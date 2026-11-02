import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
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

function renderPage(repository: ReturnType<typeof createRepository>) {
  return render(
    <MemoryRouter>
      <HistoryPage repository={repository} />
    </MemoryRouter>,
  );
}

describe('history page', () => {
  it('lists saved runs with their headline metrics', async () => {
    const repository = createRepository();

    renderPage(repository);

    expect(await screen.findByText('30 seconds')).toBeInTheDocument();
    expect(screen.getByText('61.5')).toBeInTheDocument();
    expect(screen.getByText('96.4%')).toBeInTheDocument();
    expect(screen.getByText('82.1%')).toBeInTheDocument();
    expect(screen.getByText('1 run')).toBeInTheDocument();
    expect(repository.list).toHaveBeenCalledWith({
      limit: 100,
      offset: 0,
      includeExcluded: false,
    });
  });

  it('links each run to its detail page', async () => {
    const repository = createRepository();

    renderPage(repository);

    const link = await screen.findByRole('link', { name: '30 seconds' });

    expect(link).toHaveAttribute('href', '/results/result-1');
  });

  it('charts progress when more than one run matches', async () => {
    const repository = createRepository([
      makeResult({ id: 'result-2', netWpm: 65, completedAt: '2026-10-28T12:00:00.000Z' }),
      makeResult(),
    ]);

    renderPage(repository);

    expect(
      await screen.findByRole('heading', { name: /progress over time/i }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/latest 65 wpm/i)).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    const repository = createRepository([]);

    renderPage(repository);

    expect(await screen.findByText(/no runs match yet/i)).toBeInTheDocument();
  });

  it('shows an error state and retries', async () => {
    const user = userEvent.setup();
    const list = vi
      .fn<() => Promise<HistoryPageData>>()
      .mockRejectedValueOnce(new Error('blocked'))
      .mockResolvedValueOnce({ items: [makeResult()], total: 1, hasMore: false });

    render(
      <MemoryRouter>
        <HistoryPage repository={{ list, delete: async () => {} }} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/could not be opened/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('30 seconds')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('asks the repository for excluded runs when toggled', async () => {
    const user = userEvent.setup();
    const repository = createRepository();

    renderPage(repository);
    await screen.findByText('30 seconds');

    await user.click(screen.getByLabelText('Show excluded runs'));

    await waitFor(() => {
      expect(repository.list).toHaveBeenLastCalledWith({
        limit: 100,
        offset: 0,
        includeExcluded: true,
      });
    });
  });

  it('filters by mode', async () => {
    const user = userEvent.setup();
    const repository = createRepository();

    renderPage(repository);
    await screen.findByText('30 seconds');

    await user.selectOptions(screen.getByLabelText('Filter by mode'), 'words');

    await waitFor(() => {
      expect(repository.list).toHaveBeenLastCalledWith({
        limit: 100,
        offset: 0,
        includeExcluded: false,
        testMode: 'words',
      });
    });
  });

  it('deletes only after confirmation, then removes the row in place', async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderPage(repository);
    await screen.findByText('30 seconds');

    await user.click(screen.getByRole('button', { name: /delete run/i }));
    expect(repository.delete).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /delete run/i }));

    await waitFor(() => {
      expect(repository.delete).toHaveBeenCalledWith('result-1');
    });
    expect(screen.queryByText('30 seconds')).not.toBeInTheDocument();
    expect(screen.getByText(/no runs match yet/i)).toBeInTheDocument();
    expect(repository.list).toHaveBeenCalledTimes(1);

    confirm.mockRestore();
  });

  it('loads older runs without duplicating a row', async () => {
    const user = userEvent.setup();
    const first = [
      makeResult({ id: 'result-3', completedAt: '2026-10-29T12:00:00.000Z' }),
      makeResult({ id: 'result-2', completedAt: '2026-10-28T12:00:00.000Z' }),
    ];
    const list = vi
      .fn()
      .mockResolvedValueOnce({ items: first, total: 3, hasMore: true })
      .mockResolvedValueOnce({
        items: [first[1], makeResult({ id: 'result-1' })],
        total: 3,
        hasMore: false,
      });

    render(
      <MemoryRouter>
        <HistoryPage repository={{ list, delete: async () => {} }} />
      </MemoryRouter>,
    );

    await screen.findByText('2 of 3 runs');
    await user.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: '30 seconds' })).toHaveLength(3);
    });
    expect(list).toHaveBeenLastCalledWith({
      limit: 100,
      offset: 2,
      includeExcluded: false,
    });
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('resets paging when a filter changes', async () => {
    const user = userEvent.setup();
    const first = [makeResult({ id: 'result-2' }), makeResult({ id: 'result-1' })];
    const list = vi
      .fn()
      .mockResolvedValueOnce({ items: first, total: 3, hasMore: true })
      .mockResolvedValueOnce({
        items: [makeResult({ id: 'result-0' })],
        total: 3,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        items: [makeResult({ id: 'words-1', testMode: 'words' })],
        total: 1,
        hasMore: false,
      });

    render(
      <MemoryRouter>
        <HistoryPage repository={{ list, delete: async () => {} }} />
      </MemoryRouter>,
    );

    await screen.findByText('2 of 3 runs');
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByText('3 runs');

    await user.selectOptions(screen.getByLabelText('Filter by mode'), 'words');

    await waitFor(() => {
      expect(list).toHaveBeenLastCalledWith({
        limit: 100,
        offset: 0,
        includeExcluded: false,
        testMode: 'words',
      });
    });
    expect(screen.getByText('1 run')).toBeInTheDocument();
  });

  it('keeps paging consistent after deleting a loaded row', async () => {
    const user = userEvent.setup();
    const items = [
      makeResult({ id: 'result-3' }),
      makeResult({ id: 'result-2' }),
      makeResult({ id: 'result-1' }),
    ];
    const list = vi.fn(() => Promise.resolve({ items, total: 5, hasMore: true }));
    const remove = vi.fn(() => Promise.resolve());
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <HistoryPage repository={{ list, delete: remove }} />
      </MemoryRouter>,
    );

    await screen.findByText('3 of 5 runs');
    const [firstDeleteButton] = screen.getAllByRole('button', { name: /delete run/i });

    if (firstDeleteButton === undefined) {
      throw new Error('expected a delete button for the first row');
    }

    await user.click(firstDeleteButton);

    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith('result-3');
    });
    expect(screen.getByText('2 of 4 runs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
  });

  it('discards a stale page after the filter changes', async () => {
    const user = userEvent.setup();
    const first = [makeResult({ id: 'result-2' }), makeResult({ id: 'result-1' })];
    const words = makeResult({ id: 'words-1', testMode: 'words', wordCount: 10 });
    let resolveStale: (page: HistoryPageData) => void = () => {};
    const stale = new Promise<HistoryPageData>((resolve) => {
      resolveStale = resolve;
    });
    const list = vi
      .fn()
      .mockResolvedValueOnce({ items: first, total: 3, hasMore: true })
      .mockReturnValueOnce(stale)
      .mockResolvedValueOnce({ items: [words], total: 1, hasMore: false });

    render(
      <MemoryRouter>
        <HistoryPage repository={{ list, delete: async () => {} }} />
      </MemoryRouter>,
    );

    await screen.findByText('2 of 3 runs');
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await user.selectOptions(screen.getByLabelText('Filter by mode'), 'words');
    await screen.findByText('1 run');

    resolveStale({
      items: [makeResult({ id: 'stale-1', completedAt: '2026-10-01T12:00:00.000Z' })],
      total: 9,
      hasMore: true,
    });

    await waitFor(() => {
      expect(screen.getByText('1 run')).toBeInTheDocument();
    });
    expect(screen.getByText('10 words')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '30 seconds' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('caps the trend chart at the newest 200 loaded runs', async () => {
    const results = Array.from({ length: 201 }, (_, index) =>
      makeResult({
        id: `result-${index}`,
        clientTestId: `client-${index}`,
        completedAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
      }),
    );

    renderPage(createRepository(results));

    expect(
      await screen.findByText('The chart shows the latest 200 loaded runs.'),
    ).toBeInTheDocument();
  });
});
