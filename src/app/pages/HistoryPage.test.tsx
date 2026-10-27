import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import { HistoryPage } from '@/app/pages/HistoryPage';
import type { HistoryPage as HistoryPageData } from '@/features/history/resultRepository';

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
    netWpm: 61.5,
    rawWpm: 64,
    accuracy: 96.4,
    characterStatistics: {
      correct: 150,
      incorrect: 2,
      extra: 1,
      missed: 0,
      correctSeparators: 25,
      extraSeparators: 0,
      missedSeparators: 0,
    },
    consistency: 82.1,
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

function createRepository(items: TestResult[] = [makeResult()]) {
  const list = vi.fn(() => Promise.resolve({ items, total: items.length, hasMore: false }));
  const remove = vi.fn(() => Promise.resolve());

  return { list, delete: remove };
}

describe('history page', () => {
  it('lists saved runs with their headline metrics', async () => {
    const repository = createRepository();

    render(<HistoryPage repository={repository} />);

    expect(await screen.findByText('30 seconds')).toBeInTheDocument();
    expect(screen.getByText('61.5')).toBeInTheDocument();
    expect(screen.getByText('96.4%')).toBeInTheDocument();
    expect(screen.getByText('82.1%')).toBeInTheDocument();
    expect(screen.getByText('1 run')).toBeInTheDocument();
    expect(repository.list).toHaveBeenCalledWith({
      limit: 100,
      includeExcluded: false,
    });
  });

  it('shows an empty state when nothing matches', async () => {
    const repository = createRepository([]);

    render(<HistoryPage repository={repository} />);

    expect(await screen.findByText(/no runs match yet/i)).toBeInTheDocument();
  });

  it('shows an error state and retries', async () => {
    const user = userEvent.setup();
    const list = vi
      .fn<() => Promise<HistoryPageData>>()
      .mockRejectedValueOnce(new Error('blocked'))
      .mockResolvedValueOnce({ items: [makeResult()], total: 1, hasMore: false });

    render(<HistoryPage repository={{ list, delete: async () => {} }} />);

    expect(await screen.findByText(/could not be opened/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('30 seconds')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('asks the repository for excluded runs when toggled', async () => {
    const user = userEvent.setup();
    const repository = createRepository();

    render(<HistoryPage repository={repository} />);
    await screen.findByText('30 seconds');

    await user.click(screen.getByLabelText('Show excluded runs'));

    await waitFor(() => {
      expect(repository.list).toHaveBeenLastCalledWith({
        limit: 100,
        includeExcluded: true,
      });
    });
  });

  it('filters by mode', async () => {
    const user = userEvent.setup();
    const repository = createRepository();

    render(<HistoryPage repository={repository} />);
    await screen.findByText('30 seconds');

    await user.selectOptions(screen.getByLabelText('Filter by mode'), 'words');

    await waitFor(() => {
      expect(repository.list).toHaveBeenLastCalledWith({
        limit: 100,
        includeExcluded: false,
        testMode: 'words',
      });
    });
  });

  it('deletes only after confirmation, then reloads', async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<HistoryPage repository={repository} />);
    await screen.findByText('30 seconds');

    await user.click(screen.getByRole('button', { name: /delete run/i }));
    expect(repository.delete).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /delete run/i }));

    await waitFor(() => {
      expect(repository.delete).toHaveBeenCalledWith('result-1');
    });
    await waitFor(() => {
      expect(repository.list).toHaveBeenCalledTimes(2);
    });

    confirm.mockRestore();
  });
});
