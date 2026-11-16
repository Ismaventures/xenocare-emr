# Corrected SQL Functions (Production-Stable Set)

## Scope
This document captures the full rewritten function set deployed by migration 215 to remove schema drift while preserving application RPC contracts.

## Implemented Functions
- public.update_consultation_with_lock(p_id uuid, p_expected_version integer, p_updates jsonb, p_modified_by uuid)
- public.update_lab_request_with_lock(p_id uuid, p_expected_version integer, p_updates jsonb, p_modified_by uuid)
- public.update_prescription_with_lock(p_id uuid, p_expected_version integer, p_updates jsonb, p_modified_by uuid)
- public.get_record_version(p_table_name character varying, p_record_id uuid)

## Function Rewrite Details

### 1) update_consultation_with_lock
Source of truth:
- migrations/215_step1_fix_function_drift.sql

Critical corrections applied:
- Uses consultation_id for lock and update predicate.
- Accepts both history_of_present_illness and legacy history_of_presenting_illness payload keys.
- Casts status to public.request_status.
- Preserves optimistic-lock exception semantics (P0002/P0003).

Compatibility rationale:
- Renderer optimistic locking calls this RPC through updateWithLock.
- Existing consultation API uses consultation_id as canonical identifier.

### 2) update_lab_request_with_lock
Source of truth:
- migrations/215_step1_fix_function_drift.sql

Critical corrections applied:
- Uses request_id for lock and update predicate.
- Casts status to public.request_status and priority to public.priority.
- Writes clinical_notes/result_notes/interpretation instead of non-existent notes.
- Preserves optimistic-lock exception semantics (P0002/P0003).

Compatibility rationale:
- Lab and workflow modules use request_id for mutations and reads.
- Legacy payloads with notes are still accepted and mapped to clinical_notes.

### 3) update_prescription_with_lock
Source of truth:
- migrations/215_step1_fix_function_drift.sql

Critical corrections applied:
- Uses prescription_id for lock and update predicate.
- Casts status to public.request_status.
- Supports quantity_dispensed/dispensed_by/dispensed_at plus notes/clinical_notes.
- Preserves optimistic-lock exception semantics (P0002/P0003).

Compatibility rationale:
- Prescription flows still rely on existing column contract and request_status enum.

### 4) get_record_version
Source of truth:
- migrations/215_step1_fix_function_drift.sql

Critical corrections applied:
- Uses key-correct reads:
  - consultations by consultation_id
  - lab_requests by request_id
  - radiology_requests by request_id
  - prescriptions by prescription_id
- Adds encounters -> visits alias resolution.
- Guards optional tables (diagnoses, ward_rounds) with to_regclass checks.

Compatibility rationale:
- Renderer calls this RPC from optimisticLocking utility for conflict metadata.
- Maintains same function signature and return shape.

## Verification Against Application Callers
- src/renderer/lib/optimisticLocking.ts
- src/renderer/modules/billing/api/billing-order.api.ts
- src/renderer/modules/clinical-consultation/api/consultation.api.ts
- src/renderer/modules/lab/api/lab.api.ts
- src/renderer/modules/radiology/api/radiology.api.ts

## Contract Preservation Notes
- RPC names and argument names are unchanged.
- Return types remain SETOF original table (or TABLE for get_record_version).
- Legacy payload aliases are accepted where field drift existed.
- No caller-visible JSON shape changes introduced.

## Rollback
Rollback is migration-level and reversible by restoring prior function definitions from:
- schema_pull_20260316.sql
- migrations/public_schema_editor.sql

No irreversible data transformation is introduced by function rewrites.
