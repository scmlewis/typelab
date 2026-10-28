import { afterEach, describe, expect, it, vi } from 'vitest';

import { TypingSounds } from '@/features/typing/sounds';
import type {
  AudioContextFactory,
  AudioContextLike,
  SoundGain,
  SoundOscillator,
} from '@/features/typing/sounds';

function at<T>(items: readonly T[], index: number): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`Missing item at index ${index}`);
  }

  return item;
}

interface FakeAudio {
  context: AudioContextLike;
  factory: AudioContextFactory;
  oscillators: FakeOscillator[];
  gains: FakeGain[];
  resume: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

class FakeParam {
  readonly events: { type: 'set' | 'ramp'; value: number; time: number }[] = [];

  setValueAtTime(value: number, time: number) {
    this.events.push({ type: 'set', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'ramp', value, time });
    return this;
  }
}

class FakeOscillator implements SoundOscillator {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeParam();
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  connect() {}

  start(time = 0) {
    this.startedAt = time;
  }

  stop(time = 0) {
    this.stoppedAt = time;
  }
}

class FakeGain implements SoundGain {
  readonly gain = new FakeParam();

  connect() {}
}

function createFakeAudio(state: 'suspended' | 'running' = 'running'): FakeAudio {
  const oscillators: FakeOscillator[] = [];
  const gains: FakeGain[] = [];
  const resume = vi.fn(() => Promise.resolve());
  const close = vi.fn(() => Promise.resolve());
  const context: AudioContextLike = {
    currentTime: 4,
    state,
    destination: {},
    resume,
    close,
    createOscillator: () => {
      const oscillator = new FakeOscillator();

      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => {
      const gain = new FakeGain();

      gains.push(gain);
      return gain;
    },
  };
  const factory: AudioContextFactory = vi.fn(() => context);

  return { context, factory, oscillators, gains, resume, close };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('typing sounds', () => {
  it('stays silent until sounds are enabled', () => {
    const audio = createFakeAudio();
    const sounds = new TypingSounds({ enabled: false, volume: 0.6 }, audio.factory);

    sounds.play('correct');

    expect(audio.factory).not.toHaveBeenCalled();
  });

  it('stays silent at zero volume', () => {
    const audio = createFakeAudio();
    const sounds = new TypingSounds({ enabled: true, volume: 0 }, audio.factory);

    sounds.play('correct');

    expect(audio.factory).not.toHaveBeenCalled();
  });

  it('creates the audio context once and schedules a tone per cue', () => {
    const audio = createFakeAudio();
    const sounds = new TypingSounds({ enabled: true, volume: 0.5 }, audio.factory);

    sounds.play('correct');
    sounds.play('backspace');

    expect(audio.factory).toHaveBeenCalledTimes(1);
    expect(audio.oscillators).toHaveLength(2);
    expect(at(audio.oscillators, 0).startedAt).toBe(4);
    expect(at(audio.oscillators, 0).stoppedAt).toBeCloseTo(4.045);
    expect(at(audio.oscillators, 1).type).toBe('triangle');
  });

  it('scales the gain by the chosen volume', () => {
    const audio = createFakeAudio();
    const sounds = new TypingSounds({ enabled: true, volume: 0.5 }, audio.factory);

    sounds.play('incorrect');

    const [start, ramp] = at(audio.gains, 0).gain.events;

    expect(start?.value).toBeCloseTo(0.2);
    expect(start?.time).toBe(4);
    expect(ramp).toMatchObject({ type: 'ramp', value: 0.0001 });
  });

  it('resumes a suspended context before playing', () => {
    const audio = createFakeAudio('suspended');
    const sounds = new TypingSounds({ enabled: true, volume: 0.5 }, audio.factory);

    sounds.play('correct');

    expect(audio.resume).toHaveBeenCalledTimes(1);
  });

  it('applies new preferences immediately', () => {
    const audio = createFakeAudio();
    const sounds = new TypingSounds({ enabled: true, volume: 0.5 }, audio.factory);

    sounds.setPreferences({ enabled: false, volume: 0.5 });
    sounds.play('correct');

    expect(audio.factory).not.toHaveBeenCalled();
  });

  it('survives a browser that refuses to create audio', () => {
    const sounds = new TypingSounds({ enabled: true, volume: 0.5 }, () => null);

    expect(() => {
      sounds.play('correct');
    }).not.toThrow();
  });

  it('swallows scheduling failures so typing cannot be blocked', () => {
    const audio = createFakeAudio();
    const sounds = new TypingSounds({ enabled: true, volume: 0.5 }, audio.factory);

    vi.spyOn(audio.context, 'createOscillator').mockImplementation(() => {
      throw new Error('audio device lost');
    });

    expect(() => {
      sounds.play('correct');
    }).not.toThrow();
  });

  it('closes the context when disposed and can start again afterwards', async () => {
    const audio = createFakeAudio();
    const sounds = new TypingSounds({ enabled: true, volume: 0.5 }, audio.factory);

    sounds.play('correct');
    sounds.dispose();

    expect(audio.close).toHaveBeenCalledTimes(1);

    sounds.play('correct');

    expect(audio.factory).toHaveBeenCalledTimes(2);
    await Promise.resolve();
  });
});
