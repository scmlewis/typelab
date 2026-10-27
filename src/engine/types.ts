export type Language = 'english';
export type Vocabulary = 'english-200' | 'english-1k';
export type TestMode = 'timed' | 'words' | 'quote' | 'custom';
export type ErrorPolicy = 'free' | 'strict' | 'no-backspace';
export type DurationSeconds = 15 | 30 | 60 | 120;
export type WordCount = 10 | 25 | 50 | 100;

interface BaseTestConfig {
  language: Language;
  vocabulary: Vocabulary;
  punctuation: boolean;
  numbers: boolean;
  errorPolicy: ErrorPolicy;
  seed: number;
}

export interface TimedTestConfig extends BaseTestConfig {
  mode: 'timed';
  durationSeconds: DurationSeconds;
  wordCount: null;
  quoteId: null;
  customText: null;
}

export interface WordsTestConfig extends BaseTestConfig {
  mode: 'words';
  durationSeconds: null;
  wordCount: WordCount;
  quoteId: null;
  customText: null;
}

export interface QuoteTestConfig extends BaseTestConfig {
  mode: 'quote';
  durationSeconds: null;
  wordCount: null;
  quoteId: string;
  customText: null;
}

export interface CustomTestConfig extends BaseTestConfig {
  mode: 'custom';
  durationSeconds: null;
  wordCount: null;
  quoteId: null;
  customText: string;
}

export type TestConfig = TimedTestConfig | WordsTestConfig | QuoteTestConfig | CustomTestConfig;

export type AttemptKind = 'correct' | 'incorrect' | 'extra' | 'separator' | 'extra-separator';

export interface Attempt {
  kind: AttemptKind;
  atMs: number;
}

export interface Prompt {
  id: string;
  text: string;
  words: readonly string[];
  generatorVersion: string;
}

export interface IntervalSample {
  startMs: number;
  durationMs: number;
  chars: number;
  wpm: number;
}

export interface CharacterStatistics {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
  correctSeparators: number;
  extraSeparators: number;
  missedSeparators: number;
}

export type ResultFlag = 'no-input' | 'under-one-second' | 'failed' | 'low-confidence';

export type EngineStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface EngineSnapshot {
  status: EngineStatus;
  config: TestConfig;
  prompt: Prompt;
  typedInputs: readonly string[];
  activeWordIndex: number;
  elapsedMs: number;
  attempts: readonly Attempt[];
  commitTimestampsMs: readonly number[];
  failureReason: string | null;
}

export interface TestResult {
  id: string;
  clientTestId: string;
  testMode: TestMode;
  language: Language;
  configuration: TestConfig;
  promptId: string;
  seed: number;
  durationMs: number;
  wordCount: number | null;
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  characterStatistics: CharacterStatistics;
  consistency: number;
  flags: ResultFlag[];
  samples: IntervalSample[];
  scoringVersion: string;
  generatorVersion: string;
  failureReason: string | null;
  completedAt: string;
  createdAt: string;
}
