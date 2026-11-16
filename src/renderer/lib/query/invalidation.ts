import type { QueryClient, QueryKey } from '@tanstack/react-query';

interface InvalidationBatch {
  timer: ReturnType<typeof setTimeout> | null;
  keys: Map<string, QueryKey>;
}

const INVALIDATION_STATE = new WeakMap<QueryClient, InvalidationBatch>();

function getBatchState(queryClient: QueryClient): InvalidationBatch {
  const existing = INVALIDATION_STATE.get(queryClient);
  if (existing) return existing;

  const state: InvalidationBatch = {
    timer: null,
    keys: new Map<string, QueryKey>(),
  };

  INVALIDATION_STATE.set(queryClient, state);
  return state;
}

function keyFingerprint(key: QueryKey): string {
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

export function scheduleQueryInvalidations(
  queryClient: QueryClient,
  keys: QueryKey[],
  delayMs: number = 120,
): void {
  const state = getBatchState(queryClient);

  for (const key of keys) {
    state.keys.set(keyFingerprint(key), key);
  }

  if (state.timer) {
    clearTimeout(state.timer);
  }

  state.timer = setTimeout(() => {
    const pending = Array.from(state.keys.values());
    state.keys.clear();
    state.timer = null;

    for (const key of pending) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, delayMs);
}
