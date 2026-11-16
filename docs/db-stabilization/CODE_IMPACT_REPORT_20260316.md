# Code Impact Report (DB Stabilization Wave)

## Scope of Changes
Database objects changed in migrations 215-219 and client lock utility update:
- Optimistic-lock RPC functions
- Version reader RPC
- Staff identity compatibility trigger
- Radiology legacy-to-UUID identity sync trigger
- Function grants and RLS policies
- Facility enforcement for visits and encounter-scoped clinical records

## 1) Directly Impacted Code Files

### Optimistic Locking Layer
- src/renderer/lib/optimisticLocking.ts

Behavioral impact:
- Uses table-specific primary keys instead of fixed id.
- Uses encounters -> visits table alias for direct fallback queries.
- Keeps RPC path unchanged for known update_*_with_lock functions.

### Billing Flow
- src/renderer/modules/billing/api/billing-order.api.ts

Behavioral impact:
- updateWithLock continues to work with corrected billing/record-version logic.

### Consultation Flow
- src/renderer/modules/clinical-consultation/api/consultation.api.ts

Behavioral impact:
- consultation_id remains canonical for consultation reads/writes.
- No caller contract changes required.

### Lab Flow
- src/renderer/modules/lab/api/lab.api.ts
- src/renderer/lib/workflow/payment-gating.ts

Behavioral impact:
- request_id remains canonical; corrected RPC now aligns with table key and columns.

### Radiology Flow
- src/renderer/modules/radiology/api/radiology.api.ts

Behavioral impact:
- Existing mixed identifier usage (staff.id and staff.staff_id) remains supported.
- New UUID bridge columns and sync trigger reduce drift without breaking callers.

### Facility Resolution and Tenant-Aware Modules
- src/renderer/hooks/useFacilityId.ts
- src/renderer/modules/in-patient/hooks/useAdmissions.ts
- src/renderer/modules/in-patient/hooks/useBeds.ts
- src/renderer/modules/in-patient/hooks/useWards.ts
- src/renderer/modules/procedure/hooks/useProcedures.ts
- src/renderer/modules/surgery/hooks/useSurgery.ts

Behavioral impact:
- facility_id is now guaranteed on visits; fewer null-facility fallbacks expected.
- encounter-scoped policy checks now rely on visits.facility_id integrity.

## 2) RPC Dependency Impact

RPCs impacted:
- get_record_version
- update_patient_with_lock
- update_billing_order_with_lock
- update_consultation_with_lock
- update_lab_request_with_lock
- update_prescription_with_lock

Expected caller outcome:
- No signature changes.
- No parameter name changes.
- Improved correctness for key lookups and version conflict handling.

## 3) Security/RLS Impact on Callers

Potentially affected access paths:
- Any read/write operation on visits, consultations, lab_requests, radiology_requests where user facility mismatch exists.

Expected outcome:
- Legitimate same-facility workflows continue.
- Cross-facility access denied for non-admin clinical users.

## 4) High-Risk Integration Points to Test
- Encounter creation and stage transitions.
- Consultation update/save within edit window.
- Lab accept/reject and result workflows.
- Radiology accept/report workflows.
- Billing verification with optimistic locking enabled.
- Dashboard widgets that aggregate encounter-scoped records.

## 5) Compatibility Guarantees in This Wave
- Legacy key columns retained.
- Bridge UUID columns added without removing text identifiers.
- Trigger-based synchronization for staff/radiology identity fields.
- No destructive drops/renames in this stabilization wave.

## 6) Known Deferred Work
- Full canonical UUID-only model with strict naming convention for every primary key and FK.
- Complete elimination of legacy staff_id/text identity dependencies in application code.
- Expansion of facility-scoped RLS to all tenant-sensitive tables beyond this core set.
