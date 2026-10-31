import { Link } from 'react-router';

import { TypingTest } from '@/features/typing/TypingTest';
import { useSettings } from '@/features/settings/settingsContext';

export function HomePage() {
  const { status } = useSettings();

  return (
    <section aria-labelledby="bench-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Instrument / 001
          </p>
          <h1
            className="mt-2 font-display text-4xl leading-none tracking-tight sm:mt-3 sm:text-5xl"
            id="bench-title"
          >
            The typing bench.
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted sm:hidden">
            A quiet test of speed and accuracy.
          </p>
        </div>
        <p className="hidden max-w-sm text-sm leading-6 text-ink-muted sm:block">
          A quiet test of speed and accuracy. No account, no cloud, no tracking — results stay in
          this browser.
        </p>
      </div>

      {status === 'loading' ? (
        <div
          aria-busy="true"
          className="mt-6 rounded-card border border-line bg-surface p-8 shadow-card sm:mt-8"
        >
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
            Preparing the bench…
          </p>
        </div>
      ) : (
        <TypingTest />
      )}

      <section aria-labelledby="why-title" className="mt-12 border-t border-line/80 pt-8 sm:mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Field notes / 01
            </p>
            <h2
              className="mt-2 font-display text-2xl leading-tight tracking-tight sm:text-3xl"
              id="why-title"
            >
              Built for practice, not accounts.
            </h2>
          </div>
          <Link
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
            to="/about"
          >
            Read the field notes →
          </Link>
        </div>

        <ul className="mt-6 grid gap-5 sm:grid-cols-3">
          <li>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink">Local-first</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Settings and runs stay in this browser; export is the backup.
            </p>
          </li>
          <li>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink">
              Measured properly
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Net and raw WPM, accuracy, consistency, and per-second charts.
            </p>
          </li>
          <li>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink">Yours to tune</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Themes, type, sounds, caret, and saved presets.
            </p>
          </li>
        </ul>
      </section>
    </section>
  );
}
