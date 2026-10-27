import Dexie, { type EntityTable } from 'dexie';

import type { TestResult } from '@/engine/types';

export interface MetaRecord {
  key: string;
  value: string;
}

/**
 * Local history and small metadata. Settings deliberately live in
 * localStorage, not here, so a database problem cannot lose preferences.
 */
export class TypelabDatabase extends Dexie {
  results!: EntityTable<TestResult, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;

  constructor(name = 'typelab') {
    super(name);

    this.version(1).stores({
      results:
        'id, &clientTestId, completedAt, testMode, language, [testMode+language], [testMode+completedAt]',
      meta: 'key',
    });
  }
}

let sharedDatabase: TypelabDatabase | null = null;

export function getTypelabDatabase(): TypelabDatabase {
  sharedDatabase ??= new TypelabDatabase();

  return sharedDatabase;
}
