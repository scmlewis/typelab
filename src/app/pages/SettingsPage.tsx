import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { DURATION_OPTIONS, WORD_COUNT_OPTIONS } from '@/engine/config';
import type { ErrorPolicy } from '@/engine/types';
import { BackupPanel } from '@/features/history/BackupPanel';
import {
  DEFAULT_SETTINGS,
  MAX_PRESETS,
  PRESET_NAME_MAX_LENGTH,
  configFromDefaults,
} from '@/features/settings/settings';
import type {
  Appearance,
  CaretStyle,
  MotionPreference,
  Preset,
  TestDefaults,
  ThemePreference,
  TypingFontFamily,
  TypingFontSize,
  TypingTextWidth,
} from '@/features/settings/settings';
import { useSettings } from '@/features/settings/settingsContext';
import { describeTestConfig } from '@/features/typing/format';

const ERROR_POLICIES: readonly { value: ErrorPolicy; label: string; hint: string }[] = [
  { value: 'free', label: 'Free', hint: 'Keep typing through mistakes.' },
  { value: 'strict', label: 'Strict', hint: 'End the run at the first mismatch.' },
  {
    value: 'no-backspace',
    label: 'No backspace',
    hint: 'Corrections are blocked; mistakes stay.',
  },
];

const THEMES: readonly { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const MOTIONS: readonly { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'reduce', label: 'Reduced' },
  { value: 'full', label: 'Full' },
];

const FONTS: readonly { value: TypingFontFamily; label: string }[] = [
  { value: 'mono', label: 'Mono' },
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
];

const FONT_SIZES: readonly { value: TypingFontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const TEXT_WIDTHS: readonly { value: TypingTextWidth; label: string }[] = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'default', label: 'Default' },
  { value: 'wide', label: 'Wide' },
];

const CARET_STYLES: readonly { value: CaretStyle; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'block', label: 'Block' },
  { value: 'underline', label: 'Underline' },
];

