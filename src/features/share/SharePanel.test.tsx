import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import type * as DownloadModule from '@/features/history/download';
import { SharePanel } from '@/features/share/SharePanel';
import type * as ShareCardModule from '@/features/share/shareCard';

const downloadBlobMock = vi.hoisted(() => vi.fn());
const shareCardBlobMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/history/download', async (importOriginal) => {
  const actual = await importOriginal<typeof DownloadModule>();

  return { ...actual, downloadBlob: downloadBlobMock };
});

vi.mock('@/features/share/shareCard', async (importOriginal) => {
  const actual = await importOriginal<typeof ShareCardModule>();

  return { ...actual, shareCardBlob: shareCardBlobMock };
});

function makeResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: 'result-1',
    clientTestId: 'client-1',
    testMode: 'timed',
    language: 'english',
    configuration: DEFAULT_TIMED_CONFIG,
    promptId: 'prompt-1',
    seed: 1,
    durationMs: 30_000,
    wordCount: null,
    netWpm: 72.4,
    rawWpm: 75,
    accuracy: 97.2,
    characterStatistics: {
      correct: 180,
      incorrect: 3,
      extra: 1,
      missed: 2,
      correctSeparators: 30,
      extraSeparators: 1,
      missedSeparators: 0,
    },
    consistency: 84.6,
    flags: [],
    samples: [],
    scoringVersion: '1.0.0',
    generatorVersion: '1.0.0',
    failureReason: null,
    completedAt: '2026-10-27T12:00:00.000Z',
    createdAt: '2026-10-27T12:00:00.000Z',
    ...overrides,
  };
}

const writeText = vi.fn<(value: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  downloadBlobMock.mockReset();
  shareCardBlobMock.mockReset();
  shareCardBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('share panel', () => {
  it('offers a summary, a link, and an image card', () => {
    render(<SharePanel origin="https://typelab.test" result={makeResult()} />);

    expect(screen.getByRole('heading', { name: /take this run with you/i })).toBeInTheDocument();
    expect(screen.getByLabelText<HTMLInputElement>('Share link').value).toMatch(
      /^https:\/\/typelab\.test\/shared\?r=/,
    );
    expect(screen.getByText(/72.4 net WPM/)).toBeInTheDocument();
  });

  it('keeps the page heading order when used as a top-level section', () => {
    render(<SharePanel headingLevel={2} origin="https://typelab.test" result={makeResult()} />);

    expect(
      screen.getByRole('heading', { level: 2, name: /take this run with you/i }),
    ).toBeInTheDocument();
  });

  it('copies the summary with its metrics and link', async () => {
    render(<SharePanel origin="https://typelab.test" result={makeResult()} />);

    fireEvent.click(screen.getByRole('button', { name: /copy summary/i }));

    await screen.findByText(/summary copied/i);

    const copied = writeText.mock.calls[0]?.[0];

    expect(copied).toContain('72.4 net WPM · 75.0 raw WPM · 97.2% accuracy');
    expect(copied).toContain('Snapshot · not a verified score.');
    expect(copied).toContain('https://typelab.test/shared?r=');
  });

  it('copies the link on its own', async () => {
    render(<SharePanel origin="https://typelab.test" result={makeResult()} />);

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));

    await screen.findByText(/share link copied/i);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/typelab\.test\/shared\?r=/),
    );
  });

  it('downloads the image card with a dated name', async () => {
    render(<SharePanel origin="https://typelab.test" result={makeResult()} />);

    fireEvent.click(screen.getByRole('button', { name: /download image card/i }));

    await screen.findByText(/image card downloaded/i);
    expect(downloadBlobMock).toHaveBeenCalledWith(
      'typelab-result-2026-10-27.png',
      expect.any(Blob),
    );
  });

  it('reports a copy failure without losing the summary', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const execCommand = vi.fn(() => false);

    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

    render(<SharePanel origin="https://typelab.test" result={makeResult()} />);

    fireEvent.click(screen.getByRole('button', { name: /copy summary/i }));

    await screen.findByText(/could not copy/i);
    expect(screen.getByText(/72.4 net WPM/)).toBeInTheDocument();
    expect(screen.getByText(/preview the text summary/i).closest('details')).toHaveAttribute(
      'open',
    );
  });

  it('marks an unranked run and hides the link when it cannot be built', () => {
    render(<SharePanel origin="" result={makeResult({ flags: ['failed'] })} />);

    expect(screen.getByText('Unranked run')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeDisabled();
    expect(screen.getByText(/too detailed to fit in a stable link/i)).toBeInTheDocument();
  });

  it('waits for the card to be drawn before reporting', async () => {
    let release: ((blob: Blob) => void) | undefined;

    shareCardBlobMock.mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          release = resolve;
        }),
    );

    render(<SharePanel origin="https://typelab.test" result={makeResult()} />);

    fireEvent.click(screen.getByRole('button', { name: /download image card/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drawing card/i })).toBeDisabled();
    });

    release?.(new Blob(['png'], { type: 'image/png' }));

    await screen.findByText(/image card downloaded/i);
  });
});
