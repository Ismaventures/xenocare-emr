/**
 * Embedding Sync — background service that keeps the patient_record_embeddings
 * table in sync with source clinical records.
 *
 * Flow:
 * 1. For each embeddable table, query rows for the given patient_id
 *    that don't yet have an embedding (LEFT JOIN).
 * 2. Build text chunks via chunkBuilder.
 * 3. Generate embeddings via embeddingClient (batched).
 * 4. Upsert into patient_record_embeddings.
 *
 * Designed to run in the renderer process — it calls Supabase directly.
 */
import log from 'electron-log';
import { supabase } from '../../api/supabaseClient';
import { buildChunks, getEmbeddableTables, getTableMeta } from './chunkBuilder';
import { generateEmbeddingBatch } from './embeddingClient';
import type { EmbeddableTable } from '../../modules/ai-assistant/types/ai.types';
import type { TextChunk } from './chunkBuilder';

// =============================================================================
// Configuration
// =============================================================================

/** Max records to process per table per sync cycle */
const BATCH_SIZE = 50;

/** Max chunks to embed per API call */
const EMBED_BATCH_SIZE = 20;

// =============================================================================
// Sync State
// =============================================================================

const activeSyncs = new Map<string, AbortController>();

// =============================================================================
// Core Sync Logic
// =============================================================================

/**
 * Sync embeddings for a single patient across all embeddable tables.
 * Designed to be called when a patient chart is opened.
 *
 * @param patientId - UUID of the patient
 * @param force - If true, re-embed all records (not just new ones)
 * @returns Summary of the sync operation
 */
export async function syncPatientEmbeddings(
  patientId: string,
  force = false,
): Promise<{ totalEmbedded: number; errors: string[] }> {
  // Cancel any in-progress sync for this patient
  const existing = activeSyncs.get(patientId);
  if (existing) {
    existing.abort();
    activeSyncs.delete(patientId);
  }

  const controller = new AbortController();
  activeSyncs.set(patientId, controller);

  const errors: string[] = [];
  let totalEmbedded = 0;

  try {
    const tables = getEmbeddableTables();

    for (const table of tables) {
      if (controller.signal.aborted) break;

      try {
        const count = await syncTable(
          patientId,
          table,
          force,
          controller.signal,
        );
        totalEmbedded += count;
      } catch (err) {
        if (controller.signal.aborted) break;
        const msg = `[EmbeddingSync] Error syncing ${table}: ${String(err)}`;
        log.warn(msg);
        errors.push(msg);
      }
    }
  } finally {
    activeSyncs.delete(patientId);
  }

  log.info(
    `[EmbeddingSync] Patient ${patientId}: embedded ${totalEmbedded} chunks, ${errors.length} errors`,
  );
  return { totalEmbedded, errors };
}

/**
 * Sync a single table for a patient.
 */
async function syncTable(
  patientId: string,
  table: EmbeddableTable,
  force: boolean,
  signal: AbortSignal,
): Promise<number> {
  const meta = getTableMeta(table);

  const rows = await fetchRowsForPatient(table, patientId, meta);
  if (rows.length === 0) return 0;

  // 2. If not forcing, filter out already-embedded records
  let rowsToEmbed = rows;
  if (!force) {
    const sourceIds = rows.map((r: Record<string, unknown>) =>
      String(r[meta.idField]),
    );
    const { data: existing } = await supabase
      .from('patient_record_embeddings')
      .select('source_id,metadata')
      .eq('source_table', table)
      .in('source_id', sourceIds);

    const versionBySource = new Map<string, string>();
    (existing ?? []).forEach(
      (entry: { source_id: string; metadata?: Record<string, unknown> }) => {
        const sourceId = String(entry.source_id);
        const embeddedVersion = String(entry.metadata?.source_updated_at || '');
        if (!versionBySource.has(sourceId)) {
          versionBySource.set(sourceId, embeddedVersion);
        }
      },
    );

    rowsToEmbed = rows.filter((r: Record<string, unknown>) => {
      const sourceId = String(r[meta.idField]);
      const currentVersion = String(
        r.updated_at || r.created_at || r[meta.dateField] || '',
      );
      return versionBySource.get(sourceId) !== currentVersion;
    });
  }

  if (rowsToEmbed.length === 0) return 0;
  if (signal.aborted) return 0;

  // 3. Build text chunks
  const chunks = buildChunks(table, rowsToEmbed, patientId);
  if (chunks.length === 0) return 0;

  // 4. Generate embeddings in batches and upsert
  let embedded = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    if (signal.aborted) break;

    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    const { embeddings } = await generateEmbeddingBatch(texts);

    // 5. Upsert into database
    const upsertRows = batch.map((chunk: TextChunk, idx: number) => ({
      patient_id: chunk.patientId,
      source_table: chunk.sourceTable,
      source_id: chunk.sourceId,
      encounter_id: chunk.encounterId || null,
      chunk_index: chunk.chunkIndex,
      chunk_type: chunk.chunkType,
      chunk_text: chunk.content,
      embedding: `[${embeddings[idx].join(',')}]`,
      record_date: chunk.encounterDate,
      metadata: chunk.metadata,
    }));

    const { error: upsertError } = await supabase
      .from('patient_record_embeddings')
      .upsert(upsertRows, { onConflict: 'source_table,source_id,chunk_index' });

    if (upsertError) {
      throw new Error(`Upsert ${table}: ${upsertError.message}`);
    }

    embedded += batch.length;
  }

  log.debug(
    `[EmbeddingSync] ${table}: embedded ${embedded} chunks for patient ${patientId}`,
  );
  return embedded;
}

