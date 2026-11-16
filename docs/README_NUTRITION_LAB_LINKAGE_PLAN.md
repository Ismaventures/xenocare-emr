# Nutrition to Lab and Inpatient Timeline Linkage Plan

## 1. Purpose
This document defines the implementation plan to:
- Fix nutrition module visibility of laboratory data.
- Add direct nutrition-to-lab ordering linkage.
- Ensure nutrition and nutrition-lab events appear in inpatient clinical summary timeline.

This plan is based on the current architecture and existing module patterns in this codebase.

## 2. Current State Summary

### 2.1 What is already wired
- Nutrition page consumes queue and specialty referrals.
- Nutrition writes care plans and sessions to specialty_careplans and careplan_sessions.
- Nutrition can open patient records modal that includes a Labs tab UI.

### 2.2 Key gaps
- No direct nutrition-to-lab order creation path exists.
- Patient medical history currently returns consultations with empty lab_requests arrays.
- totalLabTests is hardcoded to 0 in patient medical history response.
- Clinical timeline does not include nutrition care plan or nutrition session events.

## 3. Goals
1. Labs tab in nutrition patient records must show real patient lab data.
2. Nutrition clinicians must be able to place lab requests from nutrition workflow.
3. Nutrition and nutrition-lab activity must appear in inpatient clinical timeline.
4. All updates must be consistent with existing query invalidation and workflow tracking patterns.

## 4. Scope

### In scope
- Read linkage fix in patient history aggregation.
- Nutrition lab-order action wiring using existing order pipeline.
- Clinical request linkage for workflow tracking.
- Timeline event extension for nutrition categories.
- Query invalidation and realtime refresh consistency.

### Out of scope
- Full redesign of nutrition UI.
- New standalone lab ordering engine.
- Breaking schema changes to existing consultation order tables.

## 5. Implementation Plan

## Phase 1: Read Linkage Fix (Safe, Immediate Value)

### Objective
Show real lab data in nutrition patient records panel without changing ordering behavior.

### Tasks
1. Update patient medical history aggregator to fetch and attach lab_requests per patient consultation.
2. Update stats.totalLabTests using actual fetched lab records.
3. Preserve current response shape used by PatientMedicalRecordsPanel.

### Primary files
- src/renderer/modules/clinical-consultation/api/consultation.api.ts
- src/renderer/components/shared/PatientMedicalRecordsPanel.tsx (verify only, minimal or no change expected)

### Acceptance criteria
- Labs tab opened from Nutrition page displays existing lab records when present.
- Lab count is no longer always 0.
- No regression in consultations, radiology, or prescription tabs.

## Phase 2: Nutrition Lab Ordering Linkage (Functional Wiring)

### Objective
Allow nutrition clinicians to create lab orders using existing shared order pipeline.

### Tasks
1. Add nutrition lab order action entry point in nutrition workflow UI.
   - Option A: from NutritionPlanCreateModal.
   - Option B: from NutritionSessionRecordModal.
   - Option C: from NutritionPage patient card quick action.
2. Reuse existing batch order creation flow (no duplicate order engine).
3. Ensure encounter_id is always propagated for inpatient and timeline traceability.
4. Create/maintain clinical_requests linkage for tracking and downstream modules.

### Primary files
- src/renderer/modules/nutrition/pages/NutritionPage.tsx
- src/renderer/modules/nutrition/components/NutritionPlanCreateModal.tsx
- src/renderer/modules/nutrition/components/NutritionSessionRecordModal.tsx
- src/renderer/modules/clinical-consultation/api/consultation.api.ts (reuse batch order API)
- src/renderer/modules/clinical-requests/api/clinical-requests.api.ts (workflow linkage)

### Acceptance criteria
- Nutrition user can place a lab order tied to patient and encounter.
- Order appears in lab module queues using existing workflow.
- Clinical request status reflects request lifecycle.

## Phase 3: Inpatient Timeline Linkage (Cross-Module Visibility)

