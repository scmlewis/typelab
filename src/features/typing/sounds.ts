import type { SoundSettings } from '@/features/settings/settings';

export type TypingSoundKind = 'correct' | 'incorrect' | 'backspace';

export interface SoundPlayer {
  play(kind: TypingSoundKind): void;
}

export interface SoundParam {
  setValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
}

export interface SoundOscillator {
  type: OscillatorType;
  frequency: SoundParam;
  connect(node: unknown): void;
  start(time?: number): void;
  stop(time?: number): void;
}

export interface SoundGain {
  gain: SoundParam;
  connect(node: unknown): void;
}

export interface AudioContextLike {
  currentTime: number;
  state: 'suspended' | 'running' | 'closed';
  destination: unknown;
  resume(): Promise<void>;
  close(): Promise<void>;
  createOscillator(): SoundOscillator;
  createGain(): SoundGain;
}

export type AudioContextFactory = () => AudioContextLike | null;

interface Tone {
  frequency: number;
  durationSeconds: number;
  level: number;
  type: OscillatorType;
  /** Incorrect cues drop in pitch instead of ringing flat. */
  dropTo?: number;
}

const TONES: Record<TypingSoundKind, Tone> = {
  correct: { frequency: 880, durationSeconds: 0.045, level: 0.28, type: 'triangle' },
  backspace: { frequency: 440, durationSeconds: 0.04, level: 0.22, type: 'triangle' },
  incorrect: {
    frequency: 220,
    durationSeconds: 0.09,
    level: 0.4,
    type: 'sawtooth',
    dropTo: 150,
  },
};

const SILENCE = 0.0001;

/**
 * Opt-in, synthesised keystroke feedback. No audio work happens until a sound
 * is played, which keeps autoplay policies satisfied and silent by default.
 */
export class TypingSounds implements SoundPlayer {
  private preferences: SoundSettings;
  private readonly factory: AudioContextFactory;
  private context: AudioContextLike | null = null;

  constructor(preferences: SoundSettings, factory: AudioContextFactory = browserAudioContext) {
    this.preferences = preferences;
    this.factory = factory;
  }

  setPreferences(preferences: SoundSettings): void {
    this.preferences = preferences;
  }

  play(kind: TypingSoundKind): void {
    if (!this.preferences.enabled || this.preferences.volume <= 0) {
      return;
    }

    const context = this.ensureContext();

    if (context === null) {
      return;
    }

    try {
      if (context.state === 'suspended') {
        void context.resume().catch(() => {});
      }

      this.schedule(context, kind);
    } catch {
      // Audio is decoration; a closed device must never block typing.
    }
  }

  private schedule(context: AudioContextLike, kind: TypingSoundKind): void {
    const tone = TONES[kind];
    const start = context.currentTime;
    const end = start + tone.durationSeconds;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, start);

    if (tone.dropTo !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(tone.dropTo, end);
    }

    gain.gain.setValueAtTime(Math.max(SILENCE, this.preferences.volume * tone.level), start);
    gain.gain.exponentialRampToValueAtTime(SILENCE, end);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }

  dispose(): void {
    const context = this.context;

    this.context = null;

    if (context !== null) {
      void context.close().catch(() => {});
    }
  }

  private ensureContext(): AudioContextLike | null {
    if (this.context !== null) {
      return this.context;
    }

    this.context = this.factory();

    return this.context;
  }
}

function browserAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const Constructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Constructor) {
    return null;
  }

  try {
    return new Constructor() as unknown as AudioContextLike;
  } catch {
    return null;
  }
}
