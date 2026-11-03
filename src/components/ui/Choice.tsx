import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type ChoiceTone = 'solid' | 'soft';
export type ChoiceSize = 'xs' | 'sm' | 'md';
export type ChoiceFrame = 'none' | 'soft' | 'outline';

const CHOICE_TONES: Record<ChoiceTone, { active: string; inactive: string }> = {
  solid: {
    active: 'bg-ink text-paper',
    inactive: 'text-ink-muted hover:bg-surface-strong hover:text-ink',
  },
  soft: {
    active: 'border border-transparent bg-accent-soft text-ink',
    inactive: 'border border-line/80 text-ink-muted hover:bg-surface-strong hover:text-ink',
  },
};

const CHOICE_SIZES: Record<ChoiceSize, string> = {
  xs: 'px-2 py-2 font-mono text-xs sm:px-2.5 sm:py-1',
  sm: 'px-3 py-1.5 font-mono text-xs',
  md: 'px-3.5 py-2 text-xs font-medium sm:px-3 sm:py-1.5',
};

const CHOICE_FRAMES: Record<ChoiceFrame, string> = {
  none: '',
  soft: 'rounded-full border border-line bg-surface-strong/50 p-0.5',
  outline: 'rounded-full border border-line bg-surface/70 p-0.5',
};

type ChoiceButtonProps = ComponentProps<'button'> & {
  active: boolean;
  label?: string | undefined;
  tone?: ChoiceTone | undefined;
  size?: ChoiceSize | undefined;
};

export function ChoiceButton({
  active,
  label,
  tone = 'solid',
  size = 'sm',
  className,
  children,
  ...props
}: ChoiceButtonProps) {
  const palette = CHOICE_TONES[tone];

  return (
    <button
      {...props}
      aria-pressed={active}
      className={cn(
        'rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        CHOICE_SIZES[size],
        active ? palette.active : palette.inactive,
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
  frame?: ChoiceFrame | undefined;
};

export function ChoiceGroup({ label, children, className, frame = 'none' }: ChoiceGroupProps) {
  return (
    <div
      aria-label={label}
      className={cn('flex gap-1', CHOICE_FRAMES[frame], className)}
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
  frame?: ChoiceFrame | undefined;
  tone?: ChoiceTone | undefined;
  size?: ChoiceSize | undefined;
};

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  frame = 'soft',
  tone = 'solid',
  size = 'sm',
}: SegmentedControlProps<T>) {
  return (
    <ChoiceGroup className={className} frame={frame} label={label}>
      {options.map((option) => (
        <ChoiceButton
          active={option.value === value}
          key={option.value}
          onClick={() => {
            onChange(option.value);
          }}
          size={size}
          tone={tone}
        >
          {option.label}
        </ChoiceButton>
      ))}
    </ChoiceGroup>
  );
}
