import { cn } from '@/lib/cn';

type MetricProps = {
  label: string;
  value: string;
  className?: string | undefined;
};

export function Metric({ label, value, className }: MetricProps) {
  return (
    <div
      className={cn('flex items-baseline justify-between gap-3 sm:block sm:text-right', className)}
    >
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="font-mono text-sm tabular-nums text-ink">{value}</p>
    </div>
  );
}
