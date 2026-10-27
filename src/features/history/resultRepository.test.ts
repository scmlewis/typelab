import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import type { TestResult } from '@/engine/types';
import { LocalResultRepository } from '@/features/history/resultRepository';
import { TypelabDatabase } from '@/features/history/typelabDatabase';

const databases: TypelabDatabase[] = [];

function createRepository() {
  const db = new TypelabDatabase(`typelab-test-${crypto.randomUUID()}`);
  databases.push(db);

  return { db, repository: new LocalResultRepository(db) };
}

let sequence = 0;

function makeResult(overrides: Partial<TestResult> = {}): TestResult {
  sequence += 1;

  const completedAt = new Date(Date.UTC(2026, 9, 27, 12, sequence)).toISOString();

  return {
    id: `result-${sequence}`,
    clientTestId: `client-${sequence}`,
    testMode: 'timed',
    language: 'english',
    configuration: { ...DEFAULT_TIMED_CONFIG, seed: sequence },
    promptId: `prompt-${sequence}`,
    seed: sequence,
    durationMs: 30_000,
    wordCount: null,
    netWpm: 60,
    rawWpm: 62,
    accuracy: 97.5,
    characterStatistics: {
      correct: 150,
      incorrect: 2,
      extra: 1,
      missed: 0,
      correctSeparators: 25,
      extraSeparators: 0,
      missedSeparators: 0,
    },
    consistency: 80,
    flags: [],
    samples: [{ startMs: 0, durationMs: 1_000, chars: 5, wpm: 60 }],
    scoringVersion: '1.0.0',
    generatorVersion: '1.0.0',
    failureReason: null,
    completedAt,
    createdAt: completedAt,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

describe('local result repository', () => {
  it('saves and reads a full result', async () => {
    const { repository } = createRepository();
    const result = makeResult();

    await repository.save(result);

    await expect(repository.get(result.id)).resolves.toEqual(result);
    await expect(repository.get('missing')).resolves.toBeNull();
  });

  it('lists newest first with pagination metadata', async () => {
    const { repository } = createRepository();
    const first = makeResult();
    const second = makeResult();
    const third = makeResult();

    await repository.save(first);
    await repository.save(second);
    await repository.save(third);

    const page = await repository.list({ limit: 2 });

    expect(page.items.map((item) => item.id)).toEqual([third.id, second.id]);
    expect(page.total).toBe(3);
    expect(page.hasMore).toBe(true);

    const next = await repository.list({ limit: 2, offset: 2 });

    expect(next.items.map((item) => item.id)).toEqual([first.id]);
    expect(next.hasMore).toBe(false);
  });

  it('excludes degenerate results unless asked', async () => {
    const { repository } = createRepository();
    const clean = makeResult();
    const failed = makeResult({ flags: ['failed'] });
    const noInput = makeResult({ flags: ['no-input'] });
    const lowConfidence = makeResult({ flags: ['low-confidence'] });

    for (const result of [clean, failed, noInput, lowConfidence]) {
      await repository.save(result);
    }

    const visible = await repository.list({});

    expect(visible.items.map((item) => item.id)).toEqual([lowConfidence.id, clean.id]);
    expect(visible.total).toBe(2);

    const all = await repository.list({ includeExcluded: true });

    expect(all.total).toBe(4);
  });

  it('filters by mode and language', async () => {
    const { repository } = createRepository();
    const timed = makeResult();
    const words = makeResult({
      testMode: 'words',
      configuration: { ...DEFAULT_WORDS_CONFIG, seed: 2 },
      wordCount: 25,
    });

    await repository.save(timed);
    await repository.save(words);

    await expect(repository.list({ testMode: 'words' })).resolves.toMatchObject({
      total: 1,
      items: [{ id: words.id }],
    });
    await expect(repository.list({ language: 'english' })).resolves.toMatchObject({ total: 2 });
    await expect(repository.list({ testMode: 'quote' })).resolves.toMatchObject({ total: 0 });
  });

  it('deletes one result', async () => {
    const { repository } = createRepository();
    const result = makeResult();

    await repository.save(result);
    await repository.delete(result.id);

    await expect(repository.get(result.id)).resolves.toBeNull();
  });

  it('rejects a duplicate clientTestId', async () => {
    const { repository } = createRepository();

    await repository.save(makeResult({ id: 'one', clientTestId: 'shared' }));

    await expect(
      repository.save(makeResult({ id: 'two', clientTestId: 'shared' })),
    ).rejects.toThrow();
  });

  it('treats re-saving the same result as a no-op', async () => {
    const { repository } = createRepository();
    const result = makeResult();

    await repository.save(result);
    await expect(repository.save(result)).resolves.toBeUndefined();
    await expect(repository.list({})).resolves.toMatchObject({ total: 1 });
  });

  it('computes a personal best inside one comparable category', async () => {
    const { repository } = createRepository();
    const slow = makeResult({ netWpm: 50, accuracy: 99 });
    const fast = makeResult({ netWpm: 80, accuracy: 95 });
    const failed = makeResult({ netWpm: 120, flags: ['failed'] });
    const otherDuration = makeResult({
      netWpm: 140,
      configuration: { ...DEFAULT_TIMED_CONFIG, durationSeconds: 60, seed: 9 },
    });

    for (const result of [slow, fast, failed, otherDuration]) {
      await repository.save(result);
    }

    await expect(
      repository.getPersonalBest(`timed:30000:english:english-200:false:false:free`),
    ).resolves.toMatchObject({
      id: fast.id,
      netWpm: 80,
    });

    await expect(
      repository.getPersonalBest('timed:30000:english:english-200:true:false:free'),
    ).resolves.toBeNull();
  });

  it('does not compare custom results', async () => {
    const { repository } = createRepository();
    await repository.save(
      makeResult({
        testMode: 'custom',
        configuration: {
          ...DEFAULT_TIMED_CONFIG,
          mode: 'custom',
          durationSeconds: null,
          customText: 'custom words',
          seed: 3,
        },
      }),
    );

    await expect(repository.getPersonalBest('custom')).resolves.toBeNull();
  });
});
