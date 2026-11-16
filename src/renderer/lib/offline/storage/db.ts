import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const EMR_DB_NAME = 'emr-db';
/** Bump when schema changes; upgrade() ensures every store in STORE_NAMES exists. */
export const EMR_DB_VERSION = 4;

export type EmrStoreName =
  | 'core_patient'
  | 'core_encounter'
  | 'orders_and_results'
  | 'billing_finance'
  | 'reference_data'
  | 'sync_outbox'
  | 'sync_meta'
  | 'cache';

export interface EmrStoreRecord<T = unknown> {
  id: string;
  entityType: string;
  data: T;
  createdAt: number;
  updatedAt: number;
  version?: string;
  userId?: string;
  facilityId?: string;
  isEncrypted?: boolean;
  ttlAt?: number | null;
}

interface EmrDbSchema extends DBSchema {
  core_patient: {
    key: string;
    value: EmrStoreRecord;
    indexes: {
      'by-userId': string;
      'by-entityType': string;
      'by-updatedAt': number;
      'by-ttlAt': number;
    };
  };
  core_encounter: {
    key: string;
    value: EmrStoreRecord;
    indexes: {
      'by-userId': string;
      'by-entityType': string;
      'by-updatedAt': number;
      'by-ttlAt': number;
    };
  };
  orders_and_results: {
    key: string;
    value: EmrStoreRecord;
    indexes: {
      'by-userId': string;
      'by-entityType': string;
      'by-updatedAt': number;
      'by-ttlAt': number;
    };
  };
  billing_finance: {
    key: string;
    value: EmrStoreRecord;
    indexes: {
      'by-userId': string;
      'by-entityType': string;
      'by-updatedAt': number;
      'by-ttlAt': number;
    };
  };
  reference_data: {
    key: string;
    value: EmrStoreRecord;
    indexes: {
      'by-userId': string;
      'by-entityType': string;
      'by-updatedAt': number;
      'by-ttlAt': number;
    };
  };
  sync_outbox: {
    key: string;
    value: EmrStoreRecord;
    indexes: {
      'by-userId': string;
      'by-entityType': string;
      'by-updatedAt': number;
      'by-ttlAt': number;
    };
  };
  sync_meta: {
    key: string;
    value: EmrStoreRecord;
    indexes: {
      'by-userId': string;
      'by-entityType': string;
      'by-updatedAt': number;
      'by-ttlAt': number;
    };
  };
  cache: {
    key: string;
    value: EmrStoreRecord;
    indexes: {
      'by-userId': string;
      'by-entityType': string;
      'by-updatedAt': number;
      'by-ttlAt': number;
    };
  };
}

const STORE_NAMES: EmrStoreName[] = [
  'core_patient',
  'core_encounter',
  'orders_and_results',
  'billing_finance',
  'reference_data',
  'sync_outbox',
  'sync_meta',
  'cache',
];

let dbPromise: Promise<IDBPDatabase<EmrDbSchema>> | null = null;

function allStoresPresent(db: IDBPDatabase<EmrDbSchema>): boolean {
  return STORE_NAMES.every((name) => db.objectStoreNames.contains(name));
}

/** Thrown when opening a transaction on a missing store (corrupt / legacy schema). */
function isMissingObjectStoreError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'NotFoundError')
    return true;
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /object store.*not found|one of the specified object stores was not found/i.test(
    msg,
  );
}

function isIndexedDbVersionError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof DOMException) {
    if (error.name === 'VersionError') return true;
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

async function openEmrDbConnection(): Promise<IDBPDatabase<EmrDbSchema>> {
  try {
    return await openDB<EmrDbSchema>(EMR_DB_NAME, EMR_DB_VERSION, {
      upgrade(db) {
        for (const storeName of STORE_NAMES) {
          ensureStore(db, storeName);
        }
      },
    });
  } catch (error) {
    if (!isIndexedDbVersionError(error)) {
      throw error;
    }
    // Existing on-disk version is newer than EMR_DB_VERSION — open current version without upgrade.
    // That DB may lack stores if it came from a broken migration; validate and recreate if needed.
    const existing = await openDB<EmrDbSchema>(EMR_DB_NAME);
    if (!allStoresPresent(existing)) {
      existing.close();
      await deleteDB(EMR_DB_NAME);
      return await openDB<EmrDbSchema>(EMR_DB_NAME, EMR_DB_VERSION, {
        upgrade(db) {
          for (const storeName of STORE_NAMES) {
            ensureStore(db, storeName);
          }
        },
      });
    }
    return existing;
  }
}

/** Clear cached handle and delete DB (e.g. after NotFoundError on a store). */
export async function resetEmrDb(): Promise<void> {
  dbPromise = null;
  try {
    await deleteDB(EMR_DB_NAME);
  } catch {
    // ignore
  }
}

async function withDbRecovery<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingObjectStoreError(error)) throw error;
    await resetEmrDb();
    return await operation();
  }
}

