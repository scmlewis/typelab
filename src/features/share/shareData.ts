import { z } from 'zod';

import { getQuoteById } from '@/engine/content/quotes';
import { isDegenerateResult } from '@/engine/scoring';
import type { TestMode, TestResult } from '@/engine/types';
import { describeResultMode, describeTestConfig, formatPercent } from '@/features/typing/format';

/** The encoded part of a share link is capped so links stay copy-pasteable. */
export const MAX_ENCODED_SHARE_LENGTH = 1_800;
export const MAX_SHARE_URL_LENGTH = 2_000;
export const SHARE_VERSION = 1;

/**
 * A small, read-only snapshot of a run. It deliberately leaves out typed text,
 * character statistics, and interval samples: a link should be short, and a
 * custom run must never leak the pasted text.
 */
export interface SharedResultSnapshot {
  version: typeof SHARE_VERSION;
  mode: TestMode;
  language: string;
  durationMs: number;
  wordCount: number | null;
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  configSummary: string;
  quoteSource: string | null;
  quoteAuthor: string | null;
  excluded: boolean;
  scoringVersion: string;
  completedAt: string;
}

const snapshotSchema = z
  .object({
    version: z.literal(SHARE_VERSION),
    mode: z.enum(['timed', 'words', 'quote', 'custom']),
    language: z.string().min(1).max(32),
    durationMs: z.number().finite().min(0).max(86_400_000),
    wordCount: z.number().int().min(1).max(100_000).nullable(),
    netWpm: z.number().finite().min(0).max(10_000),
    rawWpm: z.number().finite().min(0).max(10_000),
    accuracy: z.number().finite().min(0).max(100),
    consistency: z.number().finite().min(0).max(100),
    configSummary: z.string().min(1).max(160),
    quoteSource: z.string().max(200).nullable(),
    quoteAuthor: z.string().max(200).nullable(),
    excluded: z.boolean(),
    scoringVersion: z.string().min(1).max(50),
    completedAt: z.iso.datetime(),
  })
  .superRefine((snapshot, context) => {
    const expectsWordCount = snapshot.mode === 'words';

    if (expectsWordCount && snapshot.wordCount === null) {
      context.addIssue({
        code: 'custom',
        message: 'Word-count runs need a word count.',
        path: ['wordCount'],
      });
    }

    if (!expectsWordCount && snapshot.wordCount !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Only word-count runs carry a word count.',
        path: ['wordCount'],
      });
    }
  });

export function createShareSnapshot(result: TestResult): SharedResultSnapshot {
  const quote =
    result.configuration.mode === 'quote' ? getQuoteById(result.configuration.quoteId) : null;

  return {
    version: SHARE_VERSION,
    mode: result.testMode,
    language: result.language,
    durationMs: result.durationMs,
    wordCount: result.wordCount,
    netWpm: result.netWpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    consistency: result.consistency,
    configSummary: describeTestConfig(result.configuration),
    quoteSource: quote?.source ?? null,
    quoteAuthor: quote?.author ?? null,
    excluded: result.testMode === 'custom' || isDegenerateResult(result),
    scoringVersion: result.scoringVersion,
    completedAt: result.completedAt,
  };
}

export function encodeShareSnapshot(snapshot: SharedResultSnapshot): string {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeShareSnapshot(value: string): SharedResultSnapshot | null {
  if (value.length === 0 || value.length > MAX_ENCODED_SHARE_LENGTH) {
    return null;
  }

  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = snapshotSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(
  snapshot: SharedResultSnapshot,
  origin: string,
  maxLength = MAX_SHARE_URL_LENGTH,
): string | null {
  if (origin.length === 0) {
    return null;
  }

  const encoded = encodeShareSnapshot(snapshot);

  if (encoded.length > MAX_ENCODED_SHARE_LENGTH) {
    return null;
  }

  const url = `${origin.replace(/\/+$/, '')}/shared?r=${encoded}`;

  return url.length > maxLength ? null : url;
}

export function buildShareSummary(
  snapshot: SharedResultSnapshot,
  url: string | null = null,
): string {
  const lines = [
    `TypeLab · ${describeShareMode(snapshot)} · ${capitalise(snapshot.language)}`,
    `${snapshot.netWpm.toFixed(1)} net WPM · ${snapshot.rawWpm.toFixed(1)} raw WPM · ${formatPercent(snapshot.accuracy, 1)} accuracy · ${formatPercent(snapshot.consistency, 1)} consistency`,
  ];

  if (snapshot.quoteSource !== null) {
    const author = snapshot.quoteAuthor === null ? '' : ` — ${snapshot.quoteAuthor}`;
    lines.push(`${snapshot.quoteSource}${author}`);
  }

  if (snapshot.excluded) {
    lines.push('Unranked run, excluded from personal bests.');
  }

  lines.push('Snapshot · not a verified score.');
  lines.push(`${formatShareDate(snapshot.completedAt)} · scoring ${snapshot.scoringVersion}`);

  if (url !== null) {
    lines.push(url);
  }

  return lines.join('\n');
}

/** A local calendar date, so an evening run is not dated tomorrow. */
export function formatShareDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function describeShareMode(snapshot: SharedResultSnapshot): string {
  return describeResultMode({
    testMode: snapshot.mode,
    durationMs: snapshot.durationMs,
    wordCount: snapshot.wordCount,
  });
}

function capitalise(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
