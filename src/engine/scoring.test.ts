import { describe, expect, it } from 'vitest';

import { FakeClock } from '@/engine/clock';
import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import { TypingEngine } from '@/engine/engine';
import { createPromptFromText } from '@/engine/prompt';
import {
  buildIntervalSamples,
  buildResult,
  computeAccuracy,
  computeCharacterStatistics,
  computeConsistency,
  computeNetWpm,
  computeRawWpm,
  isDegenerateResult,
} from '@/engine/scoring';
import type {
  Attempt,
  AttemptKind,
  CharacterStatistics,
  EngineSnapshot,
  TestConfig,
} from '@/engine/types';
import { SCORING_VERSION } from '@/engine/versions';

const PROMPT = createPromptFromText('the quick brown');
const COMPLETED_AT = new Date('2026-10-27T12:00:00.000Z');

function attempt(kind: AttemptKind, atMs: number): Attempt {
  return { kind, atMs };
}

function attemptsOf(kinds: readonly AttemptKind[]): Attempt[] {
  return kinds.map((kind, index) => attempt(kind, index * 100));
}

const ZERO_STATS: CharacterStatistics = {
  correct: 0,
  incorrect: 0,
  extra: 0,
  missed: 0,
  correctSeparators: 0,
  extraSeparators: 0,
  missedSeparators: 0,
};

function makeSnapshot(overrides: Partial<EngineSnapshot> = {}): EngineSnapshot {
  const config: TestConfig = { ...DEFAULT_WORDS_CONFIG, wordCount: 10 };

  return {
    status: 'completed',
    config,
    prompt: PROMPT,
    typedInputs: ['the', 'quick', 'brown'],
    activeWordIndex: 2,
    elapsedMs: 30_000,
    attempts: attemptsOf(['correct']),
    commitTimestampsMs: [0],
    failureReason: null,
    ...overrides,
  };
}

describe('character statistics', () => {
  it('counts final correct, incorrect, extra, and missed characters', () => {
    const stats = computeCharacterStatistics(PROMPT, ['the', 'quik', 'brownx'], 2, 'words');

    expect(stats).toEqual({
      correct: 11,
      incorrect: 1,
      extra: 1,
      missed: 1,
      correctSeparators: 2,
      extraSeparators: 0,
      missedSeparators: 0,
    });
  });

  it('counts untouched trailing words and missed separators in a finite test', () => {
    const stats = computeCharacterStatistics(
      createPromptFromText('one two three'),
      ['one', '', ''],
      1,
      'words',
    );

    expect(stats).toEqual({
      correct: 3,
      incorrect: 0,
      extra: 0,
      missed: 8,
      correctSeparators: 1,
      extraSeparators: 0,
      missedSeparators: 1,
    });
  });

  it('does not punish the untouched remainder of a timed prompt', () => {
    const stats = computeCharacterStatistics(
      createPromptFromText('one two three'),
      ['one', '', ''],
      1,
      'timed',
    );

    expect(stats).toEqual({
      correct: 3,
      incorrect: 0,
      extra: 0,
      missed: 3,
      correctSeparators: 1,
      extraSeparators: 0,
      missedSeparators: 0,
    });
  });

  it('keeps corrected characters correct in the final statistics', () => {
    const stats = computeCharacterStatistics(PROMPT, ['the', 'quick', 'brown'], 2, 'words');

    expect(stats.correct).toBe(13);
    expect(stats.incorrect).toBe(0);
  });

  it('counts extra separators from the attempt log', () => {
    const stats = computeCharacterStatistics(
      PROMPT,
      ['the', 'quick', 'brown'],
      2,
      'words',
      attemptsOf(['correct', 'separator', 'extra-separator', 'extra-separator']),
    );

    expect(stats.extraSeparators).toBe(2);
  });
});

describe('accuracy', () => {
  it('treats separators as attempts and extra separators as incorrect', () => {
    const accuracy = computeAccuracy(
      attemptsOf(['correct', 'correct', 'correct', 'separator', 'incorrect', 'extra']),
    );

    expect(accuracy).toBeCloseTo(66.67, 2);
  });

  it('counts a corrected mistake against accuracy', () => {
    const attempts = attemptsOf(['correct', 'incorrect', 'correct', 'separator']);

    expect(computeAccuracy(attempts)).toBeCloseTo(75, 2);
  });

  it('returns zero with no attempts', () => {
    expect(computeAccuracy([])).toBe(0);
  });
});

