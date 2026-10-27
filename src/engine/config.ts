import { z } from 'zod';

import type { TestConfig, TimedTestConfig, WordsTestConfig } from '@/engine/types';

export type { TestConfig } from '@/engine/types';

const durationSchema = z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(120)]);
const wordCountSchema = z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]);

const baseConfigSchema = z.object({
  language: z.enum(['english']),
  vocabulary: z.enum(['english-200', 'english-1k']),
  punctuation: z.boolean(),
  numbers: z.boolean(),
  errorPolicy: z.enum(['free', 'strict', 'no-backspace']),
  seed: z.number().int().min(0).max(0xffffffff),
});

const timedConfigSchema = baseConfigSchema.extend({
  mode: z.literal('timed'),
  durationSeconds: durationSchema,
  wordCount: z.null(),
  quoteId: z.null(),
  customText: z.null(),
});

const wordsConfigSchema = baseConfigSchema.extend({
  mode: z.literal('words'),
  durationSeconds: z.null(),
  wordCount: wordCountSchema,
  quoteId: z.null(),
  customText: z.null(),
});

const quoteConfigSchema = baseConfigSchema.extend({
  mode: z.literal('quote'),
  durationSeconds: z.null(),
  wordCount: z.null(),
  quoteId: z.string().trim().min(1).max(200),
  customText: z.null(),
});

const customConfigSchema = baseConfigSchema.extend({
  mode: z.literal('custom'),
  durationSeconds: z.null(),
  wordCount: z.null(),
  quoteId: z.null(),
  customText: z.string().trim().min(1).max(10_000),
});

export const testConfigSchema = z.discriminatedUnion('mode', [
  timedConfigSchema,
  wordsConfigSchema,
  quoteConfigSchema,
  customConfigSchema,
]);

export const DEFAULT_TIMED_CONFIG: TimedTestConfig = {
  mode: 'timed',
  language: 'english',
  vocabulary: 'english-200',
  punctuation: false,
  numbers: false,
  errorPolicy: 'free',
  seed: 1,
  durationSeconds: 30,
  wordCount: null,
  quoteId: null,
  customText: null,
};

export const DEFAULT_WORDS_CONFIG: WordsTestConfig = {
  mode: 'words',
  language: 'english',
  vocabulary: 'english-200',
  punctuation: false,
  numbers: false,
  errorPolicy: 'free',
  seed: 1,
  durationSeconds: null,
  wordCount: 25,
  quoteId: null,
  customText: null,
};

export function parseTestConfig(input: unknown): TestConfig {
  return testConfigSchema.parse(input);
}

/**
 * Personal bests are only comparable inside the same category.
 *
 * Vocabulary is part of the timed/words key because a 200-word pool and a
 * 1,000-word pool produce materially different difficulty.
 */
export function getCategoryKey(config: TestConfig): string {
  switch (config.mode) {
    case 'timed':
      return [
        'timed',
        config.durationSeconds * 1000,
        config.language,
        config.vocabulary,
        config.punctuation,
        config.numbers,
        config.errorPolicy,
      ].join(':');
    case 'words':
      return [
        'words',
        config.wordCount,
        config.language,
        config.vocabulary,
        config.punctuation,
        config.numbers,
        config.errorPolicy,
      ].join(':');
    case 'quote':
      return [
        'quote',
        encodeURIComponent(config.quoteId),
        config.language,
        config.errorPolicy,
      ].join(':');
    case 'custom':
      return 'custom';
  }
}

export function getComparableCategoryKey(config: TestConfig): string | null {
  return config.mode === 'custom' ? null : getCategoryKey(config);
}
