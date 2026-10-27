import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { SettingsPage } from '@/app/pages/SettingsPage';
import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import type { SettingsRepositoryLike } from '@/features/settings/SettingsProvider';

function createRepository() {
  const save = vi.fn(() => Promise.resolve());
  const reset = vi.fn(() => Promise.resolve());
  const repository: SettingsRepositoryLike = {
    load: vi.fn(() => Promise.resolve({ settings: DEFAULT_SETTINGS, notice: null })),
    save,
    reset,
  };

  return { repository, save, reset };
}

function renderPage(repository: SettingsRepositoryLike) {
  return render(
    <MemoryRouter>
      <SettingsProvider repository={repository}>
        <SettingsPage />
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('settings page', () => {
  it('shows saved defaults', async () => {
    const repository: SettingsRepositoryLike = {
      load: vi.fn(() =>
        Promise.resolve({
          settings: {
            ...DEFAULT_SETTINGS,
            testDefaults: {
              ...DEFAULT_SETTINGS.testDefaults,
              mode: 'words' as const,
              wordCount: 50 as const,
            },
          },
          notice: null,
        }),
      ),
      save: vi.fn(() => Promise.resolve()),
      reset: vi.fn(() => Promise.resolve()),
    };

    renderPage(repository);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Words' })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByRole('button', { name: '50' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves a change immediately', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderPage(repository);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Time' })).toHaveAttribute('aria-pressed', 'true');
    });

    await user.click(screen.getByRole('button', { name: 'Words' }));

    expect(save).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      testDefaults: { ...DEFAULT_SETTINGS.testDefaults, mode: 'words' },
    });
  });

  it('requires confirmation before resetting to defaults', async () => {
    const user = userEvent.setup();
    const { repository, reset } = createRepository();

    renderPage(repository);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Time' })).toHaveAttribute('aria-pressed', 'true');
    });

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirm reset' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm reset' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending reset', async () => {
    const user = userEvent.setup();
    const { repository, reset } = createRepository();

    renderPage(repository);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset to defaults' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reset to defaults' })).toBeInTheDocument();
  });
});
