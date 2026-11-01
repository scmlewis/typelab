import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '@/app/AppRoutes';

const ROUTES: readonly [string, RegExp][] = [
  ['/', /the typing bench/i],
  ['/about', /about the lab/i],
  ['/history', /local history/i],
  ['/settings', /make the lab yours/i],
  ['/shared', /this link is not readable/i],
  ['/results/missing', /run not found/i],
  ['/missing', /not in the notebook/i],
];

describe('route table', () => {
  it.each(ROUTES)('renders %s', async (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 5_000 }),
    ).toBeInTheDocument();
  });
});
