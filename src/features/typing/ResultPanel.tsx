import { ArrowRight, Repeat2 } from 'lucide-react';

import { getQuoteById } from '@/engine/content/quotes';
import type { EngineStatus, TestResult } from '@/engine/types';
import {
  describeResultMode,
  formatDuration,
  formatLanguage,
  formatPercent,
  formatTimestamp,
} from '@/features/typing/format';

interface ResultPanelProps {
  result: TestResult | null;
  status: EngineStatus;
  onNext: () => void;
  onRepeat: () => void;
}

export function ResultPanel({ result, status, onNext, onRepeat }: ResultPanelProps) {
  const cancelled = status === 'cancelled' || result === null;
  const failed = status === 'failed';
  const quote =
    result !== null && result.configuration.mode === 'quote'
      ? getQuoteById(result.configuration.quoteId)
      : null;

  return (
    <section aria-live="polite" className="mt-8 pt-2" data-testid="result-panel">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="max-w-md">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-accent">
            {cancelled ? 'Test / cancelled' : failed ? 'Result / failed' : 'Result / recorded'}
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            {cancelled ? 'Run cancelled.' : failed ? 'Run ended early.' : 'Run complete.'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            {cancelled
              ? 'Nothing was recorded. Start another run when you are ready.'
              : failed
                ? 'Strict mode stops at the first mismatch. This run is kept for history but excluded from personal bests.'
                : `${describeResultMode(result)} · ${formatLanguage(result.language)} · ${formatTimestamp(result.completedAt)}`}
          </p>
        </div>

        {result ? (
          <div className="sm:text-right">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
              Net WPM
            </p>
            <p
              className="font-mono text-6xl leading-none tabular-nums text-ink"
              data-testid="result-net-wpm"
            >
              {result.netWpm.toFixed(0)}
            </p>
            <p className="mt-2 font-mono text-sm text-ink-muted">
              {formatPercent(result.accuracy, 1)} accuracy
            </p>
          </div>
        ) : null}
      </div>

      {result ? (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
            <Metric label="Raw WPM" value={result.rawWpm.toFixed(1)} />
            <Metric label="Accuracy" value={formatPercent(result.accuracy, 1)} />
            <Metric label="Consistency" value={formatPercent(result.consistency, 1)} />
            <Metric label="Time" value={formatDuration(result.durationMs)} />
          </dl>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line/70 pt-5 sm:grid-cols-4">
            <SmallMetric label="Correct" value={result.characterStatistics.correct} />
            <SmallMetric label="Incorrect" value={result.characterStatistics.incorrect} />
            <SmallMetric label="Extra" value={result.characterStatistics.extra} />
            <SmallMetric label="Missed" value={result.characterStatistics.missed} />
          </dl>

          {result.flags.length > 0 ? (
            <p className="mt-6 rounded-xl bg-accent-soft/60 px-4 py-3 text-xs leading-5 text-ink-muted">
              {describeFlags(result.flags)}
            </p>
          ) : null}

          {quote ? (
            <p
              className="mt-6 text-right font-display text-sm leading-6 text-ink-muted"
              data-testid="quote-source"
            >
              <cite>{quote.source}</cite> · {quote.author}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
          onClick={onNext}
          type="button"
        >
          Next test
          <ArrowRight aria-hidden="true" size={15} />
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-strong"
          onClick={onRepeat}
          type="button"
        >
          <Repeat2 aria-hidden="true" size={15} />
          Repeat text
        </button>
        <span className="text-xs text-ink-muted">
          or press <kbd className="font-mono text-ink">Ctrl</kbd> +{' '}
          <kbd className="font-mono text-ink">Enter</kbd>
        </span>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-xl tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-ink sm:mt-1">{value}</dd>
    </div>
  );
}

function describeFlags(flags: TestResult['flags']): string {
  const parts: string[] = [];

  if (flags.includes('failed')) {
    parts.push('Failed runs are excluded from personal bests.');
  }

  if (flags.includes('no-input')) {
    parts.push('No characters were recorded.');
  }

  if (flags.includes('under-one-second')) {
    parts.push('Runs under one second are excluded from personal bests.');
  }

  if (flags.includes('low-confidence')) {
    parts.push('Only the first ten minutes of interval data were kept.');
  }

  return parts.join(' ');
}
