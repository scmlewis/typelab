import { Link } from 'react-router';

const SECTIONS = [
  {
    id: 'about-measures',
    label: '01 / Measurement',
    title: 'What it measures',
    body: (
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-muted">
        <li>
          <strong className="font-medium text-ink">Net WPM.</strong> Correct characters and
          separators, counted at five characters per word and divided by elapsed minutes.
        </li>
        <li>
          <strong className="font-medium text-ink">Raw WPM.</strong> The same calculation over every
          typed character, including mistakes.
        </li>
        <li>
          <strong className="font-medium text-ink">Accuracy.</strong> Correctly placed attempts as a
          share of all attempts. Spaces are attempts too, so they are not free.
        </li>
        <li>
          <strong className="font-medium text-ink">Consistency.</strong> How steady the per-second
          speeds are, expressed as a percentage.
        </li>
        <li>
          <strong className="font-medium text-ink">Character counts.</strong> Correct, incorrect,
          extra, and missed characters for the finished run.
        </li>
      </ul>
    ),
  },
  {
    id: 'about-scoring',
    label: '02 / Scoring',
    title: 'How a run is scored',
    body: (
      <>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Scoring version <span className="font-mono text-ink">1.0.0</span>. Net WPM is correct
          characters plus correct separators, divided by five and by elapsed minutes. Raw WPM uses
          every typed character instead. Accuracy is correct attempts divided by total attempts.
          Consistency is 100 minus the coefficient of variation of the per-second speeds.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Failed, empty, and sub-second runs are still saved to history, but they are excluded from
          personal bests and trend lines.
        </p>
      </>
    ),
  },
  {
    id: 'about-data',
    label: '03 / Storage',
    title: 'Where your data lives',
    body: (
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Settings live in <span className="font-mono text-ink">localStorage</span>. Completed runs
        live in IndexedDB through Dexie. A versioned JSON backup and CSV export are the durability
        path. Clearing this site&apos;s data in your browser deletes both, and there is no remote
        copy.
      </p>
    ),
  },
  {
    id: 'about-input',
    label: '04 / Input',
    title: 'Typing and corrections',
    body: (
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-muted">
        <li>
          <strong className="font-medium text-ink">Free.</strong> Keep typing after a mistake; the
          run continues.
        </li>
        <li>
          <strong className="font-medium text-ink">Strict.</strong> The run ends on the first
          incorrect character.
        </li>
        <li>
          <strong className="font-medium text-ink">No backspace.</strong> Corrections are disabled
          for the whole run.
        </li>
        <li>
          Under Free, backspace removes the last typed character, stepping back into the previous
          word at a word boundary. <kbd className="font-mono text-ink">Ctrl</kbd>/
          <kbd className="font-mono text-ink">Cmd</kbd> +{' '}
          <kbd className="font-mono text-ink">Enter</kbd> restarts the test.
        </li>
      </ul>
    ),
  },
  {
    id: 'about-boundaries',
    label: '05 / Boundaries',
    title: 'What it does not do',
    body: (
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        There are no accounts, no cloud sync, no public profiles, no leaderboards, no
        server-validated shares, and no tracking. A share link encodes a result snapshot in the URL
        itself; nothing is stored on a server.
      </p>
    ),
  },
] as const;

export function AboutPage() {
  return (
    <article aria-labelledby="about-title" className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        Field notes / About
      </p>
      <h1
        className="mt-3 font-display text-4xl leading-none tracking-tight sm:text-5xl"
        id="about-title"
      >
        About the lab.
      </h1>
      <p className="mt-4 text-sm leading-6 text-ink-muted">
        TypeLab is a local-first typing laboratory for measuring speed, accuracy, and consistency.
        It runs entirely in this browser, with no account and no server.
      </p>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section aria-labelledby={section.id} key={section.id}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-muted">
              {section.label}
            </p>
            <h2 className="mt-2 font-display text-2xl leading-tight tracking-tight" id={section.id}>
              {section.title}
            </h2>
            {section.body}
          </section>
        ))}
      </div>

      <Link
        className="mt-10 inline-flex items-center rounded-full border border-line px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-ink"
        to="/"
      >
        Back to the test
      </Link>
    </article>
  );
}
