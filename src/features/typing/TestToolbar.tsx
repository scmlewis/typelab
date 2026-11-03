import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ChoiceButton, ChoiceGroup } from '@/components/ui/Choice';
import { Select } from '@/components/ui/controls';
import { Overline } from '@/components/ui/Overline';
import { pickQuote } from '@/engine/content/quotes';
import {
  DEFAULT_TIMED_CONFIG,
  DEFAULT_WORDS_CONFIG,
  DURATION_OPTIONS,
  WORD_COUNT_OPTIONS,
} from '@/engine/config';
import type { DurationSeconds, QuoteTestConfig, TestConfig, WordCount } from '@/engine/types';
import type { Preset } from '@/features/settings/settings';

interface TestToolbarProps {
  config: TestConfig;
  /** Overrides the active mode while the custom-text composer is open. */
  displayMode?: TestConfig['mode'];
  disabled: boolean;
  onChange: (config: TestConfig) => void;
  onCustomText: () => void;
  onRestart: () => void;
  presets?: readonly Preset[];
  onApplyPreset?: (preset: Preset) => void;
}

export function TestToolbar({
  config,
  displayMode,
  disabled,
  onChange,
  onCustomText,
  onRestart,
  presets = [],
  onApplyPreset,
}: TestToolbarProps) {
  const shared = {
    language: config.language,
    vocabulary: config.vocabulary,
    punctuation: config.punctuation,
    numbers: config.numbers,
    errorPolicy: config.errorPolicy,
    seed: config.seed,
  } as const;

  const switchMode = (mode: 'timed' | 'words' | 'quote') => {
    if (mode === 'quote') {
      const next: QuoteTestConfig = {
        ...shared,
        mode: 'quote',
        durationSeconds: null,
        wordCount: null,
        quoteId: pickQuote(shared.seed).id,
        customText: null,
      };

      onChange(next);
      return;
    }

    onChange(
      mode === 'timed'
        ? { ...DEFAULT_TIMED_CONFIG, ...shared }
        : { ...DEFAULT_WORDS_CONFIG, ...shared },
    );
  };

  const activeMode = displayMode ?? config.mode;
  const usesWordOptions = activeMode === 'timed' || activeMode === 'words';

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
      {presets.length > 0 ? (
        <div
          aria-label="Saved presets"
          className="mb-3 flex w-full flex-wrap items-center gap-2 border-b border-line/70 pb-3 sm:order-first"
          role="group"
        >
          <Overline>Presets</Overline>
          {presets.map((preset) => (
            <Button
              className="font-mono"
              disabled={disabled}
              key={preset.id}
              onClick={() => {
                onApplyPreset?.(preset);
              }}
              size="sm"
              variant="secondary"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 sm:contents">
        <ChoiceGroup className="shrink-0 sm:order-1" frame="outline" label="Test mode">
          <ChoiceButton
            active={activeMode === 'timed'}
            disabled={disabled}
            label="Time"
            onClick={() => {
              switchMode('timed');
            }}
            size="md"
          />
          <ChoiceButton
            active={activeMode === 'words'}
            disabled={disabled}
            label="Words"
            onClick={() => {
              switchMode('words');
            }}
            size="md"
          />
          <ChoiceButton
            active={activeMode === 'quote'}
            disabled={disabled}
            label="Quote"
            onClick={() => {
              switchMode('quote');
            }}
            size="md"
          />
          <ChoiceButton
            active={activeMode === 'custom'}
            disabled={disabled}
            label="Text"
            onClick={onCustomText}
            size="md"
          />
        </ChoiceGroup>

        <Button
          aria-label="Restart test"
          className="order-1 shrink-0 sm:order-5 sm:ml-auto"
          onClick={onRestart}
          size="compact"
          variant="secondary"
        >
          <RotateCcw aria-hidden="true" size={13} />
          <span className="hidden sm:inline">Restart</span>
        </Button>
      </div>

      {usesWordOptions ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-0 sm:contents">
          {activeMode === 'timed' ? (
            <ChoiceGroup className="items-center sm:order-2" label="Duration">
              {DURATION_OPTIONS.map((duration) => (
                <ChoiceButton
                  active={config.durationSeconds === duration}
                  disabled={disabled}
                  key={duration}
                  label={String(duration)}
                  onClick={() => {
                    setDuration(duration);
                  }}
                  size="xs"
                  tone="soft"
                />
              ))}
            </ChoiceGroup>
          ) : (
            <ChoiceGroup className="items-center sm:order-2" label="Word count">
              {WORD_COUNT_OPTIONS.map((count) => (
                <ChoiceButton
                  active={config.wordCount === count}
                  disabled={disabled}
                  key={count}
                  label={String(count)}
                  onClick={() => {
                    setWordCount(count);
                  }}
                  size="xs"
                  tone="soft"
                />
              ))}
            </ChoiceGroup>
          )}

          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-muted sm:order-3 sm:flex-none">
            <span className="hidden font-mono uppercase tracking-[0.14em] sm:inline">List</span>
            <Select
              aria-label="Vocabulary"
              className="min-w-0 flex-1 sm:flex-none"
              density="sm"
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
            </Select>
          </label>

          <ChoiceGroup className="items-center sm:order-4" label="Modifiers">
            <ChoiceButton
              active={config.punctuation}
              disabled={disabled}
              label="Punctuation"
              onClick={() => {
                onChange({ ...config, punctuation: !config.punctuation });
              }}
              size="xs"
              tone="soft"
            />
            <ChoiceButton
              active={config.numbers}
              disabled={disabled}
              label="Numbers"
              onClick={() => {
                onChange({ ...config, numbers: !config.numbers });
              }}
              size="xs"
              tone="soft"
            />
          </ChoiceGroup>
        </div>
      ) : null}
    </div>
  );
}
