import { useState } from 'react';

import { CUSTOM_TEXT_MAX_LENGTH } from '@/engine/config';
import { normalizeCustomText } from '@/engine/prompt';

interface CustomTextPanelProps {
  initialText: string;
  onStart: (text: string) => void;
  onCancel: () => void;
}

export function CustomTextPanel({ initialText, onStart, onCancel }: CustomTextPanelProps) {
  const [draft, setDraft] = useState(initialText);
  const normalized = normalizeCustomText(draft);
  const tooLong = normalized.length > CUSTOM_TEXT_MAX_LENGTH;
  const wordCount = normalized.length === 0 ? 0 : normalized.split(' ').length;
  const canStart = normalized.length > 0 && !tooLong;
  const limit = CUSTOM_TEXT_MAX_LENGTH.toLocaleString('en-US');

  return (
    <section
      aria-labelledby="custom-text-title"
      className="mt-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <h2 className="font-display text-2xl tracking-tight" id="custom-text-title">
        Paste your own text.
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
        Punctuation and casing are kept. Line breaks and repeated spaces become single spaces.
      </p>

      <label className="mt-5 block" htmlFor="custom-text-input">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted">
          Custom text
        </span>
        <textarea
          autoFocus
          className="mt-2 min-h-40 w-full resize-y rounded-xl border border-line bg-paper px-4 py-3 font-mono text-sm leading-6 text-ink outline-none focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/30"
          id="custom-text-input"
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          rows={6}
          value={draft}
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-ink-muted">
          {wordCount} {wordCount === 1 ? 'word' : 'words'} ·{' '}
          {normalized.length.toLocaleString('en-US')} / {limit} characters
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-strong"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={!canStart}
            onClick={() => {
              onStart(normalized);
            }}
            type="button"
          >
            Start custom test
          </button>
        </div>
      </div>

      {tooLong ? (
        <p
          className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs leading-5 text-danger"
          role="alert"
        >
          Custom text must be {limit} characters or fewer.
        </p>
      ) : null}
    </section>
  );
}
