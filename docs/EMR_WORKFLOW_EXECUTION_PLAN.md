# NDC Medical Centre EMR - Workflow Improvement Execution Plan

**Version:** 1.0  
**Date:** January 12, 2026  
**Status:** Planning Phase  
**Author:** Clinical Informatics Audit Team

---

## 📋 Executive Summary

This document outlines the execution plan for implementing workflow improvements and fixes identified during the EMR clinical informatics audit. The plan is organized into phases with clear priorities, dependencies, and acceptance criteria.

---

## 🎯 Objectives

1. **Fix Critical Data Integrity Issues** - Resolve encounter ID type inconsistencies causing FK violations
2. **Standardize Role-Based Access Control** - Implement centralized permission checks across all modules
3. **Improve Clinical Workflow Compliance** - Ensure all actions are properly encounter-centric
4. **Enhance User Experience** - Reduce cognitive load and improve role-specific interfaces
5. **Strengthen Audit Trail** - Ensure complete traceability of all clinical actions

---

## 📊 Priority Matrix

| Priority | Label | Criteria | Timeline |
|:--------:|-------|----------|----------|
| 🔴 P0 | Critical | Data integrity issues, FK violations, blocking errors | Immediate (1-2 days) |
| 🟠 P1 | High | Security gaps, role enforcement, clinical safety | Week 1 |
| 🟡 P2 | Medium | UX improvements, workflow optimization | Week 2-3 |
| 🟢 P3 | Low | Nice-to-have enhancements, polish | Week 4+ |

---

## 🔴 PHASE 0: Critical Fixes (P0) - Days 1-2

### Task 0.1: Fix Encounter ID Type Inconsistencies

**Problem:** Some tables use `visits.id` (UUID) while others use `visits.visit_id` (VARCHAR) for encounter references, causing FK constraint violations.

**Affected Components:**
- `ClinicalNotesModal.tsx` - Was passing UUID to `daily_progress_notes.encounter_id` (expects VARCHAR)
- `QuickOrderModal.tsx` - Needs to use correct encounter ID type per table
- `consultation.api.ts` - Mixed usage of encounterId vs encounterNumber

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 0.1.1 | ✅ Fix `daily_progress_notes` insert to use `encounterNumber` | ClinicalNotesModal.tsx | Done |
| 0.1.2 | ✅ Audit all order creation APIs for correct encounter ID type | consultation.api.ts | Done |
| 0.1.3 | ✅ Create helper function `getEncounterIdForTable(table, visitId, visitUuid)` | lib/encounter/helpers.ts | Done |
| 0.1.4 | ✅ Document which tables use UUID vs VARCHAR | This document + helpers.ts | Done |

**Encounter ID Reference Table:**
| Table | Column | Type | References |
|-------|--------|------|------------|
| `consultations` | encounter_id | UUID | visits.id |
| `procedure_requests` | encounter_id | UUID | visits.id |
| `encounter_care_team` | encounter_id | UUID | visits.id |
| `lab_requests` | encounter_id | UUID | visits.id |
| `radiology_requests` | encounter_id | UUID | visits.id |
| `prescriptions` | encounter_id | UUID | visits.id |
| `vitals` | encounter_id | UUID | visits.id |
| `queue` | encounter_id | UUID | visits.id |
| `treatment_plans` | encounter_id | UUID | visits.id |
| `nursing_notes` | encounter_id | UUID | visits.id |
| `admissions` | encounter_id | UUID | visits.id |
| `billing_orders` | encounter_id | UUID | visits.id |
| `invoices` | encounter_id | UUID | visits.id |
| `daily_progress_notes` | encounter_id | VARCHAR | visits.visit_id |
| `doctor_orders` | encounter_id | VARCHAR | visits.visit_id |

**Acceptance Criteria:**
- [ ] No FK constraint violations when creating orders from EncounterCentricView
- [ ] No FK constraint violations when creating clinical notes
- [ ] All new code uses documented ID type per table

---

### Task 0.2: Fix Empty Array/UUID Handling in Batch Orders

**Problem:** Empty strings passed to UUID and array columns cause PostgreSQL errors.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 0.2.1 | ✅ Fix `consultationId` empty string → null | consultation.api.ts | Done |
| 0.2.2 | ✅ Fix `diagnosis` empty string → empty array | QuickOrderModal.tsx | Done |
| 0.2.3 | ✅ Fix diagnosis array handling in API | consultation.api.ts | Done |
| 0.2.4 | ✅ Add validation utility for optional UUID fields | lib/validation.ts | Done |

