import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open
      </button>
      <ConfirmDialog
        confirmLabel="Delete"
        description="This removes the run."
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
        }}
        open={open}
        title="Delete this run?"
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('starts on Cancel and wraps Tab in both directions', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('cancels on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('cancels from the backdrop', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