function ensureStore(
  db: IDBPDatabase<EmrDbSchema>,
  storeName: EmrStoreName,
): void {
  if (db.objectStoreNames.contains(storeName)) return;

  const store = db.createObjectStore(storeName, { keyPath: 'id' });
  store.createIndex('by-userId', 'userId', { unique: false });
  store.createIndex('by-entityType', 'entityType', { unique: false });
  store.createIndex('by-updatedAt', 'updatedAt', { unique: false });
  store.createIndex('by-ttlAt', 'ttlAt', { unique: false });
}

export function getEmrDb(): Promise<IDBPDatabase<EmrDbSchema>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      let db = await openEmrDbConnection();
      if (!allStoresPresent(db)) {
        db.close();
        await deleteDB(EMR_DB_NAME);
        db = await openEmrDbConnection();
        if (!allStoresPresent(db)) {
          throw new DOMException(
            'EMR IndexedDB is missing required object stores after reset. Try clearing site data for this origin.',
            'InvalidStateError',
          );
        }
      }
      return db;
    })().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }

  return dbPromise;
}

export async function upsertStoreRecord<T>(
  store: EmrStoreName,
  record: EmrStoreRecord<T>,
): Promise<void> {
  return withDbRecovery(async () => {
    const db = await getEmrDb();
    await db.put(store, record as EmrStoreRecord);
  });
}

export async function getStoreRecord<T>(
  store: EmrStoreName,
  id: string,
): Promise<EmrStoreRecord<T> | null> {
  return withDbRecovery(async () => {
    const db = await getEmrDb();
    const item = await db.get(store, id);
    return (item as EmrStoreRecord<T> | undefined) || null;
  });
}

export async function deleteStoreRecord(
  store: EmrStoreName,
  id: string,
): Promise<void> {
  return withDbRecovery(async () => {
    const db = await getEmrDb();
    await db.delete(store, id);
  });
}

export async function clearStore(store: EmrStoreName): Promise<void> {
  return withDbRecovery(async () => {
    const db = await getEmrDb();
    await db.clear(store);
  });
}

export async function countStoreRecords(store: EmrStoreName): Promise<number> {
  return withDbRecovery(async () => {
    const db = await getEmrDb();
    return db.count(store);
  });
}

export async function removeExpiredRecords(
  store: EmrStoreName,
  nowTs = Date.now(),
  maxDelete = 250,
): Promise<number> {
  return withDbRecovery(async () => {
    const db = await getEmrDb();
    const tx = db.transaction(store, 'readwrite');
    const index = tx.store.index('by-ttlAt');

    let deleted = 0;
    let cursor = await index.openCursor(IDBKeyRange.upperBound(nowTs));

    while (cursor && deleted < maxDelete) {
      const { ttlAt } = cursor.value;
      if (typeof ttlAt === 'number' && ttlAt <= nowTs) {
        await cursor.delete();
        deleted += 1;
      }
      cursor = await cursor.continue();
    }

    await tx.done;
    return deleted;
  });
}

export async function removeOldestRecords(
  store: EmrStoreName,
  maxDelete = 250,
): Promise<number> {
  return withDbRecovery(async () => {
    const db = await getEmrDb();
    const tx = db.transaction(store, 'readwrite');
    const index = tx.store.index('by-updatedAt');

    let deleted = 0;
    let cursor = await index.openCursor();

    while (cursor && deleted < maxDelete) {
      await cursor.delete();
      deleted += 1;
      cursor = await cursor.continue();
    }

    await tx.done;
    return deleted;
  });
}
