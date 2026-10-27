import type { IntervalSample } from '@/engine/types';

export interface SpeedPoint {
  /** Label for the end of the bucket, in whole seconds. */
  second: number;
  wpm: number;
  average: number;
}

export interface SpeedSummary {
  average: number;
  peak: number;
}

/**
 * Turn stored interval samples into chart points. `average` is a trailing
 * moving average so the line stays readable without hiding the raw pace.
 */
export function buildSpeedSeries(samples: readonly IntervalSample[], windowSize = 5): SpeedPoint[] {
  const size = Math.max(1, Math.floor(windowSize));

  return samples.map((sample, index) => {
    const window = samples.slice(Math.max(0, index - size + 1), index + 1);
    const average = window.reduce((total, entry) => total + entry.wpm, 0) / window.length;

    return {
      second: Math.max(1, Math.round((sample.startMs + sample.durationMs) / 1_000)),
      wpm: sample.wpm,
      average: round(average),
    };
  });
}

export function summarizeSpeedSeries(points: readonly SpeedPoint[]): SpeedSummary | null {
  if (points.length === 0) {
    return null;
  }

  let total = 0;
  let peak = 0;

  for (const point of points) {
    total += point.wpm;
    peak = Math.max(peak, point.wpm);
  }

  return {
    average: round(total / points.length),
    peak: round(peak),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
