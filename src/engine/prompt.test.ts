import { describe, expect, it } from 'vitest';

import { getWordList } from '@/engine/content/word-lists';
import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import { GENERATOR_VERSION } from '@/engine/versions';
import type { QuoteTestConfig, TestConfig } from '@/engine/types';
import { generatePrompt, normalizeCustomText, TIMED_PROMPT_WORD_COUNT } from '@/engine/prompt';

describe('word lists', () => {
  it('provides the promised word-list sizes', () => {
    expect(getWordList('english-200')).toHaveLength(200);
    expect(getWordList('english-1k')).toHaveLength(1_000);
  });

  it('contains unique, plain lowercase words', () => {
    for (const vocabulary of ['english-200', 'english-1k'] as const) {
      const words = getWordList(vocabulary);

      expect(new Set(words).size).toBe(words.length);
      expect(words.every((word) => /^[a-z]+$/.test(word))).toBe(true);
      expect(words.every((word) => word.length > 0 && word.length <= 20)).toBe(true);
    }
  });

  it('builds the 200-word list from the 1,000-word list', () => {
    const small = new Set(getWordList('english-200'));
    const large = new Set(getWordList('english-1k'));

    expect([...small].every((word) => large.has(word))).toBe(true);
  });
});

describe('prompt generation', () => {
  it('is deterministic for the same config and seed', () => {
    const config: TestConfig = { ...DEFAULT_WORDS_CONFIG, seed: 7, wordCount: 25 };

    const first = generatePrompt(config);
    const second = generatePrompt(config);

    expect(first).toEqual(second);
    expect(first.id).toBe(second.id);
  });

  it('changes when the seed changes', () => {
    const first = generatePrompt({ ...DEFAULT_WORDS_CONFIG, seed: 7 });
    const second = generatePrompt({ ...DEFAULT_WORDS_CONFIG, seed: 8 });

    expect(first.text).not.toBe(second.text);
    expect(first.id).not.toBe(second.id);
  });

  it('generates exactly the requested word count', () => {
    for (const wordCount of [10, 25, 50, 100] as const) {
      const prompt = generatePrompt({ ...DEFAULT_WORDS_CONFIG, wordCount });

      expect(prompt.words).toHaveLength(wordCount);
    }
  });

  it('generates a long enough timed prompt', () => {
    const prompt = generatePrompt(DEFAULT_TIMED_CONFIG);

    expect(prompt.words).toHaveLength(TIMED_PROMPT_WORD_COUNT);
    expect(TIMED_PROMPT_WORD_COUNT).toBeGreaterThanOrEqual(400);
  });

  it('joins the target words with single spaces', () => {
    const prompt = generatePrompt({ ...DEFAULT_WORDS_CONFIG, wordCount: 50 });

    expect(prompt.text).toBe(prompt.words.join(' '));
    expect(prompt.text).not.toMatch(/\s{2,}/);
    expect(prompt.words.every((word) => !/\s/.test(word))).toBe(true);
  });

  it('uses only lowercase words without modifiers', () => {
    const prompt = generatePrompt({ ...DEFAULT_WORDS_CONFIG, wordCount: 100 });

    expect(prompt.words.every((word) => /^[a-z]+$/.test(word))).toBe(true);
  });

  it('adds punctuation and capitalises the first word when punctuation is enabled', () => {
    const prompt = generatePrompt({
      ...DEFAULT_WORDS_CONFIG,
      wordCount: 50,
      punctuation: true,
      seed: 12_345,
    });

    expect(/[.,!?;:]/.test(prompt.text)).toBe(true);
    expect(prompt.words[0]?.charAt(0)).toMatch(/[A-Z]/);
  });

  it('adds numeric tokens when numbers are enabled', () => {
    const prompt = generatePrompt({
      ...DEFAULT_WORDS_CONFIG,
      wordCount: 100,
      numbers: true,
      seed: 42,
    });

    expect(prompt.words.some((word) => /^\d+$/.test(word))).toBe(true);
  });

  it('keeps every modifier token free of whitespace', () => {
    const prompt = generatePrompt({
      ...DEFAULT_WORDS_CONFIG,
      wordCount: 100,
      punctuation: true,
      numbers: true,
      seed: 99,
    });

    expect(prompt.words.every((word) => word.length > 0 && !/\s/.test(word))).toBe(true);
  });

  it('uses the generator version in the prompt id', () => {
    const prompt = generatePrompt(DEFAULT_WORDS_CONFIG);

    expect(prompt.generatorVersion).toBe(GENERATOR_VERSION);
    expect(prompt.id.startsWith(`${GENERATOR_VERSION}:`)).toBe(true);
  });

  it('normalises custom text without changing its punctuation or case', () => {
    const config: TestConfig = {
      ...DEFAULT_WORDS_CONFIG,
      mode: 'custom',
      durationSeconds: null,
      wordCount: null,
      customText: '  Hello,\n  world!  ',
    };

    const prompt = generatePrompt(config);

    expect(prompt.words).toEqual(['Hello,', 'world!']);
    expect(prompt.text).toBe('Hello, world!');
  });

  it('collapses whitespace runs in custom text', () => {
    expect(normalizeCustomText('  One,\n\n\ttwo  three.  ')).toBe('One, two three.');
    expect(normalizeCustomText('   ')).toBe('');
    expect(normalizeCustomText('Keep "quotes" and CAPS!')).toBe('Keep "quotes" and CAPS!');
  });

  it('creates a quote prompt from supplied text', () => {
    const config: QuoteTestConfig = {
      ...DEFAULT_WORDS_CONFIG,
      mode: 'quote',
      durationSeconds: null,
      wordCount: null,
      quoteId: 'quote-1',
      customText: null,
    };

    const prompt = generatePrompt(config, { quoteText: 'To be, or not to be.' });

    expect(prompt.words).toEqual(['To', 'be,', 'or', 'not', 'to', 'be.']);
    expect(prompt.text).toBe('To be, or not to be.');
  });

  it('rejects a quote without source text', () => {
    const config: QuoteTestConfig = {
      ...DEFAULT_WORDS_CONFIG,
      mode: 'quote',
      durationSeconds: null,
      wordCount: null,
      quoteId: 'quote-1',
      customText: null,
    };

    expect(() => generatePrompt(config)).toThrow(/quote text/i);
  });

  it('rejects empty text', () => {
    const config: TestConfig = {
      ...DEFAULT_WORDS_CONFIG,
      mode: 'custom',
      durationSeconds: null,
      wordCount: null,
      customText: '   ',
    };

    expect(() => generatePrompt(config)).toThrow(/empty/i);
  });
});
