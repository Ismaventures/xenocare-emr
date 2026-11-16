# Database Dependency Map (Targeted Stabilization Scope)

## Scope
This map covers the objects changed in migrations 215-219:
- visits
- consultations
- lab_requests
- radiology_requests
- prescriptions
- staff
- RPC/PLpgSQL functions used by optimistic locking and facility scoping

## Table -> Function -> API -> UI/Caller

### visits
- Database functions:
  - get_record_version (encounters/visits alias)
  - can_access_encounter_facility
  - assign_visit_facility_id
- API/service usage:
  - src/renderer/modules/encounter/api/encounter.api.ts:350
  - src/renderer/lib/workflow/api.ts:730
  - src/renderer/modules/clinical-consultation/api/consultation.api.ts:621
  - src/main/aiService.ts:989
- Frontend callers:
  - src/renderer/modules/encounter/components/EncounterForm.tsx:390
  - src/renderer/modules/ae/components/arrival/ArrivalForm.tsx:85
  - src/renderer/modules/specialty-clinic/components/SpecialtyConsultationTimeline.tsx:790

### consultations
- Database functions:
  - update_consultation_with_lock
  - get_record_version
- API/service usage:
  - src/renderer/modules/clinical-consultation/api/consultation.api.ts:417
  - src/renderer/modules/clinical-consultation/api/consultation.api.ts:772
  - src/renderer/contexts/PatientEncounterContext.tsx:382
  - src/main/aiService.ts:1195
- Frontend callers:
  - src/renderer/modules/clinical-consultation/components/ConsultationWizard.tsx:5458
  - src/renderer/modules/clinical-consultation/components/ConsultationDetail.tsx:229
  - src/renderer/modules/specialty-clinic/components/SpecialtyConsultationTimeline.tsx:1895

### lab_requests
- Database functions:
  - update_lab_request_with_lock
  - get_record_version
- API/service usage:
  - src/renderer/modules/lab/api/lab.api.ts:450
  - src/renderer/modules/lab/api/lab.api.ts:1290
  - src/renderer/modules/anc/api/anc.api.ts:637
  - src/renderer/lib/workflow/payment-gating.ts:444
- Frontend callers:
  - src/renderer/modules/lab/components/LabRequestList.tsx
  - src/renderer/modules/nhis/components/NhisSpecialtyApprovalQueue.tsx:259
  - src/renderer/modules/ophthalmology/components/OphthalmologyConsultantRecord.tsx:630

### radiology_requests
- Database functions:
  - get_record_version
  - sync_radiology_staff_identifiers (trigger function)
- API/service usage:
  - src/renderer/modules/radiology/api/radiology.api.ts:728
  - src/renderer/modules/radiology/api/radiology.api.ts:787
  - src/renderer/modules/anc/api/anc.api.ts:646
  - src/renderer/contexts/PatientEncounterContext.tsx:384
  - src/main/aiService.ts:1203
- Frontend callers:
  - src/renderer/modules/radiology/index.tsx
  - src/renderer/modules/radiology/components/RadiologyReportForm.tsx
  - src/renderer/modules/nhis/components/NhisSpecialtyApprovalQueue.tsx:283

### prescriptions
- Database functions:
  - update_prescription_with_lock
  - get_record_version
- API/service usage:
  - src/renderer/modules/pharmacy/api/pharmacy.api.ts
  - src/main/aiService.ts:1207
- Frontend callers:
  - src/renderer/modules/pharmacy/**/*

### staff
- Database functions:
  - get_user_role
  - get_user_facility_id
  - has_permission
  - create_staff_user
  - sync_staff_auth_user_id (trigger function)
- API/service usage:
  - src/renderer/modules/staff/api/staff.api.ts:1
  - src/renderer/hooks/useFacilityId.ts:27
  - src/renderer/contexts/AuthContext.tsx:289
  - src/renderer/modules/radiology/api/radiology.api.ts:124
- Frontend callers:
  - src/renderer/modules/staff/components/StaffForm.tsx
  - src/renderer/modules/staff/components/StaffList.tsx

## RPC/Fn Usage Map
- get_record_version:
  - src/renderer/lib/optimisticLocking.ts:563
- update_*_with_lock:
  - mapped in src/renderer/lib/optimisticLocking.ts:111
  - currently invoked by updateWithLock in src/renderer/modules/billing/api/billing-order.api.ts:1278
- create_staff_user:
  - no active renderer caller found; staff creation uses Electron admin IPC in src/renderer/modules/staff/api/staff.api.ts:59

## Notes
- App code currently uses a mixed identifier model (id + visit_id/request_id/consultation_id + staff_id).
- Migrations keep legacy identifiers intact and add UUID bridge behavior to avoid breaking existing callers.
