import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { IntervalSample } from '@/engine/types';
import { SpeedChart } from '@/features/history/SpeedChart';

function samples(wpms: number[]): IntervalSample[] {
  return wpms.map((wpm, index) => ({
    startMs: index * 1_000,
    durationMs: 1_000,
    chars: 5,
    wpm,
  }));
}

describe('speed chart', () => {
  it('summarises a run and labels the chart', () => {
    render(<SpeedChart samples={samples([40, 60, 80, 70])} />);

    expect(screen.getByRole('heading', { name: /speed over time/i })).toBeInTheDocument();
    expect(screen.getByText(/averaged 62.5 wpm with a peak second of 80 wpm/i)).toBeInTheDocument();
    expect(screen.getByText(/raw wpm per second · 5s average/i)).toBeInTheDocument();
  });

  it('explains when there is not enough data to chart', () => {
    render(<SpeedChart samples={samples([120])} />);

    expect(screen.getByText(/too short for a speed chart/i)).toBeInTheDocument();
  });
});
