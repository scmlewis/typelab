import { useEffect } from 'react';

import type { ThemePreference } from '@/features/settings/settings';

export type ResolvedTheme = 'light' | 'dark';

const BROWSER_CHROME: Record<ResolvedTheme, string> = {
  light: '#f4efe4',
  dark: '#141816',
};

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }

  return preference;
}

export function applyTheme(
  theme: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset['theme'] = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', BROWSER_CHROME[theme]);
}

/**
 * Keep the document theme in sync with the saved preference. `system` also
 * follows changes to the operating-system scheme while the app is open.
 */
export function useTheme(preference: ThemePreference): void {
  useEffect(() => {
    const query =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    const apply = () => {
      applyTheme(resolveTheme(preference, query?.matches ?? false));
    };

    apply();

    if (preference !== 'system' || query === null) {
      return undefined;
    }

    query.addEventListener('change', apply);

    return () => {
      query.removeEventListener('change', apply);
    };
  }, [preference]);
}
