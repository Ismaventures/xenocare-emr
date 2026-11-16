import { useSyncExternalStore } from 'react';
import {
  backgroundMutationManager,
  BackgroundMutationQueueSnapshot,
} from '../lib/mutations/backgroundMutationManager';

export function useBackgroundMutationQueue(): BackgroundMutationQueueSnapshot {
  return useSyncExternalStore(
    backgroundMutationManager.subscribe.bind(backgroundMutationManager),
    () => backgroundMutationManager.getSnapshot(),
    () => backgroundMutationManager.getSnapshot(),
  );
}
