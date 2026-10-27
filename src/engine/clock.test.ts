import { describe, expect, it } from 'vitest';

import { FakeClock } from '@/engine/clock';

describe('fake clock', () => {
  it('starts at zero by default', () => {
    expect(new FakeClock().now()).toBe(0);
  });

  it('starts at a supplied time', () => {
    expect(new FakeClock(1_000).now()).toBe(1_000);
  });

  it('advances by a positive duration', () => {
    const clock = new FakeClock(10);
    clock.advance(250);

    expect(clock.now()).toBe(260);
  });

  it('rejects a negative advance', () => {
    const clock = new FakeClock();

    expect(() => clock.advance(-1)).toThrow(/negative/i);
  });

  it('can be set to an absolute time', () => {
    const clock = new FakeClock();
    clock.set(5_000);

    expect(clock.now()).toBe(5_000);
  });
});
