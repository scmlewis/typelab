import { useEffect, useMemo, useState } from 'react';

import type { TestResult } from '@/engine/types';
import {
  buildBackup,
  describeImportSummary,
  MAX_BACKUP_BYTES,
  parseBackup,
  resultsToCsv,
  serializeBackup,
} from '@/features/history/backup';
import type { BackupFile, BackupIssue, ImportSummary } from '@/features/history/backup';
import { backupFileName, csvFileName, downloadText } from '@/features/history/download';
import { getResultRepository } from '@/features/history/resultRepository';
import { useSettings } from '@/features/settings/settingsContext';
import { formatTimestamp } from '@/features/typing/format';

interface BackupRepository {
  getAll(): Promise<TestResult[]>;
  importResults(results: readonly TestResult[]): Promise<ImportSummary>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

interface BackupPanelProps {
  repository?: BackupRepository;
}

interface PendingImport {
  backup: BackupFile;
  fileName: string;
  fresh: number;
  duplicates: number;
}

type Message =
  | { kind: 'success' | 'info'; text: string }
  | { kind: 'error'; text: string; issues: BackupIssue[] };

export function BackupPanel({ repository }: BackupPanelProps) {
  const activeRepository = useMemo(() => repository ?? getResultRepository(), [repository]);
  const { settings, replaceSettings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [replaceDefaults, setReplaceDefaults] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    activeRepository
      .getMeta('lastExportAt')
      .then((value) => {
        if (!cancelled) {
          setLastExportAt(value);
        }
      })
      .catch(() => {
        // The export date is a convenience; failing to read it is harmless.
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository]);

  const exportJson = async () => {
    setBusy(true);
    setMessage(null);

    try {
      const results = await activeRepository.getAll();
      const now = new Date().toISOString();
      const backup = buildBackup({ settings, results, exportedAt: now });

      downloadText(backupFileName(), serializeBackup(backup));
      await activeRepository.setMeta('lastExportAt', now);
      setLastExportAt(now);
      setMessage({
        kind: 'success',
        text: `Exported ${results.length} ${results.length === 1 ? 'run' : 'runs'} and your settings.`,
      });
    } catch {
      setMessage({
        kind: 'error',
        text: 'The backup could not be created. Browser storage may be blocked.',
        issues: [],
      });
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setBusy(true);
    setMessage(null);

    try {
      const results = await activeRepository.getAll();

      downloadText(csvFileName(), resultsToCsv(results), 'text/csv;charset=utf-8');
      setMessage({
        kind: 'success',
        text: `Exported ${results.length} ${results.length === 1 ? 'row' : 'rows'} as CSV.`,
      });
    } catch {
      setMessage({
        kind: 'error',
        text: 'The CSV could not be created. Browser storage may be blocked.',
        issues: [],
      });
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async (file: File) => {
    setBusy(true);
    setMessage(null);
    setPending(null);

    try {
      if (file.size > MAX_BACKUP_BYTES) {
        setMessage({
          kind: 'error',
          text: 'This file is larger than the 25 MB backup limit.',
          issues: [],
        });
        return;
      }

      const parsed = parseBackup(await file.text());

      if (!parsed.ok) {
        setMessage({ kind: 'error', text: parsed.error, issues: parsed.issues });
        return;
      }

      const existing = new Set(
        (await activeRepository.getAll()).map((result) => result.clientTestId),
      );
      const duplicates = parsed.results.filter((result) =>
        existing.has(result.clientTestId),
      ).length;

      setPending({
        backup: parsed.backup,
        fileName: file.name,
        fresh: parsed.results.length - duplicates,
        duplicates,
      });
      setReplaceDefaults(false);
      setMessage({
        kind: 'info',
        text: `Ready to import ${parsed.results.length} ${
          parsed.results.length === 1 ? 'run' : 'runs'
        } from ${file.name}.`,
      });
    } catch {
      setMessage({
        kind: 'error',
        text: 'The file could not be read.',
        issues: [],
      });
    } finally {
      setBusy(false);
    }
  };

  const applyImport = async () => {
    if (pending === null) {
      return;
    }

    setBusy(true);

    try {
      const summary = await activeRepository.importResults(pending.backup.results);

      if (replaceDefaults) {
        await replaceSettings(pending.backup.settings);
      }

      await activeRepository.setMeta('lastImportAt', new Date().toISOString());
      setMessage({
        kind: 'success',
        text: `Imported ${describeImportSummary(summary)}.${
          replaceDefaults ? ' Test defaults were replaced.' : ''
        }`,
      });
      setPending(null);
    } catch {
      setMessage({
        kind: 'error',
        text: 'The import could not be completed. Some runs may already be saved.',
        issues: [],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="backup-title"
      className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 className="font-display text-2xl tracking-tight" id="backup-title">
        Backup and export
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-ink-muted">
        This browser is the only copy. Download a backup before clearing site data or switching
        devices. Imports merge by run ID and never overwrite an existing run.
      </p>
      <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-muted">
        Last export: {lastExportAt ? formatTimestamp(lastExportAt) : 'never'}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          disabled={busy}
          onClick={() => {
            void exportJson();
          }}
          type="button"
        >
          Export backup (.json)
        </button>
        <button
          className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong disabled:opacity-50"
          disabled={busy}
          onClick={() => {
            void exportCsv();
          }}
          type="button"
        >
          Export CSV
        </button>
        <label
          className={[
            'inline-flex cursor-pointer items-center rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong',
            busy ? 'pointer-events-none opacity-50' : '',
          ].join(' ')}
          htmlFor="import-backup"
        >
          Import backup
        </label>
        <input
          accept=".json,application/json"
          className="sr-only"
          id="import-backup"
          onChange={(event) => {
            const file = event.target.files?.[0];

            event.target.value = '';

            if (file) {
              void chooseFile(file);
            }
          }}
          type="file"
        />
      </div>

      {message ? (
        <div
          className={[
            'mt-5 rounded-xl border px-4 py-3 text-xs leading-5',
            message.kind === 'error'
              ? 'border-danger/30 bg-danger/5 text-danger'
              : 'border-line/80 bg-accent-soft/40 text-ink-muted',
          ].join(' ')}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          <p>{message.text}</p>
          {message.kind === 'error' && message.issues.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {message.issues.map((issue) => (
                <li key={`${issue.row}-${issue.message}`}>
                  Row {issue.row}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {pending ? (
        <div className="mt-5 rounded-xl border border-line/80 bg-paper/60 px-4 py-4">
          <p className="text-sm font-medium">{pending.fileName}</p>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            {pending.fresh} new {pending.fresh === 1 ? 'run' : 'runs'}, {pending.duplicates}{' '}
            {pending.duplicates === 1 ? 'duplicate' : 'duplicates'}. Backup made by TypeLab{' '}
            {pending.backup.appVersion} on {formatTimestamp(pending.backup.exportedAt)}.
          </p>
          <label className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <input
              checked={replaceDefaults}
              className="size-4 accent-ink"
              onChange={(event) => {
                setReplaceDefaults(event.target.checked);
              }}
              type="checkbox"
            />
            Also replace my test defaults with the backup&apos;s settings
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                void applyImport();
              }}
              type="button"
            >
              {busy
                ? 'Importing…'
                : `Import ${pending.fresh} ${pending.fresh === 1 ? 'run' : 'runs'}`}
            </button>
            <button
              className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong"
              disabled={busy}
              onClick={() => {
                setPending(null);
                setMessage(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
