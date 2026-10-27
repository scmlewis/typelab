import type { TestConfig } from '@/engine/types';

export function describeTestConfig(config: TestConfig): string {
  const parts: string[] = [];

  switch (config.mode) {
    case 'timed':
      parts.push(`${config.durationSeconds} seconds`);
      break;
    case 'words':
      parts.push(`${config.wordCount} words`);
      break;
    case 'quote':
      parts.push('Quote');
      break;
    case 'custom':
      parts.push('Custom text');
      break;
  }

  if (config.mode === 'timed' || config.mode === 'words') {
    parts.push(config.vocabulary === 'english-1k' ? 'English 1k' : 'English 200');

    if (config.punctuation) {
      parts.push('punctuation');
    }

    if (config.numbers) {
      parts.push('numbers');
    }
  }

  return parts.join(' · ');
}

export function describeResultMode(result: {
  testMode: TestConfig['mode'];
  durationMs: number;
  wordCount: number | null;
}): string {
  switch (result.testMode) {
    case 'timed':
      return `${Math.round(result.durationMs / 1_000)} seconds`;
    case 'words':
      return `${result.wordCount ?? '?'} words`;
    case 'quote':
      return 'Quote';
    case 'custom':
      return 'Custom text';
  }
}

export function formatDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, elapsedMs) / 1_000;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatPercent(value: number, decimals = 1): string {
  const fixed = value.toFixed(decimals);

  return `${fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed}%`;
}

export function formatLanguage(language: string): string {
  if (language.length === 0) {
    return language;
  }

  return language.charAt(0).toUpperCase() + language.slice(1);
}

export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}
