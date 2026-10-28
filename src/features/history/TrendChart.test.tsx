import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import { TrendChart } from '@/features/history/TrendChart';

function makeResult(
  id: string,
  completedAt: string,
  netWpm: number,
  accuracy: number,
  overrides: Partial<TestResult> = {},
): TestResult {
  return {
    id,
    clientTestId: `client-${id}`,
    testMode: 'timed',
    language: 'english',
    configuration: DEFAULT_TIMED_CONFIG,
    promptId: 'prompt-1',
    seed: 1,
    durationMs: 30_000,
    wordCount: null,
    netWpm,
    rawWpm: netWpm + 3,
    accuracy,
    characterStatistics: {
      correct: 150,
      incorrect: 2,
      extra: 0,
      missed: 0,
      correctSeparators: 25,
      extraSeparators: 0,
      missedSeparators: 0,
    },
    consistency: 80,
    flags: [],
    samples: [],
    scoringVersion: '1.0.0',
    generatorVersion: '1.0.0',
    failureReason: null,
    completedAt,
    createdAt: completedAt,
    ...overrides,
  };
}

describe('history trend chart', () => {
  it('summarises progress across saved runs', () => {
    render(
      <TrendChart
        results={[
          makeResult('a', '2026-10-20T12:00:00.000Z', 50, 90),
          makeResult('b', '2026-10-24T12:00:00.000Z', 60, 95),
          makeResult('c', '2026-10-27T12:00:00.000Z', 70, 100),
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: /progress over time/i })).toBeInTheDocument();
    expect(
      screen.getByText(/latest 70 wpm · up 20 from the first run · 95% average accuracy/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/net wpm and accuracy per completed run/i)).toBeInTheDocument();
  });

  it('explains that a single run is not a trend', () => {
    render(<TrendChart results={[makeResult('a', '2026-10-20T12:00:00.000Z', 50, 90)]} />);

    expect(screen.getByText(/two completed runs draw this trend/i)).toBeInTheDocument();
  });

  it('warns when the series mixes test modes', () => {
    render(
      <TrendChart
        results={[
          makeResult('a', '2026-10-20T12:00:00.000Z', 80, 98),
          makeResult('b', '2026-10-27T12:00:00.000Z', 65, 92, {
            testMode: 'words',
            configuration: DEFAULT_WORDS_CONFIG,
          }),
        ]}
      />,
    );

    expect(screen.getByText(/filter by mode for a fair comparison/i)).toBeInTheDocument();
  });

  it('describes a decline without hiding it', () => {
    render(
      <TrendChart
        results={[
          makeResult('a', '2026-10-20T12:00:00.000Z', 80, 98),
          makeResult('b', '2026-10-27T12:00:00.000Z', 65, 92),
        ]}
      />,
    );

    expect(screen.getByText(/latest 65 wpm · down 15 from the first run/i)).toBeInTheDocument();
  });
});
