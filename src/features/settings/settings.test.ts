import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import {
  DEFAULT_SETTINGS,
  migrateSettings,
  SETTINGS_SCHEMA_VERSION,
  settingsSchema,
  testDefaultsFromConfig,
  toTestConfig,
} from '@/features/settings/settings';

describe('settings schema', () => {
  it('defaults validate', () => {
    expect(settingsSchema.parse(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('adds appearance defaults to a payload written before appearance existed', () => {
    expect(settingsSchema.parse({ testDefaults: DEFAULT_SETTINGS.testDefaults })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('rejects unsupported durations and word counts', () => {
    expect(
      settingsSchema.safeParse({
        ...DEFAULT_SETTINGS,
        testDefaults: { ...DEFAULT_SETTINGS.testDefaults, durationSeconds: 45 },
      }).success,
    ).toBe(false);

    expect(
      settingsSchema.safeParse({
        ...DEFAULT_SETTINGS,
        testDefaults: { ...DEFAULT_SETTINGS.testDefaults, wordCount: 20 },
      }).success,
    ).toBe(false);
  });

  it('strips unknown keys instead of failing', () => {
    const parsed = settingsSchema.parse({
      ...DEFAULT_SETTINGS,
      futureOption: true,
      testDefaults: { ...DEFAULT_SETTINGS.testDefaults, unknown: 'x' },
    });

    expect(parsed).toEqual(DEFAULT_SETTINGS);
  });
});

describe('settings migration', () => {
  it('migrates version 1 by adding appearance defaults', () => {
    const legacy = { testDefaults: DEFAULT_SETTINGS.testDefaults };

    expect(migrateSettings(1, legacy)).toEqual(DEFAULT_SETTINGS);
    expect(SETTINGS_SCHEMA_VERSION).toBe(2);
  });

  it('accepts current settings unchanged', () => {
    expect(migrateSettings(SETTINGS_SCHEMA_VERSION, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects unknown versions and invalid legacy payloads', () => {
    expect(migrateSettings(0, DEFAULT_SETTINGS)).toBeNull();
    expect(migrateSettings(1, { testDefaults: {} })).toBeNull();
  });
});

describe('test defaults', () => {
  it('builds a timed config with the supplied seed', () => {
    const config = toTestConfig(
      {
        ...DEFAULT_SETTINGS,
        testDefaults: {
          ...DEFAULT_SETTINGS.testDefaults,
          mode: 'timed',
          durationSeconds: 60,
          punctuation: true,
          numbers: true,
        },
      },
      42,
    );

    expect(config).toEqual({
      ...DEFAULT_TIMED_CONFIG,
      durationSeconds: 60,
      punctuation: true,
      numbers: true,
      seed: 42,
    });
  });

  it('builds a word-count config with the supplied seed', () => {
    const config = toTestConfig(
      {
        ...DEFAULT_SETTINGS,
        testDefaults: {
          ...DEFAULT_SETTINGS.testDefaults,
          mode: 'words',
          wordCount: 100,
          vocabulary: 'english-1k',
        },
      },
      7,
    );

    expect(config).toEqual({
      ...DEFAULT_WORDS_CONFIG,
      wordCount: 100,
      vocabulary: 'english-1k',
      seed: 7,
    });
  });

  it('extracts comparable defaults from an active config', () => {
    expect(
      testDefaultsFromConfig({
        ...DEFAULT_TIMED_CONFIG,
        durationSeconds: 120,
        errorPolicy: 'strict',
      }),
    ).toEqual({
      mode: 'timed',
      durationSeconds: 120,
      wordCount: DEFAULT_SETTINGS.testDefaults.wordCount,
      language: 'english',
      vocabulary: 'english-200',
      punctuation: false,
      numbers: false,
      errorPolicy: 'strict',
    });
  });

  it('does not extract defaults from quote or custom configs', () => {
    expect(
      testDefaultsFromConfig({
        ...DEFAULT_TIMED_CONFIG,
        mode: 'quote',
        durationSeconds: null,
        quoteId: 'quote-1',
      }),
    ).toBeNull();
  });
});