**Acceptance Criteria:**
- [ ] Creating orders from QuickOrderModal succeeds without database errors
- [ ] Empty optional fields are properly converted to null

---

## 🟠 PHASE 1: Role-Based Access Control (P1) - Week 1

### Task 1.1: Centralize Permission Checks

**Problem:** Scattered inline role checks (`staff.role === 'doctor'`) instead of using centralized `hasPermission()`.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1.1.1 | ✅ Audit all files for inline role checks | Multiple | Done |
| 1.1.2 | ✅ Create `useRolePermission` hook for UI components | hooks/useRolePermission.ts | Done |
| 1.1.3 | Pending - Replace inline checks in CareTeamPanel | CareTeamPanel.tsx | N/A (checks appropriate) |
| 1.1.4 | Pending - Replace inline checks in EncounterCentricView | EncounterCentricView.tsx | Pending |
| 1.1.5 | ✅ Add permission checks to QuickOrderModal | QuickOrderModal.tsx | Done |

**Implementation Pattern:**
```typescript
// Before (scattered)
if (staff.role === 'doctor' || staff.role === 'nurse') { ... }

// After (centralized)
import { hasPermission } from '@/lib/permissions';
if (hasPermission(staff.role, 'view_treatment_plan')) { ... }
```

**Acceptance Criteria:**
- [ ] No inline `staff.role === 'xxx'` checks in clinical modules
- [ ] All permission checks use centralized `hasPermission()` or `useRolePermission`
- [ ] Permission denied shows user-friendly error message

---

### Task 1.2: Implement Field-Level Permission Enforcement

**Problem:** Field permissions defined in `permissions.ts` but not consistently enforced in UI.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1.2.1 | ✅ Create `<ProtectedField>` component | components/auth/ProtectedField.tsx | Done |
| 1.2.2 | Wrap clinical note fields with ProtectedField | ConsultationWizard.tsx | Pending |
| 1.2.3 | Wrap diagnosis fields with ProtectedField | Multiple | Pending |
| 1.2.4 | Add visual indicator for read-only fields | CSS/Component | Pending |

**Acceptance Criteria:**
- [ ] Nurses cannot edit doctor's clinical notes (field disabled)
- [ ] Lab techs can only see/edit lab-related fields
- [ ] Read-only fields show visual distinction

---

### Task 1.3: Encounter Access Control Integration

**Problem:** `useEncounterAccess` hook exists but not used everywhere.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1.3.1 | ✅ Add encounter access check to EncounterCentricView | EncounterCentricView.tsx | Already has it |
| 1.3.2 | ✅ Add encounter access check to QuickOrderModal | QuickOrderModal.tsx | Done |
| 1.3.3 | ✅ Add encounter access check to ClinicalNotesModal | ClinicalNotesModal.tsx | Done |
| 1.3.4 | Log access attempts for audit trail | lib/encounter/access-control.ts | Pending |

**Acceptance Criteria:**
- [ ] Users without encounter access see appropriate error
- [ ] All encounter access attempts are logged
- [ ] Primary doctor has full access, department doctors have read-only

---

## 🟡 PHASE 2: Workflow Improvements (P2) - Week 2-3

### Task 2.1: Treatment Plan Notification System

**Problem:** Nurses not notified when doctors create new treatment plans.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 2.1.1 | ✅ Create notifications table migration | migrations/046_notifications_system.sql | Done |
| 2.1.2 | ✅ Add notification creation after treatment plan | treatment-plan.api.ts | Done (via DB trigger) |
| 2.1.3 | ✅ Create notification bell component | components/ui/NotificationBell.tsx | Done |
| 2.1.4 | ✅ Add real-time subscription for notifications | hooks/useNotifications.ts | Done |
| 2.1.5 | Integrate notification badge in nursing module | nursing/index.tsx | Pending |

**Key Features:**
- Real-time notifications using Supabase subscriptions
- Notification prioritization (critical → red, high → orange, etc.)
- Mark as read / Dismiss functionality
- Database triggers auto-create notifications on treatment plan creation
- Browser notifications for critical/urgent items
- Notification preferences per user

**Acceptance Criteria:**
- [ ] Nurses see notification within 30 seconds of plan creation
- [ ] Notification links directly to patient's treatment plan
- [ ] Notifications can be marked as read
- [ ] NotificationBell shows unread count
- [ ] Dropdown displays up to 10 most recent notifications

---

### Task 2.2: Order Acknowledgment Workflow for Procedures

