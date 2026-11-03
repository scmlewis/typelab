import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router';

import { Eyebrow } from '@/app/components/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Metric } from '@/components/ui/Metric';
import { StatusMessage } from '@/components/ui/StatusMessage';
import type { TestMode, TestResult } from '@/engine/types';
import { getResultRepository } from '@/features/history/resultRepository';
import type {
  HistoryPage as HistoryPageData,
  HistoryQuery,
} from '@/features/history/resultRepository';
import {
  describeResultMode,
  formatLanguage,
  formatPercent,
  formatTimestamp,
} from '@/features/typing/format';

const MODE_FILTERS: readonly { value: 'all' | TestMode; label: string }[] = [
  { value: 'all', label: 'All modes' },
  { value: 'timed', label: 'Timed' },
  { value: 'words', label: 'Words' },
  { value: 'quote', label: 'Quote' },
  { value: 'custom', label: 'Custom' },
];

const PAGE_SIZE = 100;
const CHART_LIMIT = 200;

/** The chart library is only needed once a second run exists. */
const TrendChart = lazy(async () => {
  const module = await import('@/features/history/TrendChart');

  return { default: module.TrendChart };
});

interface HistoryRepository {
  list(query?: HistoryQuery): Promise<HistoryPageData>;
  delete(id: string): Promise<void>;
}

interface HistoryPageProps {
  repository?: HistoryRepository;
}

