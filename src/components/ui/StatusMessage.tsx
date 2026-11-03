import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type StatusTone = 'info' | 'success' | 'error';

type StatusMessageProps = {
  tone?: StatusTone | undefined;
  variant?: 'box' | 'plain' | undefined;
  details?: readonly string[] | undefined;
  className?: string | undefined;
  children: ReactNode;
};

const TONE_TEXT: Record<StatusTone, string> = {
  info: 'text-ink-muted',
  success: 'text-ink',
  error: 'text-danger',
};

const TONE_BOX: Record<StatusTone, string> = {
  info: 'border-line/80 bg-accent-soft/40',
  success: 'border-line/80 bg-accent-soft/40',
  error: 'border-danger/30 bg-danger/5',
};

/**
 * Inline status output. Failures are announced as alerts, everything else as
 * status, so a routine save does not interrupt the screen reader.
 */
export function StatusMessage({
  tone = 'info',
  variant = 'box',
  details,
  className,
  children,
}: StatusMessageProps) {
  return (
    <div
      className={cn(
        'text-xs leading-5',
        TONE_TEXT[tone],
        variant === 'box' && 'rounded-control border px-4 py-3',
        variant === 'box' && TONE_BOX[tone],
        className,
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
      {details && details.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
