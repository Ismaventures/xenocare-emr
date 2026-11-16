import {
  countStoreRecords,
  removeExpiredRecords,
  removeOldestRecords,
} from './db';

interface StorageEstimate {
  usage: number;
  quota: number;
  ratio: number;
}

const WARN_RATIO = 0.8;
const TARGET_RATIO = 0.7;
const MAX_TRIM_ITERATIONS = 4;
const BATCH_TRIM_SIZE = 300;

async function estimateStorage(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = Number(estimate.usage ?? 0);
    const quota = Number(estimate.quota ?? 0);
    if (!quota) return null;

    return {
      usage,
      quota,
      ratio: usage / quota,
    };
  } catch {
    return null;
  }
}

export async function runIndexedDbMaintenance(): Promise<void> {
  // Trim expired cache records first to recover space from stale SWR entries.
  await removeExpiredRecords('cache', Date.now(), 1000);

  const before = await estimateStorage();
  if (before && before.ratio >= WARN_RATIO) {
    console.warn(
      `[StorageMaintenance] High storage usage: ${(before.ratio * 100).toFixed(1)}% ` +
        `(${Math.round(before.usage / (1024 * 1024))}MB / ${Math.round(before.quota / (1024 * 1024))}MB).`,
    );
  }

  let current = before;
  let iteration = 0;

  while (
    current &&
    current.ratio > TARGET_RATIO &&
    iteration < MAX_TRIM_ITERATIONS
  ) {
    const removed = await removeOldestRecords('cache', BATCH_TRIM_SIZE);
    if (!removed) break;

    iteration += 1;
    current = await estimateStorage();
  }

  // Keep outbox stores bounded in record count to avoid unbounded growth.
  const outboxCount = await countStoreRecords('sync_outbox');
  if (outboxCount > 2000) {
    await removeOldestRecords('sync_outbox', outboxCount - 1800);
  }
}
