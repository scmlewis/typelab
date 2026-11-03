import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/Button';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
};

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A lightweight confirmation dialog. Focus starts on Cancel, Tab and Shift+Tab
 * wrap inside the dialog, Escape and the backdrop cancel, and closing returns
 * focus to whatever was focused before it opened. Destructive confirmations use
 * the danger variant.
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    const focusable = (): HTMLElement[] => {
      const dialog = dialogRef.current;

      if (!dialog) {
        return [];
      }

      return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.hasAttribute('disabled'),
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancelRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (!first || !last) {
        return;
      }

      const active = document.activeElement;
      const inside = active instanceof Node && dialogRef.current?.contains(active) === true;

      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    const restoreTarget = restoreRef.current;

    return () => {
      window.removeEventListener('keydown', onKeyDown);

      if (restoreTarget?.isConnected) {
        restoreTarget.focus();
      }
    };
  }, [open]);

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
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card"
        ref={dialogRef}
        role="dialog"
      >
        <h2 className="font-display text-2xl tracking-tight" id={titleId}>
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted" id={descriptionId}>
          {description}
        </p>
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