// =============================================================================
// Source Fetch Helpers
// =============================================================================

async function fetchRowsForPatient(
  table: EmbeddableTable,
  patientId: string,
  meta: ReturnType<typeof getTableMeta>,
): Promise<Record<string, unknown>[]> {
  const getEncounterIds = async () => {
    const { data, error } = await supabase
      .from('visits')
      .select('id')
      .eq('patient_id', patientId)
      .order('encounter_date', { ascending: false })
      .limit(BATCH_SIZE * 4);
    if (error)
      throw new Error(
        `Fetch visits for encounter resolution: ${error.message}`,
      );
    return (data ?? []).map((row: { id: string }) => row.id).filter(Boolean);
  };

  const byPatient = async (patientColumn = 'patient_id') => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(patientColumn, patientId)
      .order(meta.dateField, { ascending: false })
      .limit(BATCH_SIZE);
    if (error) throw new Error(`Fetch ${table}: ${error.message}`);
    return (data as Record<string, unknown>[] | null) ?? [];
  };

  const byEncounter = async (encounterIds: string[]) => {
    if (encounterIds.length === 0) return [];
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in('encounter_id', encounterIds)
      .order(meta.dateField, { ascending: false })
      .limit(BATCH_SIZE);
    if (error) throw new Error(`Fetch ${table} by encounter: ${error.message}`);
    return (data as Record<string, unknown>[] | null) ?? [];
  };

  const dedupeById = (rows: Record<string, unknown>[]) => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const id = String(row[meta.idField] || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  if (table === 'ward_round_notes') {
    const { data: admissions, error: admissionError } = await supabase
      .from('admissions')
      .select('id')
      .eq('patient_id', patientId)
      .order('admission_date', { ascending: false })
      .limit(BATCH_SIZE * 4);
    if (admissionError)
      throw new Error(
        `Fetch admissions for ward rounds: ${admissionError.message}`,
      );
    const admissionIds = (admissions ?? [])
      .map((row: { id: string }) => row.id)
      .filter(Boolean);
    if (admissionIds.length === 0) return [];

    const { data, error } = await supabase
      .from('ward_round_notes')
      .select('*')
      .in('admission_id', admissionIds)
      .order(meta.dateField, { ascending: false })
      .limit(BATCH_SIZE);
    if (error) throw new Error(`Fetch ward_round_notes: ${error.message}`);
    return (data as Record<string, unknown>[] | null) ?? [];
  }

  if (
    table === 'consultations' ||
    table === 'lab_requests' ||
    table === 'radiology_requests' ||
    table === 'prescriptions' ||
    table === 'dispense_records' ||
    table === 'scan_results' ||
    table === 'procedures' ||
    table === 'vitals' ||
    table === 'daily_progress_notes'
  ) {
    const encounterIds = await getEncounterIds();
    const encounterRows = await byEncounter(encounterIds);

    // Keep fallback for deployments where patient_id is set directly on the same table.
    const patientRows = await byPatient();
    return dedupeById([...encounterRows, ...patientRows]);
  }

  if (table === 'lab_results') {
    const directRows = await byPatient();
    const encounterIds = await getEncounterIds();

    if (encounterIds.length === 0) return directRows;

    const { data: labRequests, error: requestsError } = await supabase
      .from('lab_requests')
      .select('request_id')
      .in('encounter_id', encounterIds)
      .limit(BATCH_SIZE * 4);
    if (requestsError)
      throw new Error(
        `Fetch lab_requests for lab_results: ${requestsError.message}`,
      );
    const requestIds = (labRequests ?? [])
      .map((row: { request_id: string }) => row.request_id)
      .filter(Boolean);

    if (requestIds.length === 0) return directRows;

    const { data: linkedRows, error: linkedError } = await supabase
      .from('lab_results')
      .select('*')
      .in('request_id', requestIds)
      .order(meta.dateField, { ascending: false })
      .limit(BATCH_SIZE);
    if (linkedError)
      throw new Error(
        `Fetch lab_results by request_id: ${linkedError.message}`,
      );

    return dedupeById([
      ...directRows,
      ...((linkedRows as Record<string, unknown>[] | null) ?? []),
    ]);
  }

  if (table === 'billing_items') {
    const { data: orders, error: orderError } = await supabase
      .from('billing_orders')
      .select('id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(BATCH_SIZE * 4);
    if (orderError)
      throw new Error(
        `Fetch billing_orders for billing_items: ${orderError.message}`,
      );
    const orderIds = (orders ?? [])
      .map((row: { id: string }) => row.id)
      .filter(Boolean);
    if (orderIds.length === 0) return [];

    const { data, error } = await supabase
      .from('billing_items')
      .select('*')
      .in('billing_order_id', orderIds)
      .order(meta.dateField, { ascending: false })
      .limit(BATCH_SIZE);
    if (error) throw new Error(`Fetch billing_items: ${error.message}`);
    return (data as Record<string, unknown>[] | null) ?? [];
  }

  return byPatient();
}

// =============================================================================
// Public Helpers
// =============================================================================

/**
 * Cancel any active sync for a patient (e.g., when navigating away).
 */
export function cancelPatientSync(patientId: string): void {
  const controller = activeSyncs.get(patientId);
  if (controller) {
    controller.abort();
    activeSyncs.delete(patientId);
    log.debug(`[EmbeddingSync] Cancelled sync for patient ${patientId}`);
  }
}

/**
 * Delete all embeddings for a patient (e.g., data-purge request).
 */
export async function deletePatientEmbeddings(
  patientId: string,
): Promise<void> {
  cancelPatientSync(patientId);
  const { error } = await supabase
    .from('patient_record_embeddings')
    .delete()
    .eq('patient_id', patientId);

  if (error) throw new Error(`Delete embeddings: ${error.message}`);
  log.info(`[EmbeddingSync] Deleted all embeddings for patient ${patientId}`);
}

/**
 * Get embedding stats for a patient.
 */
export async function getPatientEmbeddingStats(patientId: string): Promise<{
  totalChunks: number;
  byTable: Record<string, number>;
  lastUpdated: string | null;
}> {
  const { data, error } = await supabase
    .from('patient_record_embeddings')
    .select('source_table, created_at')
    .eq('patient_id', patientId);

  if (error) throw new Error(`Stats: ${error.message}`);
  if (!data || data.length === 0) {
    return { totalChunks: 0, byTable: {}, lastUpdated: null };
  }

  const byTable: Record<string, number> = {};
  let lastUpdated: string | null = null;

  for (const row of data) {
    const tbl = row.source_table as string;
    byTable[tbl] = (byTable[tbl] || 0) + 1;
    if (!lastUpdated || row.created_at > lastUpdated) {
      lastUpdated = row.created_at as string;
    }
  }

  return { totalChunks: data.length, byTable, lastUpdated };
}

/**
 * Bulk sync embeddings for all patients.
 * Intended for initial backfill or periodic integrity jobs.
 */
export async function syncAllPatientsEmbeddings(
  force = false,
  maxPatients?: number,
): Promise<{
  patientsProcessed: number;
  totalEmbedded: number;
  errors: string[];
}> {
  const { data: patients, error } = await supabase
    .from('patients')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(maxPatients && maxPatients > 0 ? maxPatients : 1000000);

  if (error) {
    throw new Error(`Fetch patients for bulk embedding sync: ${error.message}`);
  }

  const errors: string[] = [];
  let totalEmbedded = 0;
  let patientsProcessed = 0;

  for (const patient of patients ?? []) {
    const patientId = String((patient as { id?: string }).id || '');
    if (!patientId) continue;

    try {
      const result = await syncPatientEmbeddings(patientId, force);
      patientsProcessed += 1;
      totalEmbedded += result.totalEmbedded;
      if (result.errors.length > 0) {
        errors.push(...result.errors.map((msg) => `[${patientId}] ${msg}`));
      }
    } catch (syncError) {
      errors.push(`[${patientId}] ${String(syncError)}`);
    }
  }

  log.info(
    `[EmbeddingSync] Bulk run complete. Patients=${patientsProcessed}, Chunks=${totalEmbedded}, Errors=${errors.length}`,
  );

  return { patientsProcessed, totalEmbedded, errors };
}
