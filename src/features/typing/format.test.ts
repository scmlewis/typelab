import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import type { CustomTestConfig, QuoteTestConfig } from '@/engine/types';
import {
  describeResultMode,
  describeTestConfig,
  formatCountdown,
  formatDuration,
  formatLanguage,
  formatPercent,
} from '@/features/typing/format';

describe('formatPercent', () => {
  it('trims redundant trailing zeros', () => {
    expect(formatPercent(100, 1)).toBe('100%');
    expect(formatPercent(97.5, 1)).toBe('97.5%');
    expect(formatPercent(97.5, 2)).toBe('97.5%');
    expect(formatPercent(99.25, 2)).toBe('99.25%');
    expect(formatPercent(0, 1)).toBe('0%');
  });
});

describe('formatLanguage', () => {
  it('capitalises the language label', () => {
    expect(formatLanguage('english')).toBe('English');
    expect(formatLanguage('')).toBe('');
  });
});

describe('duration formatting', () => {
  it('formats short durations with one decimal', () => {
    expect(formatDuration(0)).toBe('0.0s');
    expect(formatDuration(1_234)).toBe('1.2s');
  });

  it('formats long durations as minutes and seconds', () => {
    expect(formatDuration(60_000)).toBe('1:00');
    expect(formatDuration(125_000)).toBe('2:05');
  });

  it('ceils the countdown to whole seconds', () => {
    expect(formatCountdown(15_000)).toBe('0:15');
    expect(formatCountdown(14_001)).toBe('0:15');
    expect(formatCountdown(0)).toBe('0:00');
  });
});

describe('describeResultMode', () => {
  it('describes timed and word-count results', () => {
    expect(describeResultMode({ testMode: 'timed', durationMs: 60_000, wordCount: null })).toBe(
      '60 seconds',
    );
    expect(describeResultMode({ testMode: 'words', durationMs: 5_000, wordCount: 25 })).toBe(
      '25 words',
    );
  });
});

describe('describeTestConfig', () => {
  it('lists vocabulary and modifiers only for generated text', () => {
    expect(
      describeTestConfig({ ...DEFAULT_TIMED_CONFIG, punctuation: true, vocabulary: 'english-1k' }),
    ).toBe('30 seconds · English 1k · punctuation');
  });

  it('describes quote and custom runs without word-list settings', () => {
    const quote: QuoteTestConfig = {
      ...DEFAULT_TIMED_CONFIG,
      mode: 'quote',
      durationSeconds: null,
      wordCount: null,
      quoteId: 'austen-pride-01',
      customText: null,
      punctuation: true,
      numbers: true,
    };
    const custom: CustomTestConfig = {
      ...quote,
      mode: 'custom',
      quoteId: null,
      customText: 'One two three',
    };

    expect(describeTestConfig(quote)).toBe('Quote');
    expect(describeTestConfig(custom)).toBe('Custom text');
  });
});
