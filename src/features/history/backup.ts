import { z } from 'zod';

import { testConfigSchema } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import { settingsSchema } from '@/features/settings/settings';
import type { AppSettings } from '@/features/settings/settings';

export const BACKUP_FORMAT = 'typelab-backup';
export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_VERSION = '0.1.0';
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
export const MAX_BACKUP_RESULTS = 20_000;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  settings: AppSettings;
  results: TestResult[];
}

export interface BackupIssue {
  row: number;
  message: string;
}

export type BackupParseResult =
  | { ok: true; backup: BackupFile; settings: AppSettings; results: TestResult[] }
  | { ok: false; error: string; issues: BackupIssue[] };

const sampleSchema = z.object({
  startMs: z.number().finite().min(0),
  durationMs: z.number().finite().min(0),
  chars: z.number().int().min(0),
  wpm: z.number().finite().min(0),
});

const characterStatisticsSchema = z.object({
  correct: z.number().int().min(0),
  incorrect: z.number().int().min(0),
  extra: z.number().int().min(0),
  missed: z.number().int().min(0),
  correctSeparators: z.number().int().min(0),
  extraSeparators: z.number().int().min(0),
  missedSeparators: z.number().int().min(0),
});

export const resultSchema = z.object({
  id: z.string().min(1).max(200),
  clientTestId: z.string().min(1).max(200),
  testMode: z.enum(['timed', 'words', 'quote', 'custom']),
  language: z.enum(['english']),
  configuration: testConfigSchema,
  promptId: z.string().min(1).max(200),
  seed: z.number().int().min(0).max(0xffffffff),
  durationMs: z.number().finite().min(0),
  wordCount: z.number().int().min(1).nullable(),
  netWpm: z.number().finite().min(0),
  rawWpm: z.number().finite().min(0),
  accuracy: z.number().finite().min(0).max(100),
  characterStatistics: characterStatisticsSchema,
  consistency: z.number().finite().min(0).max(100),
  flags: z.array(z.enum(['no-input', 'under-one-second', 'failed', 'low-confidence'])),
  samples: z.array(sampleSchema),
  scoringVersion: z.string().min(1).max(50),
  generatorVersion: z.string().min(1).max(50),
  failureReason: z.string().max(2_000).nullable(),
  completedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

const shellSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.iso.datetime(),
  appVersion: z.string().min(1).max(50),
  settings: settingsSchema,
  results: z.array(z.unknown()),
});

export function buildBackup(input: {
  settings: AppSettings;
  results: TestResult[];
  exportedAt?: string;
  appVersion?: string;
}): BackupFile {
  const exportedAt = input.exportedAt ?? new Date().toISOString();

  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    appVersion: input.appVersion ?? BACKUP_APP_VERSION,
    settings: input.settings,
    results: input.results,
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(
  text: string,
  options: { maxBytes?: number; maxResults?: number } = {},
): BackupParseResult {
  const maxBytes = options.maxBytes ?? MAX_BACKUP_BYTES;
  const maxResults = options.maxResults ?? MAX_BACKUP_RESULTS;

  if (byteLength(text) > maxBytes) {
    return {
      ok: false,
      error: 'This file is larger than the 25 MB backup limit.',
      issues: [],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.', issues: [] };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { format?: unknown }).format !== BACKUP_FORMAT
  ) {
    return { ok: false, error: 'This file is not a TypeLab backup.', issues: [] };
  }

  const schemaVersion = (parsed as { schemaVersion?: unknown }).schemaVersion;

  if (typeof schemaVersion === 'number' && schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This backup was made by a newer version of TypeLab. Update the app to import it.',
      issues: [],
    };
  }

  const shell = shellSchema.safeParse(parsed);

  if (!shell.success) {
    return {
      ok: false,
      error: 'This backup is missing required fields or has an unsupported schema.',
      issues: [],
    };
  }

  if (shell.data.results.length > maxResults) {
    return {
      ok: false,
      error: `This backup contains more than ${maxResults.toLocaleString()} runs.`,
      issues: [],
    };
  }

  const results: TestResult[] = [];
  const issues: BackupIssue[] = [];

  shell.data.results.forEach((row, index) => {
    const result = resultSchema.safeParse(row);

    if (result.success) {
      results.push(result.data);
      return;
    }

    issues.push({
      row: index + 1,
      message: result.error.issues[0]?.message ?? 'Invalid run.',
    });
  });

  if (issues.length > 0) {
    return {
      ok: false,
      error: `${issues.length} ${issues.length === 1 ? 'run is' : 'runs are'} invalid. Fix or re-export the file, then try again.`,
      issues: issues.slice(0, 20),
    };
  }

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      schemaVersion: shell.data.schemaVersion,
      exportedAt: shell.data.exportedAt,
      appVersion: shell.data.appVersion,
      settings: shell.data.settings,
      results,
    },
    settings: shell.data.settings,
    results,
  };
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
  rejected: number;
}

export function describeImportSummary({ imported, duplicates, rejected }: ImportSummary): string {
  if (imported === 0 && duplicates === 0 && rejected > 0) {
    return `${rejected} ${rejected === 1 ? 'row' : 'rows'} could not be imported`;
  }

  const parts: string[] = [];

  if (imported > 0) {
    parts.push(`${imported} new ${imported === 1 ? 'run' : 'runs'}`);
  }

  if (duplicates > 0) {
    parts.push(`${duplicates} ${duplicates === 1 ? 'duplicate' : 'duplicates'}`);
  }

  if (rejected > 0) {
    parts.push(`${rejected} rejected`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Nothing to import';
}

const CSV_HEADER = [
  'completedAt',
  'mode',
  'language',
  'netWpm',
  'rawWpm',
  'accuracy',
  'consistency',
  'durationMs',
  'wordCount',
  'flags',
  'id',
].join(',');

export function resultsToCsv(results: readonly TestResult[]): string {
  const rows = results.map((result) =>
    [
      result.completedAt,
      result.testMode,
      result.language,
      String(result.netWpm),
      String(result.rawWpm),
      String(result.accuracy),
      String(result.consistency),
      String(result.durationMs),
      result.wordCount === null ? '' : String(result.wordCount),
      result.flags.join('|'),
      result.id,
    ]
      .map(escapeCsvField)
      .join(','),
  );

  return [CSV_HEADER, ...rows].join('\r\n');
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
