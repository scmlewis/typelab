import { TypingTest } from '@/features/typing/TypingTest';

export function HomePage() {
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

      <TypingTest />
    </section>
  );
}
