import type { EngineInput } from '@/engine/types';

export type RejectedInputReason = 'paste' | 'drop' | 'unsupported';

export interface InputAdapterOptions {
  textarea: HTMLTextAreaElement;
  onInput: (input: EngineInput) => void;
  isActive?: () => boolean;
  onFocusLost?: () => void;
  onFocusRestored?: () => void;
  onRejectedInput?: (reason: RejectedInputReason) => void;
}

const BACKSPACE_DEDUPE_MS = 100;

/**
 * Turns committed browser text into engine inputs.
 *
 * The textarea is a receptor, not the source of truth: every committed value is
 * drained and cleared immediately, so the native undo stack and autocorrect
 * never fight the engine.
 */
export class InputAdapter {
  private readonly options: InputAdapterOptions;
  private readonly view: Window | null;
  private attached = false;
  private composing = false;
  private lastBackspaceKeydownAt: number | null = null;

  constructor(options: InputAdapterOptions) {
    this.options = options;
    this.view = options.textarea.ownerDocument.defaultView;
  }

  attach(): void {
    if (this.attached) {
      return;
    }

    this.attached = true;

    const textarea = this.options.textarea;

    textarea.addEventListener('keydown', this.handleKeydown);
    textarea.addEventListener('beforeinput', this.handleBeforeInput);
    textarea.addEventListener('input', this.handleInput);
    textarea.addEventListener('compositionstart', this.handleCompositionStart);
    textarea.addEventListener('compositionend', this.handleCompositionEnd);
    textarea.addEventListener('paste', this.handlePaste);
    textarea.addEventListener('drop', this.handleDrop);
    textarea.addEventListener('blur', this.handleBlur);
    textarea.addEventListener('focus', this.handleFocus);
    this.view?.addEventListener('keydown', this.handleWindowKeydown);
  }

  detach(): void {
    if (!this.attached) {
      return;
    }

    this.attached = false;
    this.composing = false;
    this.lastBackspaceKeydownAt = null;

    const textarea = this.options.textarea;

    textarea.removeEventListener('keydown', this.handleKeydown);
    textarea.removeEventListener('beforeinput', this.handleBeforeInput);
    textarea.removeEventListener('input', this.handleInput);
    textarea.removeEventListener('compositionstart', this.handleCompositionStart);
    textarea.removeEventListener('compositionend', this.handleCompositionEnd);
    textarea.removeEventListener('paste', this.handlePaste);
    textarea.removeEventListener('drop', this.handleDrop);
    textarea.removeEventListener('blur', this.handleBlur);
    textarea.removeEventListener('focus', this.handleFocus);
    this.view?.removeEventListener('keydown', this.handleWindowKeydown);
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || this.composing || event.isComposing) {
      return;
    }

    if (event.key === 'Escape') {
      this.options.onInput({ type: 'cancel' });
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.lastBackspaceKeydownAt = nowMs();
      this.options.onInput({ type: 'backspace' });
      return;
    }

    // Space reaches the engine through the committed input event. Preventing
    // the keydown default here would also suppress that insertion.
  };

  private readonly handleBeforeInput = (event: InputEvent): void => {
    if (this.composing) {
      return;
    }

    if (event.inputType !== 'deleteContentBackward') {
      return;
    }

    event.preventDefault();

    const keydownAt = this.lastBackspaceKeydownAt;

    if (keydownAt !== null && nowMs() - keydownAt <= BACKSPACE_DEDUPE_MS) {
      return;
    }

    this.options.onInput({ type: 'backspace' });
  };

  private readonly handleInput = (event: Event): void => {
    if (this.composing) {
      return;
    }

    const textarea = this.options.textarea;
    const inputType = event instanceof InputEvent ? event.inputType : '';

    if (inputType === 'insertFromPaste' || inputType === 'insertFromDrop') {
      textarea.value = '';
      this.options.onRejectedInput?.(inputType === 'insertFromPaste' ? 'paste' : 'drop');
      return;
    }

    const text = textarea.value;

    if (text.length === 0) {
      return;
    }

    textarea.value = '';
    this.options.onInput({ type: 'insert', text });
  };

  private readonly handleCompositionStart = (): void => {
    this.composing = true;
  };

  private readonly handleCompositionEnd = (event: CompositionEvent): void => {
    this.composing = false;

    const textarea = this.options.textarea;
    const text = textarea.value.length > 0 ? textarea.value : (event.data ?? '');

    textarea.value = '';

    if (text.length > 0) {
      this.options.onInput({ type: 'insert', text });
    }
  };

  private readonly handlePaste = (event: ClipboardEvent): void => {
    event.preventDefault();
    this.options.textarea.value = '';
    this.options.onRejectedInput?.('paste');
  };

  private readonly handleDrop = (event: DragEvent): void => {
    event.preventDefault();
    this.options.textarea.value = '';
    this.options.onRejectedInput?.('drop');
  };

  private readonly handleBlur = (): void => {
    this.options.onFocusLost?.();
  };

  private readonly handleFocus = (): void => {
    this.options.onFocusRestored?.();
  };

  private readonly handleWindowKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || this.composing || event.isComposing) {
      return;
    }

    if (!(this.options.isActive?.() ?? false)) {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    // Only printable keys reclaim focus. Tab, Enter, and Escape keep their
    // normal navigation and activation behaviour.
    if (event.key.length !== 1) {
      return;
    }

    event.preventDefault();
    this.options.textarea.focus();
    this.options.onInput({ type: 'insert', text: event.key });
  };
}

function nowMs(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}