describe('speed', () => {
  it('computes net and raw WPM from final text', () => {
    const stats: CharacterStatistics = {
      ...ZERO_STATS,
      correct: 250,
      incorrect: 5,
      extra: 2,
      correctSeparators: 50,
      extraSeparators: 1,
    };

    expect(computeNetWpm(stats, 60_000)).toBe(60);
    expect(computeRawWpm(stats, 60_000)).toBe(61.6);
  });

  it('applies a one-second floor to the elapsed time', () => {
    const stats: CharacterStatistics = { ...ZERO_STATS, correct: 5 };

    expect(computeNetWpm(stats, 0)).toBe(60);
    expect(computeRawWpm(stats, 500)).toBe(60);
    expect(computeNetWpm(ZERO_STATS, 0)).toBe(0);
  });

  it('never returns NaN or Infinity', () => {
    expect(Number.isFinite(computeNetWpm(ZERO_STATS, 0))).toBe(true);
    expect(Number.isFinite(computeRawWpm(ZERO_STATS, 0))).toBe(true);
  });
});

describe('interval samples', () => {
  it('groups attempts into one-second buckets aligned to the start', () => {
    const attempts = [
      attempt('correct', 0),
      attempt('correct', 500),
      attempt('correct', 999),
      attempt('correct', 1_000),
      attempt('correct', 1_500),
    ];

    expect(buildIntervalSamples(attempts, 1_600)).toEqual([
      { startMs: 0, durationMs: 1_000, chars: 3, wpm: 36 },
      { startMs: 1_000, durationMs: 600, chars: 2, wpm: 40 },
    ]);
  });

  it('drops a final partial bucket shorter than 500 ms', () => {
    const samples = buildIntervalSamples([attempt('correct', 1_200)], 1_400);

    expect(samples).toEqual([{ startMs: 0, durationMs: 1_000, chars: 0, wpm: 0 }]);
  });

  it('counts attempt timestamps at the exact end inside the last bucket', () => {
    const samples = buildIntervalSamples([attempt('correct', 2_000)], 2_000);

    expect(samples).toHaveLength(2);
    expect(samples[1]).toEqual({ startMs: 1_000, durationMs: 1_000, chars: 1, wpm: 12 });
  });

  it('returns no samples for a zero-length test', () => {
    expect(buildIntervalSamples([attempt('correct', 0)], 0)).toEqual([]);
  });

  it('caps samples at 600 and reports truncation', () => {
    const attempts = Array.from({ length: 700 }, (_, index) => attempt('correct', index * 1_000));

    expect(buildIntervalSamples(attempts, 700_000)).toHaveLength(600);
  });
});

describe('consistency', () => {
  it('computes the coefficient of variation across buckets', () => {
    const samples = [
      { startMs: 0, durationMs: 1_000, chars: 10, wpm: 40 },
      { startMs: 1_000, durationMs: 1_000, chars: 15, wpm: 60 },
    ];

    expect(computeConsistency(samples)).toBeCloseTo(71.7, 1);
  });

  it('returns zero for fewer than two buckets', () => {
    expect(computeConsistency([])).toBe(0);
    expect(computeConsistency([{ startMs: 0, durationMs: 1_000, chars: 10, wpm: 60 }])).toBe(0);
  });

  it('returns zero when the mean is zero', () => {
    expect(
      computeConsistency([
        { startMs: 0, durationMs: 1_000, chars: 0, wpm: 0 },
        { startMs: 1_000, durationMs: 1_000, chars: 0, wpm: 0 },
      ]),
    ).toBe(0);
  });

  it('is 100 for perfectly even buckets', () => {
    expect(
      computeConsistency([
        { startMs: 0, durationMs: 1_000, chars: 10, wpm: 60 },
        { startMs: 1_000, durationMs: 1_000, chars: 10, wpm: 60 },
      ]),
    ).toBe(100);
  });
});

