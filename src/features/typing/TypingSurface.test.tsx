import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_WORDS_CONFIG } from '@/engine/config';
import { generatePrompt } from '@/engine/prompt';
import { DEFAULT_SETTINGS } from '@/features/settings/settings';
import type { Appearance } from '@/features/settings/settings';
import { TypingSurface } from '@/features/typing/TypingSurface';
import { TypingStore } from '@/features/typing/typingStore';

function createStore() {
  return new TypingStore({
    config: DEFAULT_WORDS_CONFIG,
    prompt: generatePrompt(DEFAULT_WORDS_CONFIG),
  });
}

function appearance(overrides: Partial<Appearance> = {}): Appearance {
  return { ...DEFAULT_SETTINGS.appearance, ...overrides };
}

function caretIndicator(caret: HTMLElement): Element {
  const indicator = caret.firstElementChild;

  if (indicator === null) {
    throw new Error('caret indicator is missing');
  }

  return indicator;
}

describe('typing surface appearance', () => {
  it('uses the default mono, medium, and default-width presentation', () => {
    render(<TypingSurface store={createStore()} />);

    const surface = screen.getByTestId('typing-surface');

    expect(surface).toHaveAttribute('data-font-family', 'mono');
    expect(surface).toHaveAttribute('data-font-size', 'medium');
    expect(surface).toHaveAttribute('data-text-width', 'default');
    expect(surface).toHaveClass('font-mono');
  });

  it('applies the chosen font, size, and text width', () => {
    render(
      <TypingSurface
        appearance={appearance({ fontFamily: 'serif', fontSize: 'large', textWidth: 'wide' })}
        store={createStore()}
      />,
    );

    const surface = screen.getByTestId('typing-surface');

    expect(surface).toHaveAttribute('data-font-family', 'serif');
    expect(surface).toHaveAttribute('data-font-size', 'large');
    expect(surface).toHaveAttribute('data-text-width', 'wide');
    expect(surface).toHaveClass('font-serif');
    expect(surface).toHaveClass('text-3xl', 'sm:text-4xl');
    expect(surface).toHaveClass('max-w-none');
  });

  it('renders a still caret when blinking is disabled', () => {
    render(
      <TypingSurface
        appearance={appearance({ caret: { style: 'block', blink: false } })}
        store={createStore()}
      />,
    );

    const caret = screen.getByTestId('typing-caret');

    expect(caret).toHaveAttribute('data-style', 'block');
    expect(caretIndicator(caret)).not.toHaveClass('typing-caret');
  });

  it('animates the caret by default', () => {
    render(
      <TypingSurface
        appearance={appearance({ caret: { style: 'underline', blink: true } })}
        store={createStore()}
      />,
    );

    expect(caretIndicator(screen.getByTestId('typing-caret'))).toHaveClass('typing-caret');
  });
});

describe('typing surface sounds', () => {
  it('plays correct, incorrect, and backspace cues', () => {
    const store = createStore();
    const play = vi.fn();
    const prompt = store.getState().snapshot.prompt;

    render(<TypingSurface soundPlayer={{ play }} store={store} />);

    const textarea = screen.getByLabelText('Typing input');
    const firstWord = prompt.words[0] ?? '';

    if (firstWord.length === 0) {
      throw new Error('prompt has no first word');
    }

    const firstCharacter = firstWord.charAt(0);
    const wrongCharacter = firstCharacter === 'z' ? 'q' : 'z';

    fireEvent.input(textarea, { target: { value: firstCharacter } });
    expect(play).toHaveBeenLastCalledWith('correct');

    fireEvent.input(textarea, { target: { value: wrongCharacter } });
    expect(play).toHaveBeenLastCalledWith('incorrect');

    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(play).toHaveBeenLastCalledWith('backspace');
  });

  it('treats a word separator as a completed keystroke', () => {
    const store = createStore();
    const play = vi.fn();
    const prompt = store.getState().snapshot.prompt;

    render(<TypingSurface soundPlayer={{ play }} store={store} />);

    const textarea = screen.getByLabelText('Typing input');
    const firstWord = prompt.words[0] ?? '';

    for (const character of firstWord) {
      fireEvent.input(textarea, { target: { value: character } });
    }

    fireEvent.input(textarea, { target: { value: ' ' } });

    expect(play).toHaveBeenLastCalledWith('correct');
  });
});
