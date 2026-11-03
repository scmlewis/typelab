import { useMemo, useRef, useState } from 'react';
import { Copy, Download, Link2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/controls';
import { Overline } from '@/components/ui/Overline';
import { StatusMessage } from '@/components/ui/StatusMessage';
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
    <Card as="section" aria-labelledby="share-title" className="mt-8" data-testid="share-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Overline tone="accent">Share / snapshot</Overline>
          <Heading className="mt-1 font-display text-2xl tracking-tight" id="share-title">
            Take this run with you.
          </Heading>
        </div>
        {snapshot.excluded ? <Overline>Unranked run</Overline> : null}
      </div>

      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
        A summary, a PNG card, and an optional link. Everything is generated in this browser; the
        link is a snapshot, not a verified score.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => void copySummary()}>
          <Copy aria-hidden="true" size={15} />
          Copy summary
        </Button>
        <Button disabled={busy} onClick={() => void downloadCard()}>
          <Download aria-hidden="true" size={15} />
          {busy ? 'Drawing card…' : 'Download image card'}
        </Button>
      </div>

      <div className="mt-5">
        <label className="block" htmlFor="share-link">
          <Overline>Share link</Overline>
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            aria-describedby={link === null ? 'share-link-note' : undefined}
            className="min-w-0 flex-1"
            density="sm"
            id="share-link"
            placeholder={link === null ? 'Link unavailable for this run' : undefined}
            readOnly
            value={link ?? ''}
          />
          <Button
            aria-describedby={link === null ? 'share-link-note' : undefined}
            disabled={link === null}
            onClick={() => void copyLink()}
          >
            <Link2 aria-hidden="true" size={15} />
            Copy link
          </Button>
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
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-control bg-paper px-4 py-3 font-mono text-xs leading-5 text-ink-muted">
          {summary}
        </pre>
      </details>

      <StatusMessage
        className="mt-3 min-h-5"
        tone={status.kind === 'error' ? 'error' : 'info'}
        variant="plain"
      >
        {statusMessage(status)}
      </StatusMessage>
    </Card>
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
