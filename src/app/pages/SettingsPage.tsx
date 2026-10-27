import { useState } from 'react';
import { Link } from 'react-router';

import { DURATION_OPTIONS, WORD_COUNT_OPTIONS } from '@/engine/config';
import type { ErrorPolicy } from '@/engine/types';
import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import type { TestDefaults } from '@/features/settings/settings';
import { useSettings } from '@/features/settings/settingsContext';

const ERROR_POLICIES: readonly { value: ErrorPolicy; label: string; hint: string }[] = [
  { value: 'free', label: 'Free', hint: 'Keep typing through mistakes.' },
  { value: 'strict', label: 'Strict', hint: 'End the run at the first mismatch.' },
  {
    value: 'no-backspace',
    label: 'No backspace',
    hint: 'Corrections are blocked; mistakes stay.',
  },
];

export function SettingsPage() {
  const { settings, status, updateTestDefaults, resetSettings } = useSettings();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const defaults = settings.testDefaults;

  const save = (next: Partial<TestDefaults>) => {
    void updateTestDefaults({ ...defaults, ...next });
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
        These defaults load every time you open the bench. Changes are saved in this browser
        immediately, and never touch a run that is already in progress.
      </p>

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
