# NDC Medical Centre EMR - Workflow Gap Analysis & Execution Plan

## Master Reference: OPD → Clinical Requests → Admission → Wards → In-Patient Care

> **Document Purpose**: This document analyzes the current NDC EMR implementation against the Master Reference Workflow and provides a detailed execution plan to close all gaps.

> **EXECUTION STATUS**: Phase 1 (Critical Foundation) - ✅ COMPLETED
> - Migration 038 created
> - Clinical Requests module implemented
> - Consultation integration complete
>
> **EXECUTION STATUS**: Phase 2 (Integration) - ✅ COMPLETED
> - Admission Execution workflow implemented (WardBedSelector, AdmissionExecutionModal)
> - Procedure Scheduling workflow implemented (ProcedureSchedulingModal)
> - API functions for executing admissions and scheduling procedures
> - Patient status updates on admission (OPD → In-Patient)
> - Bed status updates on allocation
>
> **EXECUTION STATUS**: Phase 3 (In-Patient Enhancements) - ✅ COMPLETED
> - Ward round notes now auto-create encounters for traceability
> - DischargeChecklist.tsx created for comprehensive pre-discharge verification
> - DischargeSummary.tsx created for generating discharge summary documents
> - DischargeExecutionModal.tsx created for completing discharge from approved requests
> - executeDischarge() API function implemented
> - Patient status updated to 'Out-Patient' on discharge
> - Bed released and ward availability updated on discharge

---

