import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import { buildTrendSeries, summarizeTrend } from '@/features/history/trendData';

function makeResult(id: string, completedAt: string, netWpm: number, accuracy: number): TestResult {
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
  };
}

describe('history trend data', () => {
  it('orders runs oldest first regardless of the stored page order', () => {
    const points = buildTrendSeries([
      makeResult('new', '2026-10-27T12:00:00.000Z', 72, 97),
      makeResult('old', '2026-10-20T12:00:00.000Z', 55, 94),
      makeResult('middle', '2026-10-24T12:00:00.000Z', 64, 96),
    ]);

    expect(points.map((point) => point.id)).toEqual(['old', 'middle', 'new']);
    expect(points[0]).toMatchObject({ netWpm: 55, accuracy: 94, label: '10-20' });
  });

  it('summarises the latest pace, the change, and average accuracy', () => {
    const points = buildTrendSeries([
      makeResult('a', '2026-10-20T12:00:00.000Z', 50, 90),
      makeResult('b', '2026-10-24T12:00:00.000Z', 60, 95),
      makeResult('c', '2026-10-27T12:00:00.000Z', 70, 100),
    ]);

    expect(summarizeTrend(points)).toEqual({
      count: 3,
      latestNetWpm: 70,
      change: 20,
      averageNetWpm: 60,
      averageAccuracy: 95,
    });
  });

  it('skips runs with an unusable timestamp', () => {
    const points = buildTrendSeries([
      makeResult('valid', '2026-10-27T12:00:00.000Z', 60, 96),
      makeResult('broken', 'not-a-date', 99, 99),
    ]);

    expect(points.map((point) => point.id)).toEqual(['valid']);
  });

  it('has no summary without points', () => {
    expect(summarizeTrend([])).toBeNull();
  });
});
