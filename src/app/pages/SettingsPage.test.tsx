import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('saves a theme choice immediately', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderPage(repository);
    await waitFor(() => {
      expect(
        within(screen.getByRole('group', { name: 'Theme' })).getByRole('button', {
          name: 'System',
        }),
      ).toHaveAttribute('aria-pressed', 'true');
    });

    await user.click(screen.getByRole('button', { name: 'Dark' }));

    expect(save).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: { ...DEFAULT_SETTINGS.appearance, theme: 'dark' },
    });
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves a reduced-motion choice immediately', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderPage(repository);

    await user.click(
      within(screen.getByRole('group', { name: 'Motion' })).getByRole('button', {
        name: 'Reduced',
      }),
    );

    expect(save).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: { ...DEFAULT_SETTINGS.appearance, motion: 'reduce' },
    });
  });

  it('shows saved typography, caret, and sound preferences', async () => {
    const repository: SettingsRepositoryLike = {
      load: vi.fn(() =>
        Promise.resolve({
          settings: {
            ...DEFAULT_SETTINGS,
            appearance: {
              ...DEFAULT_SETTINGS.appearance,
              fontFamily: 'serif' as const,
              fontSize: 'large' as const,
              textWidth: 'wide' as const,
              caret: { style: 'block' as const, blink: false },
              sounds: { enabled: true, volume: 0.7 },
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
      expect(screen.getByRole('button', { name: 'Serif' })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByRole('button', { name: 'Large' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Wide' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Block' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Blink caret')).not.toBeChecked();
    expect(screen.getByLabelText('Key sounds')).toBeChecked();
    expect(screen.getByLabelText('Key sound volume')).toHaveValue('70');
  });

  it('saves typography and caret choices without touching theme', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderPage(repository);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mono' })).toHaveAttribute('aria-pressed', 'true');
    });

    await user.click(screen.getByRole('button', { name: 'Sans' }));
    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: { ...DEFAULT_SETTINGS.appearance, fontFamily: 'sans' },
    });

    await user.click(screen.getByRole('button', { name: 'Large' }));
    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: { ...DEFAULT_SETTINGS.appearance, fontFamily: 'sans', fontSize: 'large' },
    });

    await user.click(screen.getByRole('button', { name: 'Wide' }));
    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        fontFamily: 'sans',
        fontSize: 'large',
        textWidth: 'wide',
      },
    });

    await user.click(screen.getByRole('button', { name: 'Underline' }));
    await user.click(screen.getByLabelText('Blink caret'));

    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        fontFamily: 'sans',
        fontSize: 'large',
        textWidth: 'wide',
        caret: { style: 'underline', blink: false },
      },
    });
  });

  it('saves opt-in key sounds and their volume', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderPage(repository);
    await waitFor(() => {
      expect(screen.getByLabelText('Key sounds')).not.toBeChecked();
    });

    await user.click(screen.getByLabelText('Key sounds'));

    expect(screen.getByLabelText('Key sound volume')).not.toBeDisabled();

    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        sounds: { enabled: true, volume: 0.5 },
      },
    });

    fireEvent.input(screen.getByLabelText('Key sound volume'), {
      target: { value: '35' },
    });

    await waitFor(() => {
      expect(save).toHaveBeenLastCalledWith({
        ...DEFAULT_SETTINGS,
        appearance: {
          ...DEFAULT_SETTINGS.appearance,
          sounds: { enabled: true, volume: 0.35 },
        },
      });
    });
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

  it('saves the current setup as a named preset', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderPage(repository);
    await waitFor(() => {
      expect(screen.getByLabelText('Preset name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Preset name'), 'Warm-up');
    await user.click(screen.getByRole('button', { name: 'Save current setup' }));

    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      presets: [expect.objectContaining({ name: 'Warm-up' })],
    });
    expect(screen.getByText(/saved “warm-up”/i)).toBeInTheDocument();
    expect(screen.getByText('30 seconds · English 200')).toBeInTheDocument();
    expect(screen.getByLabelText('Preset name')).toHaveValue('');
  });

  it('applies a preset to the bench defaults and deletes it', async () => {
    const user = userEvent.setup();
    const preset = {
      id: 'preset-1',
      name: 'Sprint',
      defaults: { ...DEFAULT_SETTINGS.testDefaults, durationSeconds: 15 as const },
    };
    const { repository, save } = createRepository();

    repository.load = vi.fn(() =>
      Promise.resolve({ settings: { ...DEFAULT_SETTINGS, presets: [preset] }, notice: null }),
    );

    renderPage(repository);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Use' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Use' }));

    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      testDefaults: preset.defaults,
      presets: [preset],
    });

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      testDefaults: preset.defaults,
      presets: [],
    });
    expect(screen.queryByRole('button', { name: 'Use' })).not.toBeInTheDocument();
  });

  it('updates a preset when the name already exists', async () => {
    const user = userEvent.setup();
    const preset = {
      id: 'preset-1',
      name: 'Sprint',
      defaults: { ...DEFAULT_SETTINGS.testDefaults, durationSeconds: 15 as const },
    };
    const { repository, save } = createRepository();

    repository.load = vi.fn(() =>
      Promise.resolve({ settings: { ...DEFAULT_SETTINGS, presets: [preset] }, notice: null }),
    );

    renderPage(repository);
    await waitFor(() => {
      expect(screen.getByLabelText('Preset name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Preset name'), 'sprint');
    await user.click(screen.getByRole('button', { name: 'Save current setup' }));

    expect(save).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      presets: [{ ...preset, name: 'sprint' }],
    });
    expect(screen.getByText(/updated “sprint”/i)).toBeInTheDocument();
  });
});
