import type { TestConfig } from '@/engine/types';
import { formatCountdown, formatDuration, formatPercent } from '@/features/typing/format';
import { useLiveMetrics } from '@/features/typing/useLiveMetrics';
import type { TypingStore } from '@/features/typing/typingStore';

interface LiveStatsProps {
  store: TypingStore;
  config: TestConfig;
}

export function LiveStats({ store, config }: LiveStatsProps) {
  const { netWpm, rawWpm, accuracy, elapsedMs } = useLiveMetrics(store);
  const remainingMs = config.mode === 'timed' ? config.durationSeconds * 1_000 - elapsedMs : null;

  return (
    <dl className="mt-4 grid max-w-xl grid-cols-4 gap-3 sm:mt-5 sm:gap-4">
      <Stat label="WPM" value={netWpm.toFixed(0)} />
      <Stat label="Raw" value={rawWpm.toFixed(0)} />
      <Stat label="Accuracy" value={formatPercent(accuracy, 0)} />
      <Stat
        label={remainingMs === null ? 'Time' : 'Left'}
        value={remainingMs === null ? formatDuration(elapsedMs) : formatCountdown(remainingMs)}
      />
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted sm:text-[0.65rem] sm:tracking-[0.16em]">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg tabular-nums text-ink sm:text-3xl">{value}</dd>
    </div>
  );
}
