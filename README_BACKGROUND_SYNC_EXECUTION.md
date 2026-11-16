# Background Sync Recommendations - Execution Log

Date: 2026-03-17

This file tracks which background sync and responsiveness recommendations were executed.
Per request, items already implemented earlier were not reworked.

## Scope Covered In This Execution

1. Added restart-safe replay support for background mutations (durable outbox payload snapshots).
2. Removed remaining blocking post-save chain in Nursing triage (save first, route in background).
3. Kept previously executed recommendations unchanged.

## What Was Implemented Now

### 1) Durable Outbox Replay After App Restart

Files:
- src/renderer/lib/mutations/backgroundMutationManager.ts
- src/renderer/hooks/useBackgroundMutation.ts

Changes:
- Added persisted outbox snapshots for queued/retrying mutations with serialized variables.
- Added replay handler registration using deterministic handler IDs (scope + mutation function fingerprint).
- On restart, pending mutations with valid payload snapshots are restored to queued state.
- When a matching handler ID becomes available, pending tasks are rehydrated and resumed.
- Added retry hydration path so failed records with persisted payload can be retried after restart.
- Outbox snapshots are removed on final success/final failure.

Outcome:
- Background writes are no longer metadata-only across restart.
- Pending writes can now resume when the relevant module/hook registers the matching mutation handler.

### 2) Nursing Triage: Non-Blocking Post-Save Routing

File:
- src/renderer/modules/nursing/components/TriageForm.tsx

Changes:
- Kept triage assessment save on the critical path.
- Moved patient auto-routing to fire in background after successful save.
- Added warning toast if auto-routing fails, while preserving saved triage record.
- Added user-facing error toast when triage save itself fails.

Outcome:
- Faster perceived completion for triage save.
- No clinical data loss if routing step fails.

## Previously Executed Recommendations (Intentionally Not Repeated)

- Supabase request latency telemetry toggle and logging.
- A&E batch order staffId propagation to avoid repeated staff lookup.
- Targeted invalidation reductions and deduping in workflow hooks.
- Non-blocking post-save fan-out in A&E, Dental, Physiotherapy, Ophthalmology, and Specialty clinic flows.
- Optimistic timeline addendum behavior in Specialty consultation timeline.

## Operational Notes

- Replay depends on handler-ID registration from useBackgroundMutation.
- Payload replay requires serializable mutation variables.
- If a module is never mounted after restart, its pending task remains queued until the matching handler is loaded.

## Recommended Verification

1. Create a write action that uses useBackgroundMutation.
2. Trigger save, close/restart app before completion.
3. Reopen and navigate to the module that owns that mutation handler.
4. Confirm pending mutation resumes and reaches saved/failed state.
5. In Nursing triage, confirm save completes immediately and routing errors show warning toast without losing triage data.
