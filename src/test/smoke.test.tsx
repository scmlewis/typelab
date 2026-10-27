import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '@/app/AppRoutes';

describe('app shell', () => {
  it('renders the local-first home page', () => {
    render(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /type with intent/i })).toBeInTheDocument();
    expect(screen.getByText(/engine build in progress/i)).toBeInTheDocument();
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
