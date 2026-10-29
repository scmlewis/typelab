import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG } from '@/engine/config';
import { QUOTES } from '@/engine/content/quotes';
import type { TestResult } from '@/engine/types';
import { shareCardFileName, shareCardText } from '@/features/share/shareCard';
import { createShareSnapshot } from '@/features/share/shareData';

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

describe('share card', () => {
  it('builds the card text from the snapshot', () => {
    expect(shareCardText(createShareSnapshot(makeResult()))).toEqual({
      mode: '30 SECONDS · ENGLISH',
      netWpm: '72.4',
      rawWpm: '75.0',
      accuracy: '97.2%',
      consistency: '84.6%',
      time: '30.0s',
      detail: '30 seconds · English 200',
      attribution: null,
      date: '2026-10-27',
      excluded: false,
    });
  });

  it('adds the attribution and unranked state', () => {
    const quote = QUOTES[1]!;

    const text = shareCardText(
      createShareSnapshot(
        makeResult({
          testMode: 'quote',
          flags: ['under-one-second'],
          configuration: {
            ...DEFAULT_TIMED_CONFIG,
            mode: 'quote',
            durationSeconds: null,
            quoteId: quote.id,
            customText: null,
          },
        }),
      ),
    );

    expect(text.attribution).toBe(`${quote.source} — ${quote.author}`);
    expect(text.excluded).toBe(true);
  });

  it('names the downloaded file after the local run date', () => {
    expect(shareCardFileName(new Date(2026, 9, 27, 23, 30).toISOString())).toBe(
      'typelab-result-2026-10-27.png',
    );
  });
});
