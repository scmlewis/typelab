import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { IntervalSample } from '@/engine/types';
import { buildSpeedSeries, summarizeSpeedSeries } from '@/features/history/chartData';

interface SpeedChartProps {
  samples: readonly IntervalSample[];
}

export function SpeedChart({ samples }: SpeedChartProps) {
  const points = buildSpeedSeries(samples);
  const summary = summarizeSpeedSeries(points);

  if (points.length < 2 || summary === null) {
    return (
      <section aria-labelledby="speed-chart-title" className="mt-8 border-t border-line pt-6">
        <h2 className="font-display text-2xl tracking-tight" id="speed-chart-title">
          Speed over time
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This run is too short for a speed chart. A few seconds of typing draws the per-second pace
          here.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="speed-chart-title" className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight" id="speed-chart-title">
          Speed over time
        </h2>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-muted">
          Raw WPM per second · 5s average
        </p>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
        Averaged {summary.average} WPM with a peak second of {summary.peak} WPM across{' '}
        {points.length} seconds.
      </p>

      <div aria-hidden="true" className="mt-4 h-56 w-full sm:h-64">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
            <XAxis
              axisLine={{ stroke: 'var(--line)' }}
              dataKey="second"
              minTickGap={24}
              tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-code)' }}
              tickFormatter={(value: number) => `${value}s`}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[0, 'auto']}
              tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-code)' }}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                color: 'var(--ink)',
                fontFamily: 'var(--font-code)',
                fontSize: 12,
              }}
              labelFormatter={(value) => `${typeof value === 'number' ? value : ''}s`}
            />
            <Line
              dataKey="wpm"
              dot={false}
              isAnimationActive={false}
              name="Raw WPM"
              stroke="var(--accent)"
              strokeWidth={1.5}
              type="monotone"
            />
            <Line
              dataKey="average"
              dot={false}
              isAnimationActive={false}
              name="5s average"
              stroke="var(--ink)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
