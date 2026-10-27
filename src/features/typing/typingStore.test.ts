import { describe, expect, it, vi } from 'vitest';

import { FakeClock } from '@/engine/clock';
import { DEFAULT_TIMED_CONFIG, DEFAULT_WORDS_CONFIG } from '@/engine/config';
import { createPromptFromText } from '@/engine/prompt';
import type { Prompt, TestConfig } from '@/engine/types';
import { TypingStore } from '@/features/typing/typingStore';

const PROMPT = createPromptFromText('the quick brown');
const COMPLETED_AT = new Date('2026-10-27T12:00:00.000Z');

function createStore(
  overrides: {
    config?: TestConfig;
    prompt?: Prompt;
    clock?: FakeClock;
    createId?: () => string;
    onResult?: (result: unknown) => void;
  } = {},
) {
  const clock = overrides.clock ?? new FakeClock();
  const createId = overrides.createId ?? (() => 'generated-id');
  const onResult = overrides.onResult ?? vi.fn();
  const store = new TypingStore({
    config: overrides.config ?? { ...DEFAULT_WORDS_CONFIG, wordCount: 10 },
    prompt: overrides.prompt ?? PROMPT,
    clock,
    createId,
    now: () => COMPLETED_AT,
    onResult,
  });

  return { clock, store, createId, onResult };
}

describe('typing store', () => {
  it('starts idle with no result', () => {
    const { store } = createStore();

    expect(store.getState()).toMatchObject({
      result: null,
      revision: 0,
    });
    expect(store.getState().snapshot.status).toBe('idle');
  });

  it('forwards inserts and notifies subscribers', () => {
    const { store } = createStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.input({ type: 'insert', text: 't' });

    expect(store.getState().snapshot.typedInputs[0]).toBe('t');
    expect(store.getState().snapshot.status).toBe('running');
    expect(store.getState().revision).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.input({ type: 'insert', text: 'h' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('forwards backspace', () => {
    const { store } = createStore();

    store.input({ type: 'insert', text: 'th' });
    store.input({ type: 'backspace' });

    expect(store.getState().snapshot.typedInputs[0]).toBe('t');
  });

  it('throttles clock notifications to roughly ten per second', () => {
    const clock = new FakeClock();
    const { store } = createStore({ clock });
    const listener = vi.fn();
    store.subscribe(listener);

    store.input({ type: 'insert', text: 't' });

    expect(listener).toHaveBeenCalledTimes(1);

    clock.advance(16);
    store.tick();
    clock.advance(50);
    store.tick();

    expect(store.getState().snapshot.elapsedMs).toBe(66);
    expect(listener).toHaveBeenCalledTimes(1);

    clock.advance(50);
    store.tick();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('builds one result when a word test completes', () => {
    const { clock, store, onResult } = createStore();

    store.input({ type: 'insert', text: 'the quick ' });
    clock.advance(2_000);
    store.input({ type: 'insert', text: 'brown' });

    const state = store.getState();

    expect(state.snapshot.status).toBe('completed');
    expect(state.result).toMatchObject({
      id: 'generated-id',
      clientTestId: 'generated-id',
      testMode: 'words',
      durationMs: 2_000,
      netWpm: 90,
      completedAt: '2026-10-27T12:00:00.000Z',
    });
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(state.result);
  });

  it('does not rebuild the result after further input', () => {
    const { store } = createStore();

    store.input({ type: 'insert', text: 'the quick brown' });
    const firstResult = store.getState().result;

    store.input({ type: 'insert', text: 'x' });
    store.input({ type: 'backspace' });

    expect(store.getState().result).toBe(firstResult);
  });

  it('builds a failed result exactly once', () => {
    const { store, onResult } = createStore({
      config: { ...DEFAULT_WORDS_CONFIG, errorPolicy: 'strict' },
      prompt: createPromptFromText('the'),
    });

    store.input({ type: 'insert', text: 'x' });

    expect(store.getState().snapshot.status).toBe('failed');
    expect(store.getState().result?.flags).toEqual(['under-one-second', 'failed']);
    expect(onResult).toHaveBeenCalledTimes(1);

    store.input({ type: 'insert', text: 'y' });

    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it('completes a timed test from a tick and notifies immediately', () => {
    const clock = new FakeClock();
    const { store } = createStore({
      clock,
      config: { ...DEFAULT_TIMED_CONFIG, durationSeconds: 15 },
    });
    const listener = vi.fn();
    store.subscribe(listener);

    store.input({ type: 'insert', text: 'the' });
    listener.mockClear();

    clock.advance(15_000);
    store.tick();

    expect(store.getState().snapshot.status).toBe('completed');
    expect(store.getState().result?.durationMs).toBe(15_000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resets to a fresh idle test and clears the result', () => {
    const { store } = createStore();

    store.input({ type: 'insert', text: 'the quick brown' });
    expect(store.getState().result).not.toBeNull();

    const nextPrompt = createPromptFromText('one two');
    store.reset({ prompt: nextPrompt });

    expect(store.getState()).toMatchObject({
      result: null,
      revision: 2,
    });
    expect(store.getState().snapshot.status).toBe('idle');
    expect(store.getState().snapshot.prompt).toBe(nextPrompt);
    expect(store.getState().snapshot.typedInputs).toEqual(['', '']);
  });

  it('keeps a cancelled test out of results', () => {
    const clock = new FakeClock();
    const { store } = createStore({ clock });

    store.input({ type: 'insert', text: 'the' });
    clock.advance(500);
    store.input({ type: 'cancel' });

    expect(store.getState().snapshot.status).toBe('cancelled');
    expect(store.getState().snapshot.elapsedMs).toBe(500);
    expect(store.getState().result).toBeNull();
  });

  it('ignores ticks unless the test is running', () => {
    const { store, onResult } = createStore();

    store.tick();

    expect(store.getState().snapshot.status).toBe('idle');
    expect(onResult).not.toHaveBeenCalled();
  });
});
