import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'link' | 'compact';
export type ButtonWeight = 'normal' | 'medium';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/90',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-strong',
  ghost: 'text-ink-muted hover:bg-surface-strong hover:text-ink',
  danger: 'border border-danger/40 text-danger hover:bg-danger/10',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
  icon: 'p-2 text-xs',
  link: 'px-3 py-1.5 text-sm',
  compact: 'p-2.5 text-xs sm:px-3.5 sm:py-1.5',
};

const BUTTON_WEIGHTS: Record<ButtonWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
};

export function buttonStyles({
  variant = 'secondary',
  size = 'md',
  weight = 'medium',
  className,
}: {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  weight?: ButtonWeight | undefined;
  className?: string | undefined;
} = {}): string {
  return cn(
    BUTTON_BASE,
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    BUTTON_WEIGHTS[weight],
    className,
  );
}

export type ControlDensity = 'sm' | 'md';

const CONTROL_BASE =
  'w-full rounded-control border border-line bg-paper text-ink outline-none transition-colors placeholder:text-ink-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50';

const CONTROL_DENSITIES: Record<ControlDensity, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export function controlStyles({
  density = 'md',
  className,
}: {
  density?: ControlDensity | undefined;
  className?: string | undefined;
} = {}): string {
  return cn(CONTROL_BASE, CONTROL_DENSITIES[density], className);
}

export type CardPadding = 'default' | 'roomy';

const CARD_BASE = 'rounded-card border border-line bg-surface shadow-card';

const CARD_PADDING: Record<CardPadding, string> = {
  default: 'p-5 sm:p-6',
  roomy: 'p-8',
};

export function cardStyles({
  padding = 'default',
  className,
}: {
  padding?: CardPadding | undefined;
  className?: string | undefined;
} = {}): string {
  return cn(CARD_BASE, CARD_PADDING[padding], className);
}
