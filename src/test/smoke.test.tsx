import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '@/app/AppRoutes';

describe('app shell', () => {
  it('renders the typing bench and input receptor', () => {
    render(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /the typing bench/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /typing input/i })).toBeInTheDocument();
    expect(screen.getByText(/local-only by design/i)).toBeInTheDocument();
  });

  it('renders the settings route', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /make the lab yours/i })).toBeInTheDocument();
  });

  it('renders the not-found route', () => {
    render(
      <MemoryRouter initialEntries={['/missing']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /not in the notebook/i })).toBeInTheDocument();
  });
});
