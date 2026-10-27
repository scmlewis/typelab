import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import {
  buildBackup,
  describeImportSummary,
  parseBackup,
  resultsToCsv,
  serializeBackup,
} from '@/features/history/backup';
import { DEFAULT_SETTINGS } from '@/features/settings/settings';

function makeResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: 'result-1',
    clientTestId: 'client-1',
    testMode: 'timed',
    language: 'english',
    configuration: DEFAULT_TIMED_CONFIG,
    promptId: 'prompt-1',
    seed: 1,
    durationMs: 30_000,
    wordCount: null,
    netWpm: 61.5,
    rawWpm: 64,
    accuracy: 96.4,
    characterStatistics: {
      correct: 150,
      incorrect: 2,
      extra: 1,
      missed: 0,
      correctSeparators: 25,
      extraSeparators: 0,
      missedSeparators: 0,
    },
    consistency: 82.1,
    flags: [],
    samples: [{ startMs: 0, durationMs: 1_000, chars: 5, wpm: 60 }],
    scoringVersion: '1.0.0',
    generatorVersion: '1.0.0',
    failureReason: null,
    completedAt: '2026-10-27T12:00:00.000Z',
    createdAt: '2026-10-27T12:00:00.000Z',
    ...overrides,
  };
}

describe('backup file', () => {
  it('builds a versioned envelope with settings and results', () => {
    const backup = buildBackup({
      settings: DEFAULT_SETTINGS,
      results: [makeResult()],
      exportedAt: '2026-10-27T13:00:00.000Z',
      appVersion: '0.1.0',
    });

    expect(backup).toMatchObject({
      format: 'typelab-backup',
      schemaVersion: 1,
      exportedAt: '2026-10-27T13:00:00.000Z',
      appVersion: '0.1.0',
      settings: DEFAULT_SETTINGS,
    });
    expect(backup.results).toHaveLength(1);
  });

  it('round-trips through JSON', () => {
    const results = [makeResult(), makeResult({ id: 'result-2', clientTestId: 'client-2' })];
    const parsed = parseBackup(
      serializeBackup(buildBackup({ settings: DEFAULT_SETTINGS, results })),
    );

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.results).toHaveLength(2);
      expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
      expect(parsed.backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

describe('backup validation', () => {
  it('imports a backup made before appearance settings', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'typelab-backup',
        schemaVersion: 1,
        exportedAt: '2026-10-27T12:00:00.000Z',
        appVersion: '0.1.0',
        settings: { testDefaults: DEFAULT_SETTINGS.testDefaults },
        results: [],
      }),
    );

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('rejects non-JSON input', () => {
    const parsed = parseBackup('{not json');

    expect(parsed).toEqual({ ok: false, error: 'This file is not valid JSON.', issues: [] });
  });

  it('rejects a file that is not a TypeLab backup', () => {
    const parsed = parseBackup(JSON.stringify({ format: 'something-else' }));

    expect(parsed.ok).toBe(false);

    if (!parsed.ok) {
      expect(parsed.error).toMatch(/not a TypeLab backup/i);
    }
  });

  it('rejects a newer backup schema', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'typelab-backup',
        schemaVersion: 2,
        exportedAt: '2026-10-27T12:00:00.000Z',
        appVersion: '9.0.0',
        settings: DEFAULT_SETTINGS,
        results: [],
      }),
    );

    expect(parsed.ok).toBe(false);

    if (!parsed.ok) {
      expect(parsed.error).toMatch(/newer version/i);
    }
  });

  it('reports invalid rows with their positions', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'typelab-backup',
        schemaVersion: 1,
        exportedAt: '2026-10-27T12:00:00.000Z',
        appVersion: '0.1.0',
        settings: DEFAULT_SETTINGS,
        results: [makeResult(), { ...makeResult(), netWpm: 'fast' }, makeResult()],
      }),
    );

    expect(parsed.ok).toBe(false);

    if (!parsed.ok) {
      expect(parsed.error).toMatch(/invalid/i);
      expect(parsed.issues).toEqual([expect.objectContaining({ row: 2 })]);
    }
  });

  it('rejects oversized input before parsing', () => {
    const parsed = parseBackup('{}', { maxBytes: 1 });

    expect(parsed.ok).toBe(false);

    if (!parsed.ok) {
      expect(parsed.error).toMatch(/25 MB|too large/i);
    }
  });
});

describe('import summary', () => {
  it('describes new, duplicate, and invalid rows', () => {
    expect(describeImportSummary({ imported: 3, duplicates: 2, rejected: 0 })).toBe(
      '3 new runs, 2 duplicates',
    );
    expect(describeImportSummary({ imported: 0, duplicates: 0, rejected: 4 })).toBe(
      '4 rows could not be imported',
    );
  });
});

describe('CSV export', () => {
  it('writes a header and one escaped row per result', () => {
    const csv = resultsToCsv([
      makeResult(),
      makeResult({
        id: 'result-2',
        clientTestId: 'client-2',
        testMode: 'custom',
        configuration: {
          ...DEFAULT_TIMED_CONFIG,
          mode: 'custom',
          durationSeconds: null,
          customText: 'hello, "world"',
        },
        flags: ['failed', 'low-confidence'],
      }),
    ]);

    const lines = csv.split('\r\n');

    expect(lines[0]).toBe(
      'completedAt,mode,language,netWpm,rawWpm,accuracy,consistency,durationMs,wordCount,flags,id',
    );
    expect(lines[1]).toBe(
      '2026-10-27T12:00:00.000Z,timed,english,61.5,64,96.4,82.1,30000,,,result-1',
    );
    expect(lines[2]).toContain('custom,english');
    expect(lines[2]).toContain('failed|low-confidence');
    expect(lines).toHaveLength(3);
  });
});
