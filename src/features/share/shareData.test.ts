import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import { QUOTES } from '@/engine/content/quotes';
import type { TestResult } from '@/engine/types';
import {
  MAX_ENCODED_SHARE_LENGTH,
  buildShareSummary,
  buildShareUrl,
  createShareSnapshot,
  decodeShareSnapshot,
  encodeShareSnapshot,
  formatShareDate,
} from '@/features/share/shareData';

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
    netWpm: 72.4,
    rawWpm: 75,
    accuracy: 97.2,
    characterStatistics: {
      correct: 180,
      incorrect: 3,
      extra: 1,
      missed: 2,
      correctSeparators: 30,
      extraSeparators: 1,
      missedSeparators: 0,
    },
    consistency: 84.6,
    flags: [],
    samples: [],
    scoringVersion: '1.0.0',
    generatorVersion: '1.0.0',
    failureReason: null,
    completedAt: new Date(2026, 9, 27, 20, 0).toISOString(),
    createdAt: new Date(2026, 9, 27, 20, 0).toISOString(),
    ...overrides,
  };
}

describe('share snapshot', () => {
  it('keeps the run summary and drops typing detail', () => {
    const snapshot = createShareSnapshot(makeResult());

    expect(snapshot).toMatchObject({
      version: 1,
      mode: 'timed',
      netWpm: 72.4,
      rawWpm: 75,
      accuracy: 97.2,
      consistency: 84.6,
      configSummary: '30 seconds · English 200',
      excluded: false,
    });
    expect(snapshot).not.toHaveProperty('samples');
    expect(snapshot).not.toHaveProperty('characterStatistics');
  });

  it('records quote attribution and marks an unranked run', () => {
    const quote = QUOTES[0]!;
    const snapshot = createShareSnapshot(
      makeResult({
        testMode: 'quote',
        wordCount: null,
        flags: ['under-one-second'],
        configuration: {
          ...DEFAULT_TIMED_CONFIG,
          mode: 'quote',
          durationSeconds: null,
          quoteId: quote.id,
          customText: null,
        },
      }),
    );

    expect(snapshot.quoteSource).toBe(quote.source);
    expect(snapshot.quoteAuthor).toBe(quote.author);
    expect(snapshot.excluded).toBe(true);
  });

  it('never includes the text of a custom run', () => {
    const secret = 'this pasted text must stay local';
    const snapshot = createShareSnapshot(
      makeResult({
        testMode: 'custom',
        configuration: {
          ...DEFAULT_TIMED_CONFIG,
          mode: 'custom',
          durationSeconds: null,
          customText: secret,
        },
      }),
    );

    expect(snapshot.configSummary).toBe('Custom text');
    expect(snapshot.excluded).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain(secret);
  });
});

describe('share codec', () => {
  it('round-trips a snapshot through a URL-safe encoding', () => {
    const snapshot = createShareSnapshot(makeResult());

    const encoded = encodeShareSnapshot(snapshot);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShareSnapshot(encoded)).toEqual(snapshot);
  });

  it('survives non-ASCII configuration text', () => {
    const snapshot = { ...createShareSnapshot(makeResult()), configSummary: 'Café · naïve' };

    expect(decodeShareSnapshot(encodeShareSnapshot(snapshot))).toEqual(snapshot);
  });

  it('rejects broken, non-JSON, oversized, and inconsistent payloads', () => {
    expect(decodeShareSnapshot('')).toBeNull();
    expect(decodeShareSnapshot('not base64!')).toBeNull();
    expect(decodeShareSnapshot(btoa('not json'))).toBeNull();
    expect(decodeShareSnapshot('A'.repeat(MAX_ENCODED_SHARE_LENGTH + 1))).toBeNull();

    const snapshot = createShareSnapshot(makeResult());

    expect(decodeShareSnapshot(encodeShareSnapshot({ ...snapshot, accuracy: 120 }))).toBeNull();
    expect(
      decodeShareSnapshot(encodeShareSnapshot({ ...snapshot, mode: 'words', wordCount: null })),
    ).toBeNull();
    expect(
      decodeShareSnapshot(encodeShareSnapshot({ ...snapshot, mode: 'timed', wordCount: 10 })),
    ).toBeNull();
  });

  it('builds an absolute link and refuses one over the size cap', () => {
    const snapshot = createShareSnapshot(makeResult());

    const url = buildShareUrl(snapshot, 'https://typelab.example/');

    expect(url).toMatch(/^https:\/\/typelab\.example\/shared\?r=[A-Za-z0-9_-]+$/);
    expect(buildShareUrl(snapshot, 'https://typelab.example', 20)).toBeNull();
    expect(buildShareUrl(snapshot, '')).toBeNull();
  });
});

describe('share summary', () => {
  it('writes a compact result someone can paste into a chat', () => {
    const snapshot = createShareSnapshot(makeResult());

    expect(buildShareSummary(snapshot, 'https://typelab.example/shared?r=abc')).toBe(
      [
        'TypeLab · 30 seconds · English',
        '72.4 net WPM · 75.0 raw WPM · 97.2% accuracy · 84.6% consistency',
        'Snapshot · not a verified score.',
        '2026-10-27 · scoring 1.0.0',
        'https://typelab.example/shared?r=abc',
      ].join('\n'),
    );
  });

  it('names the source, the unranked state, and the word count', () => {
    const quote = QUOTES[0]!;
    const snapshot = createShareSnapshot(
      makeResult({
        testMode: 'quote',
        flags: ['failed'],
        configuration: {
          ...DEFAULT_TIMED_CONFIG,
          mode: 'quote',
          durationSeconds: null,
          quoteId: quote.id,
          customText: null,
        },
      }),
    );
    const summary = buildShareSummary(snapshot);

    expect(summary).toContain(`${quote.source} — ${quote.author}`);
    expect(summary).toContain('Unranked run');
    expect(summary).not.toContain('/shared?r=');
  });

  it('reports a word-count run from its stored word count', () => {
    const snapshot = createShareSnapshot(
      makeResult({
        testMode: 'words',
        configuration: DEFAULT_WORDS_CONFIG,
        durationMs: 24_000,
        wordCount: 25,
      }),
    );

    expect(buildShareSummary(snapshot)).toContain('TypeLab · 25 words · English');
  });

  it('dates a late run by the local calendar, not UTC', () => {
    const late = new Date(2026, 9, 27, 23, 30).toISOString();

    expect(formatShareDate(late)).toBe('2026-10-27');
  });
});
