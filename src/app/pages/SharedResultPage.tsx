import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';

import {
  describeShareMode,
  decodeShareSnapshot,
  formatShareDate,
} from '@/features/share/shareData';
import { formatDuration, formatLanguage, formatPercent } from '@/features/typing/format';

export function SharedResultPage() {
  const [params] = useSearchParams();
  const snapshot = useMemo(() => decodeShareSnapshot(params.get('r') ?? ''), [params]);

  if (snapshot === null) {
    return (
      <section aria-labelledby="shared-title" className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Shared run</p>
        <h1
          className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
          id="shared-title"
        >
          This link is not readable.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink-muted">
          A TypeLab link carries a compact snapshot of one run. This one is incomplete, too long, or
          was edited. Nothing was changed in this browser.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
            to="/"
          >
            Open the bench
          </Link>
          <Link
            className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong"
            to="/history"
          >
            Local history
          </Link>
        </div>
      </section>
    );
  }

  const attribution =
    snapshot.quoteSource === null
      ? null
      : `${snapshot.quoteSource}${snapshot.quoteAuthor === null ? '' : ` · ${snapshot.quoteAuthor}`}`;

  return (
    <section aria-labelledby="shared-title" className="max-w-3xl" data-testid="shared-result">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Shared run</p>
      <h1
        className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
        id="shared-title"
      >
        A result from the bench.
      </h1>
      <p className="mt-4 text-sm leading-6 text-ink-muted">
        {describeShareMode(snapshot)} · {formatLanguage(snapshot.language)} ·{' '}
        {formatShareDate(snapshot.completedAt)}
      </p>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-y border-line/80 py-6">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
            Net WPM
          </p>
          <p
            className="font-mono text-6xl leading-none tabular-nums text-ink"
            data-testid="shared-net-wpm"
          >
            {snapshot.netWpm.toFixed(1)}
          </p>
        </div>
        <p className="max-w-sm text-sm leading-6 text-ink-muted">
          {snapshot.excluded
            ? snapshot.mode === 'custom'
              ? 'Custom runs are not compared, so this snapshot makes no personal-best claim.'
              : 'This run was unranked in its own browser, so it makes no personal-best claim.'
            : 'A local result, shared as a snapshot.'}
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Metric label="Raw WPM" value={snapshot.rawWpm.toFixed(1)} />
        <Metric label="Accuracy" value={formatPercent(snapshot.accuracy, 1)} />
        <Metric label="Consistency" value={formatPercent(snapshot.consistency, 1)} />
        <Metric label="Time" value={formatDuration(snapshot.durationMs)} />
      </dl>

      <div className="mt-8 grid gap-8 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Configuration</h2>
          <p className="mt-4 text-sm leading-6 text-ink-muted">{snapshot.configSummary}</p>
          {attribution !== null ? (
            <p className="mt-2 text-sm leading-6 text-ink-muted" data-testid="shared-quote-source">
              {attribution}
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-ink-muted">Scoring {snapshot.scoringVersion}</p>
        </div>

        <div>
          <h2 className="font-display text-2xl tracking-tight">What this is</h2>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            A read-only snapshot encoded in the link. It is not checked by a server, so treat it as
            a note rather than a verified score.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
          to="/"
        >
          Run your own test
        </Link>
        <Link
          className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong"
          to="/history"
        >
          Local history
        </Link>
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