## Table of Contents
1. [Current Implementation Status](#1-current-implementation-status)
2. [Gap Analysis by Section](#2-gap-analysis-by-section)
3. [Execution Plan](#3-execution-plan)
4. [File Mapping & Changes](#4-file-mapping--changes)
5. [Database Schema Updates](#5-database-schema-updates)
6. [Priority Matrix](#6-priority-matrix)

---

## 1. Current Implementation Status

### ✅ What's Already Implemented

| Feature | Status | Location |
|---------|--------|----------|
| Patient Registration | ✅ Complete | `src/renderer/modules/patient-registration/` |
| Encounter/Visit System | ✅ Complete | `src/renderer/lib/workflow/`, `src/renderer/modules/encounter/` |
| Queue Management | ✅ Complete | `src/renderer/modules/queue/` |
| Nursing Vitals | ✅ Complete | `src/renderer/modules/nursing/` |
| Clinical Consultation | ✅ Complete | `src/renderer/modules/clinical-consultation/` |
| Lab Requests | ✅ Complete | `src/renderer/modules/lab/` |
| Radiology Requests | ✅ Complete | `src/renderer/modules/radiology/` |
| Pharmacy/Prescriptions | ✅ Complete | `src/renderer/modules/pharmacy/` |
| Billing | ✅ Complete | `src/renderer/modules/billing/` |
| Treatment Plans | ✅ Complete | `src/renderer/modules/treatment-plan/` |
| Ward Management | ✅ Partial | `src/renderer/modules/in-patient/api/wards.api.ts` |
| Bed Management | ✅ Partial | `src/renderer/modules/in-patient/api/beds.api.ts` |
| Admissions | ✅ Partial | `src/renderer/modules/in-patient/api/admissions.api.ts` |
| Ward Rounds | ✅ Partial | `src/renderer/modules/in-patient/api/ward-rounds.api.ts` |
| Procedures/Surgery | ✅ Partial | `src/renderer/modules/procedure/` |
| Referrals (Schema) | ✅ Partial | `migrations/001_fresh_schema.sql`, `src/renderer/types/referrals.types.ts` |

### ⚠️ Partially Implemented Features

| Feature | Current State | Gap |
|---------|---------------|-----|
| OPD Classification | Visit types exist but no MOPD/SOPD split | Missing OPD umbrella concept |
| Clinical Requests | Orders created directly in consultation | Missing formal Clinical Request entity |
| Admission Workflow | Basic admission exists | Missing request → approval → admission flow |
| Discharge | Schema exists | Missing discharge workflow UI |
| In-Patient Encounters | Ward rounds exist | Missing daily encounter linking |

### ❌ Missing Features

| Feature | Reference Section | Impact |
|---------|-------------------|--------|
| OPD Classification (MOPD/SOPD) | §1, §2, §3 | High |
| Clinical Request Entity | §5 | Critical |
| Admission Request Workflow | §7 | Critical |
| Surgery/Procedure Request Flow | §10 | High |
| Discharge Request & Checklist | §11 | High |
| Follow-up Request Management | §6 | Medium |
| Department Routing (MOPD → SOPD) | §2, §3 | Medium |

---

## 2. Gap Analysis by Section

### §1. OPD as Entry Point

**Reference Requirement:**
> All patients begin care as OPD unless admitted. OPD is classified into MOPD (Medical OPD) and SOPD (Specialist OPD).

**Current State:**
- ✅ Visits/Encounters are created for all patients
- ✅ Visit types include: `New Visit`, `Follow-Up`, `Emergency`, `Referral`, `General`, `Specialty`
- ❌ No formal MOPD/SOPD classification
- ❌ No OPD umbrella linking MOPD and SOPD

**Gap:**
```
MISSING: opd_classification ENUM ('MOPD', 'SOPD')
MISSING: Department categorization as MOPD or SOPD
```

**Files to Update:**
- `src/renderer/lib/workflow/types.ts` - Add OPD classification
- `src/renderer/modules/encounter/dtos/encounter.dto.ts` - Add OPD classification
- `migrations/` - Add opd_classification column to visits

---

### §2 & §3. MOPD and SOPD Separation

**Reference Requirement:**
> - MOPD: Initial assessment, triage, routing (General Medicine, Family Medicine, Primary Care)
> - SOPD: Specialist evaluation, advanced decisions, surgery planning (Surgery, Cardiology, Neurology, etc.)

**Current State:**
- ✅ Departments table exists with category field
- ❌ No MOPD/SOPD categorization
- ❌ No routing workflow from MOPD to SOPD

**Gap:**
```
MISSING: Department.opd_type ENUM ('MOPD', 'SOPD', 'Support', 'Administrative')
MISSING: Referral/routing from MOPD to SOPD workflow
```

**Files to Update:**
- `src/renderer/types/departments.types.ts` - Add `opd_type` field
- `src/renderer/modules/customer-service/` - Add MOPD → SOPD routing
- `migrations/` - Add opd_type to departments

---

### §4. Encounter-Centric Design ✅ (Mostly Complete)

**Reference Requirement:**
> Every clinical action must originate from an Encounter and be traceable.

**Current State:**
- ✅ All clinical records link to `visit_id` or `encounter_id`
- ✅ Encounter validation exists (`src/renderer/lib/encounter/validation.ts`)
- ✅ Lab, Radiology, Prescriptions link to encounters
- ⚠️ In-patient ward rounds could be better linked

**Gap:**
```
MINOR: Ward round encounters should explicitly create encounter_id in visits table
```

**Files to Update:**
- `src/renderer/modules/in-patient/api/ward-rounds.api.ts` - Ensure encounter creation

---

### §5. Clinical Requests (CRITICAL GAP)

**Reference Requirement:**
> Doctors create Clinical Requests from encounters. Request Types: Follow-up review, Procedure, Surgery, Admission, Referral. Requests represent intent, not logistics.

**Current State:**
- ❌ **No Clinical Request entity exists**
- ✅ Lab/Radiology/Prescription orders exist
- ⚠️ Admission/Procedure orders added to consultation but not as formal requests
- ❌ No request approval workflow

**Gap:**
```
CRITICAL MISSING: clinical_requests table
CRITICAL MISSING: Clinical Request workflow (create → review → approve → execute)
CRITICAL MISSING: Request status tracking (Pending, Approved, Rejected, In Progress, Completed)
```

**Database Schema Needed:**
```sql
CREATE TABLE clinical_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    encounter_id UUID REFERENCES visits(id) NOT NULL,
    requesting_doctor_id UUID REFERENCES staff(id) NOT NULL,
    
    -- Request Type
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'Follow-Up', 'Procedure', 'Surgery', 'Admission', 'Referral', 'Transfer'
    )),
    
    -- Clinical Details
    clinical_reason TEXT NOT NULL,
    urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('Routine', 'Urgent', 'Emergency')),
    suggested_timeframe VARCHAR(100), -- "Within 2 weeks", "ASAP", etc.
    
    -- Target
    target_department_id UUID REFERENCES departments(id),
    target_ward_id UUID REFERENCES wards(id),
    target_doctor_id UUID REFERENCES staff(id),
    
    -- Admission-specific
    admission_type VARCHAR(20) CHECK (admission_type IN ('Emergency', 'Elective')),
    suggested_ward_type VARCHAR(50),
    level_of_care VARCHAR(20) CHECK (level_of_care IN ('Ward', 'ICU', 'HDU')),
    
    -- Surgery/Procedure-specific
    procedure_id UUID REFERENCES procedure_catalogue(id),
    procedure_notes TEXT,
    
    -- Status Tracking
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN (
        'Pending', 'Under Review', 'Approved', 'Rejected', 
        'Scheduled', 'In Progress', 'Completed', 'Cancelled'
    )),
    reviewed_by UUID REFERENCES staff(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Execution Link
    admission_id UUID REFERENCES admissions(id),
    surgery_id UUID REFERENCES procedures(id),
    referral_id UUID REFERENCES referrals(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create:**
- `src/renderer/modules/clinical-requests/` - New module
  - `api/clinical-requests.api.ts`
  - `hooks/useClinicalRequests.ts`
  - `dtos/clinical-request.dto.ts`
  - `components/ClinicalRequestForm.tsx`
  - `components/ClinicalRequestList.tsx`
  - `components/ClinicalRequestApproval.tsx`
  - `pages/ClinicalRequestsPage.tsx`
  - `index.ts`

**Files to Update:**
- `src/renderer/modules/clinical-consultation/components/ConsultationWizard.tsx`
  - Change direct admission/procedure orders to create Clinical Requests
- `src/renderer/config/menu.ts` - Add Clinical Requests menu item

---

### §6. Tests & Follow-ups

**Reference Requirement:**
> Follow-up visits are created only via clinical requests, not automatic bookings.

**Current State:**
- ✅ Lab/Radiology results flow exists
- ⚠️ Follow-up date captured in consultation but no formal request
- ❌ No follow-up request workflow

**Gap:**
```
MISSING: Follow-up requests should create Clinical Requests
MISSING: Doctor review of results → new clinical request flow
```

**Files to Update:**
- `src/renderer/modules/clinical-consultation/components/ConsultationWizard.tsx`
  - Follow-up should create a Clinical Request of type 'Follow-Up'

---

### §7. Admission (CRITICAL GAP)

**Reference Requirement:**
> Doctor creates Admission Request → System approves → Patient status changes OPD → In-Patient → Admission Episode created.

**Current State:**
- ✅ Admission table exists with comprehensive fields
- ✅ Ward/Bed assignment exists
- ⚠️ AdmissionOrderDTO added to consultation (recent change)
- ❌ **No formal Admission Request entity**
- ❌ **No approval workflow**
- ❌ Patient status doesn't formally change

**Gap:**
```
CRITICAL: Admission must go through Clinical Request approval
CRITICAL: Patient status should indicate OPD vs In-Patient
MISSING: Admission approval workflow
```

**Files to Update:**
- `src/renderer/modules/clinical-consultation/` - Create Clinical Request instead of direct admission
- `src/renderer/modules/in-patient/` - Add approval workflow
- `src/renderer/types/database.types.ts` - Add patient_status field

**Database Change Needed:**
```sql
-- Add patient_status to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
    current_status VARCHAR(20) DEFAULT 'OPD' 
    CHECK (current_status IN ('OPD', 'In-Patient', 'Discharged', 'Deceased'));

-- Add admission_request_id to admissions
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS 
    clinical_request_id UUID REFERENCES clinical_requests(id);
```

---

### §8. Wards

**Reference Requirement:**
> Ward is the unit responsible for admitted patients. Each ward has type, beds, nursing team.

**Current State:**
- ✅ Wards table exists with ward_type
- ✅ Beds table exists
- ✅ Ward assignment on admission exists
- ⚠️ Nursing team assignment partial

**Gap:**
```
MINOR: Better nursing team assignment per ward
```

---

### §9. In-Patient Care Workflow

**Reference Requirement:**
> Ward activities: Daily ward rounds (each = new encounter), nursing notes, medication administration, procedures.

**Current State:**
- ✅ Ward rounds exist with comprehensive fields
- ✅ Nursing notes exist
- ⚠️ Ward rounds don't always create formal encounters
- ⚠️ Medication administration exists but not fully ward-integrated

**Gap:**
```
MISSING: Each ward round should create a linked encounter in visits table
MISSING: Ward-specific medication administration tracking
```

**Files to Update:**
- `src/renderer/modules/in-patient/api/ward-rounds.api.ts`
  - Create encounter when creating ward round note

---

### §10. Surgery & Procedures

**Reference Requirement:**
> Doctor creates Surgery/Procedure Request → Theatre schedules logistics → Ward manages pre/post-op.

**Current State:**
- ✅ Procedure catalogue exists
- ✅ Procedures table exists
- ⚠️ ProcedureOrderDTO added to consultation (recent change)
- ❌ **No formal Surgery Request workflow**
- ❌ **No theatre scheduling integration**
- ❌ **No pre-op/post-op ward workflow**

**Gap:**
```
CRITICAL: Surgery/Procedure must go through Clinical Request
MISSING: Theatre/OR scheduling module
MISSING: Pre-op checklist
MISSING: Post-op care linkage
```

**Files to Create:**
- `src/renderer/modules/theatre/` - New module for OR scheduling
  - `api/theatre.api.ts`
  - `hooks/useTheatre.ts`
  - `components/TheatreSchedule.tsx`
  - `components/SurgeryRequestApproval.tsx`

**Files to Update:**
- `src/renderer/modules/procedure/` - Link to Clinical Requests

---

### §11. Discharge (GAP)

**Reference Requirement:**
> Doctor creates Discharge Request → Ward/Nursing completes checklist → Discharge summary → Patient status = Discharged.

**Current State:**
- ✅ Discharge fields exist in admissions table
- ✅ DischargeAdmissionDTO exists
- ❌ **No discharge request workflow**
- ❌ **No discharge checklist UI**
- ❌ **No discharge summary generation**

**Gap:**
```
MISSING: Discharge Request (part of Clinical Requests)
MISSING: Discharge checklist component
MISSING: Discharge summary generation
MISSING: Discharge instructions/medications
```

**Files to Create:**
- `src/renderer/modules/in-patient/components/DischargeForm.tsx`
- `src/renderer/modules/in-patient/components/DischargeChecklist.tsx`
- `src/renderer/modules/in-patient/components/DischargeSummary.tsx`

---

### §12. System Rules Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No appointment without clinical request | ❌ Not enforced | Need to implement |
| No admission without doctor's request | ❌ Not enforced | Clinical Request needed |
| No ward care without admission | ✅ Enforced | Foreign key constraints |
| No surgery without SOPD/ward decision | ❌ Not enforced | Clinical Request needed |
| Doctors decide what, Operations decide when/how | ❌ Not separated | Need Clinical Request workflow |

---

## 3. Execution Plan

### Phase 1: Foundation (Priority: CRITICAL)
**Estimated Time: 1-2 weeks**

#### Task 1.1: OPD Classification
- Add `opd_classification` ENUM to database
- Update visits table with opd_classification column
- Update departments with opd_type (MOPD/SOPD)
- Update visit type options in UI

#### Task 1.2: Clinical Requests Module (CORE)
- Create `clinical_requests` table (migration)
- Create Clinical Requests module structure
- Implement API functions
- Create React hooks
- Build Clinical Request form component
- Build Clinical Request list/queue component

#### Task 1.3: Patient Status Tracking
- Add `current_status` to patients table
- Update patient registration to default 'OPD'
- Update admission to change status to 'In-Patient'
- Update discharge to change status to 'Discharged'

### Phase 2: Integration (Priority: HIGH)
**Estimated Time: 1-2 weeks**

#### Task 2.1: Consultation → Clinical Request Integration
- Modify ConsultationWizard to create Clinical Requests instead of direct orders
- Admission Order → Admission Request (Clinical Request)
- Procedure Order → Surgery/Procedure Request (Clinical Request)
- Follow-up → Follow-up Request (Clinical Request)

#### Task 2.2: Admission Request Workflow
- Create Admission Request approval queue
- Role-based approval (Medical Director, Admin)
- Auto-create admission record on approval
- Update patient status on admission

#### Task 2.3: Surgery/Procedure Request Workflow
- Create Surgery Request approval queue
- Link to theatre scheduling (basic)
- Pre-op checklist creation

### Phase 3: In-Patient Enhancements (Priority: HIGH)
**Estimated Time: 1-2 weeks**

#### Task 3.1: Ward Round Encounters
- Auto-create encounter for each ward round
- Link ward round notes to encounter

#### Task 3.2: Discharge Workflow
- Create Discharge Request type in Clinical Requests
- Build Discharge Checklist component
- Build Discharge Summary generator
- Auto-update patient status on discharge

#### Task 3.3: Theatre/OR Module (Basic)
- Create theatre module structure
- Surgery scheduling interface
- Link to procedures module

### Phase 4: Refinements (Priority: MEDIUM)
**Estimated Time: 1 week**

#### Task 4.1: MOPD → SOPD Routing
- Department categorization UI
- Referral workflow from MOPD to SOPD

#### Task 4.2: Follow-up Management
- Follow-up request queue
- Scheduling integration
- Patient notification

#### Task 4.3: Audit & Compliance
- Ensure all actions have encounter links
- Audit trail for clinical requests
- Reports for workflow compliance

---

## 4. File Mapping & Changes

### New Files to Create

```
src/renderer/modules/clinical-requests/
├── index.ts
├── api/
│   └── clinical-requests.api.ts
├── hooks/
│   └── useClinicalRequests.ts
├── dtos/
│   └── clinical-request.dto.ts
├── components/
│   ├── ClinicalRequestForm.tsx
│   ├── ClinicalRequestList.tsx
│   ├── ClinicalRequestCard.tsx
│   ├── ClinicalRequestApproval.tsx
│   ├── AdmissionRequestForm.tsx
│   ├── SurgeryRequestForm.tsx
│   ├── FollowUpRequestForm.tsx
│   └── ReferralRequestForm.tsx
└── pages/
    ├── ClinicalRequestsPage.tsx
    └── RequestApprovalPage.tsx

src/renderer/modules/in-patient/components/
├── DischargeForm.tsx
├── DischargeChecklist.tsx
└── DischargeSummary.tsx

src/renderer/modules/theatre/ (Optional - Phase 3)
├── index.ts
├── api/
│   └── theatre.api.ts
├── hooks/
│   └── useTheatre.ts
├── components/
│   ├── TheatreSchedule.tsx
│   ├── SurgerySlot.tsx
│   └── PreOpChecklist.tsx
└── pages/
    └── TheatrePage.tsx
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/lib/workflow/types.ts` | Add OPD classification types |
| `src/renderer/modules/encounter/dtos/encounter.dto.ts` | Add opd_classification field |
| `src/renderer/types/departments.types.ts` | Add opd_type field |
| `src/renderer/types/database.types.ts` | Add patient_status, clinical_request types |
| `src/renderer/modules/clinical-consultation/components/ConsultationWizard.tsx` | Create Clinical Requests instead of direct orders |
| `src/renderer/modules/clinical-consultation/dtos/consultation.dto.ts` | Link to Clinical Request DTOs |
| `src/renderer/modules/in-patient/api/admissions.api.ts` | Accept clinical_request_id |
| `src/renderer/modules/in-patient/api/ward-rounds.api.ts` | Create encounter with ward round |
| `src/renderer/config/menu.ts` | Add Clinical Requests menu |
| `src/renderer/contexts/AuthContext.tsx` | Add clinical-requests module access |

---

## 5. Database Schema Updates

### Migration: `038_clinical_requests_workflow.sql`

```sql
-- =============================================================================
-- NDC Medical Centre EMR - Clinical Requests & Workflow Enhancements
-- =============================================================================

-- 1. OPD Classification Enum
DO $$ BEGIN
    CREATE TYPE opd_classification AS ENUM ('MOPD', 'SOPD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add opd_classification to visits
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS opd_classification opd_classification;

-- 3. Add opd_type to departments
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS opd_type VARCHAR(20) 
CHECK (opd_type IN ('MOPD', 'SOPD', 'Support', 'Diagnostic', 'Administrative'));

-- 4. Patient Status
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) DEFAULT 'OPD'
CHECK (current_status IN ('OPD', 'In-Patient', 'Discharged', 'Deceased'));

-- 5. Clinical Request Type Enum
DO $$ BEGIN
    CREATE TYPE clinical_request_type AS ENUM (
        'Follow-Up', 'Procedure', 'Surgery', 'Admission', 'Referral', 'Transfer', 'Discharge'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Clinical Request Status Enum
DO $$ BEGIN
    CREATE TYPE clinical_request_status AS ENUM (
        'Pending', 'Under_Review', 'Approved', 'Rejected', 
        'Scheduled', 'In_Progress', 'Completed', 'Cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Urgency Enum
DO $$ BEGIN
    CREATE TYPE clinical_urgency AS ENUM ('Routine', 'Urgent', 'Emergency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Clinical Requests Table
CREATE TABLE IF NOT EXISTS clinical_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE,
    
    -- Patient & Encounter Link
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    
    -- Requesting Doctor
    requesting_doctor_id UUID NOT NULL REFERENCES staff(id),
    requesting_department_id UUID REFERENCES departments(id),
    
    -- Request Details
    request_type clinical_request_type NOT NULL,
    clinical_reason TEXT NOT NULL,
    urgency clinical_urgency NOT NULL DEFAULT 'Routine',
    suggested_timeframe VARCHAR(100),
    notes TEXT,
    
    -- Target (where/who should handle)
    target_department_id UUID REFERENCES departments(id),
    target_ward_id UUID REFERENCES wards(id),
    target_doctor_id UUID REFERENCES staff(id),
    
    -- Admission-specific fields
    admission_type VARCHAR(20) CHECK (admission_type IN ('Emergency', 'Elective')),
    suggested_ward_type VARCHAR(50),
    level_of_care VARCHAR(20) CHECK (level_of_care IN ('Ward', 'ICU', 'HDU', 'NICU')),
    
    -- Surgery/Procedure-specific fields
    procedure_catalogue_id UUID REFERENCES procedure_catalogue(id),
    procedure_notes TEXT,
    pre_op_requirements TEXT,
    
    -- Status & Approval
    status clinical_request_status DEFAULT 'Pending',
    reviewed_by UUID REFERENCES staff(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Execution Links (filled when request is fulfilled)
    admission_id UUID REFERENCES admissions(id),
    procedure_id UUID REFERENCES procedures(id),
    referral_id UUID REFERENCES referrals(id),
    follow_up_visit_id UUID REFERENCES visits(id),
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    scheduled_by UUID REFERENCES staff(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    
    -- Facility
    facility_id UUID REFERENCES facilities(id)
);

-- 9. Request Number Generation
CREATE SEQUENCE IF NOT EXISTS clinical_request_seq START WITH 1001;

CREATE OR REPLACE FUNCTION generate_clinical_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := 'REQ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                              LPAD(nextval('clinical_request_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinical_request_number
    BEFORE INSERT ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION generate_clinical_request_number();

-- 10. Clinical Request Status History
CREATE TABLE IF NOT EXISTS clinical_request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES clinical_requests(id) ON DELETE CASCADE,
    from_status clinical_request_status,
    to_status clinical_request_status NOT NULL,
    changed_by UUID REFERENCES staff(id),
    change_reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Add clinical_request_id to admissions
ALTER TABLE admissions 
ADD COLUMN IF NOT EXISTS clinical_request_id UUID REFERENCES clinical_requests(id);

-- 12. Add clinical_request_id to procedures
ALTER TABLE procedures 
ADD COLUMN IF NOT EXISTS clinical_request_id UUID REFERENCES clinical_requests(id);

-- 13. Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_requests_patient ON clinical_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_encounter ON clinical_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_status ON clinical_requests(status);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_type ON clinical_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_urgency ON clinical_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_date ON clinical_requests(created_at);

-- 14. RLS Policies
ALTER TABLE clinical_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinical_requests_select ON clinical_requests FOR SELECT USING (true);
CREATE POLICY clinical_requests_insert ON clinical_requests FOR INSERT WITH CHECK (true);
CREATE POLICY clinical_requests_update ON clinical_requests FOR UPDATE USING (true);

-- 15. Update timestamp trigger
CREATE TRIGGER trg_clinical_requests_updated_at
    BEFORE UPDATE ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 16. View for pending requests by department
CREATE OR REPLACE VIEW pending_clinical_requests AS
SELECT 
    cr.*,
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number,
    p.gender,
    p.date_of_birth,
    doc.first_name || ' ' || doc.surname AS requesting_doctor_name,
    dept.name AS requesting_department_name,
    target_dept.name AS target_department_name,
    target_ward.name AS target_ward_name
FROM clinical_requests cr
JOIN patients p ON cr.patient_id = p.id
LEFT JOIN staff doc ON cr.requesting_doctor_id = doc.id
LEFT JOIN departments dept ON cr.requesting_department_id = dept.id
LEFT JOIN departments target_dept ON cr.target_department_id = target_dept.id
LEFT JOIN wards target_ward ON cr.target_ward_id = target_ward.id
WHERE cr.status IN ('Pending', 'Under_Review')
ORDER BY 
    CASE cr.urgency 
        WHEN 'Emergency' THEN 1 
        WHEN 'Urgent' THEN 2 
        ELSE 3 
    END,
    cr.created_at ASC;
```

---

## 6. Priority Matrix

| Priority | Task | Est. Effort | Dependencies |
|----------|------|-------------|--------------|
| 🔴 CRITICAL | Clinical Requests Module | 5 days | None |
| 🔴 CRITICAL | Clinical Requests Migration | 1 day | None |
| 🔴 CRITICAL | Admission Request Workflow | 3 days | Clinical Requests |
| 🟠 HIGH | Consultation → Clinical Request Integration | 2 days | Clinical Requests |
| 🟠 HIGH | Surgery Request Workflow | 2 days | Clinical Requests |
| 🟠 HIGH | Discharge Workflow | 2 days | Clinical Requests |
| 🟡 MEDIUM | OPD Classification | 1 day | None |
| 🟡 MEDIUM | Ward Round Encounters | 1 day | None |
| 🟡 MEDIUM | Patient Status Tracking | 1 day | None |
| 🟢 LOW | MOPD → SOPD Routing | 2 days | OPD Classification |
| 🟢 LOW | Theatre Module | 3 days | Surgery Request |

---

## Summary

### Total Implementation Effort
- **Phase 1 (Critical Foundation):** 1-2 weeks
- **Phase 2 (Integration):** 1-2 weeks  
- **Phase 3 (Enhancements):** 1-2 weeks
- **Phase 4 (Refinements):** 1 week

**Total Estimated Time: 4-7 weeks**

### Key Architectural Changes
1. **Clinical Requests as Central Hub** - All clinical decisions flow through formal requests
2. **Separation of Concerns** - Doctors request (what), Operations schedule (when/how)
3. **Status-Driven Workflow** - Patient status tracks OPD → In-Patient → Discharged
4. **Encounter Linkage** - Every action traces back to an encounter

### Immediate Next Steps
1. ✅ Review and approve this plan
2. Run Migration 038 for Clinical Requests schema
3. Create Clinical Requests module structure
4. Modify ConsultationWizard to create Clinical Requests
5. Build Admission Request approval workflow

---

*Document Version: 1.0*
*Created: January 2, 2026*
*Based on: Master Reference Workflow Document*
