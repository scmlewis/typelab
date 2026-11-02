import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'icon';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/90',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-strong',
  ghost: 'text-ink-muted hover:bg-surface-strong hover:text-ink',
  danger: 'border border-danger/40 text-danger hover:bg-danger/10',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  icon: 'p-2 text-xs',
};

export function buttonStyles({
  variant = 'secondary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
} = {}): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}
