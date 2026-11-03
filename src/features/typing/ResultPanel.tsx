import { ArrowRight, Repeat2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { HeroStat, Metric } from '@/components/ui/Metric';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { getQuoteById } from '@/engine/content/quotes';
import type { EngineStatus, TestResult } from '@/engine/types';
import { SharePanel } from '@/features/share/SharePanel';
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
          <dl className="sm:text-right">
            <HeroStat
              caption={`${formatPercent(result.accuracy, 1)} accuracy`}
              label="Net WPM"
              value={result.netWpm.toFixed(0)}
              valueTestId="result-net-wpm"
            />
          </dl>
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
            <Metric label="Correct" size="sm" value={result.characterStatistics.correct} />
            <Metric label="Incorrect" size="sm" value={result.characterStatistics.incorrect} />
            <Metric label="Extra" size="sm" value={result.characterStatistics.extra} />
            <Metric label="Missed" size="sm" value={result.characterStatistics.missed} />
          </dl>

          {result.flags.length > 0 ? (
            <StatusMessage className="mt-6" tone="info">
              {describeFlags(result.flags)}
            </StatusMessage>
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
        <Button onClick={onNext} size="lg" variant="primary">
          Next test
          <ArrowRight aria-hidden="true" size={15} />
        </Button>
        <Button onClick={onRepeat} size="lg">
          <Repeat2 aria-hidden="true" size={15} />
          Repeat text
        </Button>
        <span className="text-xs text-ink-muted">
          or press <kbd className="font-mono text-ink">Ctrl</kbd> +{' '}
          <kbd className="font-mono text-ink">Enter</kbd>
        </span>
      </div>

      {result ? <SharePanel result={result} /> : null}
    </section>
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
