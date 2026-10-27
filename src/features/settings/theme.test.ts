import { describe, expect, it } from 'vitest';

import { applyTheme, resolveTheme } from '@/features/settings/theme';

describe('theme preference', () => {
  it('honours an explicit preference over the system', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system preference when asked', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('writes the theme and browser chrome colour to the document', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);

    applyTheme('dark');

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(meta.getAttribute('content')).toBe('#141816');

    applyTheme('light');

    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(meta.getAttribute('content')).toBe('#f4efe4');

    meta.remove();
  });
});
