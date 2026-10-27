import { RotateCcw } from 'lucide-react';

import {
  DEFAULT_TIMED_CONFIG,
  DEFAULT_WORDS_CONFIG,
  DURATION_OPTIONS,
  WORD_COUNT_OPTIONS,
} from '@/engine/config';
import type { DurationSeconds, TestConfig, WordCount } from '@/engine/types';

interface TestToolbarProps {
  config: TestConfig;
  disabled: boolean;
  onChange: (config: TestConfig) => void;
  onRestart: () => void;
}

export function TestToolbar({ config, disabled, onChange, onRestart }: TestToolbarProps) {
  const shared = {
    language: config.language,
    vocabulary: config.vocabulary,
    punctuation: config.punctuation,
    numbers: config.numbers,
    errorPolicy: config.errorPolicy,
    seed: config.seed,
  } as const;

  const switchMode = (mode: 'timed' | 'words') => {
    onChange(
      mode === 'timed'
        ? { ...DEFAULT_TIMED_CONFIG, ...shared }
        : { ...DEFAULT_WORDS_CONFIG, ...shared },
    );
  };

  const setDuration = (durationSeconds: DurationSeconds) => {
    if (config.mode === 'timed') {
      onChange({ ...config, durationSeconds });
    }
  };

  const setWordCount = (wordCount: WordCount) => {
    if (config.mode === 'words') {
      onChange({ ...config, wordCount });
    }
  };

  return (
    <div className="mt-6 border-b border-line/80 pb-3 sm:mt-8 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3 sm:pb-4">
      <div className="flex items-center gap-2 sm:contents">
        <div
          aria-label="Test mode"
          className="flex shrink-0 rounded-full border border-line bg-surface/70 p-0.5 sm:order-1"
          role="group"
        >
          <ModeButton
            active={config.mode === 'timed'}
            disabled={disabled}
            label="Time"
            onClick={() => {
              switchMode('timed');
            }}
          />
          <ModeButton
            active={config.mode === 'words'}
            disabled={disabled}
            label="Words"
            onClick={() => {
              switchMode('words');
            }}
          />
        </div>

        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-muted sm:order-3 sm:flex-none">
          <span className="hidden font-mono uppercase tracking-[0.14em] sm:inline">List</span>
          <select
            aria-label="Vocabulary"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-2.5 py-2 text-xs text-ink disabled:opacity-50 sm:flex-none sm:px-3 sm:py-1.5"
            disabled={disabled}
            onChange={(event) => {
              onChange({
                ...config,
                vocabulary: event.target.value === 'english-1k' ? 'english-1k' : 'english-200',
              });
            }}
            value={config.vocabulary}
          >
            <option value="english-200">Top 200</option>
            <option value="english-1k">Top 1,000</option>
          </select>
        </label>

        <button
          aria-label="Restart test"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line p-2.5 text-xs font-medium transition-colors hover:bg-surface-strong sm:order-5 sm:ml-auto sm:px-3.5 sm:py-1.5"
          onClick={onRestart}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={13} />
          <span className="hidden sm:inline">Restart</span>
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-0 sm:contents">
        {config.mode === 'timed' ? (
          <div aria-label="Duration" className="flex items-center gap-1 sm:order-2" role="group">
            {DURATION_OPTIONS.map((duration) => (
              <OptionButton
                active={config.durationSeconds === duration}
                disabled={disabled}
                key={duration}
                label={String(duration)}
                onClick={() => {
                  setDuration(duration);
                }}
              />
            ))}
          </div>
        ) : (
          <div aria-label="Word count" className="flex items-center gap-1 sm:order-2" role="group">
            {WORD_COUNT_OPTIONS.map((count) => (
              <OptionButton
                active={config.wordCount === count}
                disabled={disabled}
                key={count}
                label={String(count)}
                onClick={() => {
                  setWordCount(count);
                }}
              />
            ))}
          </div>
        )}

        <div aria-label="Modifiers" className="flex items-center gap-1 sm:order-4" role="group">
          <OptionButton
            active={config.punctuation}
            disabled={disabled}
            label="Punctuation"
            onClick={() => {
              onChange({ ...config, punctuation: !config.punctuation });
            }}
          />
          <OptionButton
            active={config.numbers}
            disabled={disabled}
            label="Numbers"
            onClick={() => {
              onChange({ ...config, numbers: !config.numbers });
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface ModeButtonProps {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}

function ModeButton({ active, disabled, label, onClick }: ModeButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={[
        'rounded-full px-3.5 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5',
        active ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink',
      ].join(' ')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

interface OptionButtonProps {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}

function OptionButton({ active, disabled, label, onClick }: OptionButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={[
        'rounded-full border px-2 py-2 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5 sm:py-1',
        active
          ? 'border-transparent bg-accent-soft text-ink'
          : 'border-line/80 text-ink-muted hover:bg-surface-strong hover:text-ink',
      ].join(' ')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
