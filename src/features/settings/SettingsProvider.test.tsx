import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import type { SettingsRepositoryLike } from '@/features/settings/SettingsProvider';
import { useSettings } from '@/features/settings/settingsContext';

function createRepository(
  options: {
    settings?: typeof DEFAULT_SETTINGS;
    notice?: 'corrupt' | 'newer' | 'unavailable' | null;
    loadError?: Error;
    saveError?: Error;
  } = {},
) {
  const save = vi.fn(() =>
    options.saveError ? Promise.reject(options.saveError) : Promise.resolve(),
  );
  const reset = vi.fn(() => Promise.resolve());
  const repository: SettingsRepositoryLike = {
    load: vi.fn(() =>
      options.loadError
        ? Promise.reject(options.loadError)
        : Promise.resolve({
            settings: options.settings ?? DEFAULT_SETTINGS,
            notice: options.notice ?? null,
          }),
    ),
    save,
    reset,
  };

  return { repository, save, reset };
}

function Harness() {
  const {
    status,
    settings,
    notice,
    error,
    updateTestDefaults,
    updateAppearance,
    replaceSettings,
    resetSettings,
    dismissNotice,
  } = useSettings();

  return (
    <div>
      <p>{status}</p>
      <p data-testid="mode">{settings.testDefaults.mode}</p>
      <p data-testid="count">{settings.testDefaults.wordCount}</p>
      <p data-testid="theme">{settings.appearance.theme}</p>
      <p data-testid="font">{settings.appearance.fontFamily}</p>
      <p data-testid="sounds">{settings.appearance.sounds.enabled ? 'on' : 'off'}</p>
      <p data-testid="notice">{notice ?? 'none'}</p>
      <p data-testid="error">{error ?? 'none'}</p>
      <button
        onClick={() => {
          void updateTestDefaults({ ...settings.testDefaults, mode: 'words', wordCount: 100 });
        }}
        type="button"
      >
        Update
      </button>
      <button
        onClick={() => {
          void updateAppearance({ theme: 'dark' });
        }}
        type="button"
      >
        Dark theme
      </button>
      <button
        onClick={() => {
          void resetSettings();
        }}
        type="button"
      >
        Reset
      </button>
      <button
        onClick={() => {
          void replaceSettings({
            ...DEFAULT_SETTINGS,
            testDefaults: { ...DEFAULT_SETTINGS.testDefaults, mode: 'words', wordCount: 50 },
          });
        }}
        type="button"
      >
        Replace
      </button>
      <button onClick={dismissNotice} type="button">
        Dismiss
      </button>
    </div>
  );
}

function renderProvider(repository: SettingsRepositoryLike) {
  return render(
    <SettingsProvider repository={repository}>
      <Harness />
    </SettingsProvider>,
  );
}

describe('settings provider', () => {
  it('loads stored settings', async () => {
    const { repository } = createRepository({
      settings: {
        ...DEFAULT_SETTINGS,
        testDefaults: { ...DEFAULT_SETTINGS.testDefaults, mode: 'words', wordCount: 50 },
      },
    });

    renderProvider(repository);

    await waitFor(() => {
      expect(screen.getByText('ready')).toBeInTheDocument();
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('words');
    expect(screen.getByTestId('count')).toHaveTextContent('50');
  });

  it('saves updated test defaults', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderProvider(repository);
    await waitFor(() => {
      expect(screen.getByText('ready')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(screen.getByTestId('mode')).toHaveTextContent('words');
    expect(screen.getByTestId('count')).toHaveTextContent('100');
    expect(save).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      testDefaults: { ...DEFAULT_SETTINGS.testDefaults, mode: 'words', wordCount: 100 },
    });
  });

  it('resets to defaults', async () => {
    const user = userEvent.setup();
    const { repository, reset } = createRepository({
      settings: {
        ...DEFAULT_SETTINGS,
        testDefaults: { ...DEFAULT_SETTINGS.testDefaults, wordCount: 50 },
      },
    });

    renderProvider(repository);
    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('50');
    });

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByTestId('count')).toHaveTextContent('25');
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('surfaces a load failure with usable defaults', async () => {
    const { repository } = createRepository({ loadError: new Error('blocked') });

    renderProvider(repository);

    await waitFor(() => {
      expect(screen.getByText('ready')).toBeInTheDocument();
    });
    expect(screen.getByTestId('error')).toHaveTextContent(/could not read settings/i);
    expect(screen.getByTestId('mode')).toHaveTextContent('timed');
  });

  it('surfaces a save failure without losing the choice', async () => {
    const user = userEvent.setup();
    const { repository } = createRepository({ saveError: new Error('quota') });

    renderProvider(repository);
    await waitFor(() => {
      expect(screen.getByText('ready')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(/could not save settings/i);
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('words');
  });

  it('exposes and dismisses a corruption notice', async () => {
    const user = userEvent.setup();
    const { repository } = createRepository({ notice: 'corrupt' });

    renderProvider(repository);
    await waitFor(() => {
      expect(screen.getByTestId('notice')).toHaveTextContent('corrupt');
    });

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.getByTestId('notice')).toHaveTextContent('none');
  });

  it('updates and saves the appearance preference', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderProvider(repository);
    await waitFor(() => {
      expect(screen.getByText('ready')).toBeInTheDocument();
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('system');

    await user.click(screen.getByRole('button', { name: 'Dark theme' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(save).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: { ...DEFAULT_SETTINGS.appearance, theme: 'dark' },
    });
  });

  it('merges a theme update without dropping typography or sound choices', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository({
      settings: {
        ...DEFAULT_SETTINGS,
        appearance: {
          ...DEFAULT_SETTINGS.appearance,
          fontFamily: 'serif',
          sounds: { enabled: true, volume: 0.8 },
        },
      },
    });

    renderProvider(repository);
    await waitFor(() => {
      expect(screen.getByTestId('font')).toHaveTextContent('serif');
    });

    await user.click(screen.getByRole('button', { name: 'Dark theme' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('font')).toHaveTextContent('serif');
    expect(screen.getByTestId('sounds')).toHaveTextContent('on');
    expect(save).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        fontFamily: 'serif',
        sounds: { enabled: true, volume: 0.8 },
        theme: 'dark',
      },
    });
  });

  it('replaces the full settings document', async () => {
    const user = userEvent.setup();
    const { repository, save } = createRepository();

    renderProvider(repository);
    await waitFor(() => {
      expect(screen.getByText('ready')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByTestId('mode')).toHaveTextContent('words');
    expect(screen.getByTestId('count')).toHaveTextContent('50');
    expect(save).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      testDefaults: { ...DEFAULT_SETTINGS.testDefaults, mode: 'words', wordCount: 50 },
    });
  });
});
