# Nursing Module Enhancement: Treatment Plan Viewing & Nursing Reports

## Executive Summary

This document outlines the **optimal implementation strategy** for enhancing the Nursing Care module following **EMR best practices** and **code reuse principles**.

### Goals:
1. **Remove "View History"** from My Patients panel (Clinical Consultation)
2. **Enable nurses to view doctor's treatment plans** (read-only, encounter-based)
3. **Allow nurses to add nursing notes/reports** on patients already attended by doctors

---

## Current Architecture Analysis

### ✅ Existing Assets We Can Reuse

| Asset | Location | What It Does | Reuse Strategy |
|-------|----------|--------------|----------------|
| `treatment-plan.api.ts` | `modules/treatment-plan/api/` | Full CRUD + `getNurseTreatmentPlans()` | **Direct import** - already has nurse-facing functions |
| `treatment-plan.dto.ts` | `modules/treatment-plan/dtos/` | Complete DTOs for plans & tasks | **Direct import** - no changes needed |
| `PatientHistorySidebar.tsx` | `modules/clinical-consultation/components/` | Shows diagnosis, treatment_plan, orders | **Pattern reference** for display formatting |
| `ConsultationDetail.tsx` | `modules/clinical-consultation/components/` | SlideOver with tabs (Clinical, Lab, Radiology, Rx) | **Pattern reference** for detail view |
| `PatientEncounterContext.tsx` | `contexts/` | Role-based visibility: `treatmentPlan: ['doctor', 'nurse']` | **Already configured** - nurses CAN view |

### 🔑 Key Discovery: Treatment Plan API Already Supports Nurses

```typescript
// Already exists in treatment-plan.api.ts
export async function getNurseTreatmentPlans(): Promise<TreatmentPlanDTO[]> {
  // Returns plans with status: 'Created', 'Viewed', 'In_Progress'
}

export async function markPlanViewed(planId: string): Promise<TreatmentPlanDTO> {
  // Marks plan as viewed by current nurse
}

export async function executeTask(data: ExecuteTaskDTO): Promise<TreatmentTaskDTO> {
  // Nurse can complete tasks
}
```

### 🔑 Key Discovery: Permission Already Configured

```typescript
// PatientEncounterContext.tsx - Line 168
treatmentPlan: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],  // ✅ Nurse can VIEW

// Line 187 - Edit permissions
treatmentPlan: ['super_admin', 'admin', 'medical_director', 'doctor'],  // ✅ Nurse CANNOT edit plan itself
```

---

## Recommended Architecture (Professional EMR Approach)

### Design Philosophy: **Minimal New Code, Maximum Reuse**

Instead of creating new components from scratch, we will:

1. **Import existing treatment plan module** into nursing
2. **Create a thin wrapper component** that filters for nurse-relevant views
3. **Add only the nursing notes table** (new feature not yet in system)
4. **Extend existing `nursing_care` table** OR create focused `nursing_notes` table

### Why This Approach?

| Approach | Pros | Cons |
|----------|------|------|
| ❌ Create all new components | Full control | Code duplication, maintenance burden, inconsistent UI |
| ✅ **Reuse + Extend** | DRY, consistent UI, faster delivery | Minor coupling |

---

## Implementation Plan (Optimized)

### Phase 1: Remove View History Button ✅
**File:** `MyPatientsPanel.tsx`
**Change:** Remove Eye icon button

---

### Phase 2: Add Treatment Plan Tab to Nursing Module

**Strategy:** Import existing treatment plan functions, create nurse-specific view wrapper

#### Files to Create (Minimal):

```
src/renderer/modules/nursing/
├── components/
│   ├── NursingCareForm.tsx        (existing)
│   ├── NursingCareList.tsx        (existing)
│   ├── TriageForm.tsx             (existing)
│   ├── TreatmentPlanTab.tsx       (NEW - thin wrapper)
│   └── NursingNotesTab.tsx        (NEW - for nursing notes)
```

#### `TreatmentPlanTab.tsx` - Thin Wrapper Component

```tsx
// Imports from existing treatment-plan module
import { 
  getTreatmentPlans, 
  getNurseTreatmentPlans,
  markPlanViewed,
  executeTask 
} from '../../treatment-plan/api/treatment-plan.api';
import { TreatmentPlanDTO, TreatmentTaskDTO } from '../../treatment-plan/dtos/treatment-plan.dto';

// Nurse can:
// - View all active treatment plans (getNurseTreatmentPlans)
// - Mark as viewed (markPlanViewed) 
// - Execute/complete tasks (executeTask)
// - Add execution notes to tasks

// Nurse CANNOT:
// - Create new plans
// - Edit plan details
// - Delete plans
```

---

### Phase 3: Nursing Notes/Reports (New Feature)

Since this is genuinely new functionality, we need a new table. However, we should **extend the existing pattern** rather than reinvent.

