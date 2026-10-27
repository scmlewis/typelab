import { describe, expect, it } from 'vitest';

import { backupFileName, csvFileName } from '@/features/history/download';

describe('download helpers', () => {
  it('builds dated, sortable file names', () => {
    const date = new Date('2026-10-27T12:00:00.000Z');

    expect(backupFileName(date)).toBe('typelab-backup-2026-10-27.json');
    expect(csvFileName(date)).toBe('typelab-history-2026-10-27.csv');
  });
});
