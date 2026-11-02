import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A lightweight confirmation dialog. Focus starts on Cancel, Escape cancels,
 * and the backdrop closes. Destructive confirmations use the danger variant.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="relative w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card"
        role="dialog"
      >
        <h2 className="font-display text-2xl tracking-tight" id="confirm-dialog-title">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel} ref={cancelRef}>
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
