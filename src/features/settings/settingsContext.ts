import { createContext, useContext } from 'react';

import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import type { AppSettings, TestDefaults } from '@/features/settings/settings';
import type { SettingsNotice } from '@/features/settings/settingsRepository';

export interface SettingsContextValue {
  status: 'loading' | 'ready';
  settings: AppSettings;
  notice: SettingsNotice | null;
  error: string | null;
  updateTestDefaults: (defaults: TestDefaults) => Promise<void>;
  resetSettings: () => Promise<void>;
  dismissNotice: () => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  status: 'ready',
  settings: DEFAULT_SETTINGS,
  notice: null,
  error: null,
  updateTestDefaults: async () => {},
  resetSettings: async () => {},
  dismissNotice: () => {},
});

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
