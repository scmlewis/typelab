import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router';

import type { TestMode } from '@/engine/types';
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
  const [page, setPage] = useState<HistoryPageData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadToken, setReloadToken] = useState(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setStatus('loading');
    activeRepository
      .list({
        limit: 100,
        includeExcluded,
        ...(mode === 'all' ? {} : { testMode: mode }),
      })
      .then((loaded) => {
        if (!cancelled) {
          setPage(loaded);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository, includeExcluded, mode, reloadToken]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this run? This cannot be undone.')) {
        return;
      }

      setDeleteError(null);

      try {
        await activeRepository.delete(id);
        setReloadToken((token) => token + 1);
      } catch {
        setDeleteError('Could not delete this run. Nothing was removed.');
      }
    },
    [activeRepository],
  );

  return (
    <section aria-labelledby="history-title">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">The record book</p>
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

        {page ? (
          <p className="ml-auto font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
            {page.total} {page.total === 1 ? 'run' : 'runs'}
          </p>
        ) : null}
      </div>

      {deleteError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {deleteError}
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-8 rounded-card border border-danger/30 bg-danger/5 p-6">
          <p className="text-sm leading-6 text-danger">
            Local history could not be opened. Browser storage may be blocked.
          </p>
          <button
            className="mt-4 rounded-full border border-line px-4 py-2 text-sm font-medium"
            onClick={() => {
              setReloadToken((token) => token + 1);
            }}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      {status === 'loading' && page === null ? (
        <p className="mt-8 text-sm text-ink-muted">Reading the record book…</p>
      ) : null}

      {status === 'ready' && page && page.items.length === 0 ? (
        <div className="mt-8 rounded-card border border-line bg-surface p-6">
          <p className="text-sm leading-6 text-ink-muted">
            No runs match yet. Finish a test on the bench and it will appear here.
          </p>
        </div>
      ) : null}

      {page && page.items.length > 0 ? (
        <ul className="mt-2 divide-y divide-line/70">
          {page.items.map((result) => (
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
              <HistoryMetric label="Net WPM" value={result.netWpm.toFixed(1)} />
              <HistoryMetric label="Accuracy" value={formatPercent(result.accuracy, 1)} />
              <HistoryMetric label="Consistency" value={formatPercent(result.consistency, 1)} />
              <button
                aria-label={`Delete run from ${formatTimestamp(result.completedAt)}`}
                className="justify-self-start rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-danger/40 hover:text-danger sm:justify-self-end"
                onClick={() => {
                  void handleDelete(result.id);
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {page?.hasMore ? (
        <p className="mt-6 text-xs leading-5 text-ink-muted">
          Showing the most recent 100 runs. Filters and deletion still apply to older runs.
        </p>
      ) : null}
    </section>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="font-mono text-sm tabular-nums text-ink">{value}</p>
    </div>
  );
}