describe('buildResult', () => {
  it('builds a word-count result from an engine snapshot', () => {
    const clock = new FakeClock();
    const engine = new TypingEngine({
      config: { ...DEFAULT_WORDS_CONFIG, wordCount: 10 },
      prompt: PROMPT,
      clock,
    });

    engine.insertText('the quick ');
    clock.advance(2_000);
    engine.insertText('brown');

    const result = buildResult(engine.getSnapshot(), {
      id: 'result-1',
      clientTestId: 'client-1',
      completedAt: COMPLETED_AT,
    });

    expect(result).toMatchObject({
      id: 'result-1',
      clientTestId: 'client-1',
      testMode: 'words',
      language: 'english',
      promptId: PROMPT.id,
      seed: DEFAULT_WORDS_CONFIG.seed,
      durationMs: 2_000,
      wordCount: 10,
      netWpm: 90,
      rawWpm: 90,
      accuracy: 100,
      consistency: 52.9,
      scoringVersion: SCORING_VERSION,
      generatorVersion: PROMPT.generatorVersion,
      failureReason: null,
      completedAt: '2026-10-27T12:00:00.000Z',
      createdAt: '2026-10-27T12:00:00.000Z',
    });
    expect(result.flags).toEqual([]);
    expect(result.characterStatistics).toMatchObject({
      correct: 13,
      correctSeparators: 2,
    });
    expect(result.samples).toHaveLength(2);
  });

  it('reports the configured duration for a timed result', () => {
    const clock = new FakeClock();
    const engine = new TypingEngine({
      config: { ...DEFAULT_TIMED_CONFIG, durationSeconds: 15 },
      prompt: PROMPT,
      clock,
    });

    engine.insertText('the');
    clock.advance(15_000);
    engine.tick();

    const result = buildResult(engine.getSnapshot(), {
      id: 'result-2',
      clientTestId: 'client-2',
      completedAt: COMPLETED_AT,
    });

    expect(result.durationMs).toBe(15_000);
    expect(result.wordCount).toBeNull();
    expect(result.netWpm).toBe(2.4);
    expect(result.characterStatistics.missed).toBe(0);
    expect(result.characterStatistics.missedSeparators).toBe(0);
  });

  it('flags no input and keeps all scores finite', () => {
    const result = buildResult(
      makeSnapshot({
        typedInputs: ['', '', ''],
        activeWordIndex: 0,
        elapsedMs: 30_000,
        attempts: [],
        commitTimestampsMs: [],
      }),
      { id: 'result-3', clientTestId: 'client-3', completedAt: COMPLETED_AT },
    );

    expect(result.accuracy).toBe(0);
    expect(result.netWpm).toBe(0);
    expect(result.rawWpm).toBe(0);
    expect(result.consistency).toBe(0);
    expect(result.characterStatistics.missed).toBe(13);
    expect(result.flags).toEqual(['no-input']);
  });

  it('flags failed and under-one-second results', () => {
    const clock = new FakeClock();
    const engine = new TypingEngine({
      config: { ...DEFAULT_WORDS_CONFIG, errorPolicy: 'strict' },
      prompt: createPromptFromText('the'),
      clock,
    });

    engine.insertText('x');

    const result = buildResult(engine.getSnapshot(), {
      id: 'result-4',
      clientTestId: 'client-4',
      completedAt: COMPLETED_AT,
    });

    expect(result.failureReason).toBe('strict-error');
    expect(result.flags).toEqual(['under-one-second', 'failed']);
    expect(result.durationMs).toBe(0);
    expect(result.characterStatistics.incorrect).toBe(1);
  });

  it('flags a truncated sample set as low confidence', () => {
    const attempts = Array.from({ length: 700 }, (_, index) => attempt('correct', index * 1_000));

    const result = buildResult(
      makeSnapshot({
        attempts,
        elapsedMs: 700_000,
        typedInputs: ['the', '', ''],
        activeWordIndex: 0,
      }),
      { id: 'result-5', clientTestId: 'client-5', completedAt: COMPLETED_AT },
    );

    expect(result.samples).toHaveLength(600);
    expect(result.flags).toEqual(['low-confidence']);
  });

  it('rejects idle and cancelled snapshots', () => {
    expect(() =>
      buildResult(makeSnapshot({ status: 'idle' }), {
        id: 'result-6',
        clientTestId: 'client-6',
      }),
    ).toThrow(/terminal/i);

    expect(() =>
      buildResult(makeSnapshot({ status: 'cancelled' }), {
        id: 'result-7',
        clientTestId: 'client-7',
      }),
    ).toThrow(/terminal/i);
  });
});

describe('degenerate results', () => {
  it('marks no-input, under-one-second, and failed results as degenerate', () => {
    expect(isDegenerateResult({ flags: ['no-input'] })).toBe(true);
    expect(isDegenerateResult({ flags: ['under-one-second'] })).toBe(true);
    expect(isDegenerateResult({ flags: ['failed'] })).toBe(true);
    expect(isDegenerateResult({ flags: ['low-confidence'] })).toBe(false);
    expect(isDegenerateResult({ flags: [] })).toBe(false);
  });
});
