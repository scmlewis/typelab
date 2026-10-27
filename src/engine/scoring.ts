import type {
  Attempt,
  CharacterStatistics,
  EngineSnapshot,
  IntervalSample,
  ResultFlag,
  TestMode,
  TestResult,
} from '@/engine/types';
import { SCORING_VERSION } from '@/engine/versions';

export const MAX_INTERVAL_SAMPLES = 600;
export const MIN_PARTIAL_BUCKET_MS = 500;
export const SCORING_FLOOR_MS = 1_000;
const BUCKET_MS = 1_000;
const CHARS_PER_WORD = 5;
const MS_PER_MINUTE = 60_000;

export interface AttemptSummary {
  correctAttempts: number;
  incorrectAttempts: number;
  extraAttempts: number;
  correctSeparators: number;
  extraSeparators: number;
  totalAttempts: number;
}

export interface BuildResultOptions {
  id: string;
  clientTestId: string;
  completedAt?: Date;
}

/**
 * Final-state character counts.
 *
 * Finite tests (words, quote, custom) count every untyped trailing word as
 * missed because the test only ends when the whole prompt is complete. A timed
 * test ends with most of its long filler prompt untouched, so it only counts
 * the words up to the active word.
 */
export function computeCharacterStatistics(
  prompt: { words: readonly string[] },
  typedInputs: readonly string[],
  activeWordIndex: number,
  mode: TestMode,
  attempts: readonly Attempt[] = [],
): CharacterStatistics {
  const lastWordIndex = prompt.words.length - 1;
  const clampedActiveIndex = Math.min(Math.max(activeWordIndex, 0), lastWordIndex);
  const consideredWords = mode === 'timed' ? clampedActiveIndex + 1 : prompt.words.length;

  let correct = 0;
  let incorrect = 0;
  let extra = 0;
  let missed = 0;

  for (let wordIndex = 0; wordIndex < consideredWords; wordIndex += 1) {
    const target = prompt.words[wordIndex] ?? '';
    const typed = typedInputs[wordIndex] ?? '';
    const overlap = Math.min(typed.length, target.length);

    for (let position = 0; position < overlap; position += 1) {
      if (typed.charAt(position) === target.charAt(position)) {
        correct += 1;
      } else {
        incorrect += 1;
      }
    }

    missed += Math.max(0, target.length - typed.length);
    extra += Math.max(0, typed.length - target.length);
  }

  const correctSeparators = Math.min(clampedActiveIndex, Math.max(0, lastWordIndex));
  const missedSeparators = mode === 'timed' ? 0 : Math.max(0, lastWordIndex - correctSeparators);
  const extraSeparators = attempts.filter((attempt) => attempt.kind === 'extra-separator').length;

  return {
    correct,
    incorrect,
    extra,
    missed,
    correctSeparators,
    extraSeparators,
    missedSeparators,
  };
}

export function summarizeAttempts(attempts: readonly Attempt[]): AttemptSummary {
  let correctAttempts = 0;
  let incorrectAttempts = 0;
  let extraAttempts = 0;
  let correctSeparators = 0;
  let extraSeparators = 0;

  for (const attempt of attempts) {
    switch (attempt.kind) {
      case 'correct':
        correctAttempts += 1;
        break;
      case 'incorrect':
        incorrectAttempts += 1;
        break;
      case 'extra':
        extraAttempts += 1;
        break;
      case 'separator':
        correctSeparators += 1;
        break;
      case 'extra-separator':
        extraSeparators += 1;
        break;
    }
  }

  return {
    correctAttempts,
    incorrectAttempts,
    extraAttempts,
    correctSeparators,
    extraSeparators,
    totalAttempts: attempts.length,
  };
}

/**
 * Attempt-based accuracy. A correctly placed separator is a correct attempt and
 * an extra separator is an incorrect attempt, so spaces are not free.
 */
export function computeAccuracy(attempts: readonly Attempt[]): number {
  if (attempts.length === 0) {
    return 0;
  }

  const summary = summarizeAttempts(attempts);
  const correctAttempts = summary.correctAttempts + summary.correctSeparators;

  return roundPercent((correctAttempts / summary.totalAttempts) * 100);
}

export function computeNetWpm(stats: CharacterStatistics, elapsedMs: number): number {
  const characters = stats.correct + stats.correctSeparators;

  return roundSpeed(characters / CHARS_PER_WORD / elapsedMinutes(elapsedMs));
}

export function computeRawWpm(stats: CharacterStatistics, elapsedMs: number): number {
  const characters =
    stats.correct + stats.incorrect + stats.extra + stats.correctSeparators + stats.extraSeparators;

  return roundSpeed(characters / CHARS_PER_WORD / elapsedMinutes(elapsedMs));
}