**Problem:** Procedures lack formal accept/reject workflow like lab/radiology.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 2.2.1 | ✅ Add `status` field transitions for procedures | procedure.api.ts | Done (existing) |
| 2.2.2 | ✅ Create ProcedureApprovalModal component | procedure/components/ProcedureApprovalModal.tsx | Done (existing) |
| 2.2.3 | ✅ Add accept/reject handlers | clinical-requests module | Done (existing) |
| 2.2.4 | ✅ Create billing on acceptance | procedure.api.ts | Done (existing) |

**Acceptance Criteria:**
- [x] Procedure requests have Accept/Reject buttons
- [x] Rejection requires reason selection
- [x] Billing created only after acceptance

---

### Task 2.3: Structured Rejection Reasons

**Problem:** Lab/Radiology rejections use free-text only.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 2.3.1 | ✅ Create RejectionReasonSelect component | components/ui/RejectionReasonSelect.tsx | Done |
| 2.3.2 | ✅ Add reason dropdown to lab rejection modal | lab/index.tsx | Done |
| 2.3.3 | ✅ Add reason dropdown to radiology rejection modal | radiology/index.tsx | Done |
| 2.3.4 | ✅ Add reason dropdown to procedure rejection modal | ProcedureApprovalModal.tsx | Done |
| 2.3.5 | ✅ Allow "Other" with required free-text | RejectionReasonSelect.tsx | Done |

**Rejection Reason Categories:**
- Clinical: Duplicate order, Inappropriate test, Contraindicated
- Operational: Equipment down, Reagent unavailable, Staff unavailable
- Patient: Patient refused, Patient condition changed, Patient not prepared
- Administrative: Insurance not verified, Order incomplete

**Acceptance Criteria:**
- [x] Rejection requires selecting a coded reason
- [x] "Other" option requires free-text explanation
- [x] Rejection reasons visible to ordering doctor

---

### Task 2.4: Dashboard vs Patient Chart Restructuring

**Problem:** Patient-specific data appearing on global dashboard increases cognitive load.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 2.4.1 | ✅ Audit dashboard for patient-specific items | Dashboard.tsx | Done (already aggregate) |
| 2.4.2 | ✅ Dashboard shows only aggregate/summary data | Dashboard.tsx | Done |
| 2.4.3 | ✅ Keep only aggregate counts on dashboard | Dashboard.tsx | Done |
| 2.4.4 | ✅ Add "My Patients" quick access widget | Dashboard.tsx, MyPatientsWidget.tsx | Done |

**Dashboard Data Classification:**
| Data | Keep on Dashboard | Move to Patient Chart |
|------|:-----------------:|:---------------------:|
| Total patients today | ✅ | |
| My queue count | ✅ | |
| Revenue summary | ✅ | |
| Patient's pending labs | | ✅ |
| Patient's treatment tasks | | ✅ |
| Patient's billing details | | ✅ |

**Acceptance Criteria:**
- [x] Dashboard shows only aggregate/summary data
- [x] Patient-specific actions require opening patient chart
- [x] Navigation to patient chart is fast (< 2 clicks via My Patients widget)

---

## 🟢 PHASE 3: Enhancements (P3) - Week 4+

### Task 3.1: Shift-Bounded Nursing Notes

**Problem:** Nursing notes not structured around shifts, making handover difficult.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 3.1.1 | ✅ Add shift columns to nursing_notes | migrations/047_shift_bounded_notes.sql | Done |
| 3.1.2 | ✅ Create shift configuration table | migrations/047_shift_bounded_notes.sql | Done |
| 3.1.3 | ✅ Create shift_handovers table | migrations/047_shift_bounded_notes.sql | Done |
| 3.1.4 | ✅ Auto-assign shift based on note time | migrations/047_shift_bounded_notes.sql (trigger) | Done |
| 3.1.5 | ✅ Create useShift hook | hooks/useShift.ts | Done |
| 3.1.6 | ✅ Create ShiftIndicator component | components/nursing/ShiftIndicator.tsx | Done |
| 3.1.7 | ✅ Create ShiftHandoverForm component | components/nursing/ShiftHandoverForm.tsx | Done |
| 3.1.8 | Integrate shift UI in nursing module | nursing/index.tsx | Pending |

**Key Features:**
- Three shifts: Day (7AM-3PM), Evening (3PM-11PM), Night (11PM-7AM)
- Auto-assignment of shift to nursing notes via database trigger
- Shift handover documentation with structured fields
- Notifications sent to incoming shift nurses
- Shift date handling for overnight shifts

---

### Task 3.2: Vital Signs Frequency Enforcement

