# IndexedDB Offline-First Execution Plan (EMR Desktop)

## Objective

Implement an EMR-grade offline architecture where reads are instant, writes are durable offline, sync is observable, and local persistence scales beyond localStorage.

The execution strategy is tailored to the existing app structure and current building blocks already present in the codebase.

## What Is In Scope

- IndexedDB via `idb` as primary local persistence.
- Query cache + sync metadata migration from localStorage to IndexedDB.
- Outbox sync engine enhancement using existing background mutation flow.
- Sync Center UI for pending, syncing, failed, retry, replay.
- Module-by-module rollout with explicit offline contracts.
- Security controls for PHI at rest and user-session isolation.

## What Is Explicitly Out Of Scope In This Plan

- Conflict Inbox UI (`mine vs theirs`, manual merge) is excluded for now per product direction.
- We will keep server-side version checks and safe failure surfacing, but no dedicated conflict inbox screens in this execution wave.

## Current Baseline (Existing Assets To Reuse)

- Query cache setup exists in `src/renderer/api/queryClient.ts` and currently persists to localStorage.
- Background offline mutation queue exists in `src/renderer/lib/mutations/backgroundMutationManager.ts`.
- Offline mutation hooks exist in `src/renderer/hooks/useBackgroundMutation.ts` and module wrappers.
- Delta sync helpers exist in `src/renderer/lib/deltaSync.ts` but state persistence is localStorage-based.
- Global sync indicator exists in `src/renderer/components/ui/GlobalMutationSyncIndicator.tsx`.
- Offline hooks area exists as placeholder in `src/renderer/lib/offline/hooks.ts`.

## Architectural Model (Target)

### Read Path

memory cache -> IndexedDB -> network

### Write Path

optimistic UI -> IndexedDB outbox -> sync engine -> server -> cache reconciliation

### Sync Metadata

All cursors/checkpoints/watermarks move to IndexedDB (`sync_meta` store), not localStorage.

## IndexedDB Design (idb)

Database:

- Name: `emr-db`

Object stores:

- `core_patient`
- `core_encounter`
- `orders_and_results`
- `billing_finance`
- `reference_data`
- `sync_outbox`
- `sync_meta`
- `cache`

Standard record envelope (all stores):

- `id` (primary key)
- `entityType` (table/module logical name)
- `data` (payload)
- `updatedAt` (ISO timestamp)
- `createdAt` (ISO timestamp)
- `version` (etag/version/updated_at snapshot)
- `userId` (owner isolation)
- `facilityId` (scope isolation where relevant)
- `isEncrypted` (boolean for PHI records)
- `ttlAt` (optional absolute expiry)

## Caching Strategy

### Stale-While-Revalidate (Required)

1. Read from IndexedDB first.
2. If cache exists, render immediately (no skeleton flicker).
3. Revalidate in background when stale or force-refresh trigger fires.
4. If changed, update UI and write-through back to IndexedDB.

### TTL Policy (Initial)

- Dashboard/queue counters: 5 minutes
- Patient list and encounter summary: 2 minutes
- Active encounter details (clinical): 30-60 seconds with refresh triggers
- Reference data (staff/departments/catalogues): 30 minutes to 24 hours by domain

Force-refresh triggers:

- Patient switch
- Encounter save success
- Reconnect event
- Explicit user refresh

## Security Plan (EMR-Grade)

- Encrypt PHI records at rest in IndexedDB using an encryption wrapper.
- Do not store auth tokens in IndexedDB.
- Scope all records by `userId` and clear scoped data on logout/user switch.
- Add idle session timeout lock (24-48h configurable policy window).
- Prevent cross-user cache leaks by ownership checks before reads.

## Sync Engine Plan

### Outbox Record Shape (`sync_outbox`)

- `id`
- `operation` (`create` | `update` | `delete`)
- `entityType`
- `entityId`
- `payload`
- `idempotencyKey`
- `retryCount`
- `status` (`pending` | `syncing` | `failed` | `done`)
- `lastAttemptAt`
- `failureReason`
- `createdAt`
- `userId`

### Sync Behavior

- Auto-retry on reconnect.
- Exponential backoff + jitter.
- Preserve per-entity ordering (reuse existing queue semantics).
- Use idempotency keys for replay safety.

## Better Rollout Strategy (Recommended)

Instead of strict module-by-module from day 1, use a hybrid strategy:

1. Build shared offline platform once (db, repositories, hooks, persister).
2. Roll out modules in waves using vertical slices.
3. Promote reusable patterns into shared hooks before next wave.

This reduces duplicated logic and keeps module delivery fast after foundation.

## Project Structure To Create

- `src/renderer/lib/offline/storage/db.ts`
- `src/renderer/lib/offline/storage/encryption.ts`
- `src/renderer/lib/offline/storage/repositories/baseRepository.ts`
- `src/renderer/lib/offline/storage/repositories/patientRepository.ts`
- `src/renderer/lib/offline/storage/repositories/encounterRepository.ts`
- `src/renderer/lib/offline/storage/repositories/ordersRepository.ts`
- `src/renderer/lib/offline/storage/repositories/billingRepository.ts`
- `src/renderer/lib/offline/storage/repositories/referenceRepository.ts`
- `src/renderer/lib/offline/storage/repositories/cacheRepository.ts`
- `src/renderer/lib/offline/sync/outbox.ts`
- `src/renderer/lib/offline/sync/syncEngine.ts`
- `src/renderer/lib/offline/hooks/useOfflineQuery.ts`
- `src/renderer/lib/offline/hooks/useSyncStatus.ts`
- `src/renderer/lib/offline/hooks/useHotPatientPrefetch.ts`

