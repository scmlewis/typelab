import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import { QUOTES } from '@/engine/content/quotes';
import type { TestResult } from '@/engine/types';
import { SharedResultPage } from '@/app/pages/SharedResultPage';
import { createShareSnapshot, encodeShareSnapshot } from '@/features/share/shareData';

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

function renderPage(encoded: string | null) {
  const search = encoded === null ? '' : `?r=${encoded}`;

  return render(
    <MemoryRouter initialEntries={[`/shared${search}`]}>
      <Routes>
        <Route element={<SharedResultPage />} path="shared" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('shared result page', () => {
  it('shows the snapshot without needing local history', () => {
    const encoded = encodeShareSnapshot(createShareSnapshot(makeResult()));

    renderPage(encoded);

    expect(screen.getByRole('heading', { name: /a result from the bench/i })).toBeInTheDocument();
    expect(screen.getByTestId('shared-net-wpm')).toHaveTextContent('72.4');
    expect(screen.getByText('75.0')).toBeInTheDocument();
    expect(screen.getByText('97.2%')).toBeInTheDocument();
    expect(screen.getByText('84.6%')).toBeInTheDocument();
    expect(screen.getByText(/not checked by a server/i)).toBeInTheDocument();
  });

  it('keeps quote attribution and the unranked caveat', () => {
    const quote = QUOTES[0]!;
    const encoded = encodeShareSnapshot(
      createShareSnapshot(
        makeResult({
          testMode: 'quote',
          flags: ['failed'],
          configuration: {
            ...DEFAULT_TIMED_CONFIG,
            mode: 'quote',
            durationSeconds: null,
            quoteId: quote.id,
            customText: null,
          },
        }),
      ),
    );

    renderPage(encoded);

    expect(screen.getByTestId('shared-quote-source')).toHaveTextContent(quote.source);
    expect(screen.getByText(/unranked in its own browser/i)).toBeInTheDocument();
  });

  it('recovers from a missing or damaged link', () => {
    renderPage(null);

    expect(screen.getByRole('heading', { name: /not readable/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open the bench/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /local history/i })).toBeInTheDocument();
  });

  it('recovers from an edited snapshot', () => {
    renderPage('not-a-real-snapshot');

    expect(screen.getByRole('heading', { name: /not readable/i })).toBeInTheDocument();
  });
});
