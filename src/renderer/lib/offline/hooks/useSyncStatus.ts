import { useMemo } from 'react';
import { useBackgroundMutationQueue } from '../../../hooks/useBackgroundMutationQueue';

export interface SyncStatus {
  isOnline: boolean;
  hasPendingChanges: boolean;
  hasFailures: boolean;
  pendingCount: number;
  failedCount: number;
  savedCount: number;
}

export function useSyncStatus(): SyncStatus {
  const { summary } = useBackgroundMutationQueue();

  return useMemo(
    () => ({
      isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
      hasPendingChanges: summary.active > 0,
      hasFailures: summary.failed > 0,
      pendingCount: summary.active,
      failedCount: summary.failed,
      savedCount: summary.saved,
    }),
    [summary.active, summary.failed, summary.saved],
  );
}
