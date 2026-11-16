import { useCallback } from 'react';
import { create } from 'zustand';
import {
  getSyncMetaValue,
  removeSyncMetaValue,
  setSyncMetaValue,
} from '../../../lib/offline/storage/persistence';

type WorkflowDraftStatus = 'idle' | 'restoring' | 'ready' | 'saving' | 'error';

interface WorkflowDraftEntry {
  status: WorkflowDraftStatus;
  lastSavedAt: number | null;
  lastRestoredAt: number | null;
  error: string | null;
}

interface WorkflowDraftStoreState {
  entries: Record<string, WorkflowDraftEntry>;
  restoreDraft: <T>(storageKey: string) => Promise<T | null>;
  saveDraft: <T>(storageKey: string, draft: T) => Promise<void>;
  clearDraft: (storageKey: string) => Promise<void>;
  resetDraftState: (storageKey: string) => void;
}

const EMPTY_DRAFT_ENTRY: WorkflowDraftEntry = {
  status: 'idle',
  lastSavedAt: null,
  lastRestoredAt: null,
  error: null,
};

function getDraftErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Draft persistence failed';
}

function mergeEntry(
  entries: Record<string, WorkflowDraftEntry>,
  storageKey: string,
  patch: Partial<WorkflowDraftEntry>,
): Record<string, WorkflowDraftEntry> {
  return {
    ...entries,
    [storageKey]: {
      ...(entries[storageKey] ?? EMPTY_DRAFT_ENTRY),
      ...patch,
    },
  };
}

export const useWorkflowDraftStore = create<WorkflowDraftStoreState>((set) => ({
  entries: {},

  async restoreDraft<T>(storageKey: string): Promise<T | null> {
    set((state) => ({
      entries: mergeEntry(state.entries, storageKey, {
        status: 'restoring',
        error: null,
      }),
    }));

    try {
      const draft = await getSyncMetaValue<T>(storageKey);
      set((state) => ({
        entries: mergeEntry(state.entries, storageKey, {
          status: 'ready',
          lastRestoredAt: draft
            ? Date.now()
            : state.entries[storageKey]?.lastRestoredAt ?? null,
          error: null,
        }),
      }));
      return draft;
    } catch (error) {
      set((state) => ({
        entries: mergeEntry(state.entries, storageKey, {
          status: 'error',
          error: getDraftErrorMessage(error),
        }),
      }));
      return null;
    }
  },

  async saveDraft<T>(storageKey: string, draft: T): Promise<void> {
    set((state) => ({
      entries: mergeEntry(state.entries, storageKey, {
        status: 'saving',
        error: null,
      }),
    }));

    try {
      await setSyncMetaValue(storageKey, draft);
      set((state) => ({
        entries: mergeEntry(state.entries, storageKey, {
          status: 'ready',
          lastSavedAt: Date.now(),
          error: null,
        }),
      }));
    } catch (error) {
      set((state) => ({
        entries: mergeEntry(state.entries, storageKey, {
          status: 'error',
          error: getDraftErrorMessage(error),
        }),
      }));
    }
  },

  async clearDraft(storageKey: string): Promise<void> {
    try {
      await removeSyncMetaValue(storageKey);
    } finally {
      set((state) => {
        const nextEntries = { ...state.entries };
        delete nextEntries[storageKey];
        return { entries: nextEntries };
      });
    }
  },

  resetDraftState(storageKey: string): void {
    set((state) => {
      const nextEntries = { ...state.entries };
      delete nextEntries[storageKey];
      return { entries: nextEntries };
    });
  },
}));

export function useWorkflowDraftPersistence<T>(
  storageKey: string | null | undefined,
) {
  const restoreDraftState = useWorkflowDraftStore((state) => state.restoreDraft);
  const saveDraftState = useWorkflowDraftStore((state) => state.saveDraft);
  const clearDraftState = useWorkflowDraftStore((state) => state.clearDraft);
  const resetDraftStateStore = useWorkflowDraftStore(
    (state) => state.resetDraftState,
  );
  const entry = useWorkflowDraftStore((state) =>
    storageKey ? state.entries[storageKey] ?? EMPTY_DRAFT_ENTRY : EMPTY_DRAFT_ENTRY,
  );

  const restoreDraft = useCallback((): Promise<T | null> => {
    if (!storageKey) return Promise.resolve(null);
    return restoreDraftState<T>(storageKey);
  }, [restoreDraftState, storageKey]);

  const saveDraft = useCallback(
    (draft: T): Promise<void> => {
      if (!storageKey) return Promise.resolve();
      return saveDraftState(storageKey, draft);
    },
    [saveDraftState, storageKey],
  );

  const clearDraft = useCallback((): Promise<void> => {
    if (!storageKey) return Promise.resolve();
    return clearDraftState(storageKey);
  }, [clearDraftState, storageKey]);

  const resetDraftState = useCallback((): void => {
    if (!storageKey) return;
    resetDraftStateStore(storageKey);
  }, [resetDraftStateStore, storageKey]);

  return {
    restoreDraft,
    saveDraft,
    clearDraft,
    resetDraftState,
    draftStatus: entry.status,
    lastSavedAt: entry.lastSavedAt,
    lastRestoredAt: entry.lastRestoredAt,
    draftError: entry.error,
  };
}
