import { useEffect } from 'react';

import type { MotionPreference } from '@/features/settings/settings';

export type ResolvedMotion = 'reduce' | 'full';

export function resolveMotion(
  preference: MotionPreference,
  systemPrefersReduced: boolean,
): ResolvedMotion {
  if (preference === 'system') {
    return systemPrefersReduced ? 'reduce' : 'full';
  }

  return preference;
}

export function applyMotion(
  motion: ResolvedMotion,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset['motion'] = motion;
}

/**
 * Keep the document motion preference in sync with the saved choice. `system`
 * follows operating-system changes while the app is open.
 */
export function useMotion(preference: MotionPreference): void {
  useEffect(() => {
    const query =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const apply = () => {
      applyMotion(resolveMotion(preference, query?.matches ?? false));
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