### Objective
Surface nutrition care and nutrition-lab actions in admission clinical timeline.

### Tasks
1. Extend TimelineEvent categories to include nutrition_plan, nutrition_session, and optionally nutrition_order.
2. Extend clinical timeline aggregator to pull:
   - Nutrition care plans for encounter.
   - Nutrition sessions for encounter-linked plans.
   - Nutrition-created lab requests (if traceable by encounter/source metadata).
3. Add timeline badge/color mappings in timeline UIs.
4. Keep sorting and card rendering behavior unchanged.

### Primary files
- src/renderer/modules/nursing/dtos/nursing.dto.ts
- src/renderer/modules/nursing/api/nursing.api.ts
- src/renderer/modules/in-patient/components/AdmissionCareModal.tsx
- src/renderer/modules/nursing/components/PatientCarePanel.tsx

### Acceptance criteria
- Admission timeline shows nutrition events in chronological order.
- New event categories render with distinct visual tags.
- No crash or fallback rendering issues for unknown categories.

## Phase 4: Refresh and Data Consistency

### Objective
Ensure UI reflects updates immediately after nutrition/lab writes.

### Tasks
1. Invalidate clinical timeline query key after nutrition writes.
2. Invalidate patient medical history and lab-related keys after lab order creation from nutrition.
3. Optionally add realtime subscriptions for specialty_careplans and careplan_sessions scoped to encounter.

### Primary files
- src/renderer/modules/nutrition/hooks/useNutrition.ts
- src/renderer/modules/nursing/api/nursing.api.ts (if realtime helper usage is added)
- src/renderer/modules/in-patient/components/AdmissionCareModal.tsx (if subscription trigger is needed)

### Acceptance criteria
- New nutrition/lab events appear without manual reload in key views.
- Query churn remains controlled (no refetch storm).

## 6. Data and Workflow Rules
1. For inpatient-linked nutrition actions, encounter_id must be present.
2. lab_requests must include encounter_id and patient identifiers expected by existing lab workflows.
3. Clinical request linkage should use request_type and status values already used by referral/admission/procedure flows.
4. Timeline should use immutable event records and avoid mutating historical entries.

## 7. Risk Register and Mitigation

### Risk A: Identifier mismatch (UUID vs display IDs)
- Mitigation: normalize and resolve patient and encounter IDs via existing helper patterns before writes.

### Risk B: Duplicate order creation
- Mitigation: use idempotency and existing dedupe mechanisms in shared order creation path.

### Risk C: Timeline noise or unreadable event volume
- Mitigation: collapse repetitive nutrition session events and keep concise event descriptions.

### Risk D: Query invalidation overfetch
- Mitigation: invalidate only scoped keys and use existing batching/debounce patterns.

## 8. Test Plan

### Unit and integration checks
1. Patient medical history returns non-empty lab_requests where applicable.
2. Nutrition-triggered lab order inserts correctly and appears in lab workflows.
3. Clinical timeline includes nutrition categories with valid timestamps.
4. Query invalidation updates AdmissionCareModal timeline and records panel.

### Manual QA scenarios
1. Create nutrition care plan for inpatient encounter, then verify timeline event.
2. Place nutrition lab order, then verify:
   - Lab module visibility.
   - Patient records labs tab visibility.
   - Inpatient timeline visibility.
3. Complete nutrition session and verify timeline updates.

## 9. Rollout Strategy
1. Ship Phase 1 first as low-risk data visibility fix.
2. Enable Phase 2 UI action behind small feature flag if needed.
3. Ship Phase 3 timeline extension after order linkage is stable.
4. Monitor error logs and query load after each phase.

## 10. Done Definition
The work is complete when:
- Nutrition records panel shows real labs.
- Nutrition can create lab requests via shared order flow.
- Inpatient clinical timeline shows nutrition care and nutrition-lab events.
- No regressions in consultation, lab, billing, or inpatient modules.