#### Option A: Extend `nursing_care` Table (Recommended)
Add a `notes_type` field to distinguish vitals vs. progress notes:

```sql
ALTER TABLE nursing_care ADD COLUMN IF NOT EXISTS 
  notes_type VARCHAR(30) DEFAULT 'Vitals';
-- Values: 'Vitals', 'Progress_Note', 'Observation', 'Handoff', 'Assessment'

ALTER TABLE nursing_care ADD COLUMN IF NOT EXISTS 
  related_consultation_id UUID REFERENCES consultations(consultation_id);

ALTER TABLE nursing_care ADD COLUMN IF NOT EXISTS 
  patient_condition VARCHAR(30);
-- Values: 'Stable', 'Improving', 'Deteriorating', 'Critical'
```

**Pros:** Reuses existing table, queries, hooks, UI patterns
**Cons:** Table gets wider

#### Option B: New `nursing_notes` Table (Cleaner Separation)
```sql
CREATE TABLE IF NOT EXISTS nursing_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID REFERENCES visits(id) NOT NULL,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    consultation_id UUID REFERENCES consultations(consultation_id),
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    
    note_type VARCHAR(30) NOT NULL DEFAULT 'Progress_Note',
    -- 'Progress_Note', 'Observation', 'Incident', 'Handoff', 'Assessment'
    
    content TEXT NOT NULL,
    patient_condition VARCHAR(30), -- 'Stable', 'Improving', 'Deteriorating', 'Critical'
    
    recorded_by UUID REFERENCES staff(id),
    shift VARCHAR(20), -- 'Morning', 'Afternoon', 'Night'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Pros:** Clean separation, focused purpose
**Cons:** New table, new API, new hooks (but necessary for new feature)

### 🏆 **Recommendation: Option B (New Table)**
Nursing notes are conceptually different from vitals/care records. A focused table is cleaner and follows **single responsibility principle**.

---

## Complete File Changes Summary

### Files to MODIFY:

| File | Change |
|------|--------|
| `MyPatientsPanel.tsx` | Remove "View History" button |
| `nursing/index.tsx` | Add tabs: Queue, Treatment Plans, Nursing Notes, Vitals |
| `nursing/hooks/useNursing.ts` | Add hooks for nursing notes |

### Files to CREATE:

| File | Purpose | Complexity |
|------|---------|------------|
| `migrations/037_nursing_notes.sql` | New table | Simple |
| `nursing/dtos/nursing-notes.dto.ts` | DTOs | Simple |
| `nursing/api/nursing-notes.api.ts` | CRUD API | Simple |
| `nursing/components/TreatmentPlanTab.tsx` | Wrapper using existing API | Medium |
| `nursing/components/NursingNotesList.tsx` | List component | Medium |
| `nursing/components/NursingNoteForm.tsx` | Add/edit form | Medium |

### Files to REUSE (No Changes):

| File | What We Reuse |
|------|---------------|
| `treatment-plan/api/treatment-plan.api.ts` | All nurse-facing functions |
| `treatment-plan/dtos/treatment-plan.dto.ts` | All DTOs |
| `PatientEncounterContext.tsx` | Role-based permissions (already configured) |

---

## Nurse View Permissions (EMR Best Practice)

### What Nurses CAN See (Per Healthcare Standards):

| Data Type | Access | Rationale |
|-----------|--------|-----------|
| Treatment Plan Title & Instructions | ✅ Full | Required for care execution |
| Tasks & Status | ✅ Full | Required for task completion |
| Diagnosis | ✅ Full | Needed for informed care |
| Medications/Prescriptions | ✅ Full | For medication administration |
| Lab Results (flagged) | ✅ Full | For monitoring |
| Follow-up Date | ✅ Full | For discharge planning |

### What Nurses Can MODIFY:

| Action | Access | Rationale |
|--------|--------|-----------|
| Mark treatment plan as "Viewed" | ✅ Yes | Acknowledgement tracking |
| Update task status | ✅ Yes | Workflow requirement |
| Add task execution notes | ✅ Yes | Documentation |
| Add nursing notes | ✅ Yes | Primary nurse function |

### What Nurses CANNOT Do:

| Action | Access | Rationale |
|--------|--------|-----------|
| Create treatment plans | ❌ No | Doctor responsibility |
| Modify diagnosis | ❌ No | Doctor responsibility |
| Edit consultation notes | ❌ No | Doctor's clinical record |
| Delete any doctor records | ❌ No | Audit integrity |

---

## UI Design (Nursing Module Tabs)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🩺 Nursing Care                                              [Theme 🌙] │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌──────────────────┐ ┌───────────────┐ ┌─────────────────┐   │
│ │ Queue  │ │ Treatment Plans  │ │ Nursing Notes │ │ Vitals History  │   │
│ └────────┘ └──────────────────┘ └───────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TREATMENT PLANS TAB:                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📋 Post-Op Care Plan                          Status: In Progress│   │
│  │ Patient: John Doe (PT-00042)                                     │   │
│  │ Doctor: Dr. Smith                             Created: 2h ago    │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │ Instructions: Monitor vitals q2h, pain management PRN            │   │
│  │                                                                   │   │
│  │ Tasks:                                                           │   │
│  │ ☑ Monitor vitals every 2 hours          [Completed by Nurse A]   │   │
│  │ ☐ Administer pain medication PRN        [Mark Complete] [Notes]  │   │
│  │ ☐ Wound dressing change at 6pm          [Mark Complete] [Notes]  │   │
│  │                                                                   │   │
│  │ [View Full Plan] [Add Nursing Note]                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  NURSING NOTES TAB:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [+ Add Progress Note]  Filter: [All Types ▼] [All Patients ▼]   │   │
│  │                                                                   │   │
│  │ 📝 Progress Note                              Today 2:30 PM      │   │
│  │ Patient: Jane Doe | Condition: Stable                            │   │
│  │ "Patient responding well to IV fluids, vital signs stable..."    │   │
│  │ Nurse: Sarah K. | Morning Shift                                  │   │
│  │                                                                   │   │
│  │ 📝 Observation                                Today 11:00 AM     │   │
│  │ Patient: John Smith | Condition: Improving                       │   │
│  │ "Temperature returned to normal after antipyretic..."            │   │
│  │ Nurse: Sarah K. | Morning Shift                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PATIENT CARE WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Patient Arrives                                                     │
│     └─► Nurse takes vitals (existing NursingCareForm)                  │
│                                                                         │
│  2. Consultation                                                        │
│     └─► Doctor creates consultation + treatment plan                   │
│                                                                         │
│  3. Post-Consultation Care (NEW WORKFLOW)                              │
│     └─► Nurse sees treatment plan in "Treatment Plans" tab             │
│     └─► Nurse marks plan as "Viewed" (acknowledgement)                 │
│     └─► Nurse executes tasks, marks complete                           │
│     └─► Nurse adds progress notes in "Nursing Notes" tab               │
│                                                                         │
│  4. Ongoing Monitoring                                                  │
│     └─► Nurse adds observations, assessments                           │
│     └─► Critical observations flag doctor notification                 │
│                                                                         │
│  5. Shift Handoff                                                       │
│     └─► Nurse adds handoff note with patient status                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌──────────────────┐         ┌──────────────────┐
│     DOCTOR       │         │      NURSE       │
│  Consultation    │         │   Nursing Care   │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│  consultations   │         │     vitals       │
│  table (existing)│         │  table (existing)│
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ▼                            │
┌──────────────────┐                  │
│ treatment_plans  │◄─────────────────┤ (Nurse READS)
│ table (existing) │                  │
└────────┬─────────┘                  │
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│treatment_tasks   │         │  nursing_notes   │
│(Nurse can update)│         │   table (NEW)    │
└──────────────────┘         └──────────────────┘
         │                            │
         └────────────┬───────────────┘
                      ▼
              ┌──────────────────┐
              │   encounter_id   │
              │  (Links all to   │
              │   same visit)    │
              └──────────────────┘
```

