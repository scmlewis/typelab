import { useMemo, useRef, useState } from 'react';
import { Copy, Download, Link2 } from 'lucide-react';

import type { TestResult } from '@/engine/types';
import { downloadBlob } from '@/features/history/download';
import { copyText } from '@/features/share/clipboard';
import { shareCardBlob, shareCardFileName } from '@/features/share/shareCard';
import { buildShareSummary, buildShareUrl, createShareSnapshot } from '@/features/share/shareData';

interface SharePanelProps {
  result: TestResult;
  /** Override for tests; the app uses the current origin. */
  origin?: string;
  /** Keep the heading order correct: 2 on a page, 3 inside another result section. */
  headingLevel?: 2 | 3;
}

type ShareStatus =
  | { kind: 'idle' }
  | { kind: 'summary' }
  | { kind: 'link' }
  | { kind: 'image' }
  | { kind: 'error'; message: string };

export function SharePanel({ result, origin, headingLevel = 3 }: SharePanelProps) {
  const [status, setStatus] = useState<ShareStatus>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const summaryDetails = useRef<HTMLDetailsElement>(null);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const snapshot = useMemo(() => createShareSnapshot(result), [result]);
  const shareOrigin = origin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  const link = useMemo(() => buildShareUrl(snapshot, shareOrigin), [snapshot, shareOrigin]);
  const summary = useMemo(() => buildShareSummary(snapshot, link), [snapshot, link]);

  async function copySummary() {
    const copied = await copyText(summary);

    if (!copied && summaryDetails.current !== null) {
      summaryDetails.current.setAttribute('open', '');
    }

    setStatus(
      copied
        ? { kind: 'summary' }
        : {
            kind: 'error',
            message: 'Could not copy. The summary is open below to select manually.',
          },
    );
  }

  async function copyLink() {
    const copied = link !== null && (await copyText(link));

    setStatus(
      copied
        ? { kind: 'link' }
        : { kind: 'error', message: 'Could not copy the link. Select it and copy it manually.' },
    );
  }

  async function downloadCard() {
    setBusy(true);

    try {
      const blob = await shareCardBlob(snapshot);

      downloadBlob(shareCardFileName(snapshot.completedAt), blob);
      setStatus({ kind: 'image' });
    } catch {
      setStatus({
        kind: 'error',
        message: 'This browser could not draw the share card. The summary still works.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="share-title"
      className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
      data-testid="share-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-accent">
            Share / snapshot
          </p>
          <Heading className="mt-1 font-display text-2xl tracking-tight" id="share-title">
            Take this run with you.
          </Heading>
        </div>
        {snapshot.excluded ? (
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-muted">
            Unranked run
          </p>
        ) : null}
      </div>

      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
        A summary, a PNG card, and an optional link. Everything is generated in this browser; the
        link is a snapshot, not a verified score.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong"
          onClick={() => void copySummary()}
          type="button"
        >
          <Copy aria-hidden="true" size={15} />
          Copy summary
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong disabled:cursor-wait disabled:opacity-60"
          disabled={busy}
          onClick={() => void downloadCard()}
          type="button"
        >
          <Download aria-hidden="true" size={15} />
          {busy ? 'Drawing card…' : 'Download image card'}
        </button>
      </div>

      <div className="mt-5">
        <label
          className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted"
          htmlFor="share-link"
        >
          Share link
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            aria-describedby={link === null ? 'share-link-note' : undefined}
            className="min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-2 font-mono text-xs text-ink-muted focus:text-ink"
            id="share-link"
            readOnly
            value={link ?? ''}
            placeholder={link === null ? 'Link unavailable for this run' : undefined}
          />
          <button
            aria-describedby={link === null ? 'share-link-note' : undefined}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={link === null}
            onClick={() => void copyLink()}
            type="button"
          >
            <Link2 aria-hidden="true" size={15} />
            Copy link
          </button>
        </div>
        {link === null ? (
          <p className="mt-2 text-xs leading-5 text-ink-muted" id="share-link-note">
            This run is too detailed to fit in a stable link. The summary and image card still work.
          </p>
        ) : null}
      </div>

      <details className="mt-4" ref={summaryDetails}>
        <summary className="cursor-pointer text-xs font-medium text-ink-muted">
          Preview the text summary
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-paper px-4 py-3 font-mono text-xs leading-5 text-ink-muted">
          {summary}
        </pre>
      </details>

      <p className="mt-3 min-h-5 text-xs leading-5 text-ink-muted" role="status">
        {statusMessage(status)}
      </p>
    </section>
  );
}

function statusMessage(status: ShareStatus): string {
  switch (status.kind) {
    case 'idle':
      return '';
    case 'summary':
      return 'Summary copied to the clipboard.';
    case 'link':
      return 'Share link copied to the clipboard.';
    case 'image':
      return 'Image card downloaded.';
    case 'error':
      return status.message;
  }
}
