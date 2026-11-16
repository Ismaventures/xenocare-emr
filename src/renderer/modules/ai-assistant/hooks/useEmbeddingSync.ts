/**
 * useEmbeddingSync — React hook that syncs patient embeddings when a patient chart opens.
 */
import { useEffect, useRef, useState } from 'react';
import {
  syncPatientEmbeddings,
  cancelPatientSync,
  getPatientEmbeddingStats,
} from '../../../lib/embeddings';

interface SyncState {
  syncing: boolean;
  totalChunks: number;
  lastUpdated: string | null;
  error: string | null;
}

/**
 * Automatically syncs embeddings when patientId changes.
 * Cancels in-progress sync when patient changes or component unmounts.
 */
export function useEmbeddingSync(patientId: string | null) {
  const [state, setState] = useState<SyncState>({
    syncing: false,
    totalChunks: 0,
    lastUpdated: null,
    error: null,
  });
  const activePatientRef = useRef<string | null>(null);

  useEffect(() => {
    if (!patientId) return;

    // Cancel previous sync
    if (activePatientRef.current && activePatientRef.current !== patientId) {
      cancelPatientSync(activePatientRef.current);
    }
    activePatientRef.current = patientId;

    let cancelled = false;

    async function run() {
      setState((s) => ({ ...s, syncing: true, error: null }));

      try {
        // First get current stats
        const stats = await getPatientEmbeddingStats(patientId!);
        if (cancelled) return;
        setState((s) => ({
          ...s,
          totalChunks: stats.totalChunks,
          lastUpdated: stats.lastUpdated,
        }));

        // Sync new records
        const result = await syncPatientEmbeddings(patientId!);
        if (cancelled) return;

        // Refresh stats
        const updatedStats = await getPatientEmbeddingStats(patientId!);
        if (cancelled) return;

        setState({
          syncing: false,
          totalChunks: updatedStats.totalChunks,
          lastUpdated: updatedStats.lastUpdated,
          error: result.errors.length > 0 ? result.errors[0] : null,
        });
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            syncing: false,
            error: String(err),
          }));
        }
      }
    }

    run();

    return () => {
      cancelled = true;
      if (patientId) cancelPatientSync(patientId);
    };
  }, [patientId]);

  return state;
}
