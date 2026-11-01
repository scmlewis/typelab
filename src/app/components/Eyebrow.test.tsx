import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Eyebrow } from '@/app/components/Eyebrow';

describe('eyebrow', () => {
  it('renders a mono uppercase accent label', () => {
    render(<Eyebrow>Field notes / 01</Eyebrow>);

    const label = screen.getByText('Field notes / 01');

    expect(label.tagName).toBe('P');
    expect(label).toHaveClass('font-mono', 'uppercase', 'text-accent');
  });
});
