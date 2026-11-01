import type { ReactNode } from 'react';

/** One page-level label treatment: mono, uppercase, wide tracking, accent. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <p
      className={['font-mono text-xs uppercase tracking-[0.2em] text-accent', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  );
}
