import { Link } from 'react-router';

const capabilities = [
  {
    label: 'Timed',
    detail: '15, 30, 60, and 120 seconds. A clean boundary and a monotonic clock.',
  },
  {
    label: 'Words',
    detail: '10, 25, 50, and 100 words. The test ends on the final character.',
  },
  {
    label: 'Local',
    detail: 'Settings and history stay in this browser. Export is the backup.',
  },
] as const;

const previewStats = [
  { label: 'WPM', value: '--' },
  { label: 'ACC', value: '--' },
  { label: 'TIME', value: '00:00' },
] as const;

export function HomePage() {
  return (
    <div>
      <section
        aria-labelledby="hero-title"
        className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-center"
      >
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Local-first typing laboratory
          </p>
          <h1
            className="mt-5 max-w-3xl font-display text-5xl leading-[0.98] tracking-tight sm:text-7xl"
            id="hero-title"
          >
            Type with intent.
            <span className="block text-ink-muted">Measure what matters.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">
            A quiet, keyboard-first typing test for deliberate practice. Speed, accuracy, and
            consistency are calculated locally and stay on this device.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              className="inline-flex items-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
              to="/settings"
            >
              Open settings
            </Link>
            <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
              Engine build in progress
            </span>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[2rem] border border-line/70"
          />
          <div className="relative rounded-card border border-line bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between gap-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
              <span>Instrument / 001</span>
              <span>Idle</span>
            </div>

            <p className="mt-6 font-mono text-lg leading-8 text-ink sm:text-xl">
              The quick brown fox jumps over the lazy dog.
            </p>

            <dl className="mt-7 grid grid-cols-3 gap-3 border-t border-line pt-5">
              {previewStats.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-mono text-2xl text-ink">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 text-xs leading-5 text-ink-muted">
              Preview only. The typing engine, input adapter, and scoring module land in the next
              slice.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Planned capabilities" className="mt-16 grid gap-4 sm:grid-cols-3">
        {capabilities.map((capability) => (
          <article
            className="rounded-card border border-line bg-surface/70 p-5 transition-colors hover:bg-surface"
            key={capability.label}
          >
            <h2 className="font-display text-xl tracking-tight">{capability.label}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{capability.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
