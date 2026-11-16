import {
  deleteStoreRecord,
  getStoreRecord,
  type EmrStoreName,
  type EmrStoreRecord,
  upsertStoreRecord,
} from './db';

function now(): number {
  return Date.now();
}

function buildRecord<T>(
  id: string,
  entityType: string,
  data: T,
): EmrStoreRecord<T> {
  const ts = now();
  return {
    id,
    entityType,
    data,
    createdAt: ts,
    updatedAt: ts,
    isEncrypted: false,
    ttlAt: null,
  };
}

async function upsertGeneric<T>(
  store: EmrStoreName,
  id: string,
  entityType: string,
  data: T,
): Promise<void> {
  const existing = await getStoreRecord<T>(store, id);
  const base = existing || buildRecord(id, entityType, data);

  await upsertStoreRecord(store, {
    ...base,
    data,
    entityType,
    updatedAt: now(),
  });
}

async function getGeneric<T>(
  store: EmrStoreName,
  id: string,
): Promise<T | null> {
  const record = await getStoreRecord<T>(store, id);
  return record?.data ?? null;
}

export async function getSyncMetaValue<T>(key: string): Promise<T | null> {
  return getGeneric<T>('sync_meta', key);
}

export async function setSyncMetaValue<T>(
  key: string,
  value: T,
): Promise<void> {
  await upsertGeneric('sync_meta', key, 'sync_meta', value);
}

export async function removeSyncMetaValue(key: string): Promise<void> {
  await deleteStoreRecord('sync_meta', key);
}

export async function getSyncOutboxValue<T>(key: string): Promise<T | null> {
  return getGeneric<T>('sync_outbox', key);
}

export async function setSyncOutboxValue<T>(
  key: string,
  value: T,
): Promise<void> {
  await upsertGeneric('sync_outbox', key, 'sync_outbox', value);
}

export async function removeSyncOutboxValue(key: string): Promise<void> {
  await deleteStoreRecord('sync_outbox', key);
}
