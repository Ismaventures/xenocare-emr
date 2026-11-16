/**
 * =============================================================================
 * useDraftRestore — Auto-save & restore unsaved form drafts
 *
 * Saves form data to IndexedDB every few seconds while the user is typing.
 * On mount, if a draft exists and is less than 20 minutes old, it restores
 * the saved state so the doctor doesn't lose their work.
 *
 * After a successful submit, call `clearDraft()` to remove the saved data
 * so it won't be restored on next visit.
 *
 * Usage:
 *   const { hasDraft, clearDraft } = useDraftRestore(
 *     `consultation-${encounterId}`,
 *     formData,
 *     setFormData,
 *   );
 * =============================================================================
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getSyncMetaValue,
  removeSyncMetaValue,
  setSyncMetaValue,
} from '../lib/offline/storage/persistence';

const DRAFT_PREFIX = 'ndc_draft_';
const DRAFT_TTL_MS = 20 * 60 * 1000; // 20 minutes
const SAVE_INTERVAL_MS = 3_000; // auto-save every 3 seconds

interface DraftEnvelope<T> {
  data: T;
  savedAt: number; // epoch ms
}

/**
 * @param draftKey  Unique key per form instance, e.g. `consultation-${encounterId}`
 * @param formData Current form state (any serialisable object / primitive)
 * @param setFormData  State setter to restore the draft into
 * @param options.enabled  Set false to disable (default true)
 */
export function useDraftRestore<T>(
  draftKey: string,
  formData: T,
  setFormData: (data: T) => void,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const storageKey = DRAFT_PREFIX + draftKey;

  const [hasDraft, setHasDraft] = useState(false);
  const formRef = useRef(formData);
  formRef.current = formData;

  // ── Restore on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    const restore = async (): Promise<void> => {
      try {
        const envelope = await getSyncMetaValue<DraftEnvelope<T>>(storageKey);
        if (!mounted || !envelope) return;

        const age = Date.now() - envelope.savedAt;
        if (age > DRAFT_TTL_MS) {
          await removeSyncMetaValue(storageKey);
          return;
        }

        setFormData(envelope.data);
        setHasDraft(true);
      } catch {
        await removeSyncMetaValue(storageKey);
      }
    };

    void restore();

    return () => {
      mounted = false;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  // ── Periodic auto-save ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const envelope: DraftEnvelope<T> = {
        data: formRef.current,
        savedAt: Date.now(),
      };
      void setSyncMetaValue(storageKey, envelope);
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [storageKey, enabled]);

  // ── Save on page unload (beforeunload) ────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const handleUnload = () => {
      const envelope: DraftEnvelope<T> = {
        data: formRef.current,
        savedAt: Date.now(),
      };
      void setSyncMetaValue(storageKey, envelope);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [storageKey, enabled]);

  // ── Clear draft (call after successful submit) ────────────────────────
  const clearDraft = useCallback(() => {
    void removeSyncMetaValue(storageKey);
    setHasDraft(false);
  }, [storageKey]);

  // ── Force-save draft immediately ──────────────────────────────────────
  const saveDraft = useCallback(() => {
    const envelope: DraftEnvelope<T> = {
      data: formRef.current,
      savedAt: Date.now(),
    };
    void setSyncMetaValue(storageKey, envelope);
    setHasDraft(true);
  }, [storageKey]);

  return { hasDraft, clearDraft, saveDraft };
}

export default useDraftRestore;
