import { Link } from 'react-router';

import { Eyebrow } from '@/app/components/Eyebrow';

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="max-w-2xl py-8">
      <Eyebrow>404 / Missing page</Eyebrow>
      <h1
        className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
        id="not-found-title"
      >
        This page is not in the notebook.
      </h1>
      <p className="mt-4 text-base leading-7 text-ink-muted">
        The address may be wrong, or the page may not exist yet.
      </p>
      <Link
        className="mt-7 inline-flex items-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
        to="/"
      >
        Return to the test
      </Link>
    </section>
  );
}
