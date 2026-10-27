import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { InputAdapter } from '@/engine/input';
import { useTypingSelector } from '@/features/typing/useTypingSelector';
import type { TypingStore } from '@/features/typing/typingStore';

const WINDOW_BEFORE = 20;
const WINDOW_SIZE = 140;

interface TypingSurfaceProps {
  store: TypingStore;
}

export function TypingSurface({ store }: TypingSurfaceProps) {
  const revision = useTypingSelector(store, (state) => state.revision);
  const snapshot = store.getState().snapshot;
  const [focused, setFocused] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const adapter = new InputAdapter({
      textarea,
      onInput: (input) => {
        store.input(input);
      },
      isActive: () => {
        const status = store.getState().snapshot.status;
        return status === 'idle' || status === 'running';
      },
      onFocusLost: () => {
        setFocused(false);
      },
      onFocusRestored: () => {
        setFocused(true);
      },
      onRejectedInput: (reason) => {
        setNotice(
          reason === 'paste'
            ? 'Paste is disabled during a test.'
            : 'Dropped text is disabled during a test.',
        );
      },
    });

    adapter.attach();

    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;

    if (!coarsePointer) {
      textarea.focus();
    }

    return () => {
      adapter.detach();
    };
  }, [store]);

  useEffect(() => {
    if (notice === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 2_500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [notice]);

  useEffect(() => {
    const container = containerRef.current;
    const activeWord = activeWordRef.current;

    if (!container || !activeWord) {
      return;
    }

    container.scrollTop = Math.max(
      0,
      activeWord.offsetTop - container.clientHeight / 2 + activeWord.offsetHeight / 2,
    );
  }, [revision, snapshot.activeWordIndex]);

  const status = snapshot.status;
  const windowStart = Math.max(0, snapshot.activeWordIndex - WINDOW_BEFORE);
  const windowEnd = Math.min(snapshot.prompt.words.length, windowStart + WINDOW_SIZE);
  const showOverlay =
    !focused && status !== 'completed' && status !== 'failed' && status !== 'cancelled';

  return (
    <div className="relative mt-5 sm:mt-6">
      <div
        className="relative h-[9.45rem] overflow-hidden sm:h-[11.8125rem]"
        data-testid="typing-surface"
        data-status={status}
      >
        <div
          className="font-mono text-2xl leading-[2.1] tracking-tight text-ink sm:text-3xl"
          ref={containerRef}
          style={{ height: '100%', overflow: 'hidden' }}
        >
          <div aria-hidden="true" className="whitespace-normal">
            {snapshot.prompt.words.slice(windowStart, windowEnd).map((word, offset) => {
              const wordIndex = windowStart + offset;
              const isActive = wordIndex === snapshot.activeWordIndex && status !== 'completed';

              return (
                <Word
                  activeRef={isActive ? activeWordRef : undefined}
                  isActive={isActive}
                  isPast={wordIndex < snapshot.activeWordIndex}
                  key={wordIndex}
                  target={word}
                  typed={snapshot.typedInputs[wordIndex] ?? ''}
                  wordIndex={wordIndex}
                />
              );
            })}
          </div>
        </div>

        <textarea
          aria-label="Typing input"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="absolute inset-0 z-20 h-full w-full cursor-text resize-none border-0 bg-transparent p-0 text-transparent opacity-0 outline-none"
          ref={textareaRef}
          spellCheck={false}
          style={{ caretColor: 'transparent' }}
          tabIndex={0}
        />

        {showOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-paper/95">
            <p className="max-w-sm rounded-xl border border-line/80 bg-surface px-5 py-3 text-center text-sm leading-6 text-ink-muted shadow-sm">
              {status === 'idle'
                ? 'Click here or start typing.'
                : 'Focus lost. The clock keeps running — click or type to resume.'}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex min-h-5 items-center justify-between gap-4 text-xs text-ink-muted">
        <p aria-live="polite" className="text-danger">
          {notice}
        </p>
        <p className="ml-auto font-mono uppercase tracking-[0.14em]">
          {status === 'idle' ? 'Ready' : status === 'running' ? 'Recording' : status}
        </p>
      </div>
    </div>
  );
}

interface WordProps {
  target: string;
  typed: string;
  wordIndex: number;
  isActive: boolean;
  isPast: boolean;
  activeRef: RefObject<HTMLSpanElement | null> | undefined;
}

function Word({ target, typed, wordIndex, isActive, isPast, activeRef }: WordProps) {
  const length = Math.max(target.length, typed.length);
  const characters: ReactNode[] = [];

  for (let index = 0; index < length; index += 1) {
    if (isActive && index === typed.length) {
      characters.push(<Caret key={`caret-${index}`} />);
    }

    const typedCharacter = index < typed.length ? typed.charAt(index) : null;
    const targetCharacter = index < target.length ? target.charAt(index) : null;
    const state = getCharacterState(typedCharacter, targetCharacter, isPast);

    characters.push(
      <span className={characterClassName(state)} data-state={state} key={`char-${index}`}>
        {typedCharacter ?? targetCharacter}
      </span>,
    );
  }

  if (isActive && typed.length >= length) {
    characters.push(<Caret key="caret-end" />);
  }

  return (
    <span
      className={[
        'mr-[0.55ch] inline-block whitespace-pre',
        isActive ? 'rounded-[2px] bg-accent/5' : '',
      ].join(' ')}
      data-word-index={wordIndex}
      ref={activeRef}
    >
      {characters}
    </span>
  );
}

function Caret() {
  return (
    <span
      aria-hidden="true"
      className="typing-caret relative -mb-[0.1em] ml-[1px] inline-block h-[1.05em] w-[2px] translate-y-[0.12em] bg-accent"
    />
  );
}

type CharacterState = 'correct' | 'incorrect' | 'extra' | 'pending' | 'missed';

function getCharacterState(
  typedCharacter: string | null,
  targetCharacter: string | null,
  isPast: boolean,
): CharacterState {
  if (typedCharacter !== null) {
    if (targetCharacter === null) {
      return 'extra';
    }

    return typedCharacter === targetCharacter ? 'correct' : 'incorrect';
  }

  return isPast ? 'missed' : 'pending';
}

function characterClassName(state: CharacterState): string {
  switch (state) {
    case 'correct':
      return 'text-ink';
    case 'incorrect':
      return 'text-danger underline decoration-danger/50 decoration-2';
    case 'extra':
      return 'rounded-[2px] bg-danger/10 text-danger/80';
    case 'missed':
      return 'text-ink-muted/30 underline decoration-dotted';
    case 'pending':
      return 'text-ink-muted/45';
  }
}
