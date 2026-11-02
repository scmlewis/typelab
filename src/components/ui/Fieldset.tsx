import type { FieldsetHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type FieldsetProps = FieldsetHTMLAttributes<HTMLFieldSetElement> & {
  legend: string;
};

export function Fieldset({ legend, className, children, ...props }: FieldsetProps) {
  return (
    <fieldset
      className={cn(
        'mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6',
        className,
      )}
      {...props}
    >
      <legend className="sr-only">{legend}</legend>
      <p
        aria-hidden="true"
        className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted"
      >
        {legend}
      </p>
      {children}
    </fieldset>
  );
}
