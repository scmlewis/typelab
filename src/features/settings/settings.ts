import { z } from 'zod';

import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import type { TestConfig } from '@/engine/types';

export const SETTINGS_SCHEMA_VERSION = 3;
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

export const themePreferenceSchema = z.enum(['light', 'dark', 'system']);
export const typingFontFamilySchema = z.enum(['mono', 'sans', 'serif']);
export const typingFontSizeSchema = z.enum(['small', 'medium', 'large']);
export const typingTextWidthSchema = z.enum(['narrow', 'default', 'wide']);
export const caretStyleSchema = z.enum(['line', 'block', 'underline']);

export const caretSettingsSchema = z.object({
  style: caretStyleSchema.default('line'),
  blink: z.boolean().default(true),
});

export const soundSettingsSchema = z.object({
  /** Sounds are opt-in and stay silent until the user enables them. */
  enabled: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(0.5),
});

export const appearanceSchema = z.object({
  /** `system` follows the operating-system colour scheme. */
  theme: themePreferenceSchema.default('system'),
  fontFamily: typingFontFamilySchema.default('mono'),
  fontSize: typingFontSizeSchema.default('medium'),
  textWidth: typingTextWidthSchema.default('default'),
  caret: caretSettingsSchema.default(() => caretSettingsSchema.parse({})),
  sounds: soundSettingsSchema.default(() => soundSettingsSchema.parse({})),
});

export const settingsSchema = z.object({
  testDefaults: testDefaultsSchema,
  appearance: appearanceSchema.default(() => appearanceSchema.parse({})),
});

export type TestDefaults = z.infer<typeof testDefaultsSchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type TypingFontFamily = z.infer<typeof typingFontFamilySchema>;
export type TypingFontSize = z.infer<typeof typingFontSizeSchema>;
export type TypingTextWidth = z.infer<typeof typingTextWidthSchema>;
export type CaretStyle = z.infer<typeof caretStyleSchema>;
export type CaretSettings = z.infer<typeof caretSettingsSchema>;
export type SoundSettings = z.infer<typeof soundSettingsSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
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
  appearance: {
    theme: 'system',
    fontFamily: 'mono',
    fontSize: 'medium',
    textWidth: 'default',
    caret: { style: 'line', blink: true },
    sounds: { enabled: false, volume: 0.5 },
  },
};

const settingsV1Schema = z.object({
  testDefaults: testDefaultsSchema,
});

const settingsV2Schema = z.object({
  testDefaults: testDefaultsSchema,
  appearance: z.object({ theme: themePreferenceSchema }),
});

/**
 * Settings are migrated one version at a time. Unknown versions and invalid
 * payloads return null so the repository can back up and reset instead.
 */
export function migrateSettings(version: number, value: unknown): AppSettings | null {
  if (version === SETTINGS_SCHEMA_VERSION) {
    const current = settingsSchema.safeParse(value);

    return current.success ? current.data : null;
  }

  if (version === 2) {
    const legacy = settingsV2Schema.safeParse(value);

    return legacy.success
      ? {
          testDefaults: legacy.data.testDefaults,
          appearance: appearanceSchema.parse({ theme: legacy.data.appearance.theme }),
        }
      : null;
  }

  if (version === 1) {
    const legacy = settingsV1Schema.safeParse(value);

    return legacy.success
      ? {
          testDefaults: legacy.data.testDefaults,
          appearance: appearanceSchema.parse({}),
        }
      : null;
  }

  return null;
}

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
