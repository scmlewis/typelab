import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AboutPage } from '@/app/pages/AboutPage';

describe('about page', () => {
  it('explains scoring, local data, and the product boundaries', () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'About the lab.' })).toBeInTheDocument();

    for (const name of [
      'What it measures',
      'How a run is scored',
      'Where your data lives',
      'Typing and corrections',
      'What it does not do',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }

    expect(screen.getByRole('link', { name: /back to the test/i })).toHaveAttribute('href', '/');

    expect(screen.getByText(/no accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/cloud sync/i)).toBeInTheDocument();
    expect(screen.getByText(/leaderboards/i)).toBeInTheDocument();
    expect(screen.getByText(/tracking/i)).toBeInTheDocument();
  });
});
