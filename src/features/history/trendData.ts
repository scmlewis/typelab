import type { TestResult } from '@/engine/types';

export interface TrendPoint {
  id: string;
  /** Epoch milliseconds of the run's completion. */
  at: number;
  /** Locale-independent month-day label for the axis. */
  label: string;
  netWpm: number;
  accuracy: number;
}

export interface TrendSummary {
  count: number;
  latestNetWpm: number;
  change: number;
  averageNetWpm: number;
  averageAccuracy: number;
}

/** Completed runs become a chronological series; unreadable timestamps are skipped. */
export function buildTrendSeries(results: readonly TestResult[]): TrendPoint[] {
  return results
    .flatMap((result) => {
      const at = Date.parse(result.completedAt);

      if (!Number.isFinite(at)) {
        return [];
      }

      return [
        {
          id: result.id,
          at,
          label: `${pad(new Date(at).getUTCMonth() + 1)}-${pad(new Date(at).getUTCDate())}`,
          netWpm: result.netWpm,
          accuracy: result.accuracy,
        },
      ];
    })
    .sort((left, right) => left.at - right.at);
}

export function summarizeTrend(points: readonly TrendPoint[]): TrendSummary | null {
  if (points.length === 0) {
    return null;
  }

  let totalWpm = 0;
  let totalAccuracy = 0;

  for (const point of points) {
    totalWpm += point.netWpm;
    totalAccuracy += point.accuracy;
  }

  const first = points[0];
  const latest = points[points.length - 1];

  if (first === undefined || latest === undefined) {
    return null;
  }

  return {
    count: points.length,
    latestNetWpm: round(latest.netWpm),
    change: round(latest.netWpm - first.netWpm),
    averageNetWpm: round(totalWpm / points.length),
    averageAccuracy: round(totalAccuracy / points.length),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
