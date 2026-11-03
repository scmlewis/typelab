import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/app/components/Eyebrow';
import { HeroStat, Metric } from '@/components/ui/Metric';
import { buttonStyles } from '@/components/ui/styles';
import { getCategoryKey, getComparableCategoryKey } from '@/engine/config';
import { getQuoteById } from '@/engine/content/quotes';
import { isDegenerateResult } from '@/engine/scoring';
import type { TestResult } from '@/engine/types';
import { getResultRepository } from '@/features/history/resultRepository';
import { SpeedChart } from '@/features/history/SpeedChart';
import { SharePanel } from '@/features/share/SharePanel';
import {
  describeResultMode,
  describeTestConfig,
  formatDuration,
  formatLanguage,
  formatPercent,
  formatTimestamp,
} from '@/features/typing/format';

interface ResultDetailRepository {
  get(id: string): Promise<TestResult | null>;
  getPersonalBest(categoryKey: string): Promise<TestResult | null>;
}

interface ResultDetailPageProps {
  repository?: ResultDetailRepository;
}

type Comparison =
  | { kind: 'best' }
  | { kind: 'behind'; gap: number; bestNetWpm: number }
  | { kind: 'unranked' }
  | { kind: 'custom' }
  | { kind: 'unknown' };

export function ResultDetailPage({ repository }: ResultDetailPageProps) {
  const { id = '' } = useParams();
  const activeRepository = useMemo(() => repository ?? getResultRepository(), [repository]);
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'missing' }
    | { status: 'error' }
    | { status: 'ready'; result: TestResult; comparison: Comparison }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    activeRepository
      .get(id)
      .then(async (result) => {
        if (cancelled) {
          return;
        }

        if (result === null) {
          setState({ status: 'missing' });
          return;
        }

        let comparison: Comparison = { kind: 'unknown' };

        if (result.testMode === 'custom') {
          comparison = { kind: 'custom' };
        } else if (isDegenerateResult(result)) {
          comparison = { kind: 'unranked' };
        } else if (getComparableCategoryKey(result.configuration) !== null) {
          const best = await activeRepository.getPersonalBest(getCategoryKey(result.configuration));

          if (!cancelled) {
            comparison =
              best === null
                ? { kind: 'unknown' }
                : best.id === result.id
                  ? { kind: 'best' }
                  : {
                      kind: 'behind',
                      gap: Math.max(0, Number((best.netWpm - result.netWpm).toFixed(1))),
                      bestNetWpm: best.netWpm,
                    };
          }
        }

        if (!cancelled) {
          setState({ status: 'ready', result, comparison });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository, id]);

  if (state.status === 'loading') {
    return (
      <section aria-labelledby="result-title" aria-busy="true" className="max-w-3xl">
        <p className="mt-8 text-sm text-ink-muted">Reading this run…</p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section aria-labelledby="result-title" className="max-w-2xl">
        <Eyebrow>Run detail</Eyebrow>
        <h1
          className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
          id="result-title"
        >
          This run could not be opened.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink-muted">
          Browser storage may be blocked. Nothing was changed.
        </p>
        <Link className={buttonStyles({ className: 'mt-6' })} to="/history">
          Local history
        </Link>
      </section>
    );
  }

  if (state.status === 'missing') {
    return (
      <section aria-labelledby="result-title" className="max-w-2xl">
        <Eyebrow>Run detail</Eyebrow>
        <h1
          className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
          id="result-title"
        >
          Run not found.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink-muted">
          This run is not in local history. It may have been deleted, or it was saved in another
          browser.
        </p>
        <Link className={buttonStyles({ className: 'mt-6' })} to="/history">
          Local history
        </Link>
      </section>
    );
  }

  const { result, comparison } = state;
  const quote =
    result.configuration.mode === 'quote' ? getQuoteById(result.configuration.quoteId) : null;

  return (
    <section aria-labelledby="result-title" className="max-w-3xl">
      <Eyebrow>Run detail</Eyebrow>
      <h1
        className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
        id="result-title"
      >
        Run detail.
      </h1>
      <p className="mt-4 text-sm leading-6 text-ink-muted">
        {describeResultMode(result)} · {formatLanguage(result.language)} ·{' '}
        {formatTimestamp(result.completedAt)}
      </p>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-y border-line/80 py-6">
        <dl>
          <HeroStat label="Net WPM" value={result.netWpm.toFixed(1)} />
        </dl>
        <p className="max-w-sm text-sm leading-6 text-ink-muted">{comparisonMessage(comparison)}</p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Metric label="Raw WPM" value={result.rawWpm.toFixed(1)} />
        <Metric label="Accuracy" value={formatPercent(result.accuracy, 1)} />
        <Metric label="Consistency" value={formatPercent(result.consistency, 1)} />
        <Metric label="Time" value={formatDuration(result.durationMs)} />
      </dl>

      <SpeedChart samples={result.samples} />

      <SharePanel headingLevel={2} result={result} />

      <div className="mt-8 grid gap-8 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Characters</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
            <Metric label="Correct" size="sm" value={result.characterStatistics.correct} />
            <Metric label="Incorrect" size="sm" value={result.characterStatistics.incorrect} />
            <Metric label="Extra" size="sm" value={result.characterStatistics.extra} />
            <Metric label="Missed" size="sm" value={result.characterStatistics.missed} />
            <Metric
              label="Correct separators"
              size="sm"
              value={result.characterStatistics.correctSeparators}
            />
            <Metric
              label="Extra separators"
              size="sm"
              value={result.characterStatistics.extraSeparators}
            />
          </dl>
        </div>

        <div>
          <h2 className="font-display text-2xl tracking-tight">Configuration</h2>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            {describeTestConfig(result.configuration)}
          </p>
          {quote ? (
            <p className="mt-2 text-sm leading-6 text-ink-muted" data-testid="quote-source">
              <cite>{quote.source}</cite> · {quote.author}
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            Error policy: {result.configuration.errorPolicy} · Scoring {result.scoringVersion}
          </p>
          {result.flags.length > 0 ? (
            <p className="mt-4 text-xs leading-5 text-ink-muted">
              Flags: {result.flags.join(', ')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link className={buttonStyles({ variant: 'primary' })} to="/">
          Back to the bench
        </Link>
        <Link className={buttonStyles()} to="/history">
          Local history
        </Link>
      </div>
    </section>
  );
}

function comparisonMessage(comparison: Comparison): string {
  switch (comparison.kind) {
    case 'best':
      return 'Personal best for this category.';
    case 'behind':
      return `${comparison.gap} WPM behind your best (${comparison.bestNetWpm.toFixed(1)} WPM).`;
    case 'unranked':
      return 'This run is kept in history but excluded from personal bests.';
    case 'custom':
      return 'Custom runs are not compared because the text is arbitrary.';
    case 'unknown':
      return 'No personal best is available for this category yet.';
  }
}
