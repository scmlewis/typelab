import type { Clock } from '@/engine/clock';
import type {
  Attempt,
  AttemptKind,
  EngineSnapshot,
  EngineStatus,
  Prompt,
  TestConfig,
} from '@/engine/types';

export interface TypingEngineOptions {
  config: TestConfig;
  prompt: Prompt;
  clock: Clock;
}

const MAX_EXTRA_CHARACTERS = 64;

export class TypingEngine {
  private readonly clock: Clock;
  private config: TestConfig;
  private prompt: Prompt;

  private status: EngineStatus = 'idle';
  private typedInputs: string[];
  private activeWordIndex = 0;
  private elapsedMs = 0;
  private startedAtMs: number | null = null;
  private attempts: Attempt[] = [];
  private commitTimestampsMs: number[] = [];
  private failureReason: string | null = null;
  private justAdvanced = false;
  private snapshot: EngineSnapshot;

  constructor(options: TypingEngineOptions) {
    if (options.prompt.words.length === 0) {
      throw new Error('A typing engine needs at least one target word.');
    }

    this.clock = options.clock;
    this.config = options.config;
    this.prompt = options.prompt;
    this.typedInputs = this.emptyInputs();
    this.snapshot = this.buildSnapshot();
  }

  getSnapshot(): EngineSnapshot {
    return this.snapshot;
  }

  insertText(text: string): EngineSnapshot {
    if (this.isTerminal()) {
      return this.snapshot;
    }

    for (const character of text) {
      if (this.isTerminal()) {
        break;
      }

      if (character === ' ') {
        this.handleSpace();
        continue;
      }

      if (character === '\n' || character === '\r' || character === '\t') {
        continue;
      }

      if (this.status === 'idle') {
        this.start();
      }

      if (this.status !== 'running') {
        break;
      }

      if (!this.refreshElapsed()) {
        break;
      }

      this.handleCharacter(character);
    }

    this.rebuild();
    return this.snapshot;
  }

  backspace(): EngineSnapshot {
    if (this.status === 'idle' || this.isTerminal()) {
      return this.snapshot;
    }

    if (!this.refreshElapsed()) {
      this.rebuild();
      return this.snapshot;
    }

    if (this.config.errorPolicy === 'no-backspace') {
      this.rebuild();
      return this.snapshot;
    }

    if (this.justAdvanced) {
      this.justAdvanced = false;

      if (this.activeWordIndex > 0) {
        this.activeWordIndex -= 1;
      }

      this.removeLastCharacter();
    } else if ((this.typedInputs[this.activeWordIndex] ?? '').length > 0) {
      this.removeLastCharacter();
    } else if (this.activeWordIndex > 0) {
      this.activeWordIndex -= 1;
      this.removeLastCharacter();
    }

    this.rebuild();
    return this.snapshot;
  }

  tick(): EngineSnapshot {
    if (this.status === 'running') {
      this.refreshElapsed();
      this.rebuild();
    }

    return this.snapshot;
  }

  cancel(): EngineSnapshot {
    if (this.isTerminal()) {
      return this.snapshot;
    }

    if (this.status === 'running' && !this.refreshElapsed()) {
      this.rebuild();
      return this.snapshot;
    }

    const elapsed = this.status === 'running' ? this.currentElapsed() : 0;

    this.status = 'cancelled';
    this.elapsedMs = elapsed;
    this.rebuild();

    return this.snapshot;
  }

  reset(next: { config?: TestConfig; prompt?: Prompt } = {}): EngineSnapshot {
    if (next.config !== undefined) {
      this.config = next.config;
    }

    if (next.prompt !== undefined) {
      if (next.prompt.words.length === 0) {
        throw new Error('A typing engine needs at least one target word.');
      }

      this.prompt = next.prompt;
    }

    this.status = 'idle';
    this.typedInputs = this.emptyInputs();
    this.activeWordIndex = 0;
    this.elapsedMs = 0;
    this.startedAtMs = null;
    this.attempts = [];
    this.commitTimestampsMs = [];
    this.failureReason = null;
    this.justAdvanced = false;
    this.rebuild();

    return this.snapshot;
  }