## Phased Plan (Execution)

## Phase 1: Foundation (Platform First)

Steps:

1. Add `idb` dependency and initialize `emr-db` schema in `db.ts`.
2. Implement shared record envelope and base repository patterns.
3. Implement store-specific repositories mapped to existing entity families.
4. Replace query persistence localStorage backend with IndexedDB persister.
5. Move sync state from localStorage keys to `sync_meta` store.

Socratic validation before merge:

- What breaks if network drops during repository read?
- Is this payload safe for local storage and does it require encryption?
- How does ownership (`userId`) prevent cross-user reads?

Done when:

- App restart still shows cached patient and encounter list instantly.
- localStorage no longer holds primary query/sync state.

## Phase 2: Sync + Visibility

Steps:

1. Extend outbox persistence to IndexedDB (`sync_outbox`).
2. Implement sync engine worker loop with reconnect trigger + backoff.
3. Build Sync Center UI with queue state list and controls (retry/replay/cancel).
4. Wire existing global sync indicator to Sync Center deep-link.

Socratic validation before merge:

- Can critical writes complete safely while offline?
- How does user know if writes are pending or failed?
- What happens on interrupted sync or app restart mid-sync?

Done when:

- Offline mutation replay is durable across app restarts.
- Sync failures are visible and actionable in UI.

## Phase 3: Module Rollout (Wave-Based)

Wave 1 (core clinical):

- queue
- encounter
- clinical-consultation
- nursing
- pharmacy
- lab
- radiology
- billing

Wave 1 steps per module:

1. Define offline contract (Read: Required/Optional/None, Write: Allowed/Limited/Blocked).
2. Add module repository bindings and offline query hooks.
3. Implement stale-while-revalidate views (no skeleton when cache exists).
4. Route writes through outbox for allowed offline operations.
5. Add module tests for offline open, offline write, reconnect replay.

Wave 2 (specialties):

- anc
- dental
- physiotherapy
- ophthalmology
- ae
- in-patient
- procedure
- procedures

Wave 3 (support/admin):

- appointments
- medical-records
- nhis
- messaging
- treatment-plan
- surgery
- hygiene
- clinical-export
- analytics
- ai-assistant

Socratic validation before each module release:

- What core workflow fails if network drops in this module?
- Can this module write offline safely?
- What degraded state is shown to user if action is blocked offline?

Done when:

- Wave module has explicit contract and test evidence.
- UI behavior is deterministic online/offline.

## Phase 4: Hardening and Operations

Steps:

1. Add storage usage telemetry and quota guards.
2. Implement TTL/LRU eviction policy in `cache` store.
3. Add corruption recovery flow (store reset + selective refetch).
4. Add operational dashboards for sync latency, queue age, failure rates.
5. Finalize runbook for support/QA/clinical super-users.

Socratic validation before merge:

- What happens when storage is full?
- Can the app recover from partial IndexedDB corruption safely?
- Are security controls still enforced after recovery/reset?

Done when:

- Offline mode remains stable under stress scenarios.
- Recovery path is documented and testable.

## Module Offline Capability Contract Template

For each module, document:

- Offline Read: Required | Optional | None
- Offline Write: Allowed | Limited | Blocked
- Cached entities and TTL
- Sensitive fields requiring encryption
- Degraded UI behavior
- Sync visibility points (badge/panel/toast)

## React Query Migration Plan

1. Keep existing query keys and hooks to minimize refactor risk.
2. Replace only persistence backend first (localStorage -> IndexedDB).
3. Introduce `useOfflineQuery` wrapper for stale-while-revalidate and cache-first render behavior.
4. Incrementally migrate hot clinical queries to `useOfflineQuery`.

## Prefetch Strategy

- On sign-in: preload reference_data essentials.
- On patient open: preload active patient context + latest encounters/orders/results.
- Maintain hot-patient list from recent access and prefetch on idle window.

## Testing Requirements

Unit:

- Repository CRUD behavior and indexes.
- Encryption/decryption envelope correctness.
- TTL expiry and eviction logic.

Integration:

- open offline -> read cached -> write outbox -> reconnect sync success.
- restart app during pending outbox -> replay resumes safely.

Resilience:

- network flapping.
- quota exceeded.
- interrupted sync.
- store corruption recovery.

## Definition Of Done

- App opens and renders cached clinical data instantly when available.
- No skeleton flicker when valid cache exists.
- Core workflows in Wave 1 are usable offline with durable replay.
- Sync states are visible and actionable to users.
- PHI-at-rest controls and user data isolation are verified.

## Execution Governance

- Weekly architecture review: platform and security signoff.
- Weekly module readiness review: wave progress and blockers.
- Weekly QA resilience review: offline test matrix outcomes.

## Immediate Next Build Tasks

1. Add `idb` dependency and create `db.ts` with all required stores.
2. Implement base repository and patient/encounter repositories.
3. Add IndexedDB query persister and migrate sync metadata to `sync_meta`.
4. Implement `useOfflineQuery` for patient list and encounter list as first slice.
5. Add Sync Center screen bound to IndexedDB outbox state.
