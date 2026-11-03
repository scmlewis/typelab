import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/controls';
import { Overline } from '@/components/ui/Overline';
import { StatusMessage } from '@/components/ui/StatusMessage';
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
        <Overline>Custom text</Overline>
        <Textarea
          autoFocus
          className="mt-2 min-h-40 resize-y font-mono leading-6"
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
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            disabled={!canStart}
            onClick={() => {
              onStart(normalized);
            }}
            variant="primary"
          >
            Start custom test
          </Button>
        </div>
      </div>

      {tooLong ? (
        <StatusMessage className="mt-3" tone="error">
          Custom text must be {limit} characters or fewer.
        </StatusMessage>
      ) : null}
    </section>
  );
}
