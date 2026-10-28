import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { InputAdapter } from '@/engine/input';
import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import type {
  Appearance,
  CaretSettings,
  TypingFontFamily,
  TypingFontSize,
  TypingTextWidth,
} from '@/features/settings/settings';
import { TypingSounds } from '@/features/typing/sounds';
import type { SoundPlayer } from '@/features/typing/sounds';
import { useTypingSelector } from '@/features/typing/useTypingSelector';
import type { TypingStore } from '@/features/typing/typingStore';

const WINDOW_BEFORE = 20;
const WINDOW_SIZE = 140;

const FONT_CLASS: Record<TypingFontFamily, string> = {
  mono: 'font-mono',
  sans: 'font-sans',
  serif: 'font-serif',
};

const SIZE_CLASS: Record<TypingFontSize, string> = {
  small: 'text-xl sm:text-2xl',
  medium: 'text-2xl sm:text-3xl',
  large: 'text-3xl sm:text-4xl',
};

const WIDTH_CLASS: Record<TypingTextWidth, string> = {
  narrow: 'max-w-2xl',
  default: 'max-w-3xl',
  wide: 'max-w-none',
};

interface TypingSurfaceProps {
  store: TypingStore;
  appearance?: Appearance;
  /** Test seam; production surfaces create their own opt-in sound player. */
  soundPlayer?: SoundPlayer;
}

export function TypingSurface({
  store,
  appearance = DEFAULT_SETTINGS.appearance,
  soundPlayer,
}: TypingSurfaceProps) {
  const revision = useTypingSelector(store, (state) => state.revision);
  const snapshot = store.getState().snapshot;
  const [focused, setFocused] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const soundsRef = useRef<TypingSounds | null>(null);

  if (soundsRef.current === null) {
    soundsRef.current = new TypingSounds(appearance.sounds);
  }

  const player = soundPlayer ?? soundsRef.current;

  useEffect(() => {
    soundsRef.current?.setPreferences(appearance.sounds);
  }, [appearance.sounds]);

  useEffect(() => {
    const sounds = soundsRef.current;

    return () => {
      sounds?.dispose();
    };
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const adapter = new InputAdapter({
      textarea,
      onInput: (input) => {
        if (input.type === 'insert') {
          const state = store.getState().snapshot;
          const target = state.prompt.words[state.activeWordIndex] ?? '';
          const typed = state.typedInputs[state.activeWordIndex] ?? '';
          const character = input.text.charAt(0);

          player.play(
            character === ' ' || character === target.charAt(typed.length)
              ? 'correct'
              : 'incorrect',
          );
        } else if (input.type === 'backspace') {
          player.play('backspace');
        } else {
          return;
        }

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
  }, [player, store]);

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
        className={[
          'relative h-[6.3em] overflow-hidden',
          FONT_CLASS[appearance.fontFamily],
          SIZE_CLASS[appearance.fontSize],
          WIDTH_CLASS[appearance.textWidth],
        ].join(' ')}
        data-caret-blink={appearance.caret.blink}
        data-caret-style={appearance.caret.style}
        data-font-family={appearance.fontFamily}
        data-font-size={appearance.fontSize}
        data-testid="typing-surface"
        data-status={status}
        data-text-width={appearance.textWidth}
      >
        <div
          className="leading-[2.1] tracking-tight text-ink"
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
                  caret={appearance.caret}
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
  caret: CaretSettings;
  activeRef: RefObject<HTMLSpanElement | null> | undefined;
}

function Word({ target, typed, wordIndex, isActive, isPast, caret, activeRef }: WordProps) {
  const length = Math.max(target.length, typed.length);
  const characters: ReactNode[] = [];

  for (let index = 0; index < length; index += 1) {
    if (isActive && index === typed.length) {
      characters.push(<Caret caret={caret} key={`caret-${index}`} />);
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
    characters.push(<Caret caret={caret} key="caret-end" />);
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

function Caret({ caret }: { caret: CaretSettings }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'relative -mb-[0.1em] ml-[1px] inline-block h-[1.05em] translate-y-[0.12em]',
        caret.style === 'line' ? 'w-[2px]' : 'w-[0.6ch]',
      ].join(' ')}
      data-style={caret.style}
      data-testid="typing-caret"
    >
      <span
        className={[
          'absolute bg-accent',
          caret.style === 'line' ? 'inset-y-0 left-0 w-[2px]' : '',
          caret.style === 'block' ? 'inset-0 rounded-[2px] opacity-60' : '',
          caret.style === 'underline' ? 'bottom-0 left-0 h-[0.12em] w-full' : '',
          caret.blink ? 'typing-caret' : '',
        ].join(' ')}
      />
    </span>
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
      return 'text-ink-muted/50 underline decoration-dotted';
    case 'pending':
      return 'text-ink-muted';
  }
}
