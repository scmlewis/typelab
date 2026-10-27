import { describe, expect, it } from 'vitest';

import { FakeClock } from '@/engine/clock';
import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import { TypingEngine } from '@/engine/engine';
import { createPromptFromText } from '@/engine/prompt';
import type { TimedTestConfig, WordsTestConfig } from '@/engine/types';

const PROMPT = createPromptFromText('the quick brown');

function createWordsEngine(
  overrides: Partial<WordsTestConfig> = {},
  prompt = PROMPT,
  clock = new FakeClock(),
) {
  const config: WordsTestConfig = {
    ...DEFAULT_WORDS_CONFIG,
    wordCount: 10,
    ...overrides,
  };

  return {
    clock,
    engine: new TypingEngine({ config, prompt, clock }),
  };
}

function createTimedEngine(overrides: Partial<TimedTestConfig> = {}, clock = new FakeClock()) {
  const config: TimedTestConfig = {
    ...DEFAULT_TIMED_CONFIG,
    durationSeconds: 15,
    ...overrides,
  };

  return {
    clock,
    engine: new TypingEngine({ config, prompt: PROMPT, clock }),
  };
}

describe('typing engine', () => {
  it('starts idle and starts on the first non-space character', () => {
    const { clock, engine } = createWordsEngine();

    expect(engine.getSnapshot()).toMatchObject({
      status: 'idle',
      activeWordIndex: 0,
      elapsedMs: 0,
    });

    engine.insertText(' ');

    expect(engine.getSnapshot().status).toBe('idle');
    expect(engine.getSnapshot().typedInputs).toEqual(['', '', '']);

    clock.advance(250);
    engine.insertText('t');

    expect(engine.getSnapshot().status).toBe('running');
    expect(engine.getSnapshot().typedInputs[0]).toBe('t');
    expect(engine.getSnapshot().attempts[0]?.atMs).toBe(0);

    clock.advance(500);
    engine.tick();

    expect(engine.getSnapshot().elapsedMs).toBe(500);
  });

  it('tracks typed input and advances on a space', () => {
    const { engine } = createWordsEngine();

    engine.insertText('the');

    expect(engine.getSnapshot().typedInputs[0]).toBe('the');
    expect(engine.getSnapshot().attempts.map((attempt) => attempt.kind)).toEqual([
      'correct',
      'correct',
      'correct',
    ]);

    engine.insertText(' ');

    expect(engine.getSnapshot().activeWordIndex).toBe(1);
    expect(engine.getSnapshot().attempts.at(-1)?.kind).toBe('separator');
    expect(engine.getSnapshot().commitTimestampsMs).toHaveLength(4);

    engine.insertText('quick');

    expect(engine.getSnapshot().typedInputs[1]).toBe('quick');
    expect(engine.getSnapshot().status).toBe('running');
  });

  it('backspaces the current word without removing attempts', () => {
    const { engine } = createWordsEngine();

    engine.insertText('thx');
    engine.backspace();

    expect(engine.getSnapshot().typedInputs[0]).toBe('th');

    engine.insertText('e');

    expect(engine.getSnapshot().typedInputs[0]).toBe('the');
    expect(engine.getSnapshot().attempts.map((attempt) => attempt.kind)).toEqual([
      'correct',
      'correct',
      'incorrect',
      'correct',
    ]);
  });

  it('backspaces into the previous word at a word boundary', () => {
    const { engine } = createWordsEngine();

    engine.insertText('the');
    engine.insertText(' ');
    engine.backspace();

    expect(engine.getSnapshot().activeWordIndex).toBe(0);
    expect(engine.getSnapshot().typedInputs).toEqual(['th', '', '']);
  });

  it('does nothing when backspacing an empty first word', () => {
    const { engine } = createWordsEngine();

    engine.backspace();

    expect(engine.getSnapshot().status).toBe('idle');
    expect(engine.getSnapshot().typedInputs).toEqual(['', '', '']);
    expect(engine.getSnapshot().attempts).toEqual([]);
  });

  it('ignores backspace under the no-backspace policy', () => {
    const { engine } = createWordsEngine({ errorPolicy: 'no-backspace' });

    engine.insertText('thex');
    engine.backspace();

    expect(engine.getSnapshot().typedInputs[0]).toBe('thex');
  });

  it('fails immediately on a mismatch under the strict policy', () => {
    const { engine } = createWordsEngine({ errorPolicy: 'strict' });

    engine.insertText('thx');

    expect(engine.getSnapshot().status).toBe('failed');
    expect(engine.getSnapshot().failureReason).toBe('strict-error');
    expect(engine.getSnapshot().typedInputs[0]).toBe('thx');
    expect(engine.getSnapshot().attempts.at(-1)?.kind).toBe('incorrect');

    engine.insertText('e');

    expect(engine.getSnapshot().typedInputs[0]).toBe('thx');
  });

  it('allows a corrected mismatch under the free policy', () => {
    const { engine } = createWordsEngine();

    engine.insertText('thx');
    engine.backspace();
    engine.insertText('e');

    expect(engine.getSnapshot().status).toBe('running');
    expect(engine.getSnapshot().typedInputs[0]).toBe('the');
    expect(engine.getSnapshot().attempts.some((attempt) => attempt.kind === 'incorrect')).toBe(
      true,
    );
  });

  it('completes a word test on the final character', () => {
    const { clock, engine } = createWordsEngine();

    engine.insertText('the quick ');
    clock.advance(2_000);
    engine.insertText('brown');

    expect(engine.getSnapshot().status).toBe('completed');
    expect(engine.getSnapshot().activeWordIndex).toBe(2);
    expect(engine.getSnapshot().elapsedMs).toBe(2_000);
    expect(engine.getSnapshot().typedInputs).toEqual(['the', 'quick', 'brown']);

    engine.insertText('x');

    expect(engine.getSnapshot().typedInputs[2]).toBe('brown');
  });

  it('completes a word test when the final word is skipped with a space', () => {
    const { engine } = createWordsEngine();

    engine.insertText('the quick bro');
    engine.insertText(' ');

    expect(engine.getSnapshot().status).toBe('completed');
    expect(engine.getSnapshot().typedInputs).toEqual(['the', 'quick', 'bro']);
    expect(engine.getSnapshot().activeWordIndex).toBe(2);
  });

  it('completes a timed test exactly at the boundary', () => {
    const { clock, engine } = createTimedEngine();

    engine.insertText('the');
    clock.advance(15_000);
    engine.tick();

    expect(engine.getSnapshot().status).toBe('completed');
    expect(engine.getSnapshot().elapsedMs).toBe(15_000);
  });

  it('ignores input after the timed boundary', () => {
    const { clock, engine } = createTimedEngine();

    engine.insertText('the');
    clock.advance(15_001);
    engine.insertText('x');

    expect(engine.getSnapshot().status).toBe('completed');
    expect(engine.getSnapshot().typedInputs[0]).toBe('the');
    expect(engine.getSnapshot().attempts).toHaveLength(3);
    expect(engine.getSnapshot().elapsedMs).toBe(15_000);
  });

  it('clamps timed elapsed time to the configured duration', () => {
    const { clock, engine } = createTimedEngine();

    engine.insertText('t');
    clock.advance(20_000);
    engine.tick();

    expect(engine.getSnapshot().elapsedMs).toBe(15_000);
  });

  it('does not complete a timed test early when the target text is exhausted', () => {
    const { engine } = createTimedEngine();

    engine.insertText('the quick brown');

    expect(engine.getSnapshot().status).toBe('running');
    expect(engine.getSnapshot().activeWordIndex).toBe(2);
  });

  it('skips a word when space is pressed early', () => {
    const { engine } = createWordsEngine();

    engine.insertText('th');
    engine.insertText(' ');

    expect(engine.getSnapshot().activeWordIndex).toBe(1);
    expect(engine.getSnapshot().typedInputs).toEqual(['th', '', '']);
    expect(engine.getSnapshot().attempts.map((attempt) => attempt.kind)).toEqual([
      'correct',
      'correct',
      'separator',
    ]);
  });

  it('counts repeated spaces as extra separators without advancing', () => {
    const { engine } = createWordsEngine();

    engine.insertText('the');
    engine.insertText(' ');
    const attemptCount = engine.getSnapshot().attempts.length;

    engine.insertText(' ');

    expect(engine.getSnapshot().activeWordIndex).toBe(1);
    expect(engine.getSnapshot().attempts).toHaveLength(attemptCount + 1);
    expect(engine.getSnapshot().attempts.at(-1)?.kind).toBe('extra-separator');
  });

  it('counts characters beyond the target word as extra attempts', () => {
    const { engine } = createWordsEngine();

    engine.insertText('thex');

    expect(engine.getSnapshot().typedInputs[0]).toBe('thex');
    expect(engine.getSnapshot().attempts.map((attempt) => attempt.kind)).toEqual([
      'correct',
      'correct',
      'correct',
      'extra',
    ]);
  });

  it('freezes the test when cancelled', () => {
    const { clock, engine } = createWordsEngine();

    engine.insertText('the');
    clock.advance(500);
    engine.cancel();

    expect(engine.getSnapshot().status).toBe('cancelled');
    expect(engine.getSnapshot().elapsedMs).toBe(500);

    engine.insertText('x');

    expect(engine.getSnapshot().typedInputs[0]).toBe('the');
  });

  it('resets to idle and can load a new prompt', () => {
    const { clock, engine } = createWordsEngine();

    engine.insertText('the');
    clock.advance(100);
    engine.reset({ prompt: createPromptFromText('one two') });

    expect(engine.getSnapshot()).toMatchObject({
      status: 'idle',
      activeWordIndex: 0,
      elapsedMs: 0,
      typedInputs: ['', ''],
      attempts: [],
      commitTimestampsMs: [],
    });
  });

  it('records attempt timestamps relative to the first character', () => {
    const clock = new FakeClock(1_000);
    const { engine } = createWordsEngine({}, PROMPT, clock);

    engine.insertText('t');
    clock.advance(250);
    engine.insertText('h');

    expect(engine.getSnapshot().attempts.map((attempt) => attempt.atMs)).toEqual([0, 250]);
  });
});
