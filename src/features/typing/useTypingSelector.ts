import { useSyncExternalStore } from 'react';

import type { TypingState, TypingStore } from '@/features/typing/typingStore';

/**
 * Subscribes to one value from the typing store.
 *
 * Selectors must return a primitive or a stable reference (the result object,
 * for example). A selector that allocates on every call would loop forever.
 */
export function useTypingSelector<T>(store: TypingStore, selector: (state: TypingState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
