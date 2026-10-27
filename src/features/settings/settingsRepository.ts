import { z } from 'zod';

import {
  DEFAULT_SETTINGS,
  migrateSettings,
  SETTINGS_BACKUP_PREFIX,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  settingsSchema,
  type AppSettings,
} from '@/features/settings/settings';

export type SettingsNotice = 'corrupt' | 'newer' | 'unavailable';

export interface SettingsLoadResult {
  settings: AppSettings;
  notice: SettingsNotice | null;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface LocalSettingsRepositoryOptions {
  storage?: StorageLike;
  now?: () => Date;
}

const envelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  settings: z.unknown(),
  updatedAt: z.iso.datetime(),
});

export class LocalSettingsRepository {
  private readonly storage: StorageLike;
  private readonly now: () => Date;

  constructor(options: LocalSettingsRepositoryOptions = {}) {
    this.storage = options.storage ?? defaultStorage();
    this.now = options.now ?? (() => new Date());
  }

  load(): Promise<SettingsLoadResult> {
    return Promise.resolve().then(() => this.read());
  }

  save(settings: AppSettings): Promise<void> {
    return Promise.resolve().then(() => {
      const validated = settingsSchema.parse(settings);

      this.storage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: SETTINGS_SCHEMA_VERSION,
          settings: validated,
          updatedAt: this.now().toISOString(),
        }),
      );
    });
  }

  reset(): Promise<void> {
    return Promise.resolve().then(() => {
      this.storage.removeItem(SETTINGS_STORAGE_KEY);
    });
  }

  private read(): SettingsLoadResult {
    let raw: string | null;

    try {
      raw = this.storage.getItem(SETTINGS_STORAGE_KEY);
    } catch {
      return { settings: cloneDefaults(), notice: 'unavailable' };
    }

    if (raw === null) {
      return { settings: cloneDefaults(), notice: null };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.recover(raw);
    }

    const envelope = envelopeSchema.safeParse(parsed);

    if (!envelope.success) {
      return this.recover(raw);
    }

    if (envelope.data.schemaVersion > SETTINGS_SCHEMA_VERSION) {
      return { settings: cloneDefaults(), notice: 'newer' };
    }

    const settings = migrateSettings(envelope.data.schemaVersion, envelope.data.settings);

    if (settings === null) {
      return this.recover(raw);
    }

    return { settings, notice: null };
  }

  private recover(raw: string): SettingsLoadResult {
    this.storage.setItem(this.nextBackupKey(), raw);
    this.storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: SETTINGS_SCHEMA_VERSION,
        settings: DEFAULT_SETTINGS,
        updatedAt: this.now().toISOString(),
      }),
    );

    return { settings: cloneDefaults(), notice: 'corrupt' };
  }

  private nextBackupKey(): string {
    const base = `${SETTINGS_BACKUP_PREFIX}${this.now().getTime()}`;

    if (this.storage.getItem(base) === null) {
      return base;
    }

    let suffix = 2;

    while (this.storage.getItem(`${base}-${suffix}`) !== null) {
      suffix += 1;
    }

    return `${base}-${suffix}`;
  }
}

function cloneDefaults(): AppSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

function defaultStorage(): StorageLike {
  return window.localStorage;
}
