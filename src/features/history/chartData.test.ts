import { describe, expect, it } from 'vitest';

import type { IntervalSample } from '@/engine/types';
import { buildSpeedSeries, summarizeSpeedSeries } from '@/features/history/chartData';

function sample(startMs: number, wpm: number, durationMs = 1_000): IntervalSample {
  return { startMs, durationMs, chars: 5, wpm };
}

describe('speed chart data', () => {
  it('maps samples to labelled seconds', () => {
    const points = buildSpeedSeries([sample(0, 40), sample(1_000, 60), sample(2_000, 80)]);

    expect(points).toEqual([
      { second: 1, wpm: 40, average: 40 },
      { second: 2, wpm: 60, average: 50 },
      { second: 3, wpm: 80, average: 60 },
    ]);
  });

  it('smooths with a trailing window that is partial at the start', () => {
    const points = buildSpeedSeries(
      [sample(0, 10), sample(1_000, 20), sample(2_000, 30), sample(3_000, 40)],
      3,
    );

    expect(points.map((point) => point.average)).toEqual([10, 15, 20, 30]);
  });

  it('handles a short final bucket and empty input', () => {
    expect(buildSpeedSeries([sample(59_500, 120, 500)])).toEqual([
      { second: 60, wpm: 120, average: 120 },
    ]);
    expect(buildSpeedSeries([])).toEqual([]);
  });

  it('summarises the average and peak speed', () => {
    const points = buildSpeedSeries([sample(0, 40), sample(1_000, 70), sample(2_000, 52)]);

    expect(summarizeSpeedSeries(points)).toEqual({ average: 54, peak: 70 });
  });

  it('has no summary without points', () => {
    expect(summarizeSpeedSeries([])).toBeNull();
  });
});
