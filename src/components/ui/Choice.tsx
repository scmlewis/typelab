import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type ChoiceButtonProps = ComponentProps<'button'> & {
  active: boolean;
  label?: string | undefined;
};

export function ChoiceButton({ active, label, className, children, ...props }: ChoiceButtonProps) {
  return (
    <button
      {...props}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3 py-1.5 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-surface-strong hover:text-ink',
        className,
      )}
      type="button"
    >
      {children ?? label}
    </button>
  );
}

type ChoiceGroupProps = {
  label: string;
  children: ReactNode;
  className?: string | undefined;
  padded?: boolean | undefined;
};

export function ChoiceGroup({ label, children, className, padded = false }: ChoiceGroupProps) {
  return (
    <div
      aria-label={label}
      className={cn(
        'flex gap-1',
        padded && 'rounded-full border border-line bg-surface-strong/50 p-0.5',
        className,
      )}
      role="group"
    >
      {children}
    </div>
  );
}

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string | undefined;
  padded?: boolean | undefined;
};

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  padded = true,
}: SegmentedControlProps<T>) {
  return (
    <ChoiceGroup className={className} label={label} padded={padded}>
      {options.map((option) => (
        <ChoiceButton
          active={option.value === value}
          key={option.value}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </ChoiceButton>
      ))}
    </ChoiceGroup>
  );
}
