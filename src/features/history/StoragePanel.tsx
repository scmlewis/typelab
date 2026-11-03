import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusMessage } from '@/components/ui/StatusMessage';
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
          ? `Deleted ${removed} ${removed === 1 ? 'run' : 'runs'} older than 90 days.`
          : `Deleted ${removed} ${removed === 1 ? 'run' : 'runs'}.`,
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
    <Card as="section" aria-labelledby="storage-title" className="mt-8">
      <h2 className="font-display text-2xl tracking-tight" id="storage-title">
        Storage and cleanup
      </h2>
      <p className="mt-2 max-w-lg text-xs leading-5 text-ink-muted">
        History lives in this browser. Deleting runs cannot be undone, removes history only, and can
        change personal bests and trends.
      </p>

      {error === null ? null : (
        <StatusMessage className="mt-3" tone="error">
          {error}
        </StatusMessage>
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
            <Button
              disabled={busy}
              onClick={() => {
                void runDelete('older');
              }}
            >
              Confirm delete {olderCount} {olderCount === 1 ? 'run' : 'runs'}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setPending(null);
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            disabled={!hasRuns || olderCount === 0 || busy}
            onClick={() => {
              setPending('older');
            }}
          >
            Delete older than 90 days
          </Button>
        )}

        {pending === 'all' ? (
          <>
            <Button
              disabled={busy}
              onClick={() => {
                void runDelete('all');
              }}
            >
              Confirm delete all {summary?.count ?? 0}{' '}
              {(summary?.count ?? 0) === 1 ? 'run' : 'runs'}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setPending(null);
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            disabled={!hasRuns || busy}
            onClick={() => {
              setPending('all');
            }}
          >
            Delete all runs
          </Button>
        )}
      </div>

      <StatusMessage className="mt-2 min-h-4" variant="plain">
        {busy ? 'Deleting…' : (status ?? '')}
      </StatusMessage>
    </Card>
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
