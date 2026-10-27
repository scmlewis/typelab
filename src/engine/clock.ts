export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: () => performance.now(),
};

export class FakeClock implements Clock {
  private currentMs: number;

  constructor(startMs = 0) {
    this.currentMs = startMs;
  }

  now(): number {
    return this.currentMs;
  }

  advance(durationMs: number): void {
    if (durationMs < 0) {
      throw new Error('A fake clock cannot advance by a negative duration.');
    }

    this.currentMs += durationMs;
  }

  set(timeMs: number): void {
    this.currentMs = timeMs;
  }
}
