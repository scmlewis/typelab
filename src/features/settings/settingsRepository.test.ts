import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
} from '@/features/settings/settings';
import { LocalSettingsRepository } from '@/features/settings/settingsRepository';

const NOW = new Date('2026-10-27T12:00:00.000Z');

function createRepository(storage: Storage = localStorage) {
  return new LocalSettingsRepository({ storage, now: () => NOW });
}

function storedEnvelope(settings: unknown, schemaVersion = SETTINGS_SCHEMA_VERSION): string {
  return JSON.stringify({ schemaVersion, settings, updatedAt: NOW.toISOString() });
}

describe('local settings repository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', async () => {
    const repository = createRepository();

    await expect(repository.load()).resolves.toEqual({
      settings: DEFAULT_SETTINGS,
      notice: null,
    });
  });

  it('round-trips saved settings', async () => {
    const repository = createRepository();
    const settings = {
      ...DEFAULT_SETTINGS,
      testDefaults: {
        ...DEFAULT_SETTINGS.testDefaults,
        mode: 'words' as const,
        wordCount: 50 as const,
      },
    };

    await repository.save(settings);
    await expect(repository.load()).resolves.toEqual({ settings, notice: null });
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain(
      `"schemaVersion":${SETTINGS_SCHEMA_VERSION}`,
    );
  });

  it('migrates a version 1 envelope instead of discarding it', async () => {
    const repository = createRepository();
    const legacy = { testDefaults: DEFAULT_SETTINGS.testDefaults };
    localStorage.setItem(SETTINGS_STORAGE_KEY, storedEnvelope(legacy, 1));

    await expect(repository.load()).resolves.toEqual({
      settings: DEFAULT_SETTINGS,
      notice: null,
    });
    expect(localStorage.getItem(`typelab.settings.corrupt.${NOW.getTime()}`)).toBeNull();
  });

  it('migrates a version 2 envelope and keeps its theme', async () => {
    const repository = createRepository();
    const legacy = {
      testDefaults: DEFAULT_SETTINGS.testDefaults,
      appearance: { theme: 'dark' },
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, storedEnvelope(legacy, 2));

    await expect(repository.load()).resolves.toEqual({
      settings: {
        ...DEFAULT_SETTINGS,
        appearance: { ...DEFAULT_SETTINGS.appearance, theme: 'dark' },
      },
      notice: null,
    });
    expect(localStorage.getItem(`typelab.settings.corrupt.${NOW.getTime()}`)).toBeNull();
  });

  it('backs up invalid JSON, resets to defaults, and reports corruption', async () => {
    const repository = createRepository();
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json');

    const loaded = await repository.load();

    expect(loaded).toEqual({ settings: DEFAULT_SETTINGS, notice: 'corrupt' });
    expect(localStorage.getItem(`typelab.settings.corrupt.${NOW.getTime()}`)).toBe('{not json');

    // The corrupt value is replaced so the notice does not repeat forever.
    await expect(repository.load()).resolves.toEqual({
      settings: DEFAULT_SETTINGS,
      notice: null,
    });
  });

  it('backs up a schema-invalid envelope', async () => {
    const repository = createRepository();
    localStorage.setItem(SETTINGS_STORAGE_KEY, storedEnvelope({ testDefaults: {} }));

    const loaded = await repository.load();

    expect(loaded.notice).toBe('corrupt');
    expect(loaded.settings).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(`typelab.settings.corrupt.${NOW.getTime()}`)).not.toBeNull();
  });

  it('does not overwrite settings written by a newer version', async () => {
    const repository = createRepository();
    const newer = storedEnvelope(DEFAULT_SETTINGS, SETTINGS_SCHEMA_VERSION + 1);
    localStorage.setItem(SETTINGS_STORAGE_KEY, newer);

    await expect(repository.load()).resolves.toEqual({
      settings: DEFAULT_SETTINGS,
      notice: 'newer',
    });
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(newer);
  });

  it('resets by removing the stored envelope', async () => {
    const repository = createRepository();
    await repository.save(DEFAULT_SETTINGS);

    await repository.reset();

    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    await expect(repository.load()).resolves.toEqual({
      settings: DEFAULT_SETTINGS,
      notice: null,
    });
  });

  it('keeps unique backup keys for repeated corruption', async () => {
    const repository = createRepository();
    localStorage.setItem(`typelab.settings.corrupt.${NOW.getTime()}`, 'earlier backup');
    localStorage.setItem(SETTINGS_STORAGE_KEY, 'broken');

    await repository.load();

    expect(localStorage.getItem(`typelab.settings.corrupt.${NOW.getTime()}-2`)).toBe('broken');
    expect(localStorage.getItem(`typelab.settings.corrupt.${NOW.getTime()}`)).toBe(
      'earlier backup',
    );
  });
});
