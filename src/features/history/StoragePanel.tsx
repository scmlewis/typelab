import { useCallback, useEffect, useState } from 'react';

import { getResultRepository, storageCutoff } from '@/features/history/resultRepository';
import type { StorageSummary } from '@/features/history/resultRepository';
import { formatTimestamp } from '@/features/typing/format';

export interface StorageRepository {
  getStorageSummary(now?: Date): Promise<StorageSummary>;
  deleteOlderThan(cutoffIso: string): Promise<number>;
  deleteAll(): Promise<number>;
}

interface StoragePanelProps {
  repository?: StorageRepository | undefined;
  now?: (() => Date) | undefined;
}

type PendingDelete = 'older' | 'all' | null;

/**
 * History size, retention, and manual cleanup. Deletion is always two-step,
 * never automatic, and never touches settings or presets.
 */
export function StoragePanel({ repository, now }: StoragePanelProps) {
  const activeRepository = repository ?? getResultRepository();
  const currentNow = useCallback(() => now?.() ?? new Date(), [now]);
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDelete>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);

    try {
      setSummary(await activeRepository.getStorageSummary(currentNow()));
    } catch {
      setSummary(null);
      setError('Local storage could not be read. History is unchanged.');
    }
  }, [activeRepository, currentNow]);

  useEffect(() => {
    void load();
  }, [load]);

  const runDelete = async (kind: Exclude<PendingDelete, null>) => {
    setBusy(true);
    setError(null);

    try {
      const removed =
        kind === 'older'
          ? await activeRepository.deleteOlderThan(storageCutoff(currentNow()))
          : await activeRepository.deleteAll();

      setStatus(
        kind === 'older'
          ? `Deleted ${removed} runs older than 90 days.`
          : `Deleted ${removed} runs.`,
      );
      setPending(null);
      await load();
    } catch {
      setError('History could not be deleted. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  };

  const hasRuns = (summary?.count ?? 0) > 0;
  const olderCount = summary?.olderThan90Days ?? 0;

  return (
    <section
      aria-labelledby="storage-title"
      className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 className="font-display text-2xl tracking-tight" id="storage-title">
        Storage and cleanup
      </h2>
      <p className="mt-2 max-w-lg text-xs leading-5 text-ink-muted">
        History lives in this browser. Deleting runs cannot be undone, removes history only, and can
        change personal bests and trends.
      </p>

      {error === null ? null : (
        <p className="mt-3 text-xs leading-5" role="alert">
          {error}
        </p>
      )}

      {summary === null ? null : (
        <>
          <div className="mt-4 text-sm" data-testid="storage-summary">
            <p>
              {summary.count} {summary.count === 1 ? 'run' : 'runs'} ·{' '}
              {summary.bytes > 0 ? `~${formatBytes(summary.bytes)}` : '0 B'}
            </p>
            {summary.count > 0 ? (
              <p className="mt-1 text-xs text-ink-muted">
                {summary.oldestCompletedAt === null
                  ? 'No dated runs.'
                  : `Oldest run ${formatTimestamp(summary.oldestCompletedAt)}.`}
              </p>
            ) : null}
            {olderCount > 0 ? (
              <p className="mt-1 text-xs">{olderCount} older than 90 days</p>
            ) : null}
          </div>

          {summary.count === 0 ? (
            <p className="mt-2 text-xs text-ink-muted">No runs saved yet.</p>
          ) : olderCount === 0 ? (
            <p className="mt-2 text-xs text-ink-muted">No runs are older than 90 days.</p>
          ) : null}
        </>
      )}

      <p className="mt-4 text-xs leading-5 text-ink-muted">
        <a className="underline underline-offset-4 hover:text-ink" href="#backup">
          Export a backup first
        </a>{' '}
        if you may want these runs later.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {pending === 'older' ? (
          <>
            <button
              className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={() => {
                void runDelete('older');
              }}
              type="button"
            >
              Confirm delete {olderCount} {olderCount === 1 ? 'run' : 'runs'}
            </button>
            <button
              className="text-xs font-medium underline underline-offset-4"
              disabled={busy}
              onClick={() => {
                setPending(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasRuns || olderCount === 0 || busy}
            onClick={() => {
              setPending('older');
            }}
            type="button"
          >
            Delete older than 90 days
          </button>
        )}

        {pending === 'all' ? (
          <>
            <button
              className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={() => {
                void runDelete('all');
              }}
              type="button"
            >
              Confirm delete all {summary?.count ?? 0} runs
            </button>
            <button
              className="text-xs font-medium underline underline-offset-4"
              disabled={busy}
              onClick={() => {
                setPending(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasRuns || busy}
            onClick={() => {
              setPending('all');
            }}
            type="button"
          >
            Delete all runs
          </button>
        )}
      </div>

      <p className="mt-2 min-h-4 text-xs leading-5 text-ink-muted" role="status">
        {busy ? 'Deleting…' : (status ?? '')}
      </p>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} kB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