  private handleCharacter(character: string): void {
    const target = this.prompt.words[this.activeWordIndex];

    if (target === undefined) {
      return;
    }

    const current = this.typedInputs[this.activeWordIndex] ?? '';
    const position = current.length;
    const kind: AttemptKind =
      position < target.length
        ? target.charAt(position) === character
          ? 'correct'
          : 'incorrect'
        : 'extra';

    this.recordAttempt(kind);

    if (position < target.length + MAX_EXTRA_CHARACTERS) {
      this.typedInputs[this.activeWordIndex] = `${current}${character}`;
    }

    this.justAdvanced = false;

    if (this.config.errorPolicy === 'strict' && kind !== 'correct') {
      this.fail('strict-error');
      return;
    }

    const isFinalWord = this.activeWordIndex === this.prompt.words.length - 1;

    if (this.config.mode !== 'timed' && isFinalWord && current.length + 1 >= target.length) {
      this.completeAt(this.currentElapsed());
    }
  }

  private handleSpace(): void {
    if (this.status === 'idle' || this.isTerminal()) {
      return;
    }

    if (!this.refreshElapsed()) {
      return;
    }

    const lastWordIndex = this.prompt.words.length - 1;

    if (this.activeWordIndex >= lastWordIndex) {
      if (this.config.mode === 'timed') {
        return;
      }

      this.completeAt(this.currentElapsed());
      return;
    }

    if (this.justAdvanced) {
      this.recordAttempt('extra-separator');

      if (this.config.errorPolicy === 'strict') {
        this.fail('strict-error');
      }

      return;
    }

    this.recordAttempt('separator');
    this.activeWordIndex += 1;
    this.justAdvanced = true;
  }

  private recordAttempt(kind: AttemptKind): void {
    const atMs = this.currentElapsed();
    this.attempts.push({ kind, atMs });
    this.commitTimestampsMs.push(atMs);
  }

  private start(): void {
    this.startedAtMs = this.clock.now();
    this.status = 'running';
    this.elapsedMs = 0;
  }

  private refreshElapsed(): boolean {
    if (this.status !== 'running' || this.startedAtMs === null) {
      return false;
    }

    const elapsed = Math.max(0, this.clock.now() - this.startedAtMs);

    if (this.config.mode === 'timed') {
      const durationMs = this.config.durationSeconds * 1_000;

      if (elapsed >= durationMs) {
        this.completeAt(durationMs);
        return false;
      }
    }

    this.elapsedMs = elapsed;
    return true;
  }

  private completeAt(elapsedMs: number): void {
    if (this.status !== 'running') {
      return;
    }

    this.status = 'completed';
    this.elapsedMs = Math.max(0, elapsedMs);
  }

  private fail(reason: string): void {
    if (this.status !== 'running') {
      return;
    }

    const elapsed = this.currentElapsed();

    this.status = 'failed';
    this.elapsedMs = elapsed;
    this.failureReason = reason;
  }

  private currentElapsed(): number {
    if (this.startedAtMs === null) {
      return 0;
    }

    const elapsed = Math.max(0, this.clock.now() - this.startedAtMs);

    return this.config.mode === 'timed'
      ? Math.min(elapsed, this.config.durationSeconds * 1_000)
      : elapsed;
  }

  private removeLastCharacter(): void {
    const current = this.typedInputs[this.activeWordIndex];

    if (current !== undefined && current.length > 0) {
      this.typedInputs[this.activeWordIndex] = current.slice(0, -1);
    }
  }

  private isTerminal(): boolean {
    return this.status === 'completed' || this.status === 'failed' || this.status === 'cancelled';
  }

  private emptyInputs(): string[] {
    return Array.from({ length: this.prompt.words.length }, () => '');
  }

  private rebuild(): void {
    this.snapshot = this.buildSnapshot();
  }

  private buildSnapshot(): EngineSnapshot {
    return Object.freeze({
      status: this.status,
      config: this.config,
      prompt: this.prompt,
      typedInputs: Object.freeze([...this.typedInputs]),
      activeWordIndex: this.activeWordIndex,
      elapsedMs: this.elapsedMs,
      attempts: Object.freeze(this.attempts.map((attempt) => ({ ...attempt }))),
      commitTimestampsMs: Object.freeze([...this.commitTimestampsMs]),
      failureReason: this.failureReason,
    });
  }
}
