import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type OverlineProps = {
  children: ReactNode;
  tone?: 'muted' | 'accent' | undefined;
  className?: string | undefined;
};

/** The mono micro-label shared by metrics, panels, and result summaries. */
export function Overline({ children, tone = 'muted', className }: OverlineProps) {
  return (
    <span
      className={cn(
        'font-mono text-[0.65rem] uppercase tracking-[0.16em]',
        tone === 'accent' ? 'text-accent' : 'text-ink-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
