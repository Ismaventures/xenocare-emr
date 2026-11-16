# Security Hardening Plan (RLS + RPC Privileges)

## Objectives
- Remove anonymous execute access from mutating RPC functions.
- Enforce facility-scoped tenant isolation for core clinical tables.
- Preserve authenticated and service_role workflows used by the application.

## 1) Function Execute Hardening
Implemented in:
- migrations/218_step4_tighten_function_privileges.sql

Explicit anon revocations:
- public.create_staff_user(text, text, text, text, text)
- public.update_patient_with_lock(uuid, integer, jsonb, uuid)
- public.update_billing_order_with_lock(uuid, integer, jsonb, uuid)
- public.update_consultation_with_lock(uuid, integer, jsonb, uuid)
- public.update_lab_request_with_lock(uuid, integer, jsonb, uuid)
- public.update_prescription_with_lock(uuid, integer, jsonb, uuid)
- public.get_record_version(character varying, uuid)
- public.get_user_facility_id()

Expected access after migration:
- authenticated: execute
- service_role: execute
- anon: no execute on mutation-sensitive RPCs

Defensive sweep:
- Regex-based revoke/grant pass over likely mutating public functions.

## 2) RLS Tenant Hardening
Implemented in:
- migrations/219_step5_enforce_tenant_isolation.sql

Core controls:
- get_user_facility_id normalized to staff.user_id lookup.
- visits.facility_id backfilled and set NOT NULL.
- assign_visit_facility_id trigger enforces facility assignment on writes.
- can_access_facility and can_access_encounter_facility helper functions added.
- permissive policies dropped/replaced for:
  - visits
  - consultations
  - lab_requests
  - radiology_requests

## 3) API/Code Paths Affected
Authenticated/session-required flows (expected to remain working):
- src/renderer/lib/optimisticLocking.ts
- src/renderer/modules/billing/api/billing-order.api.ts
- src/renderer/modules/clinical-consultation/api/consultation.api.ts
- src/renderer/modules/lab/api/lab.api.ts
- src/renderer/modules/radiology/api/radiology.api.ts

Admin/staff provisioning flows:
- src/renderer/modules/staff/api/staff.api.ts
- uses Electron admin IPC for auth user creation, not direct anon RPC use.

## 4) Required Permission Model
Minimum expected runtime model:
- Users signed in via authenticated role.
- staff row present for auth.uid() with role and facility_id.
- service_role used only for controlled backend/system operations.

## 5) Validation Checklist
Before production cutover:
- Verify anon cannot execute protected functions.
- Verify authenticated can execute optimistic-lock RPCs.
- Verify service_role automation jobs still pass.
- Verify cross-facility data access is denied for non-admin clinical users.
- Verify admin/super_admin still have intended global access.

## 6) Residual Security Risks
- Broad allow-all policies still exist on non-target tables; these should be hardened in later waves.
- SECURITY DEFINER usage remains extensive; each function should be reviewed with least-privilege search_path constraints.

## 7) Next Hardening Wave
- Remove remaining allow-all RLS policies table-by-table.
- Replace GRANT ALL ON FUNCTION with explicit GRANT EXECUTE only.
- Add policy test harness for role x facility matrix.
