import type { ReactNode } from 'react';

import { Overline } from '@/components/ui/Overline';
import { cn } from '@/lib/cn';

type MetricProps = {
  label: string;
  value: ReactNode;
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
};

/** A `dt`/`dd` pair. Must be rendered inside a `<dl>`. */
export function Metric({ label, value, size = 'md', className }: MetricProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 sm:block', className)}>
      <dt
        className={
          size === 'sm'
            ? 'text-xs text-ink-muted'
            : 'font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-muted'
        }
      >
        {label}
      </dt>
      <dd
        className={
          size === 'sm'
            ? 'font-mono text-sm tabular-nums text-ink'
            : 'mt-1 font-mono text-xl tabular-nums text-ink'
        }
      >
        {value}
      </dd>
    </div>
  );
}

type HeroStatProps = {
  label: string;
  value: string;
  caption?: ReactNode | undefined;
  valueTestId?: string | undefined;
  className?: string | undefined;
};

/** The large result value. Must be rendered inside a `<dl>`. */
export function HeroStat({ label, value, caption, valueTestId, className }: HeroStatProps) {
  return (
    <div className={cn('sm:text-right', className)}>
      <dt>
        <Overline>{label}</Overline>
      </dt>
      <dd
        className="font-mono text-6xl leading-none tabular-nums text-ink"
        {...(valueTestId === undefined ? {} : { 'data-testid': valueTestId })}
      >
        {value}
      </dd>
      {caption ? <dd className="mt-2 font-mono text-sm text-ink-muted">{caption}</dd> : null}
    </div>
  );
}
