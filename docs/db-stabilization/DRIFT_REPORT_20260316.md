# Drift Report (Schema vs Code)

## Executive Summary
Critical drift exists in optimistic-locking RPC functions, facility resolution, and RLS policy posture.
The highest-risk defects were in SQL functions referencing non-existent columns/keys and permissive policies that nullify tenant isolation.

## Confirmed Drift Cases

## 1) update_consultation_with_lock uses wrong key and wrong column name
- Evidence:
  - schema_pull_20260316.sql:12588 uses WHERE id = p_id
  - schema_pull_20260316.sql:12616 writes history_of_presenting_illness
  - schema_pull_20260316.sql:12500 actual column is history_of_present_illness
  - schema_pull_20260316.sql:23121 consultations PK is consultation_id
- Impact:
  - runtime failures or no-op updates in optimistic-lock code path
- Fix:
  - migrations/215_step1_fix_function_drift.sql

## 2) update_lab_request_with_lock uses non-existent key/column and wrong enum types
- Evidence:
  - schema_pull_20260316.sql:12875 uses WHERE id = p_id
  - schema_pull_20260316.sql:12901 casts status to clinical_request_status
  - schema_pull_20260316.sql:12903 casts priority to clinical_urgency
  - schema_pull_20260316.sql:12905 writes notes column (not present)
  - schema_pull_20260316.sql:12790 lab_requests key is request_id
- Impact:
  - optimistic lock path breaks for lab requests
- Fix:
  - migrations/215_step1_fix_function_drift.sql

## 3) update_prescription_with_lock uses wrong key
- Evidence:
  - schema_pull_20260316.sql:13411 and 13454 use WHERE id = p_id
  - prescriptions key is prescription_id (schema_pull_20260316.sql:13337)
- Impact:
  - optimistic lock path breaks for prescriptions
- Fix:
  - migrations/215_step1_fix_function_drift.sql

## 4) get_record_version uses wrong key columns and stale table assumptions
- Evidence:
  - lab_requests queried by id at schema_pull_20260316.sql:6539 (actual key request_id)
  - radiology_requests queried by id at schema_pull_20260316.sql:6545 (actual key request_id)
  - consultations queried by id at schema_pull_20260316.sql:6527 (actual key consultation_id)
  - references encounters/diagnoses/ward_rounds (schema_pull_20260316.sql:6515, 6575, 6581)
- Impact:
  - stale conflict checks, wrong version reads, unsupported table exceptions
- Fix:
  - migrations/215_step1_fix_function_drift.sql (adds key-correct reads and encounters->visits alias)

## 5) Client optimisticLocking utility hardcodes id across tables
- Evidence:
  - src/renderer/lib/optimisticLocking.ts:159
  - src/renderer/lib/optimisticLocking.ts:284
  - src/renderer/lib/optimisticLocking.ts:384
  - src/renderer/lib/optimisticLocking.ts:409
- Impact:
  - conflict checks fail for tables keyed by consultation_id/request_id/prescription_id
- Fix:
  - src/renderer/lib/optimisticLocking.ts updated with table->key and table alias mappings

## 6) Legacy auth_user_id references in SQL functions vs staff.user_id schema
- Evidence:
  - schema_pull_20260316.sql:7253, 7329, 7633 references staff.auth_user_id
  - staff schema uses user_id (schema_pull_20260316.sql:14870)
- Impact:
  - facility/permission/audit helper lookups degrade or return null paths
- Fix:
  - migrations/217_step3_repair_triggers.sql adds staff.auth_user_id compatibility bridge + sync trigger
  - migrations/219_step5_enforce_tenant_isolation.sql normalizes get_user_facility_id to user_id

## 7) Staff identity inconsistency (UUID id vs VARCHAR staff_id) in radiology flow
- Evidence:
  - radiology_requests.performed_by is varchar(50): schema_pull_20260316.sql:19387
  - FK uses staff.staff_id: schema_pull_20260316.sql:29080
  - application hydrates by both id and staff_id: src/renderer/modules/radiology/api/radiology.api.ts:211
- Impact:
  - inconsistent joins and higher migration complexity
- Fix:
  - migrations/216_step2_standardize_identity_keys.sql adds performed_by_uuid/ordered_by_uuid + backfill + FKs
  - migrations/217_step3_repair_triggers.sql adds bidirectional sync trigger

## 8) Permissive RLS policies grant unrestricted access
- Evidence:
  - consultations: schema_pull_20260316.sql:31268
  - lab_requests: schema_pull_20260316.sql:31308 and 32095
  - radiology_requests: schema_pull_20260316.sql:31352
  - visits: schema_pull_20260316.sql:31380
- Impact:
  - tenant boundary bypass, data exposure risk
- Fix:
  - migrations/219_step5_enforce_tenant_isolation.sql drops permissive policies and creates facility-scoped replacements

## 9) visits.facility_id nullable despite tenant-scoped architecture
- Evidence:
  - schema_pull_20260316.sql:15060
  - legacy null comment: schema_pull_20260316.sql:15084
  - code fallback patching indicates frequent nulls: src/renderer/hooks/useFacilityId.ts:27
- Impact:
  - facility RLS cannot be reliably enforced
- Fix:
  - migrations/219_step5_enforce_tenant_isolation.sql backfills, auto-assign trigger, and sets NOT NULL

## 10) Anonymous execute exposure on mutating RPCs
- Evidence:
  - create_staff_user anon grant: schema_pull_20260316.sql:34276
  - update_consultation_with_lock anon grant: schema_pull_20260316.sql:35477
  - update_lab_request_with_lock anon grant: schema_pull_20260316.sql:35532
  - update_prescription_with_lock anon grant: schema_pull_20260316.sql:35606
- Impact:
  - public attack surface for write operations
- Fix:
  - migrations/218_step4_tighten_function_privileges.sql

## Residual Risk
- The codebase still depends on mixed identifiers in many modules (visit_id/request_id/consultation_id + UUID id).
- This migration set intentionally preserves legacy columns and contracts to avoid breakage while introducing UUID bridges.
- Full hard migration to UUID-only canonical IDs should be completed in a later phase with application-level contract updates.