export function HistoryPage({ repository }: HistoryPageProps) {
  const activeRepository = useMemo(() => repository ?? getResultRepository(), [repository]);
  const [mode, setMode] = useState<'all' | TestMode>('all');
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const [items, setItems] = useState<TestResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TestResult | null>(null);
  const requestId = useRef(0);

  const buildQuery = useCallback(
    (offset: number): HistoryQuery => ({
      limit: PAGE_SIZE,
      offset,
      includeExcluded,
      ...(mode === 'all' ? {} : { testMode: mode }),
    }),
    [includeExcluded, mode],
  );

  useEffect(() => {
    let cancelled = false;
    const generation = requestId.current + 1;

    requestId.current = generation;
    setStatus('loading');
    setItems([]);
    setTotal(0);
    setHasMore(false);
    setLoadingMore(false);
    activeRepository
      .list(buildQuery(0))
      .then((loaded) => {
        if (!cancelled && generation === requestId.current) {
          setItems(loaded.items);
          setTotal(loaded.total);
          setHasMore(loaded.hasMore);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled && generation === requestId.current) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository, buildQuery, reloadToken]);

  const loadMore = useCallback(async () => {
    const generation = requestId.current;

    setLoadingMore(true);
    setActionError(null);

    try {
      const next = await activeRepository.list(buildQuery(items.length));

      // A filter change or a delete while this page was in flight makes the
      // response describe a list that no longer exists.
      if (generation !== requestId.current) {
        return;
      }

      // A save can land between requests. Offset paging may repeat a row;
      // merging by id keeps the list honest without a refetch.
      setItems((current) => {
        const seen = new Set(current.map((result) => result.id));
        return [...current, ...next.items.filter((result) => !seen.has(result.id))];
      });
      setTotal(next.total);
      setHasMore(next.hasMore);
    } catch {
      if (generation === requestId.current) {
        setActionError('Could not load older runs. Your history is unchanged.');
      }
    } finally {
      if (generation === requestId.current) {
        setLoadingMore(false);
      }
    }
  }, [activeRepository, buildQuery, items.length]);

  const handleDelete = useCallback(
    async (id: string) => {
      setActionError(null);

      try {
        await activeRepository.delete(id);
        setItems((current) => current.filter((result) => result.id !== id));
        setTotal((current) => Math.max(0, current - 1));
      } catch {
        setActionError('Could not delete this run. Nothing was removed.');
      }
    },
    [activeRepository],
  );

  const summary = hasMore
    ? `${items.length} of ${total} runs`
    : `${total} ${total === 1 ? 'run' : 'runs'}`;

  return (
    <section aria-labelledby="history-title">
      <Eyebrow>The record book</Eyebrow>
      <h1
        className="mt-3 font-display text-4xl leading-none tracking-tight sm:text-5xl"
        id="history-title"
      >
        Local history.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-ink-muted">
        Every completed run stays in this browser. Failed and sub-second runs are kept for the
        record but hidden from personal bests unless you show them.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-y border-line/80 py-4">
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="font-mono uppercase tracking-[0.14em]">Mode</span>
          <select
            aria-label="Filter by mode"
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink"
            onChange={(event) => {
              setMode(event.target.value as 'all' | TestMode);
            }}
            value={mode}
          >
            {MODE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input
            checked={includeExcluded}
            className="size-4 accent-ink"
            onChange={(event) => {
              setIncludeExcluded(event.target.checked);
            }}
            type="checkbox"
          />
          Show excluded runs
        </label>

        {status === 'ready' ? (
          <p className="ml-auto font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
            {summary}
          </p>
        ) : null}
      </div>

      {actionError ? (
        <StatusMessage className="mt-4 text-sm" tone="error" variant="plain">
          {actionError}
        </StatusMessage>
      ) : null}

      {status === 'error' ? (
        <Card className="mt-8" tone="danger">
          <p className="text-sm leading-6 text-danger">
            Local history could not be opened. Browser storage may be blocked.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setReloadToken((token) => token + 1);
            }}
          >
            Try again
          </Button>
        </Card>
      ) : null}

      {status === 'loading' && items.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Reading the record book…</p>
      ) : null}

      {status === 'ready' && items.length === 0 ? (
        <Card className="mt-8">
          <p className="text-sm leading-6 text-ink-muted">
            No runs match yet. Finish a test on the bench and it will appear here.
          </p>
        </Card>
      ) : null}

      {items.length > 1 ? (
        <Suspense
          fallback={
            <p className="mt-8 text-sm text-ink-muted" role="status">
              Drawing the trend…
            </p>
          }
        >
          <TrendChart results={items.slice(0, CHART_LIMIT)} />
        </Suspense>
      ) : null}

      {items.length > CHART_LIMIT ? (
        <p className="mt-2 text-xs text-ink-muted">
          The chart shows the latest {CHART_LIMIT} loaded runs.
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-2 divide-y divide-line/70">
          {items.map((result) => (
            <li
              className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:items-center"
              key={result.id}
            >
              <div>
                <Link
                  className="text-sm font-medium underline-offset-4 hover:underline"
                  to={`/results/${result.id}`}
                >
                  {describeResultMode(result)}
                </Link>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatLanguage(result.language)} · {formatTimestamp(result.completedAt)}
                </p>
                {result.flags.length > 0 ? (
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {result.flags.map((flag) => (
                      <span
                        className="rounded-full bg-accent-soft/70 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-ink-muted"
                        key={flag}
                      >
                        {flag}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
              <dl className="grid gap-3 sm:col-span-3 sm:grid-cols-subgrid sm:items-center">
                <Metric label="Net WPM" value={result.netWpm.toFixed(1)} />
                <Metric label="Accuracy" value={formatPercent(result.accuracy, 1)} />
                <Metric label="Consistency" value={formatPercent(result.consistency, 1)} />
              </dl>
              <Button
                aria-label={`Delete run from ${formatTimestamp(result.completedAt)}`}
                className="justify-self-start sm:justify-self-end"
                onClick={() => {
                  setPendingDelete(result);
                }}
                size="icon"
                variant="dangerGhost"
              >
                <Trash2 aria-hidden="true" size={14} />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {status === 'ready' && hasMore ? (
        <div className="mt-6">
          <Button
            disabled={loadingMore}
            onClick={() => {
              void loadMore();
            }}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete"
        description="This removes the run from local history. It cannot be undone."
        onCancel={() => {
          setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete !== null) {
            void handleDelete(pendingDelete.id);
          }

          setPendingDelete(null);
        }}
        open={pendingDelete !== null}
        title="Delete this run?"
      />
    </section>
  );
}
