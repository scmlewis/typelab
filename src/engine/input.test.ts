import { afterEach, describe, expect, it, vi } from 'vitest';

import { InputAdapter } from '@/engine/input';
import type { EngineInput } from '@/engine/types';

type AdapterOptions = Partial<ConstructorParameters<typeof InputAdapter>[0]>;

let adapters: InputAdapter[] = [];

function setup(overrides: AdapterOptions = {}) {
  const textarea = document.createElement('textarea');
  document.body.append(textarea);

  const inputs: EngineInput[] = [];
  const onRejectedInput = vi.fn();
  const onFocusLost = vi.fn();
  const onFocusRestored = vi.fn();

  const adapter = new InputAdapter({
    textarea,
    onInput: (input) => inputs.push(input),
    onRejectedInput,
    onFocusLost,
    onFocusRestored,
    ...overrides,
  });

  adapter.attach();
  adapters.push(adapter);

  return { adapter, textarea, inputs, onRejectedInput, onFocusLost, onFocusRestored };
}

function fire(target: EventTarget, event: Event): Event {
  target.dispatchEvent(event);
  return event;
}

function inputEvent(inputType: string, data: string | null = null): InputEvent {
  return new InputEvent('input', { bubbles: true, cancelable: true, inputType, data });
}

function keydown(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
}

afterEach(() => {
  adapters.forEach((adapter) => {
    adapter.detach();
  });
  adapters = [];
  document.body.replaceChildren();
});

describe('plain text input', () => {
  it('commits one character and clears the textarea', () => {
    const { textarea, inputs } = setup();

    textarea.value = 'a';
    fire(textarea, inputEvent('insertText', 'a'));

    expect(inputs).toEqual([{ type: 'insert', text: 'a' }]);
    expect(textarea.value).toBe('');
  });

  it('commits multi-character input as one insert', () => {
    const { textarea, inputs } = setup();

    textarea.value = 'ab';
    fire(textarea, inputEvent('insertText', 'ab'));

    expect(inputs).toEqual([{ type: 'insert', text: 'ab' }]);
  });

  it('ignores an empty input event', () => {
    const { textarea, inputs } = setup();

    fire(textarea, inputEvent('insertText'));

    expect(inputs).toEqual([]);
  });

  it('clears and rejects paste input', () => {
    const { textarea, inputs, onRejectedInput } = setup();

    const paste = fire(textarea, new Event('paste', { bubbles: true, cancelable: true }));

    expect(paste.defaultPrevented).toBe(true);
    expect(inputs).toEqual([]);
    expect(onRejectedInput).toHaveBeenCalledWith('paste');

    textarea.value = 'pasted';
    fire(textarea, inputEvent('insertFromPaste', 'pasted'));

    expect(inputs).toEqual([]);
    expect(textarea.value).toBe('');
    expect(onRejectedInput).toHaveBeenCalledTimes(2);
  });

  it('rejects dropped text', () => {
    const { textarea, inputs, onRejectedInput } = setup();

    const drop = fire(textarea, new Event('drop', { bubbles: true, cancelable: true }));
    textarea.value = 'dropped';
    fire(textarea, inputEvent('insertFromDrop', 'dropped'));

    expect(drop.defaultPrevented).toBe(true);
    expect(inputs).toEqual([]);
    expect(textarea.value).toBe('');
    expect(onRejectedInput).toHaveBeenCalledWith('drop');
  });
});

describe('composition', () => {
  it('defers input until composition ends, then commits once', () => {
    const { textarea, inputs } = setup();

    fire(textarea, new CompositionEvent('compositionstart', { bubbles: true }));
    textarea.value = 'に';
    fire(textarea, inputEvent('insertCompositionText', 'に'));

    expect(inputs).toEqual([]);

    fire(textarea, new CompositionEvent('compositionend', { bubbles: true, data: 'に' }));

    expect(inputs).toEqual([{ type: 'insert', text: 'に' }]);
    expect(textarea.value).toBe('');

    fire(textarea, inputEvent('insertText', 'に'));

    expect(inputs).toEqual([{ type: 'insert', text: 'に' }]);
  });

  it('falls back to the composition data when the textarea is already empty', () => {
    const { textarea, inputs } = setup();

    fire(textarea, new CompositionEvent('compositionstart', { bubbles: true }));
    fire(textarea, new CompositionEvent('compositionend', { bubbles: true, data: 'か' }));

    expect(inputs).toEqual([{ type: 'insert', text: 'か' }]);
  });

  it('ignores backspace while composing', () => {
    const { textarea, inputs } = setup();

    fire(textarea, new CompositionEvent('compositionstart', { bubbles: true }));
    fire(textarea, keydown('Backspace'));

    expect(inputs).toEqual([]);
    expect(textarea.value).toBe('');
  });
});

