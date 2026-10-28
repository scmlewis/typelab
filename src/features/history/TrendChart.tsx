import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TestResult } from '@/engine/types';
import { buildTrendSeries, summarizeTrend } from '@/features/history/trendData';

interface TrendChartProps {
  results: readonly TestResult[];
}

export function TrendChart({ results }: TrendChartProps) {
  const points = buildTrendSeries(results);
  const summary = summarizeTrend(points);
  const mixedModes = new Set(results.map((result) => result.testMode)).size > 1;

  if (summary === null || points.length < 2) {
    return (
      <section aria-labelledby="trend-chart-title" className="mt-8">
        <h2 className="font-display text-2xl tracking-tight" id="trend-chart-title">
          Progress over time
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
          Two completed runs draw this trend. Keep the same mode and settings so the comparison
          stays honest.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="trend-chart-title"
      className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight" id="trend-chart-title">
          Progress over time
        </h2>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-muted">
          Net WPM and accuracy per completed run
        </p>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
        Latest {summary.latestNetWpm} WPM · {describeChange(summary.change)} ·{' '}
        {summary.averageAccuracy}% average accuracy across {summary.count} runs (
        {summary.averageNetWpm} WPM average).
      </p>
      {mixedModes ? (
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          This series mixes test modes; filter by mode for a fair comparison.
        </p>
      ) : null}

      <div aria-hidden="true" className="mt-4 h-56 w-full sm:h-64">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
            <XAxis
              axisLine={{ stroke: 'var(--line)' }}
              dataKey="label"
              minTickGap={24}
              tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-code)' }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[0, 'auto']}
              tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-code)' }}
              tickLine={false}
              width={40}
              yAxisId="wpm"
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              orientation="right"
              tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-code)' }}
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
              width={40}
              yAxisId="accuracy"
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
            />
            <Line
              dataKey="netWpm"
              dot={false}
              isAnimationActive={false}
              name="Net WPM"
              stroke="var(--accent)"
              strokeWidth={2}
              type="monotone"
              yAxisId="wpm"
            />
            <Line
              dataKey="accuracy"
              dot={false}
              isAnimationActive={false}
              name="Accuracy"
              stroke="var(--success)"
              strokeDasharray="4 3"
              strokeWidth={2}
              type="monotone"
              yAxisId="accuracy"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function describeChange(change: number): string {
  if (change === 0) {
    return 'level with the first run';
  }

  return `${change > 0 ? 'up' : 'down'} ${Math.abs(change)} from the first run`;
}
