import { z } from 'zod';

import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import type { TestConfig } from '@/engine/types';

export const SETTINGS_SCHEMA_VERSION = 1;
export const SETTINGS_STORAGE_KEY = 'typelab.settings';
export const SETTINGS_BACKUP_PREFIX = 'typelab.settings.corrupt.';

const durationSchema = z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(120)]);
const wordCountSchema = z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]);

export const testDefaultsSchema = z.object({
  mode: z.enum(['timed', 'words']),
  durationSeconds: durationSchema,
  wordCount: wordCountSchema,
  language: z.literal('english'),
  vocabulary: z.enum(['english-200', 'english-1k']),
  punctuation: z.boolean(),
  numbers: z.boolean(),
  errorPolicy: z.enum(['free', 'strict', 'no-backspace']),
});

export const settingsSchema = z.object({
  testDefaults: testDefaultsSchema,
});

export type TestDefaults = z.infer<typeof testDefaultsSchema>;
export type AppSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  testDefaults: {
    mode: 'timed',
    durationSeconds: 30,
    wordCount: 25,
    language: 'english',
    vocabulary: 'english-200',
    punctuation: false,
    numbers: false,
    errorPolicy: 'free',
  },
};

export function toTestConfig(settings: AppSettings, seed: number): TestConfig {
  const defaults = settings.testDefaults;

  if (defaults.mode === 'timed') {
    return {
      ...DEFAULT_TIMED_CONFIG,
      durationSeconds: defaults.durationSeconds,
      language: defaults.language,
      vocabulary: defaults.vocabulary,
      punctuation: defaults.punctuation,
      numbers: defaults.numbers,
      errorPolicy: defaults.errorPolicy,
      seed,
    };
  }

  return {
    ...DEFAULT_WORDS_CONFIG,
    wordCount: defaults.wordCount,
    language: defaults.language,
    vocabulary: defaults.vocabulary,
    punctuation: defaults.punctuation,
    numbers: defaults.numbers,
    errorPolicy: defaults.errorPolicy,
    seed,
  };
}

/**
 * Only timed and word-count configs map onto saved defaults. Quote and custom
 * runs carry per-test text, so changing them must not rewrite the bench setup.
 */
export function testDefaultsFromConfig(config: TestConfig): TestDefaults | null {
  if (config.mode !== 'timed' && config.mode !== 'words') {
    return null;
  }

  return {
    mode: config.mode,
    durationSeconds: config.durationSeconds ?? DEFAULT_SETTINGS.testDefaults.durationSeconds,
    wordCount: config.wordCount ?? DEFAULT_SETTINGS.testDefaults.wordCount,
    language: config.language,
    vocabulary: config.vocabulary,
    punctuation: config.punctuation,
    numbers: config.numbers,
    errorPolicy: config.errorPolicy,
  };
}
