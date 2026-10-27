import { systemClock, type Clock } from '@/engine/clock';
import { TypingEngine } from '@/engine/engine';
import { buildResult } from '@/engine/scoring';
import type { EngineInput, EngineSnapshot, Prompt, TestConfig, TestResult } from '@/engine/types';

const CLOCK_NOTIFY_MS = 100;

export interface TypingState {
  snapshot: EngineSnapshot;
  result: TestResult | null;
  /** Increments on commits, resets, and cancellation, not on clock ticks. */
  revision: number;
}

export interface TypingStoreOptions {
  config: TestConfig;
  prompt: Prompt;
  clock?: Clock;
  createId?: () => string;
  now?: () => Date;
  onResult?: (result: TestResult) => void;
}

/**
 * External store around the framework-free engine.
 *
 * React reads it through `useSyncExternalStore`. Clock notifications are
 * throttled; snapshot revisions let the word surface re-render only when the
 * typed text changes.
 */
export class TypingStore {
  private readonly clock: Clock;
  private readonly createId: () => string;
  private readonly now: () => Date;
  private readonly onResult: ((result: TestResult) => void) | undefined;
  private readonly listeners = new Set<() => void>();

  private engine: TypingEngine;
  private state: TypingState;
  private lastClockNotifyAt: number;

  constructor(options: TypingStoreOptions) {
    this.clock = options.clock ?? systemClock;
    this.createId = options.createId ?? defaultCreateId;
    this.now = options.now ?? (() => new Date());
    this.onResult = options.onResult;

    this.engine = new TypingEngine({
      config: options.config,
      prompt: options.prompt,
      clock: this.clock,
    });
    this.lastClockNotifyAt = this.clock.now();
    this.state = {
      snapshot: this.engine.getSnapshot(),
      result: null,
      revision: 0,
    };
  }

  getState(): TypingState {
    return this.state;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  input(input: EngineInput): void {
    switch (input.type) {
      case 'insert':
        this.engine.insertText(input.text);
        break;
      case 'backspace':
        this.engine.backspace();
        break;
      case 'cancel':
        this.engine.cancel();
        break;
    }

    this.lastClockNotifyAt = this.clock.now();
    this.sync({ bumpRevision: true });
    this.notify();
  }

  tick(): void {
    if (this.engine.getSnapshot().status !== 'running') {
      return;
    }

    this.engine.tick();
    this.sync();

    const status = this.state.snapshot.status;
    const now = this.clock.now();

    if (status !== 'running' || now - this.lastClockNotifyAt >= CLOCK_NOTIFY_MS) {
      this.lastClockNotifyAt = now;
      this.notify();
    }
  }

  reset(next: { config?: TestConfig; prompt?: Prompt } = {}): void {
    const current = this.engine.getSnapshot();

    this.engine = new TypingEngine({
      config: next.config ?? current.config,
      prompt: next.prompt ?? current.prompt,
      clock: this.clock,
    });
    this.lastClockNotifyAt = this.clock.now();
    this.sync({ bumpRevision: true, clearResult: true });
    this.notify();
  }

  private sync(options: { bumpRevision?: boolean; clearResult?: boolean } = {}): void {
    const snapshot = this.engine.getSnapshot();
    let result = options.clearResult === true ? null : this.state.result;

    if (result === null && (snapshot.status === 'completed' || snapshot.status === 'failed')) {
      const id = this.createId();

      result = buildResult(snapshot, {
        id,
        clientTestId: id,
        completedAt: this.now(),
      });

      this.onResult?.(result);
    }

    this.state = {
      snapshot,
      result,
      revision: this.state.revision + (options.bumpRevision === true ? 1 : 0),
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function defaultCreateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `test-${Math.random().toString(36).slice(2, 12)}`;
}
