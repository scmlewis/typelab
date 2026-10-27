import { Link } from 'react-router';

export function SettingsPage() {
  return (
    <section aria-labelledby="settings-title" className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Settings</p>
      <h1
        className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
        id="settings-title"
      >
        Make the lab yours.
      </h1>
      <p className="mt-4 text-base leading-7 text-ink-muted">
        Theme, typography, test defaults, and local history controls will live here. The settings
        schema and storage repository arrive with the first persistence slice.
      </p>

      <div className="mt-8 rounded-card border border-line bg-surface p-6">
        <h2 className="font-display text-2xl tracking-tight">Local-only by design</h2>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          TypeLab has no account system, cloud database, or third-party analytics. Your results stay
          in this browser until you export them. Clearing browser data deletes them, so export is
          the durable backup.
        </p>
        <Link
          className="mt-5 inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong"
          to="/"
        >
          Back to the test
        </Link>
      </div>
    </section>
  );
}