---

## Implementation Order (Recommended)

### Step 1: Quick Win - Remove View History
- 5 minutes
- Single line removal

### Step 2: Add Nursing Notes Infrastructure
- Create migration
- Create DTOs
- Create API
- ~30 minutes

### Step 3: Create Treatment Plan Tab (Reuse Approach)
- Import existing treatment plan API
- Create thin wrapper component
- Wire up to nursing index
- ~45 minutes

### Step 4: Create Nursing Notes UI
- List component
- Form component
- ~45 minutes

### Step 5: Integration & Testing
- Tab navigation
- Data flow verification
- ~30 minutes

**Total Estimated Time: ~2.5 hours**

---

## Summary: Why This Approach is Optimal

| Criteria | Our Approach |
|----------|--------------|
| **Code Reuse** | ✅ Reuses 100% of treatment plan API/DTOs |
| **Consistency** | ✅ Same patterns as consultation module |
| **Permissions** | ✅ Already configured in PatientEncounterContext |
| **Maintenance** | ✅ Single source of truth for treatment plans |
| **EMR Standards** | ✅ Follows HIPAA/healthcare data separation |
| **Delivery Speed** | ✅ Minimal new code = faster delivery |

---

## Ready to Proceed?

Confirm and I will implement in this order:
1. ✅ Remove "View History" button
2. ✅ Create `nursing_notes` table migration
3. ✅ Create nursing notes DTOs & API
4. ✅ Create `TreatmentPlanTab.tsx` (reusing existing API)
5. ✅ Create `NursingNotesTab.tsx` with form
6. ✅ Update `nursing/index.tsx` with new tabs
