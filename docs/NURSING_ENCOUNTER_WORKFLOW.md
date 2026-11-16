# Nursing Module & Encounter Workflow Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Nursing Care Records vs Encounters](#nursing-care-records-vs-encounters)
3. [Edit Button Functionality](#edit-button-functionality)
4. [Nurse Access to Doctor's Notes](#nurse-access-to-doctors-notes)
5. [Handling Long-Duration Encounters](#handling-long-duration-encounters)
6. [Standard EMR Best Practices](#standard-emr-best-practices)
7. [Implementation Plan](#implementation-plan)

---

## 🎯 Overview

This document outlines how nurses interact with encounters, patient records, and clinical notes in the NDC Medical Centre EMR system. It follows industry-standard EMR practices while accommodating the realities of hospital workflows where encounters may span hours, days, or weeks.

---

## 📊 Nursing Care Records vs Encounters

### Understanding the Distinction

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA HIERARCHY IN NDC EMR                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PATIENT (Permanent Identity)                                              │
│       │                                                                     │
│       └── ENCOUNTER (Visit/Episode of Care)                                 │
│               │                                                             │
│               ├── Vitals Records (nursing_care table)                       │
│               │       • Blood pressure, pulse, temperature                  │
│               │       • Multiple readings per encounter                     │
│               │                                                             │
│               ├── Nursing Notes (nursing_notes table)                       │
│               │       • Observations, assessments                           │
│               │       • Care interventions performed                        │
│               │       • Patient condition updates                           │
│               │                                                             │
│               ├── Consultations (consultations table)                       │
│               │       • Doctor's SOAP notes                                 │
│               │       • Diagnosis, treatment plan                           │
│               │                                                             │
│               ├── Lab Orders & Results                                      │
│               ├── Radiology Orders & Results                                │
│               ├── Prescriptions                                             │
│               └── Treatment Plans                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Term | Definition | Table |
|------|------------|-------|
| **Patient** | Permanent identity, created once | `patients` |
| **Encounter** | Single visit or care episode (can span days/weeks) | `visits` |
| **Nursing Care** | Vital signs recording | `nursing_care` |
| **Nursing Notes** | Observations, interventions, shift reports | `nursing_notes` |
| **Consultation** | Doctor's clinical documentation | `consultations` |

---

## ✏️ Edit Button Functionality

### Current State: NursingCareList Component

The **Edit** button in the Care Records table (`NursingCareList.tsx`) should:

1. **Open the Nursing Care Form** with pre-populated data
2. **Allow modification of**:
   - Vital signs (BP, pulse, temp, SpO2, etc.)
   - Care type
   - Notes/observations
3. **NOT allow modification of**:
   - Patient or encounter association
   - Created timestamp (record when it was originally taken)

### Recommended Implementation

```typescript
// In NursingCare (index.tsx)
const handleEditRecord = (record: NursingCareDTO) => {
  setEditingRecord(record);  // Store the record being edited
  setSelectedPatient({       // Pre-fill patient context
    patient_id: record.patient_id,
    ...record.patient,
  });
  setSelectedEncounterId(record.encounter_id);
  setSelectedVisitId(record.visit_id);
  setIsFormOpen(true);       // Open the form in edit mode
};
```

### Edit vs View Distinction

| Action | Purpose | Modifies Data |
|--------|---------|---------------|
| **View** | Display read-only details | No |
| **Edit** | Modify existing vital signs record | Yes |
| **Delete** | Remove erroneous record (with audit) | Yes |

---

## 👩‍⚕️ Nurse Access to Doctor's Notes

### Standard EMR Practice

In standard EMR systems, **clinical notes are shared across the care team**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CLINICAL NOTES ACCESS MATRIX                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Note Type              │ Nurse Can View │ Nurse Can Add │ Nurse Can Edit │
│   ─────────────────────────────────────────────────────────────────────────│
│   Nursing Notes          │      ✅         │      ✅        │   ✅ (Own)     │
│   Nursing Care (Vitals)  │      ✅         │      ✅        │   ✅ (Own)     │
│   Doctor's SOAP Notes    │      ✅         │      ❌        │      ❌        │
│   Treatment Plans        │      ✅         │      ❌        │      ❌        │
│   Doctor's Orders        │      ✅         │      ❌        │      ❌        │
│   Lab Results            │      ✅         │      ❌        │      ❌        │
│   Radiology Reports      │      ✅         │      ❌        │      ❌        │
│                                                                             │
│   KEY: Nurses can VIEW all clinical documentation but only ADD/EDIT        │
│        their own nursing notes and vital signs records.                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How Nurses Access Doctor's Instructions

#### Option 1: Encounter Detail View (Recommended)

When a nurse clicks on a patient from the queue or care records, they should see:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ENCOUNTER DETAIL VIEW - Patient: John Doe (ENC-2024-001234)               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────────┐  │
│  │ PATIENT INFO    │  │ LATEST DOCTOR'S NOTES (Read-Only)               │  │
│  │                 │  │                                                  │  │
│  │ Age: 45 yrs     │  │ Date: 31 Dec 2024, 10:30 AM                     │  │
│  │ Gender: Male    │  │ Doctor: Dr. Ama Mensah                          │  │
│  │ Blood Type: O+  │  │                                                  │  │
│  │ Allergies: None │  │ Assessment:                                      │  │
│  │                 │  │ Patient presents with controlled hypertension.   │  │
│  └─────────────────┘  │                                                  │  │
│                       │ Plan:                                            │  │
│  ┌─────────────────┐  │ 1. Continue Amlodipine 5mg daily                │  │
│  │ VITALS HISTORY  │  │ 2. Monitor BP every 4 hours                     │  │
│  │                 │  │ 3. Notify if SBP > 160 or DBP > 100             │  │
│  │ Current:        │  │ 4. Low sodium diet                              │  │
│  │ BP: 145/90      │  │                                                  │  │
│  │ Pulse: 78       │  │ [Requires Nurse Follow-up ⚠️]                    │  │
│  │ Temp: 36.8°C    │  └─────────────────────────────────────────────────┘  │
│  │                 │                                                       │
│  │ Previous:       │  ┌─────────────────────────────────────────────────┐  │
│  │ [See History]   │  │ NURSING NOTES                         [+ Add]   │  │
│  └─────────────────┘  │                                                  │  │
│                       │ 31 Dec 2024, 14:00 - Shift Report (Afternoon)   │  │
│  [Record Vitals]      │ BP monitored. Patient resting comfortably.      │  │
│  [Add Nursing Note]   │                                                  │  │
│                       │ 31 Dec 2024, 10:45 - Medication Administration  │  │
│                       │ Amlodipine 5mg given as per doctor's orders.    │  │
│                       └─────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Option 2: "Doctor's Orders" Section in Nursing Module

Add a dedicated section showing active doctor's orders that require nursing action:

```typescript
// Example: Doctor's Orders Component for Nursing Module
interface DoctorsOrder {
  order_id: string;
  encounter_id: string;
  patient_name: string;
  order_type: 'medication' | 'monitoring' | 'procedure' | 'diet';
  instruction: string;
  frequency: string;
  ordered_by: string;
  ordered_at: string;
  status: 'pending' | 'in_progress' | 'completed';
}
```

#### Option 3: "Requires Nurse Review" Flag

The existing `requires_doctor_review` field in nursing notes has a counterpart:
- Doctors can flag consultations/orders as `requires_nurse_followup`
- Nurses see these flagged items in their dashboard

---

## ⏱️ Handling Long-Duration Encounters

### The Challenge

In many healthcare settings, encounters don't end in a single day:

| Encounter Type | Typical Duration | Example |
|----------------|------------------|---------|
| Outpatient | 1-4 hours | Regular clinic visit |
| Emergency | 4-24 hours | ER visit with observation |
| Day Case | 1 day | Minor surgery |
| **Inpatient** | **1-30+ days** | **Admission for treatment** |
| **Chronic Care** | **Ongoing** | **Dialysis, chemotherapy** |

### Recommended Architecture: Episodes of Care

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EPISODE-BASED ENCOUNTER MODEL                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PATIENT                                                                   │
│       │                                                                     │
│       └── EPISODE OF CARE (Long-term care period)                          │
│               │   • admission_date, discharge_date                         │
│               │   • episode_type: 'inpatient', 'outpatient', 'emergency'   │
│               │   • status: 'active', 'discharged', 'transferred'          │
│               │                                                             │
│               ├── Encounter Day 1                                          │
│               │       ├── Morning Vitals                                   │
│               │       ├── Doctor Round Notes                               │
│               │       ├── Nursing Shift Reports (Day, Evening, Night)      │
│               │       └── Medications Administered                          │
│               │                                                             │
│               ├── Encounter Day 2                                          │
│               │       ├── Morning Vitals                                   │
│               │       ├── Lab Results Review                               │
│               │       ├── Treatment Adjustments                            │
│               │       └── Nursing Shift Reports                             │
│               │                                                             │
│               └── Encounter Day N... (until discharge)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Options

#### Option A: Extended Encounter (Current System - Recommended Short-term)

Keep the current encounter model but:
- Allow encounters to remain `Active` for extended periods
- Add daily **Progress Notes** within the same encounter
- Track **Shift Handovers** within nursing notes

```sql
-- Encounters can have expected duration
ALTER TABLE visits ADD COLUMN IF NOT EXISTS expected_duration_days INTEGER DEFAULT 1;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS encounter_category VARCHAR(20) DEFAULT 'outpatient';
-- Values: 'outpatient', 'inpatient', 'emergency', 'day_case'
```

#### Option B: Episodes with Sub-Encounters (Long-term Solution)

Create a parent-child relationship:

```sql
-- New table for Episodes of Care
CREATE TABLE episodes_of_care (
    episode_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(patient_id) NOT NULL,
    episode_type VARCHAR(20) NOT NULL, -- 'inpatient', 'outpatient_series', 'chronic_care'
    admission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_discharge_date DATE,
    actual_discharge_date TIMESTAMPTZ,
    primary_diagnosis TEXT,
    attending_physician UUID REFERENCES staff(id),
    ward_bed VARCHAR(50), -- For inpatient
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'discharged', 'transferred', 'deceased'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

-- Link encounters to episodes
ALTER TABLE visits ADD COLUMN IF NOT EXISTS episode_id UUID REFERENCES episodes_of_care(episode_id);
```

### Daily Progress Notes Pattern

For long-term encounters, implement **Daily Progress Notes**:

```typescript
interface DailyProgressNote {
  progress_id: string;
  encounter_id: string;
  patient_id: string;
  note_date: string; // Date of the progress note
  
  // Clinical Summary
  subjective: string;     // Patient's reported symptoms
  objective: string;      // Clinical findings
  assessment: string;     // Doctor's assessment
  plan: string;           // Treatment plan updates
  
  // Nursing Summary
  nursing_summary: string;
  vital_signs_summary: string;
  intake_output: {
    oral_intake_ml: number;
    iv_intake_ml: number;
    urine_output_ml: number;
    other_output_ml: number;
  };
  
  // Recorded by
  recorded_by: string;
  recorded_at: string;
}
```

### Shift Handover Documentation

For nursing continuity across shifts:

```typescript
interface ShiftHandover {
  handover_id: string;
  encounter_id: string;
  patient_id: string;
  
  outgoing_shift: 'morning' | 'afternoon' | 'night';
  incoming_shift: 'morning' | 'afternoon' | 'night';
  
  patient_status: string;           // Current condition
  pending_tasks: string[];          // Tasks to complete
  special_instructions: string;     // Critical information
  medication_due: string[];         // Upcoming medications
  investigations_pending: string[]; // Labs, radiology awaiting
  
  outgoing_nurse_id: string;
  incoming_nurse_id: string;
  handover_time: string;
}
```

---

## ✅ Standard EMR Best Practices

### 1. Encounter-Centric Data Model

**Rule**: All clinical data MUST be linked to an encounter.

```typescript
// ✅ Correct
const nursingNote = {
  patient_id: 'xxx',
  encounter_id: 'yyy', // REQUIRED
  note_type: 'shift_report',
  content: '...',
};

// ❌ Wrong - Missing encounter_id
const nursingNote = {
  patient_id: 'xxx',
  content: '...',
};
```

### 2. Role-Based Access Control

| Role | View | Create | Edit Own | Edit Others | Delete |
|------|------|--------|----------|-------------|--------|
| Nurse | ✅ | ✅ | ✅ | ❌ | ❌* |
| Doctor | ✅ | ✅ | ✅ | ❌ | ❌* |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

*Soft delete with audit trail only

### 3. Audit Trail

Every clinical action must be logged:

```typescript
interface AuditEntry {
  action: 'CREATE' | 'UPDATE' | 'VIEW' | 'DELETE';
  entity_type: 'nursing_care' | 'nursing_notes' | 'consultation';
  entity_id: string;
  encounter_id: string;
  patient_id: string;
  performed_by: string;
  performed_at: string;
  changes?: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
}
```

### 4. Clinical Note Signing

Notes should be "signed" (locked) after completion:

```typescript
interface SignedNote {
  note_id: string;
  signed_by: string;
  signed_at: string;
  is_locked: boolean; // Once signed, cannot be edited
  
  // Amendments must be addendums, not edits
  addendums?: {
    content: string;
    added_by: string;
    added_at: string;
  }[];
}
```

### 5. Real-Time Notifications

Critical updates should trigger notifications:

- Doctor adds order → Nurse gets notification
- Nurse flags critical vital → Doctor gets notification
- Lab results ready → Doctor & Nurse get notification

---

## 📋 Implementation Plan

### Phase 1: Fix Current Edit Functionality (Immediate) ✅ COMPLETED

1. ✅ **Update `handleEditRecord`** in nursing module to properly open form with record data
2. ✅ **Pass `editingRecord`** prop to `NursingCareForm`
3. ✅ **Update form** to populate fields when editing

### Phase 2: Add Doctor's Notes View for Nurses (Week 1) ✅ COMPLETED

1. ✅ Created `DoctorNotesPanel` component (read-only)
2. ✅ Added "Doctor's Notes" tab to nursing module
3. ✅ Shows consultations, treatment plans, and medication orders

### Phase 3: Database Schema for Extended Encounters ✅ COMPLETED

Created migration `048_extended_encounters_nursing_workflow.sql` with:
1. ✅ Extended `visits` table with encounter category and inpatient fields
2. ✅ Created `daily_progress_notes` table for long-term encounters
3. ✅ Created `shift_handovers` table for nursing continuity
4. ✅ Created `doctor_orders` table for nursing action items
5. ✅ Added `requires_nurse_followup` to consultations

### Phase 4: Implement Daily Progress Notes ✅ COMPLETED

1. ✅ Created `DailyProgressNotes.tsx` component with SOAP format
2. ✅ Intake/Output tracking tied to encounter_id
3. ✅ Patient condition summary with mandatory encounter reference
4. ✅ Added "Progress Notes" tab in nursing module
5. ✅ All data requires encounter_id before saving

### Phase 5: Shift Handover Feature ✅ COMPLETED

1. ✅ Created `ShiftHandoverTab.tsx` component
2. ✅ Comprehensive handover form with encounter_id validation
3. ✅ Pending tasks, medication due, IV access tracking
4. ✅ Acknowledgment workflow for incoming nurse
5. ✅ Added "Shift Handover" tab in nursing module

### Phase 6: Episode of Care (Month 2) - PENDING

1. Design and create `episodes_of_care` table
2. Link encounters to episodes
3. Add episode management UI

---

## 🔧 Quick Reference: File Locations

| Feature | File Path |
|---------|-----------|
| Nursing Module Index | `src/renderer/modules/nursing/index.tsx` |
| Nursing Care List | `src/renderer/modules/nursing/components/NursingCareList.tsx` |
| Nursing Care Form | `src/renderer/modules/nursing/components/NursingCareForm.tsx` |
| Nursing Notes Tab | `src/renderer/modules/nursing/components/NursingNotesTab.tsx` |
| **Doctor Notes Panel** | `src/renderer/modules/nursing/components/DoctorNotesPanel.tsx` |
| **Daily Progress Notes** | `src/renderer/modules/nursing/components/DailyProgressNotes.tsx` |
| **Shift Handover** | `src/renderer/modules/nursing/components/ShiftHandoverTab.tsx` |
| Nursing API | `src/renderer/modules/nursing/api/nursing.api.ts` |
| Encounter Architecture | `docs/ENCOUNTER_CENTRIC_ARCHITECTURE.md` |
| **Extended Encounters Migration** | `migrations/048_extended_encounters_nursing_workflow.sql` |

---

## 📝 Summary

1. **Edit Button** → Opens form to modify existing vital signs record
2. **Nurses View Doctor's Notes** → Read-only access via Encounter Detail View
3. **Long Encounters** → Use daily progress notes within extended encounters
4. **Best Practice** → Everything linked to encounter, audit everything, role-based access

This ensures NDC EMR follows industry standards while providing practical workflows for hospital staff.
