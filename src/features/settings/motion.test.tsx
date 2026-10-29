import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyMotion, resolveMotion, useMotion } from '@/features/settings/motion';

afterEach(() => {
  vi.unstubAllGlobals();
});

function Probe({ preference }: { preference: 'system' | 'reduce' | 'full' }) {
  useMotion(preference);
  return <p>ready</p>;
}

describe('motion preference', () => {
  it('resolves the system preference both ways', () => {
    expect(resolveMotion('system', true)).toBe('reduce');
    expect(resolveMotion('system', false)).toBe('full');
    expect(resolveMotion('reduce', false)).toBe('reduce');
    expect(resolveMotion('full', true)).toBe('full');
  });

  it('writes the resolved choice to the document', () => {
    const root = document.createElement('div');

    applyMotion('reduce', root);

    expect(root.dataset['motion']).toBe('reduce');
  });

  it('applies and follows a system preference change', () => {
    const listeners: (() => void)[] = [];
    const query = {
      matches: true,
      addEventListener: vi.fn((_event: string, listener: () => void) => {
        listeners.push(listener);
      }),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => query),
    );

    render(<Probe preference="system" />);

    expect(document.documentElement.dataset['motion']).toBe('reduce');

    query.matches = false;
    listeners.forEach((listener) => listener());

    expect(document.documentElement.dataset['motion']).toBe('full');
    expect(screen.getByText('ready')).toBeInTheDocument();
  });
});
