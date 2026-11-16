# Migration Runbook (DB Stabilization Wave)

## Migration Order (Required)
1. migrations/215_step1_fix_function_drift.sql
2. migrations/216_step2_standardize_identity_keys.sql
3. migrations/217_step3_repair_triggers.sql
4. migrations/218_step4_tighten_function_privileges.sql
5. migrations/219_step5_enforce_tenant_isolation.sql

## Preflight Checks
Run before applying migrations:
- Confirm backup/snapshot exists.
- Confirm no long-running write transactions on core clinical tables.
- Confirm staff records have facility_id coverage.
- Confirm visits rows with null facility_id can be backfilled.

Recommended SQL probes:
- select count(*) from public.visits where facility_id is null;
- select count(*) from public.staff where user_id is null;
- select count(*) from public.consultations where consultation_id is null;
- select count(*) from public.lab_requests where request_id is null;
- select count(*) from public.prescriptions where prescription_id is null;

## Execution Procedure
- Apply one migration at a time in order.
- Verify each migration before proceeding to next step.
- If a migration fails, stop and remediate before continuing.

## Step Verification

### After 215
- Confirm functions compile and exist.
- Smoke test RPC calls:
  - update_consultation_with_lock
  - update_lab_request_with_lock
  - update_prescription_with_lock
  - get_record_version

### After 216
- Confirm bridge columns exist and are backfilled where possible.
- Validate new FK constraints on radiology UUID bridge columns.

### After 217
- Confirm triggers exist:
  - trg_staff_sync_auth_user_id
  - trg_sync_radiology_staff_identifiers
  - consultations_version_trigger
  - lab_requests_version_trigger
  - prescriptions_version_trigger

### After 218
- Confirm anon execute removed from targeted mutating RPCs.
- Confirm authenticated and service_role execute privileges remain.

### After 219
- Confirm visits.facility_id is NOT NULL.
- Confirm facility assignment trigger exists.
- Confirm new facility-scoped policies active for target tables.

## Post-Deployment Functional Tests
- Create/edit encounter and transition stages.
- Create/edit consultation record.
- Accept/reject lab and radiology requests.
- Submit radiology report and verify staff identity hydration.
- Verify billing order update with optimistic lock conflict behavior.
- Validate same-role users from different facilities cannot access each others records.

## Rollback Strategy
- Rollback at migration boundary only.
- Use per-file rollback guidance embedded in each migration.
- If rollback required after 219:
  - restore old policies from snapshot migration bundle
  - drop new helper functions/triggers
  - optionally relax visits.facility_id constraint only if required for emergency recovery

## Operational Notes
- This wave is additive and compatibility-focused.
- Legacy identifier columns remain intentionally for application continuity.
- UUID-only hard cutover is deferred to a dedicated contract migration phase.
