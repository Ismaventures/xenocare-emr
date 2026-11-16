import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';
import {
  getSyncMetaValue,
  removeSyncMetaValue,
  setSyncMetaValue,
} from './persistence';

const QUERY_PERSISTED_CLIENT_KEY = 'react_query_persisted_client_v1';

function isVersionRestoreError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof DOMException && error.name === 'VersionError') {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  const normalized = message.toLowerCase();
  return (
    normalized.includes('versionerror') ||
    normalized.includes('requested version') ||
    normalized.includes('existing version')
  );
}

export function createIndexedDbQueryPersister(_options = {}): Persister {
  return {
    persistClient: async (client) => {
      try {
        await setSyncMetaValue<PersistedClient>(
          QUERY_PERSISTED_CLIENT_KEY,
          client,
        );
      } catch (error) {
        // Keep app running even when persistence store is temporarily unavailable.
        if (!isVersionRestoreError(error)) {
          console.warn(
            '[QueryPersister] Failed to persist cache snapshot:',
            error,
          );
        }
      }
    },

    restoreClient: async () => {
      try {
        const stored = await getSyncMetaValue<PersistedClient>(
          QUERY_PERSISTED_CLIENT_KEY,
        );
        return stored || undefined;
      } catch (error) {
        // Return undefined to force fresh cache instead of surfacing restore errors.
        if (!isVersionRestoreError(error)) {
          console.warn(
            '[QueryPersister] Failed to restore cache snapshot:',
            error,
          );
        }
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        await removeSyncMetaValue(QUERY_PERSISTED_CLIENT_KEY);
      } catch {
        // Best-effort cleanup only.
      }
    },
  };
}

export async function clearIndexedDbQueryClientCache(): Promise<void> {
  await removeSyncMetaValue(QUERY_PERSISTED_CLIENT_KEY);
}