export function SettingsPage() {
  const { settings, status, updateTestDefaults, updateAppearance, updatePresets, resetSettings } =
    useSettings();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetStatus, setPresetStatus] = useState('');
  const defaults = settings.testDefaults;
  const appearance = settings.appearance;
  const presets = settings.presets;

  const save = (next: Partial<TestDefaults>) => {
    void updateTestDefaults({ ...defaults, ...next });
  };

  const saveAppearance = (next: Partial<Appearance>) => {
    void updateAppearance(next);
  };

  const savePreset = () => {
    const name = presetName.trim();

    if (name.length === 0) {
      setPresetStatus('Give the preset a name first.');
      return;
    }

    const existing = presets.find(
      (preset) => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );

    if (existing !== undefined) {
      void updatePresets(
        presets.map((preset) => (preset.id === existing.id ? { ...preset, name } : preset)),
      );
      setPresetName('');
      setPresetStatus(`Updated “${name}” with the current setup.`);
      return;
    }

    if (presets.length >= MAX_PRESETS) {
      setPresetStatus(`You can keep ${MAX_PRESETS} presets. Delete one before adding another.`);
      return;
    }

    void updatePresets([...presets, { id: createPresetId(), name, defaults }]);
    setPresetName('');
    setPresetStatus(`Saved “${name}”.`);
  };

  const applyPreset = (preset: Preset) => {
    void updateTestDefaults(preset.defaults);
    setPresetStatus(`“${preset.name}” is now the bench default.`);
  };

  const deletePreset = (preset: Preset) => {
    void updatePresets(presets.filter((candidate) => candidate.id !== preset.id));
    setPresetStatus(`Deleted “${preset.name}”.`);
  };

  const handleReset = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }

    void resetSettings();
    setConfirmingReset(false);
  };

  return (
    <section aria-labelledby="settings-title" className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Settings</p>
      <h1
        className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
        id="settings-title"
      >
        Make the lab yours.
      </h1>
      <p className="mt-4 text-sm leading-7 text-ink-muted">
        Appearance and test defaults are saved in this browser immediately, and never touch a run
        that is already in progress.
      </p>

      <fieldset
        className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
        disabled={status === 'loading'}
      >
        <legend className="sr-only">Appearance</legend>
        <p
          aria-hidden="true"
          className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted"
        >
          Appearance
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
              Theme
            </p>
            <div
              aria-label="Theme"
              className="mt-2 flex rounded-full border border-line bg-surface-strong/50 p-0.5"
              role="group"
            >
              {THEMES.map((theme) => (
                <Choice
                  active={appearance.theme === theme.value}
                  key={theme.value}
                  label={theme.label}
                  onClick={() => {
                    void updateAppearance({ theme: theme.value });
                  }}
                />
              ))}
            </div>
          </div>
          <p className="max-w-xs text-xs leading-5 text-ink-muted">
            System follows your device&apos;s light or dark setting.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Group label="Motion">
            {MOTIONS.map((motion) => (
              <Choice
                active={appearance.motion === motion.value}
                key={motion.value}
                label={motion.label}
                onClick={() => {
                  saveAppearance({ motion: motion.value });
                }}
              />
            ))}
          </Group>
          <p className="max-w-xs text-xs leading-5 text-ink-muted">
            System follows your device&apos;s reduced-motion setting. Reduced quiets transitions and
            stops the caret blinking.
          </p>
        </div>
      </fieldset>

      <fieldset
        className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
        disabled={status === 'loading'}
      >
        <legend className="sr-only">Typography and typing</legend>
        <p
          aria-hidden="true"
          className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted"
        >
          Typography &amp; typing
        </p>

        <div className="mt-5 flex flex-wrap items-start gap-x-8 gap-y-5">
          <Group label="Font">
            {FONTS.map((font) => (
              <Choice
                active={appearance.fontFamily === font.value}
                key={font.value}
                label={font.label}
                onClick={() => {
                  saveAppearance({ fontFamily: font.value });
                }}
              />
            ))}
          </Group>

          <Group label="Size">
            {FONT_SIZES.map((size) => (
              <Choice
                active={appearance.fontSize === size.value}
                key={size.value}
                label={size.label}
                onClick={() => {
                  saveAppearance({ fontSize: size.value });
                }}
              />
            ))}
          </Group>

          <Group label="Text width">
            {TEXT_WIDTHS.map((width) => (
              <Choice
                active={appearance.textWidth === width.value}
                key={width.value}
                label={width.label}
                onClick={() => {
                  saveAppearance({ textWidth: width.value });
                }}
              />
            ))}
          </Group>
        </div>

        <div className="mt-6 flex flex-wrap items-start gap-x-8 gap-y-5 border-t border-line/70 pt-5">
          <div>
            <Group label="Caret">
              {CARET_STYLES.map((caret) => (
                <Choice
                  active={appearance.caret.style === caret.value}
                  key={caret.value}
                  label={caret.label}
                  onClick={() => {
                    saveAppearance({ caret: { ...appearance.caret, style: caret.value } });
                  }}
                />
              ))}
            </Group>
            <div className="mt-3">
              <Check
                checked={appearance.caret.blink}
                label="Blink caret"
                onChange={(checked) => {
                  saveAppearance({ caret: { ...appearance.caret, blink: checked } });
                }}
              />
            </div>
          </div>

          <div className="max-w-xs">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
              Sound
            </p>
            <div className="mt-2">
              <Check
                checked={appearance.sounds.enabled}
                label="Key sounds"
                onChange={(checked) => {
                  saveAppearance({ sounds: { ...appearance.sounds, enabled: checked } });
                }}
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs text-ink-muted" htmlFor="sound-volume">
                Key sound volume
              </label>
              <input
                className="h-1.5 w-28 accent-ink disabled:opacity-40"
                disabled={!appearance.sounds.enabled}
                id="sound-volume"
                max={100}
                min={0}
                onChange={(event) => {
                  saveAppearance({
                    sounds: { ...appearance.sounds, volume: Number(event.target.value) / 100 },
                  });
                }}
                step={5}
                type="range"
                value={Math.round(appearance.sounds.volume * 100)}
              />
              <span className="w-8 font-mono text-xs text-ink-muted">
                {Math.round(appearance.sounds.volume * 100)}%
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-muted">
              Sounds play only on this device, after you enable them.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset
        className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
        disabled={status === 'loading'}
      >
        <legend className="sr-only">Test defaults</legend>
        <p
          aria-hidden="true"
          className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted"
        >
          Test defaults
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-5">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
              Mode
            </p>
            <div
              aria-label="Default test mode"
              className="mt-2 flex rounded-full border border-line bg-surface-strong/50 p-0.5"
              role="group"
            >
              <Choice
                active={defaults.mode === 'timed'}
                label="Time"
                onClick={() => {
                  save({ mode: 'timed' });
                }}
              />
              <Choice
                active={defaults.mode === 'words'}
                label="Words"
                onClick={() => {
                  save({ mode: 'words' });
                }}
              />
            </div>
          </div>

          {defaults.mode === 'timed' ? (
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
                Duration
              </p>
              <div aria-label="Default duration" className="mt-2 flex gap-1" role="group">
                {DURATION_OPTIONS.map((duration) => (
                  <Choice
                    active={defaults.durationSeconds === duration}
                    key={duration}
                    label={String(duration)}
                    onClick={() => {
                      save({ durationSeconds: duration });
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
                Word count
              </p>
              <div aria-label="Default word count" className="mt-2 flex gap-1" role="group">
                {WORD_COUNT_OPTIONS.map((count) => (
                  <Choice
                    active={defaults.wordCount === count}
                    key={count}
                    label={String(count)}
                    onClick={() => {
                      save({ wordCount: count });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <label
              className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted"
              htmlFor="default-vocabulary"
            >
              Word list
            </label>
            <select
              className="mt-2 block rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink"
              id="default-vocabulary"
              onChange={(event) => {
                save({
                  vocabulary: event.target.value === 'english-1k' ? 'english-1k' : 'english-200',
                });
              }}
              value={defaults.vocabulary}
            >
              <option value="english-200">English top 200</option>
              <option value="english-1k">English top 1,000</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line/70 pt-5">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
              Modifiers
            </p>
            <div aria-label="Default modifiers" className="mt-2 flex gap-4" role="group">
              <Check
                checked={defaults.punctuation}
                label="Punctuation"
                onChange={(checked) => {
                  save({ punctuation: checked });
                }}
              />
              <Check
                checked={defaults.numbers}
                label="Numbers"
                onChange={(checked) => {
                  save({ numbers: checked });
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted"
              htmlFor="default-error-policy"
            >
              Error policy
            </label>
            <select
              aria-describedby="default-error-policy-hint"
              className="mt-2 block rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink"
              id="default-error-policy"
              onChange={(event) => {
                save({ errorPolicy: event.target.value as ErrorPolicy });
              }}
              value={defaults.errorPolicy}
            >
              {ERROR_POLICIES.map((policy) => (
                <option key={policy.value} value={policy.value}>
                  {policy.label}
                </option>
              ))}
            </select>
            <p
              className="mt-1.5 max-w-xs text-xs leading-5 text-ink-muted"
              id="default-error-policy-hint"
            >
              {ERROR_POLICIES.find((policy) => policy.value === defaults.errorPolicy)?.hint}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line/70 pt-5">
          <button
            className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong"
            onClick={handleReset}
            type="button"
          >
            {confirmingReset ? 'Confirm reset' : 'Reset to defaults'}
          </button>
          {confirmingReset ? (
            <>
              <span className="text-xs text-ink-muted">
                Reset to {DEFAULT_SETTINGS.testDefaults.mode} /{' '}
                {DEFAULT_SETTINGS.testDefaults.durationSeconds}s?
              </span>
              <button
                className="text-xs font-medium underline underline-offset-4"
                onClick={() => {
                  setConfirmingReset(false);
                }}
                type="button"
              >
                Cancel
              </button>
            </>
          ) : (
            <span className="text-xs text-ink-muted">
              Saved automatically. Current run is left untouched.
            </span>
          )}
        </div>
      </fieldset>

      <fieldset
        className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
        disabled={status === 'loading'}
      >
        <legend className="sr-only">Saved presets</legend>
        <p
          aria-hidden="true"
          className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted"
        >
          Presets
        </p>
        <p className="mt-2 max-w-lg text-xs leading-5 text-ink-muted">
          Name the current test defaults and reuse them from the bench. Presets travel with your
          settings backup.
        </p>

        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            savePreset();
          }}
        >
          <div className="min-w-0 flex-1">
            <label
              className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted"
              htmlFor="preset-name"
            >
              Preset name
            </label>
            <input
              className="mt-2 w-full rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink placeholder:text-ink-muted/70"
              id="preset-name"
              maxLength={PRESET_NAME_MAX_LENGTH}
              onChange={(event) => {
                setPresetName(event.target.value);
              }}
              placeholder="Morning warm-up"
              value={presetName}
            />
          </div>
          <button
            className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={presetName.trim().length === 0}
            type="submit"
          >
            Save current setup
          </button>
        </form>
        <p className="mt-2 min-h-4 text-xs leading-5 text-ink-muted" role="status">
          {presetStatus}
        </p>

        {presets.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            No presets yet. The bench keeps showing every preset you save.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line/70 border-t border-line/70">
            {presets.map((preset) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={preset.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{preset.name}</p>
                  <p className="mt-0.5 font-mono text-[0.7rem] leading-5 text-ink-muted">
                    {describeTestConfig(configFromDefaults(preset.defaults, 1))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-strong"
                    onClick={() => {
                      applyPreset(preset);
                    }}
                    type="button"
                  >
                    Use
                  </button>
                  <button
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
                    onClick={() => {
                      deletePreset(preset);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <BackupPanel />

      <div className="mt-8 rounded-card border border-line bg-surface p-6">
        <h2 className="font-display text-2xl tracking-tight">Local-only by design</h2>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          TypeLab has no account system, cloud database, or third-party analytics. Settings and
          results stay in this browser. Clearing browser data deletes them, so export is the durable
          backup.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
            to="/"
          >
            Back to the test
          </Link>
          <Link
            className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong"
            to="/history"
          >
            Open local history
          </Link>
        </div>
      </div>
    </section>
  );
}

function createPresetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function Group({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">{label}</p>
      <div aria-label={label} className="mt-2 flex gap-1" role="group">
        {children}
      </div>
    </div>
  );
}

function Choice({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        'rounded-full px-3 py-1.5 font-mono text-xs transition-colors',
        active ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-surface-strong hover:text-ink',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Check({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-muted">
      <input
        checked={checked}
        className="size-4 accent-ink"
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        type="checkbox"
      />
      {label}
    </label>
  );
}
