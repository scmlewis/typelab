import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from '@/components/ui/Card';
import { ChoiceButton } from '@/components/ui/Choice';
import { Input, Select, Textarea } from '@/components/ui/controls';
import { HeroStat, Metric } from '@/components/ui/Metric';
import { Overline } from '@/components/ui/Overline';
import { StatusMessage } from '@/components/ui/StatusMessage';

describe('Overline', () => {
  it('renders a muted mono span by default', () => {
    render(<Overline>Net WPM</Overline>);
    const label = screen.getByText('Net WPM');
    expect(label.tagName).toBe('SPAN');
    expect(label).toHaveClass('font-mono', 'uppercase', 'text-ink-muted');
  });

  it('uses accent when asked', () => {
    render(<Overline tone="accent">Share</Overline>);
    expect(screen.getByText('Share')).toHaveClass('text-accent');
  });
});

describe('StatusMessage', () => {
  it('announces errors as alerts and lists details', () => {
    render(
      <StatusMessage details={['Row 2: bad id', 'Row 5: missing score']} tone="error">
        Import failed.
      </StatusMessage>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Import failed.');
    expect(screen.getByText('Row 2: bad id')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('text-danger');
  });

  it('announces info as status without a box when plain', () => {
    render(
      <StatusMessage tone="info" variant="plain">
        Deleted 1 run.
      </StatusMessage>,
    );
    const message = screen.getByRole('status');
    expect(message).toHaveTextContent('Deleted 1 run.');
    expect(message).not.toHaveClass('border');
  });
});

describe('Metric', () => {
  it('renders Metric as dt and dd inside a dl', () => {
    render(
      <dl>
        <Metric label="Raw WPM" value="81.2" />
      </dl>,
    );
    expect(screen.getByText('Raw WPM').tagName).toBe('DT');
    expect(screen.getByText('81.2').tagName).toBe('DD');
  });

  it('renders the small Metric size', () => {
    render(
      <dl>
        <Metric label="Correct" size="sm" value={420} />
      </dl>,
    );
    expect(screen.getByText('Correct')).toHaveClass('text-xs');
    expect(screen.getByText('420')).toHaveClass('text-sm');
  });

  it('renders HeroStat with a test id', () => {
    render(
      <dl>
        <HeroStat label="Net WPM" value="72" valueTestId="hero-value" />
      </dl>,
    );
    expect(screen.getByTestId('hero-value')).toHaveTextContent('72');
    expect(screen.getByText('Net WPM').closest('dt')).not.toBeNull();
  });
});

it('renders Card as a section with roomy padding', () => {
  render(<Card as="section" aria-label="Storage" padding="roomy" />);
  const card = screen.getByLabelText('Storage');
  expect(card.tagName).toBe('SECTION');
  expect(card).toHaveClass('p-8');
});

it('expresses soft choice tone and size', () => {
  render(
    <ChoiceButton active size="xs" tone="soft">
      15
    </ChoiceButton>,
  );
  const button = screen.getByRole('button', { name: '15' });
  expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(button).toHaveClass('bg-accent-soft');
});

it('forwards native control props and the control radius', () => {
  render(
    <>
      <Input aria-label="Link" density="sm" readOnly value="https://example.com" />
      <Select aria-label="Vocabulary" defaultValue="english-200" density="sm">
        <option value="english-200">Top 200</option>
      </Select>
      <Textarea aria-label="Text" rows={3} />
    </>,
  );
  expect(screen.getByLabelText('Link')).toHaveClass('rounded-control');
  expect(screen.getByLabelText('Vocabulary')).toHaveValue('english-200');
  expect(screen.getByLabelText('Text').tagName).toBe('TEXTAREA');
});
