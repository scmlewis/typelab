import { createContext, useContext } from 'react';

import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import type { Appearance, AppSettings, Preset, TestDefaults } from '@/features/settings/settings';
import type { SettingsNotice } from '@/features/settings/settingsRepository';

export interface SettingsContextValue {
  status: 'loading' | 'ready';
  settings: AppSettings;
  notice: SettingsNotice | null;
  error: string | null;
  updateTestDefaults: (defaults: TestDefaults) => Promise<void>;
  updateAppearance: (appearance: Partial<Appearance>) => Promise<void>;
  updatePresets: (presets: Preset[]) => Promise<void>;
  replaceSettings: (settings: AppSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
  dismissNotice: () => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  status: 'ready',
  settings: DEFAULT_SETTINGS,
  notice: null,
  error: null,
  updateTestDefaults: async () => {},
  updateAppearance: async () => {},
  updatePresets: async () => {},
  replaceSettings: async () => {},
  resetSettings: async () => {},
  dismissNotice: () => {},
});

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
