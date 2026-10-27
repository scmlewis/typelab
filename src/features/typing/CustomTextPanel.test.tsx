import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CUSTOM_TEXT_MAX_LENGTH } from '@/engine/config';
import { CustomTextPanel } from '@/features/typing/CustomTextPanel';

function renderPanel(options: { initialText?: string } = {}) {
  const onStart = vi.fn();
  const onCancel = vi.fn();

  render(
    <CustomTextPanel
      initialText={options.initialText ?? ''}
      onCancel={onCancel}
      onStart={onStart}
    />,
  );

  return { onStart, onCancel };
}

describe('custom text panel', () => {
  it('starts with trimmed, single-spaced text', async () => {
    const user = userEvent.setup();
    const { onStart } = renderPanel();

    await user.type(screen.getByLabelText('Custom text'), '  Hello,{enter}{enter}world!  ');
    await user.click(screen.getByRole('button', { name: /start custom test/i }));

    expect(onStart).toHaveBeenCalledWith('Hello, world!');
  });

  it('prefills an existing custom text', () => {
    renderPanel({ initialText: 'Existing words.' });

    expect(screen.getByLabelText('Custom text')).toHaveValue('Existing words.');
  });

  it('will not start with blank text', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /start custom test/i })).toBeDisabled();
  });

  it('reports an oversized paste and refuses to start', () => {
    const { onStart } = renderPanel();
    const textarea = screen.getByLabelText('Custom text');

    fireEvent.change(textarea, {
      target: { value: 'a'.repeat(CUSTOM_TEXT_MAX_LENGTH + 1) },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/10,000 characters/i);
    expect(screen.getByRole('button', { name: /start custom test/i })).toBeDisabled();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('cancels from the button or Escape', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderPanel();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
