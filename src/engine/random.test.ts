import { describe, expect, it } from 'vitest';

import { createRandom } from '@/engine/random';

describe('seeded random', () => {
  it('produces the same sequence for the same seed', () => {
    const first = createRandom(1234);
    const second = createRandom(1234);

    const firstSequence = Array.from({ length: 8 }, () => first());
    const secondSequence = Array.from({ length: 8 }, () => second());

    expect(firstSequence).toEqual(secondSequence);
  });

  it('produces a different sequence for a different seed', () => {
    const first = createRandom(1);
    const second = createRandom(2);

    expect(Array.from({ length: 8 }, () => first())).not.toEqual(
      Array.from({ length: 8 }, () => second()),
    );
  });

  it('stays inside the unit interval', () => {
    const random = createRandom(0);

    for (let index = 0; index < 1_000; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('supports seed zero', () => {
    const random = createRandom(0);

    expect(random()).toBeTypeOf('number');
    expect(random()).not.toBeNaN();
  });
});