export function buildIntervalSamples(
  attempts: readonly Attempt[],
  elapsedMs: number,
): IntervalSample[] {
  if (!(elapsedMs > 0)) {
    return [];
  }

  const totalBuckets = countIntervalBuckets(elapsedMs);
  const bucketCount = Math.min(totalBuckets, MAX_INTERVAL_SAMPLES);
  const chars = new Array<number>(bucketCount).fill(0);

  for (const attempt of attempts) {
    const bucketIndex = Math.floor(attempt.atMs / BUCKET_MS);

    if (bucketIndex >= bucketCount) {
      // A commit at the exact completion instant lands on the upper boundary
      // of the last bucket. Anything later is outside the stored window.
      if (attempt.atMs === elapsedMs && bucketCount === totalBuckets) {
        const lastIndex = bucketCount - 1;
        chars[lastIndex] = (chars[lastIndex] ?? 0) + 1;
      }

      continue;
    }

    const current = chars[bucketIndex] ?? 0;
    chars[bucketIndex] = current + 1;
  }

  return chars.map((bucketChars, index) => {
    const startMs = index * BUCKET_MS;
    const durationMs = Math.min(BUCKET_MS, Math.max(0, elapsedMs - startMs));

    return {
      startMs,
      durationMs,
      chars: bucketChars,
      wpm: roundSpeed(bucketChars / CHARS_PER_WORD / (durationMs / MS_PER_MINUTE)),
    };
  });
}

export function computeConsistency(samples: readonly IntervalSample[]): number {
  if (samples.length < 2) {
    return 0;
  }

  const speeds = samples.map((sample) => sample.wpm);
  const mean = speeds.reduce((total, speed) => total + speed, 0) / speeds.length;

  if (!(mean > 0)) {
    return 0;
  }

  const variance =
    speeds.reduce((total, speed) => total + (speed - mean) ** 2, 0) / (speeds.length - 1);
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  const consistency = 100 * (1 - coefficientOfVariation);

  return roundSpeed(Math.min(100, Math.max(0, consistency)));
}

export function buildResult(snapshot: EngineSnapshot, options: BuildResultOptions): TestResult {
  if (snapshot.status !== 'completed' && snapshot.status !== 'failed') {
    throw new Error('A result can only be built from a terminal, non-cancelled test.');
  }

  const { config, prompt } = snapshot;
  const characterStatistics = computeCharacterStatistics(
    prompt,
    snapshot.typedInputs,
    snapshot.activeWordIndex,
    config.mode,
    snapshot.attempts,
  );
  const samples = buildIntervalSamples(snapshot.attempts, snapshot.elapsedMs);
  const truncatedSamples = countIntervalBuckets(snapshot.elapsedMs) > MAX_INTERVAL_SAMPLES;
  const flags = collectFlags(snapshot, truncatedSamples);
  const completedAt = (options.completedAt ?? new Date()).toISOString();

  return {
    id: options.id,
    clientTestId: options.clientTestId,
    testMode: config.mode,
    language: config.language,
    configuration: config,
    promptId: prompt.id,
    seed: config.seed,
    durationMs: config.mode === 'timed' ? config.durationSeconds * 1_000 : snapshot.elapsedMs,
    wordCount: config.mode === 'words' ? config.wordCount : null,
    netWpm: computeNetWpm(characterStatistics, snapshot.elapsedMs),
    rawWpm: computeRawWpm(characterStatistics, snapshot.elapsedMs),
    accuracy: computeAccuracy(snapshot.attempts),
    characterStatistics,
    consistency: computeConsistency(samples),
    flags,
    samples,
    scoringVersion: SCORING_VERSION,
    generatorVersion: prompt.generatorVersion,
    failureReason: snapshot.failureReason,
    completedAt,
    createdAt: completedAt,
  };
}

export function isDegenerateResult(result: { flags: readonly ResultFlag[] }): boolean {
  return (
    result.flags.includes('no-input') ||
    result.flags.includes('under-one-second') ||
    result.flags.includes('failed')
  );
}

export function countIntervalBuckets(elapsedMs: number): number {
  if (!(elapsedMs > 0)) {
    return 0;
  }

  const fullBuckets = Math.floor(elapsedMs / BUCKET_MS);
  const remainder = elapsedMs - fullBuckets * BUCKET_MS;

  return fullBuckets + (remainder >= MIN_PARTIAL_BUCKET_MS ? 1 : 0);
}

function collectFlags(snapshot: EngineSnapshot, truncatedSamples: boolean): ResultFlag[] {
  const flags: ResultFlag[] = [];

  if (snapshot.attempts.length === 0) {
    flags.push('no-input');
  }

  if (snapshot.elapsedMs < SCORING_FLOOR_MS) {
    flags.push('under-one-second');
  }

  if (snapshot.status === 'failed') {
    flags.push('failed');
  }

  if (truncatedSamples) {
    flags.push('low-confidence');
  }

  return flags;
}

function elapsedMinutes(elapsedMs: number): number {
  return Math.max(0, elapsedMs, SCORING_FLOOR_MS) / MS_PER_MINUTE;
}

function roundSpeed(value: number): number {
  return round(value, 1);
}

function roundPercent(value: number): number {
  return round(value, 2);
}

function round(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
