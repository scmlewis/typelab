import {
  computeAccuracy,
  computeCharacterStatistics,
  computeNetWpm,
  computeRawWpm,
} from '@/engine/scoring';
import type { CharacterStatistics } from '@/engine/types';
import type { TypingStore } from '@/features/typing/typingStore';
import { useTypingSelector } from '@/features/typing/useTypingSelector';

export interface LiveMetrics {
  revision: number;
  elapsedMs: number;
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  characterStatistics: CharacterStatistics;
}

/**
 * Live figures for the test header. Recomputed from engine state, never from
 * render counts or intervals observed by React.
 */
export function useLiveMetrics(store: TypingStore): LiveMetrics {
  const revision = useTypingSelector(store, (state) => state.revision);
  const elapsedMs = useTypingSelector(store, (state) => state.snapshot.elapsedMs);
  const snapshot = store.getState().snapshot;
  const characterStatistics = computeCharacterStatistics(
    snapshot.prompt,
    snapshot.typedInputs,
    snapshot.activeWordIndex,
    snapshot.config.mode,
    snapshot.attempts,
  );

  return {
    revision,
    elapsedMs,
    netWpm: computeNetWpm(characterStatistics, snapshot.elapsedMs),
    rawWpm: computeRawWpm(characterStatistics, snapshot.elapsedMs),
    accuracy: computeAccuracy(snapshot.attempts),
    characterStatistics,
  };
}
