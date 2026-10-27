import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TIMED_CONFIG,
  DEFAULT_WORDS_CONFIG,
  getCategoryKey,
  getComparableCategoryKey,
  parseTestConfig,
  testConfigSchema,
} from '@/engine/config';
import type { TestConfig } from '@/engine/config';

const timedConfig: TestConfig = {
  mode: 'timed',
  language: 'english',
  vocabulary: 'english-200',
  punctuation: false,
  numbers: false,
  errorPolicy: 'free',
  seed: 42,
  durationSeconds: 30,
  wordCount: null,
  quoteId: null,
  customText: null,
};

const wordsConfig: TestConfig = {
  ...timedConfig,
  mode: 'words',
  durationSeconds: null,
  wordCount: 25,
};

describe('test config', () => {
  it('accepts a timed config and round-trips it', () => {
    expect(parseTestConfig(timedConfig)).toEqual(timedConfig);
    expect(JSON.parse(JSON.stringify(timedConfig))).toEqual(timedConfig);
  });

  it('accepts a word-count config', () => {
    expect(parseTestConfig(wordsConfig)).toEqual(wordsConfig);
  });

  it('rejects an unsupported timed duration', () => {
    expect(() => parseTestConfig({ ...timedConfig, durationSeconds: 45 })).toThrow();
  });

  it('rejects a word-count config with a timed duration', () => {
    expect(() => parseTestConfig({ ...wordsConfig, durationSeconds: 30 })).toThrow();
  });

  it('requires the mode-specific fields to be null elsewhere', () => {
    expect(() => parseTestConfig({ ...timedConfig, wordCount: 25 })).toThrow();
  });

  it('rejects a non-integer seed', () => {
    expect(() => parseTestConfig({ ...timedConfig, seed: 1.5 })).toThrow();
  });

  it('exports valid defaults', () => {
    expect(testConfigSchema.safeParse(DEFAULT_TIMED_CONFIG).success).toBe(true);
    expect(testConfigSchema.safeParse(DEFAULT_WORDS_CONFIG).success).toBe(true);
    expect(DEFAULT_TIMED_CONFIG.durationSeconds).toBe(30);
    expect(DEFAULT_WORDS_CONFIG.wordCount).toBe(25);
  });
});

describe('category keys', () => {
  it('formats a timed key from the scoring rules', () => {
    expect(getCategoryKey({ ...timedConfig, durationSeconds: 60 })).toBe(
      'timed:60000:english:english-200:false:false:free',
    );
  });

  it('formats a word-count key from the scoring rules', () => {
    expect(getCategoryKey({ ...wordsConfig, wordCount: 50 })).toBe(
      'words:50:english:english-200:false:false:free',
    );
  });

  it('keeps a separate best for every quote', () => {
    const quoteConfig: TestConfig = {
      ...timedConfig,
      mode: 'quote',
      durationSeconds: null,
      quoteId: 'quote-1',
    };

    expect(getCategoryKey(quoteConfig)).toBe('quote:quote-1:english:free');
    expect(getCategoryKey({ ...quoteConfig, quoteId: 'quote-2' })).not.toBe(
      getCategoryKey(quoteConfig),
    );
  });

  it('does not compare custom text for personal bests', () => {
    const customConfig: TestConfig = {
      ...timedConfig,
      mode: 'custom',
      durationSeconds: null,
      customText: 'A private sentence.',
    };

    expect(getCategoryKey(customConfig)).toBe('custom');
    expect(getComparableCategoryKey(customConfig)).toBeNull();
  });

  it('separates modifiers and error policies', () => {
    const baseKey = getCategoryKey(timedConfig);

    expect(getCategoryKey({ ...timedConfig, punctuation: true })).not.toBe(baseKey);
    expect(getCategoryKey({ ...timedConfig, numbers: true })).not.toBe(baseKey);
    expect(getCategoryKey({ ...timedConfig, errorPolicy: 'strict' })).not.toBe(baseKey);
    expect(getCategoryKey({ ...timedConfig, vocabulary: 'english-1k' })).not.toBe(baseKey);
  });
});