**Problem:** No mandatory vital sign schedule for admitted patients.

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 3.2.1 | ✅ Create vital_schedule tables | migrations/048_vital_signs_frequency.sql | Done |
| 3.2.2 | ✅ Add frequency configuration per acuity level | migrations/048_vital_signs_frequency.sql | Done |
| 3.2.3 | ✅ Create useVitalSchedule hook | hooks/useVitalSchedule.ts | Done |
| 3.2.4 | ✅ Create overdue vitals alert components | nursing/components/OverdueVitalsAlert.tsx | Done |
| 3.2.5 | ✅ Create AcuitySelector component | nursing/components/AcuitySelector.tsx | Done |
| 3.2.6 | Add dashboard widget for overdue vitals | Dashboard.tsx | Pending |

**Key Features:**
- Five acuity levels: Critical (1h), High (2h), Medium (4h), Low (6h), Routine (8h)
- Auto-create schedule on patient admission
- Auto-update schedule when vitals recorded
- Overdue detection with grace periods
- Notifications sent for overdue vitals
- Acuity selector for nurses to adjust monitoring level

---

### Task 3.3: Enhanced Audit Logging ✅ COMPLETE

**Problem:** Not all clinical actions are logged with full context.

**Solution Implemented:**
- Comprehensive `audit_logs` table with categories, actions, and severity levels
- Automatic audit triggers on lab_requests, prescriptions, and vitals tables
- Enhanced `logClinicalAction()` utility with full context capture
- Security event tracking and emergency override logging
- Admin AuditLogViewer with filtering, search, and export capabilities

**Action Items:**
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 3.3.1 | Create comprehensive audit_log table | migrations/049_enhanced_audit_logging.sql | ✅ Complete |
| 3.3.2 | Create `logClinicalAction()` utility | lib/audit/audit.ts | ✅ Complete |
| 3.3.3 | Add logging to all order creation | Automatic via triggers | ✅ Complete |
| 3.3.4 | Add logging to all result entry | Automatic via triggers | ✅ Complete |
| 3.3.5 | Create audit log viewer for admins | admin/AuditLogViewer.tsx | ✅ Complete |

---

## 📅 Timeline Summary

```
Week 1 (Days 1-7)
├── Days 1-2: Phase 0 - Critical Fixes
│   ├── Encounter ID type fixes
│   └── Empty value handling
└── Days 3-7: Phase 1 - RBAC
    ├── Centralize permission checks
    ├── Field-level enforcement
    └── Encounter access integration

Week 2-3 (Days 8-21)
├── Phase 2 - Workflow Improvements
│   ├── Treatment plan notifications
│   ├── Procedure acknowledgment
│   ├── Structured rejection reasons
│   └── Dashboard restructuring

Week 4+ (Days 22+)
└── Phase 3 - Enhancements
    ├── Shift-bounded nursing notes
    ├── Vital signs frequency
    └── Enhanced audit logging
```

---

## ✅ Definition of Done

For each task to be considered complete:

1. **Code Complete** - All code changes implemented
2. **No Errors** - No TypeScript/ESLint errors
3. **Tested** - Manual testing completed successfully
4. **Edge Cases** - Edge cases handled (empty data, permissions denied, etc.)
5. **Documented** - Code comments added where necessary
6. **Committed** - Code committed with descriptive message

---

## 🚀 Getting Started

### Immediate Next Steps:

1. **Review this plan** - Confirm priorities and timeline
2. **Start Phase 0.1.2** - Audit order creation APIs for encounter ID types
3. **Create helper function** - `getEncounterIdForTable()` for consistent ID usage
4. **Run existing code** - Verify P0 fixes (ClinicalNotesModal, QuickOrderModal) work

### Commands to Run:

```bash
# Start development server
npm start

# Test the fixed components
# 1. Open patient encounter
# 2. Try QuickOrderModal - create lab/radiology order
# 3. Try ClinicalNotesModal - add progress note
# 4. Verify no database errors in console
```

---

## 📝 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-12 | 1.0 | Initial plan created |
| 2026-01-12 | 1.1 | Phase 0 completed - encounter ID helpers, validation utilities |
| 2026-01-12 | 1.2 | Phase 1 partially completed - useRolePermission hook, encounter access checks |

---

## 👥 Stakeholders

| Role | Responsibility |
|------|---------------|
| Clinical Lead | Validate workflow correctness |
| Tech Lead | Code review, architecture decisions |
| QA | Test role-based access, edge cases |
| End Users | UAT feedback |

---

*This document will be updated as tasks are completed and new issues are discovered.*