describe('backspace', () => {
  it('handles beforeinput deletion', () => {
    const { textarea, inputs } = setup();

    const event = fire(
      textarea,
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'deleteContentBackward',
      }),
    );

    expect(event.defaultPrevented).toBe(true);
    expect(inputs).toEqual([{ type: 'backspace' }]);
  });

  it('deduplicates a keydown and its beforeinput partner', () => {
    const { textarea, inputs } = setup();

    fire(textarea, keydown('Backspace'));
    fire(
      textarea,
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'deleteContentBackward',
      }),
    );

    expect(inputs).toEqual([{ type: 'backspace' }]);
  });

  it('processes repeated keydown presses', () => {
    const { textarea, inputs } = setup();

    fire(textarea, keydown('Backspace'));
    fire(textarea, keydown('Backspace'));

    expect(inputs).toEqual([{ type: 'backspace' }, { type: 'backspace' }]);
  });

  it('processes a virtual-keyboard deletion with no keydown', () => {
    const { textarea, inputs } = setup();

    fire(
      textarea,
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'deleteContentBackward',
      }),
    );

    expect(inputs).toEqual([{ type: 'backspace' }]);
  });

  it('ignores modifier combinations', () => {
    const { textarea, inputs } = setup();

    fire(textarea, keydown('Backspace', { ctrlKey: true }));
    fire(textarea, keydown('Backspace', { metaKey: true }));

    expect(inputs).toEqual([]);
  });
});

describe('keyboard handling', () => {
  it('leaves spaces to the focused textarea', () => {
    const { textarea, inputs } = setup();

    const space = fire(textarea, keydown(' '));

    expect(space.defaultPrevented).toBe(false);
    expect(inputs).toEqual([]);

    textarea.value = ' ';
    fire(textarea, inputEvent('insertText', ' '));

    expect(inputs).toEqual([{ type: 'insert', text: ' ' }]);
  });

  it('prevents page scroll and commits a space when recovering focus', () => {
    const { textarea, inputs } = setup({ isActive: () => true });

    const event = fire(document.body, keydown(' '));

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(textarea);
    expect(inputs).toEqual([{ type: 'insert', text: ' ' }]);
  });

  it('emits cancel on Escape', () => {
    const { textarea, inputs } = setup();

    fire(textarea, keydown('Escape'));

    expect(inputs).toEqual([{ type: 'cancel' }]);
  });

  it('never traps Tab', () => {
    const { textarea, inputs } = setup();

    const tab = fire(textarea, keydown('Tab'));

    expect(tab.defaultPrevented).toBe(false);
    expect(inputs).toEqual([]);
  });
});

describe('focus recovery', () => {
  it('refocuses the textarea and commits the first typed character', () => {
    const { textarea, inputs } = setup({ isActive: () => true });

    const event = fire(document.body, keydown('a'));

    expect(document.activeElement).toBe(textarea);
    expect(event.defaultPrevented).toBe(true);
    expect(inputs).toEqual([{ type: 'insert', text: 'a' }]);
  });

  it('does nothing when the test is not active', () => {
    const { textarea, inputs } = setup({ isActive: () => false });

    fire(document.body, keydown('a'));

    expect(document.activeElement).not.toBe(textarea);
    expect(inputs).toEqual([]);
  });

  it('does not steal input from another editable element', () => {
    const { textarea, inputs } = setup({ isActive: () => true });
    const field = document.createElement('input');
    document.body.append(field);

    fire(field, keydown('a'));

    expect(document.activeElement).not.toBe(textarea);
    expect(inputs).toEqual([]);
  });

  it('reports focus loss and restoration', () => {
    const { textarea, onFocusLost, onFocusRestored } = setup({ isActive: () => true });

    fire(textarea, new FocusEvent('blur'));
    fire(textarea, new FocusEvent('focus'));

    expect(onFocusLost).toHaveBeenCalledTimes(1);
    expect(onFocusRestored).toHaveBeenCalledTimes(1);
  });
});

describe('lifecycle', () => {
  it('stops handling events after detach', () => {
    const { adapter, textarea, inputs } = setup();

    adapter.detach();
    textarea.value = 'a';
    fire(textarea, inputEvent('insertText', 'a'));
    fire(document.body, keydown('a'));

    expect(inputs).toEqual([]);
  });

  it('can be attached twice without duplicating events', () => {
    const { adapter, textarea, inputs } = setup();

    adapter.attach();
    textarea.value = 'a';
    fire(textarea, inputEvent('insertText', 'a'));

    expect(inputs).toEqual([{ type: 'insert', text: 'a' }]);
  });
});
