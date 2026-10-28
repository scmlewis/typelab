import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import type { Appearance, AppSettings, TestDefaults } from '@/features/settings/settings';
import { SettingsContext } from '@/features/settings/settingsContext';
import type { SettingsContextValue } from '@/features/settings/settingsContext';
import { LocalSettingsRepository } from '@/features/settings/settingsRepository';
import type { SettingsNotice } from '@/features/settings/settingsRepository';

export interface SettingsRepositoryLike {
  load(): Promise<{ settings: AppSettings; notice: SettingsNotice | null }>;
  save(settings: AppSettings): Promise<void>;
  reset(): Promise<void>;
}

interface SettingsState {
  status: 'loading' | 'ready';
  settings: AppSettings;
  notice: SettingsNotice | null;
  error: string | null;
}

interface SettingsProviderProps {
  children: ReactNode;
  repository?: SettingsRepositoryLike;
}

export function SettingsProvider({ children, repository }: SettingsProviderProps) {
  const activeRepository = useMemo(() => repository ?? new LocalSettingsRepository(), [repository]);
  const [state, setState] = useState<SettingsState>({
    status: 'loading',
    settings: DEFAULT_SETTINGS,
    notice: null,
    error: null,
  });
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    activeRepository
      .load()
      .then((loaded) => {
        if (cancelled) {
          return;
        }

        settingsRef.current = loaded.settings;
        setState({
          status: 'ready',
          settings: loaded.settings,
          notice: loaded.notice,
          error: null,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState({
          status: 'ready',
          settings: DEFAULT_SETTINGS,
          notice: null,
          error: 'Could not read settings from this browser. Defaults are in use.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository]);

  const enqueue = useCallback((operation: () => Promise<void>): Promise<void> => {
    const attempt = saveQueue.current.then(operation);
    saveQueue.current = attempt.catch(() => {});

    return attempt;
  }, []);

  const updateTestDefaults = useCallback(
    async (defaults: TestDefaults) => {
      const next: AppSettings = { ...settingsRef.current, testDefaults: defaults };
      settingsRef.current = next;
      setState((previous) => ({ ...previous, settings: next, error: null }));

      try {
        await enqueue(() => activeRepository.save(next));
      } catch {
        if (mounted.current) {
          setState((previous) => ({
            ...previous,
            error: 'Could not save settings. This choice applies for the current session.',
          }));
        }
      }
    },
    [activeRepository, enqueue],
  );

  const updateAppearance = useCallback(
    async (appearance: Partial<Appearance>) => {
      const next: AppSettings = {
        ...settingsRef.current,
        appearance: { ...settingsRef.current.appearance, ...appearance },
      };
      settingsRef.current = next;
      setState((previous) => ({ ...previous, settings: next, error: null }));

      try {
        await enqueue(() => activeRepository.save(next));
      } catch {
        if (mounted.current) {
          setState((previous) => ({
            ...previous,
            error: 'Could not save appearance settings. This choice applies for the current session.',
          }));
        }
      }
    },
    [activeRepository, enqueue],
  );

  const replaceSettings = useCallback(
    async (settings: AppSettings) => {
      settingsRef.current = settings;
      setState((previous) => ({ ...previous, settings, error: null }));

      try {
        await enqueue(() => activeRepository.save(settings));
      } catch {
        if (mounted.current) {
          setState((previous) => ({
            ...previous,
            error: 'Could not save imported settings. They apply for the current session.',
          }));
        }
      }
    },
    [activeRepository, enqueue],
  );

  const resetSettings = useCallback(async () => {
    settingsRef.current = DEFAULT_SETTINGS;
    setState((previous) => ({ ...previous, settings: DEFAULT_SETTINGS, error: null }));

    try {
      await enqueue(() => activeRepository.reset());
    } catch {
      if (mounted.current) {
        setState((previous) => ({
          ...previous,
          error: 'Could not reset saved settings. Defaults apply for this session.',
        }));
      }
    }
  }, [activeRepository, enqueue]);

  const dismissNotice = useCallback(() => {
    setState((previous) => ({ ...previous, notice: null }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      status: state.status,
      settings: state.settings,
      notice: state.notice,
      error: state.error,
      updateTestDefaults,
      updateAppearance,
      replaceSettings,
      resetSettings,
      dismissNotice,
    }),
    [state, updateTestDefaults, updateAppearance, replaceSettings, resetSettings, dismissNotice],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
