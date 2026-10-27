import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import { ResultDetailPage } from '@/app/pages/ResultDetailPage';

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

function createRepository(result: TestResult | null, best: TestResult | null = null) {
  return {
    get: vi.fn(() => Promise.resolve(result)),
    getPersonalBest: vi.fn(() => Promise.resolve(best)),
  };
}

function renderPage(repository: ReturnType<typeof createRepository>, id = 'result-1') {
  return render(
    <MemoryRouter initialEntries={[`/results/${id}`]}>
      <Routes>
        <Route element={<ResultDetailPage repository={repository} />} path="results/:id" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('result detail page', () => {
  it('shows the full run and its statistics', async () => {
    const result = makeResult();
    const repository = createRepository(result, result);

    renderPage(repository);

    expect(await screen.findByRole('heading', { name: /run detail/i })).toBeInTheDocument();
    expect(screen.getByText('72.4')).toBeInTheDocument();
    expect(screen.getByText('75.0')).toBeInTheDocument();
    expect(screen.getByText('97.2%')).toBeInTheDocument();
    expect(screen.getByText('84.6%')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('Personal best for this category.')).toBeInTheDocument();
    expect(screen.getByText(/too short for a speed chart/i)).toBeInTheDocument();
  });

  it('draws the speed chart for a run with samples', async () => {
    const result = makeResult({
      samples: [
        { startMs: 0, durationMs: 1_000, chars: 5, wpm: 40 },
        { startMs: 1_000, durationMs: 1_000, chars: 7, wpm: 70 },
      ],
    });
    const repository = createRepository(result, result);

    renderPage(repository);

    expect(await screen.findByRole('heading', { name: /speed over time/i })).toBeInTheDocument();
    expect(screen.getByText(/averaged 55 wpm with a peak second of 70 wpm/i)).toBeInTheDocument();
  });

  it('compares a run against the category best', async () => {
    const repository = createRepository(
      makeResult({ id: 'result-1', netWpm: 68 }),
      makeResult({ id: 'best', clientTestId: 'best-client', netWpm: 80 }),
    );

    renderPage(repository);

    expect(await screen.findByText(/12 wpm behind your best/i)).toBeInTheDocument();
    expect(repository.getPersonalBest).toHaveBeenCalledWith(
      'timed:30000:english:english-200:false:false:free',
    );
  });

  it('does not compare custom runs', async () => {
    const repository = createRepository(
      makeResult({
        testMode: 'custom',
        configuration: {
          ...DEFAULT_TIMED_CONFIG,
          mode: 'custom',
          durationSeconds: null,
          customText: 'custom text',
        },
      }),
    );

    renderPage(repository);

    expect(await screen.findByText(/custom runs are not compared/i)).toBeInTheDocument();
    expect(repository.getPersonalBest).not.toHaveBeenCalled();
  });

  it('explains that excluded runs are not ranked', async () => {
    const repository = createRepository(makeResult({ flags: ['under-one-second'] }));

    renderPage(repository);

    expect(await screen.findByText(/excluded from personal bests/i)).toBeInTheDocument();
    expect(repository.getPersonalBest).not.toHaveBeenCalled();
  });

  it('shows a missing state when the id does not exist', async () => {
    const repository = createRepository(null);

    renderPage(repository, 'missing');

    expect(await screen.findByRole('heading', { name: /run not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /local history/i })).toBeInTheDocument();
  });
});
