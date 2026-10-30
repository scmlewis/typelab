import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { getQuoteById, pickQuote } from '@/engine/content/quotes';
import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import type { QuoteTestConfig } from '@/engine/types';
import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import { TestToolbar } from '@/features/typing/TestToolbar';

function quoteConfig(): QuoteTestConfig {
  return {
    ...DEFAULT_TIMED_CONFIG,
    mode: 'quote',
    durationSeconds: null,
    wordCount: null,
    quoteId: pickQuote(3).id,
    customText: null,
  };
}

describe('test toolbar presets', () => {
  const preset = {
    id: 'preset-1',
    name: 'Warm-up',
    defaults: { ...DEFAULT_SETTINGS.testDefaults, durationSeconds: 15 as const },
  };

  it('offers saved presets and reports the chosen one', async () => {
    const user = userEvent.setup();
    const onApplyPreset = vi.fn();

    render(
      <TestToolbar
        config={DEFAULT_TIMED_CONFIG}
        disabled={false}
        onChange={() => {}}
        onCustomText={() => {}}
        onRestart={() => {}}
        onApplyPreset={onApplyPreset}
        presets={[preset]}
      />,
    );

    expect(screen.getByRole('group', { name: 'Saved presets' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Warm-up' }));

    expect(onApplyPreset).toHaveBeenCalledWith(preset);
  });

  it('hides the preset row when there are none', () => {
    render(
      <TestToolbar
        config={DEFAULT_TIMED_CONFIG}
        disabled={false}
        onChange={() => {}}
        onCustomText={() => {}}
        onRestart={() => {}}
      />,
    );

    expect(screen.queryByRole('group', { name: 'Saved presets' })).not.toBeInTheDocument();
  });
});

describe('test toolbar quote mode', () => {
  it('switches to a quote with a real quote id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TestToolbar
        config={DEFAULT_TIMED_CONFIG}
        disabled={false}
        onChange={onChange}
        onCustomText={() => {}}
        onRestart={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Quote' }));

    const next = onChange.mock.calls[0]?.[0] as QuoteTestConfig;

    expect(next.mode).toBe('quote');
    expect(next.durationSeconds).toBeNull();
    expect(next.wordCount).toBeNull();
    expect(getQuoteById(next.quoteId)).not.toBeNull();
  });

  it('asks for custom text instead of switching immediately', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCustomText = vi.fn();

    render(
      <TestToolbar
        config={DEFAULT_TIMED_CONFIG}
        disabled={false}
        onChange={onChange}
        onCustomText={onCustomText}
        onRestart={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Text' }));

    expect(onCustomText).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks Text active and hides list controls while composing', () => {
    render(
      <TestToolbar
        config={DEFAULT_TIMED_CONFIG}
        displayMode="custom"
        disabled={false}
        onChange={() => {}}
        onCustomText={() => {}}
        onRestart={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Vocabulary')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Duration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Modifiers' })).not.toBeInTheDocument();
  });

  it('hides word-list and modifier controls that do not apply to quotes', () => {
    render(
      <TestToolbar
        config={quoteConfig()}
        disabled={false}
        onChange={() => {}}
        onCustomText={() => {}}
        onRestart={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Quote' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Vocabulary')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Modifiers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Duration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Word count' })).not.toBeInTheDocument();
  });
});
