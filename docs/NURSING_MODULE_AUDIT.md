# NDC Medical Centre EMR - Nursing Module Comprehensive Audit

## 📋 Document Overview

**Date:** January 2025  
**Scope:** Comprehensive audit of the Nursing Module workflow, integration with doctor notes, ward rounds, orders, and nursing reports.  
**Purpose:** Align nursing workflows with hospital-grade EMR standards.

---

# PART 1: WORKFLOW AUDIT

## 1.1 Current Implementation Summary

### Module Structure

```
src/renderer/modules/nursing/
├── api/
│   └── nursing.api.ts          # 1742 lines - vitals, queue, consulted patients
├── components/
│   ├── DailyProgressNotes.tsx  # 966 lines - I/O tracking, daily notes
│   ├── DoctorNotesPanel.tsx    # Read-only doctor notes view
│   ├── NursingCareForm.tsx     # Vitals/care recording
│   ├── NursingCareList.tsx     # Care records list
│   ├── NursingNotesTab.tsx     # 809 lines - nursing reports
│   ├── ShiftHandoverTab.tsx    # 1166 lines - shift handover
│   ├── TreatmentPlanTab.tsx    # 568 lines - treatment plan execution
│   └── TriageForm.tsx          # Triage form
├── dtos/
│   └── nursing.dto.ts          # Data transfer objects
├── hooks/
│   └── useNursing.ts           # React Query hooks
└── index.tsx                   # 1213 lines - Main module with 7 tabs
```

### Current Tabs (nursing/index.tsx)

| Tab | Purpose | Status |
|-----|---------|--------|
| **Patient Queue** | OPD patients waiting for vitals | ✅ Working |
| **Care Records** | Vitals history (all patients) | ✅ Working |
| **Doctor's Notes** | Read-only doctor consultations | ✅ Working |
| **Treatment Plans** | View & execute doctor's plans | ✅ Working |
| **Progress Notes** | Daily progress (inpatient) | ✅ Working |
| **Shift Handover** | Shift-to-shift continuity | ✅ Working |
| **Nursing Reports** | General nursing documentation | ✅ Working |

---

## 1.2 Current State vs Standard EMR Comparison

### 🔴 CRITICAL GAPS

| Area | Standard EMR | NDC EMR Current | Gap Analysis |
|------|-------------|-----------------|--------------|
| **OPD/IPD Separation** | Distinct workflows for OPD (triage) vs IPD (ward nursing) | Single nursing module handles both | ⚠️ Major: No admission-based context |
| **Nursing Admission Assessment** | Full nursing assessment on admission | Not implemented | ❌ Missing: No admission assessment form |
| **MAR (Medication Administration Record)** | Real-time med administration tracking | Not implemented | ❌ Missing: No MAR system |
| **Intake/Output Charts** | Dedicated I/O flowsheets | Partial (in DailyProgressNotes) | ⚠️ Incomplete: Not a proper flowsheet |
| **Ward Round Participation** | Nurses participate & receive orders | Doctor-only (ward_round_notes) | ⚠️ Gap: No nursing access to ward rounds |
| **Doctor Orders → Nursing** | Real-time order notification | No order routing to nurses | ❌ Missing: No orders acknowledgment |
| **Admission-Based Documentation** | All IPD notes link to admission | Uses encounter_id only | ⚠️ Architecture gap |

### 🟡 PARTIAL IMPLEMENTATIONS

| Feature | Current State | Standard | Gap |
|---------|--------------|----------|-----|
| Shift Handover | ✅ Implemented via encounter | Should link to admission | Links via encounter, not admission |
| Vitals | ✅ Full vital signs | Should have trend alerts | No critical value alerts |
| Treatment Plans | ✅ View & execute | Should auto-notify | Manual viewing only |
| Progress Notes | ✅ SOAP + I/O | Should be per-shift | Per-day, not per-shift |

### 🟢 WELL IMPLEMENTED

| Feature | Current Implementation | Notes |
|---------|----------------------|-------|
| Vitals Recording | Full vitals with BMI calculation | Comprehensive |
| Queue Management | Priority-based patient queue | Emergency/Urgent/Normal |
| Doctor Notes View | Read-only SOAP, orders, prescriptions | Proper access control |
| Shift Types | Morning/Afternoon/Night | Configurable |
| Handover Acknowledgment | Boolean + timestamp | Auditable |

---

## 1.3 Database Schema Analysis

### Existing Tables (Relevant to Nursing)

```sql
-- VITALS TABLE (nursing.api.ts)
vitals (
    id, encounter_id, patient_id,
    temperature, blood_pressure, pulse, respiratory_rate, oxygen_saturation,
    weight, height, bmi, blood_glucose, pain_level,
    nurse_id, date_recorded, notes, is_critical
)

-- NURSING NOTES (nursing_notes table)
nursing_notes (
    id, encounter_id, patient_id,
    note_type, title, content,
    patient_condition, pain_level,
    interventions_performed, patient_response,
    follow_up_required, follow_up_notes,
    recorded_by, shift, is_critical, requires_doctor_review
)

-- SHIFT HANDOVERS
shift_handovers (
    handover_id, encounter_id, patient_id,
    outgoing_shift, incoming_shift,
    patient_status, consciousness_level, mobility_status,
    pending_tasks[], medication_due[], investigations_pending[],
    last_vitals, vitals_trend,
    iv_access[], drains_catheters[],
    diet_type, feeding_route,
    outgoing_nurse_id, incoming_nurse_id,
    is_acknowledged, acknowledged_at
)

-- DAILY PROGRESS NOTES
daily_progress_notes (
    progress_id, encounter_id, patient_id,
    note_date,
    subjective, objective, assessment, plan,  -- SOAP
    nursing_summary, vital_signs_summary,
    oral_intake_ml, iv_intake_ml, urine_output_ml, other_output_ml, io_notes,
    patient_condition, alert_level
)

-- WARD ROUND NOTES (in-patient module)
ward_round_notes (
    id, admission_id, encounter_id,
    round_date, round_type,
    subjective_notes, objective_findings, vital_signs, assessment, plan,
    new_orders[], discontinued_orders[],
    nursing_instructions,  -- ⬅️ Instructions for nurses
    patient_condition, estimated_discharge_date,
    attending_physician_id, participants[]
)

-- TREATMENT PLANS
treatment_plans (
    id, encounter_id, patient_id, consultation_id,
    title, description, instructions,
    status, viewed_by, viewed_at,
    completed_by, completed_at
)

-- TREATMENT TASKS
treatment_tasks (
    id, plan_id, encounter_id, patient_id,
    task_type, description, status,
    scheduled_at, completed_at, completed_by,
    notes, result_value
)

-- ADMISSIONS (in-patient module)
admissions (
    id, facility_id, patient_id, encounter_id,
    admission_number, admission_date, expected_discharge_date,
    current_ward_id, current_bed_id,
    attending_physician_id, primary_nurse_id,
    admission_status, acuity_level,
    allergies_snapshot, alerts,
    diet_type, activity_level, mobility_status
)
```

### Missing Tables (Standard EMR)

```sql
-- ❌ NOT IMPLEMENTED: Nursing Admission Assessment
nursing_admission_assessment (
    id, admission_id, patient_id,
    assessment_date,
    -- Skin assessment
    skin_integrity, pressure_ulcer_risk_score, existing_wounds,
    -- Pain assessment
    pain_present, pain_location, pain_intensity, pain_character,
    -- Fall risk
    fall_risk_score, fall_precautions_needed,
    -- Nutrition
    nutritional_status, weight_on_admission, height, bmi,
    -- Functional status
    adl_status, mobility_status, continence_status,
    -- Psychosocial
    mental_status, orientation, anxiety_level,
    -- Discharge planning
    living_situation, support_system, anticipated_needs,
    assessed_by, assessment_time
)

-- ❌ NOT IMPLEMENTED: Medication Administration Record
medication_administration_record (
    id, admission_id, prescription_id, patient_id,
    medication_name, dose, route, frequency,
    scheduled_time, actual_administration_time,
    administered_by, witnessed_by,
    status, -- given, held, refused, not_available
    hold_reason, refusal_reason,
    patient_response, adverse_reactions,
    vital_signs_before, vital_signs_after
)

-- ❌ NOT IMPLEMENTED: Intake/Output Flowsheet
intake_output_flowsheet (
    id, admission_id, patient_id, shift_date,
    shift, -- morning, afternoon, night
    -- Intake
    oral_intake_ml, iv_fluids_ml, blood_products_ml, tube_feeding_ml,
    -- Output
    urine_output_ml, stool_output_ml, ng_drainage_ml, wound_drainage_ml, other_output_ml,
    -- Balance
    total_intake_ml, total_output_ml, fluid_balance_ml,
    recorded_by, recorded_at
)

-- ❌ NOT IMPLEMENTED: Doctor Orders Queue
nursing_orders_queue (
    id, order_id, admission_id, patient_id,
    order_type, -- medication, lab, procedure, nursing_care
    instruction,
    priority, -- stat, urgent, routine
    status, -- pending, acknowledged, in_progress, completed
    ordered_by, ordered_at,
    acknowledged_by, acknowledged_at,
    completed_by, completed_at,
    notes
)
```

---

## 1.4 Workflow Flow Analysis

### Current OPD Nursing Flow (Working)

```
┌─────────────────────────────────────────────────────────────────┐
│                     OPD NURSING FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Registration → Payment → Nursing Queue → Record Vitals →      │
│                                                                 │
│  → Auto-route to Doctor Queue → Consultation                    │
│                                                                 │
│  ✅ STATUS: FULLY IMPLEMENTED                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Current IPD Nursing Flow (Gaps Identified)

```
┌─────────────────────────────────────────────────────────────────┐
│                   CURRENT IPD NURSING FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admission Created (In-Patient Module)                          │
│         │                                                       │
│         ▼                                                       │
│  ❌ NO Nursing Admission Assessment                             │
│         │                                                       │
│         ▼                                                       │
│  Ward Round (Doctor Only) → nursing_instructions field          │
│         │                                                       │
│         ❌ NO automatic routing to nurses                       │
│         │                                                       │
│         ▼                                                       │
│  Manual: Nurse checks "Nursing Reports" tab                     │
│         │                                                       │
│         ▼                                                       │
│  Record Progress Notes (via encounter_id, not admission_id)     │
│         │                                                       │
│         ▼                                                       │
│  Shift Handover (via encounter_id, not admission_id)            │
│         │                                                       │
│         ▼                                                       │
│  ❌ NO MAR (manual prescription checking)                       │
│         │                                                       │
│         ▼                                                       │
│  Discharge (In-Patient Module) → Nursing checklist              │
│                                                                 │
│  ⚠️ STATUS: PARTIALLY IMPLEMENTED - Major gaps                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Standard EMR IPD Nursing Flow (Target)

```
┌─────────────────────────────────────────────────────────────────┐
│                   STANDARD IPD NURSING FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ADMISSION PHASE                                             │
│     ├─ Patient Admitted (admission record created)              │
│     ├─ ➡️ NURSING ADMISSION ASSESSMENT (Trigger)               │
│     │     • Skin/wound assessment                               │
│     │     • Fall risk (Morse scale)                             │
│     │     • Pressure ulcer risk (Braden scale)                  │
│     │     • Pain assessment                                     │
│     │     • Nutritional screening                               │
│     │     • Psychosocial assessment                             │
│     │     • ADL/functional status                               │
│     │     • Discharge planning initiation                       │
│     └─ Initial Care Plan Generated                              │
│                                                                 │
│  2. DAILY CARE CYCLE                                            │
│     ├─ SHIFT START                                              │
│     │     • Review incoming handover                            │
│     │     • Acknowledge pending orders                          │
│     │     • Check MAR for upcoming meds                         │
│     │                                                           │
│     ├─ WARD ROUND                                               │
│     │     • Doctor conducts round                               │
│     │     • ➡️ NURSING INSTRUCTIONS auto-routed to nurse       │
│     │     • ➡️ NEW ORDERS auto-queued for acknowledgment       │
│     │                                                           │
│     ├─ ONGOING CARE                                             │
│     │     • Execute orders from queue                           │
│     │     • Administer medications (MAR)                        │
│     │     • Record vitals (per-shift)                           │
│     │     • I/O charting (hourly for ICU, per-shift others)    │
│     │     • Progress notes (per-shift)                          │
│     │                                                           │
│     └─ SHIFT END                                                │
│           • Complete shift handover                             │
│           • Document pending items                              │
│           • Incoming nurse acknowledges                         │
│                                                                 │
│  3. DISCHARGE PHASE                                             │
│     ├─ Discharge order from doctor                              │
│     ├─ ➡️ DISCHARGE CHECKLIST triggered                        │
│     │     • Final nursing assessment                            │
│     │     • Remove IV/lines                                     │
│     │     • Patient education documented                        │
│     │     • Medications reconciliation                          │
│     └─ Sign-off complete                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1.5 Integration Gap Summary

### 1. Doctor Notes → Nursing (Current: Read-Only)

**Current:**
- Nurses can VIEW doctor's consultations via DoctorNotesPanel
- No notification when new notes/orders are created
- Manual refresh required

**Standard:**
- Real-time notification of new orders
- Order acknowledgment workflow
- Escalation path for urgent orders

### 2. Ward Rounds → Nursing (Current: Disconnected)

**Current:**
- Ward rounds are documented in `ward_round_notes` table
- Has `nursing_instructions` field but...
- Nurses have NO access to ward round notes
- Must check via "Doctor's Notes" which shows consultations, not ward rounds

**Standard:**
- Ward round notes visible to ward nurses
- Nursing instructions pushed as actionable orders
- Automatic handover inclusion

### 3. Admission → Nursing (Current: No Direct Link)

**Current:**
- Nursing components use `encounter_id` only
- No `admission_id` in nursing_notes, shift_handovers, or daily_progress_notes
- Admission has `primary_nurse_id` but no auto-assignment workflow

**Standard:**
- All IPD nursing documentation links to admission
- Auto-assign primary nurse triggers admission assessment
- Care continuity through admission lifecycle

### 4. Prescriptions → Nursing MAR (Current: Not Implemented)

**Current:**
- Prescriptions go to Pharmacy for dispensing
- Once dispensed, no tracking of administration
- Nurses cannot document medication administration

**Standard:**
- MAR auto-populated from active prescriptions
- Scheduled administration times
- Administration documentation with witness
- Missed dose alerts

---

# PART 2: IMPLEMENTATION PLAN

## 2.1 Phase 1: Database Schema Enhancements

### Priority: HIGH - New Tables Required

```sql
-- 1. Nursing Admission Assessment Table
CREATE TABLE IF NOT EXISTS nursing_admission_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id),
    
    -- Assessment timestamp
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Skin Assessment
    skin_integrity VARCHAR(50), -- intact, impaired, wound_present
    pressure_ulcer_risk_score INTEGER, -- Braden scale (6-23)
    pressure_ulcer_risk_level VARCHAR(20), -- low, moderate, high, very_high
    existing_wounds JSONB DEFAULT '[]', -- [{location, type, size, stage}]
    
    -- Pain Assessment
    pain_present BOOLEAN DEFAULT FALSE,
    pain_location TEXT,
    pain_intensity INTEGER CHECK (pain_intensity >= 0 AND pain_intensity <= 10),
    pain_character VARCHAR(100), -- sharp, dull, burning, etc.
    pain_management_goal INTEGER,
    
    -- Fall Risk Assessment
    fall_risk_score INTEGER, -- Morse scale (0-125)
    fall_risk_level VARCHAR(20), -- low, moderate, high
    fall_precautions_needed JSONB DEFAULT '[]', -- [bed_alarm, non_slip, etc.]
    
    -- Nutritional Assessment
    nutritional_status VARCHAR(50),
    nutritional_risk_score INTEGER, -- MUST score
    weight_on_admission DECIMAL(5,2),
    height_on_admission DECIMAL(5,2),
    bmi_on_admission DECIMAL(5,2),
    diet_restrictions JSONB DEFAULT '[]',
    swallowing_difficulty BOOLEAN DEFAULT FALSE,
    
    -- Functional Status
    adl_status VARCHAR(50), -- independent, partial_assist, total_assist
    mobility_status VARCHAR(50),
    assistive_devices JSONB DEFAULT '[]',
    continence_status VARCHAR(50),
    
    -- Psychosocial
    mental_status VARCHAR(50),
    orientation VARCHAR(100), -- person, place, time, situation
    anxiety_level VARCHAR(20),
    depression_screen_positive BOOLEAN DEFAULT FALSE,
    language_barriers TEXT,
    cultural_considerations TEXT,
    
    -- Discharge Planning
    living_situation VARCHAR(100),
    primary_caregiver TEXT,
    support_system TEXT,
    anticipated_discharge_needs JSONB DEFAULT '[]',
    barriers_to_discharge TEXT,
    
    -- Allergies/Alerts (captured at admission)
    allergies_verified BOOLEAN DEFAULT FALSE,
    medication_reconciliation_done BOOLEAN DEFAULT FALSE,
    advance_directives_on_file BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    assessed_by UUID NOT NULL REFERENCES staff(id),
    assessment_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Medication Administration Record Table
CREATE TABLE IF NOT EXISTS medication_administration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES prescriptions(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id),
    
    -- Medication details (denormalized for audit)
    medication_name VARCHAR(255) NOT NULL,
    dose VARCHAR(100) NOT NULL,
    dose_unit VARCHAR(50),
    route VARCHAR(50) NOT NULL,
    frequency VARCHAR(100),
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    actual_administration_time TIMESTAMPTZ,
    
    -- Administration details
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled', 
    -- scheduled, given, held, refused, not_available, self_administered
    administered_by UUID REFERENCES staff(id),
    witnessed_by UUID REFERENCES staff(id),
    
    -- If not given
    hold_reason TEXT,
    refusal_reason TEXT,
    
    -- Response tracking
    patient_response TEXT,
    adverse_reactions TEXT,
    vital_signs_before JSONB,
    vital_signs_after JSONB,
    
    -- PRN specific
    is_prn BOOLEAN DEFAULT FALSE,
    prn_indication TEXT,
    prn_effectiveness VARCHAR(50),
    
    -- High-alert medication
    is_high_alert BOOLEAN DEFAULT FALSE,
    double_check_required BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Intake/Output Flowsheet Table
CREATE TABLE IF NOT EXISTS intake_output_flowsheet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id),
    
    -- Recording period
    recording_date DATE NOT NULL,
    shift VARCHAR(20) NOT NULL, -- morning, afternoon, night
    hour_block INTEGER, -- 0-23 for hourly ICU charting
    
    -- Intake
    oral_intake_ml INTEGER DEFAULT 0,
    iv_fluids_ml INTEGER DEFAULT 0,
    blood_products_ml INTEGER DEFAULT 0,
    tube_feeding_ml INTEGER DEFAULT 0,
    other_intake_ml INTEGER DEFAULT 0,
    intake_notes TEXT,
    
    -- Output
    urine_output_ml INTEGER DEFAULT 0,
    urine_characteristics VARCHAR(100), -- clear, cloudy, bloody, etc.
    stool_output_ml INTEGER DEFAULT 0,
    stool_characteristics VARCHAR(100),
    ng_drainage_ml INTEGER DEFAULT 0,
    wound_drainage_ml INTEGER DEFAULT 0,
    chest_tube_ml INTEGER DEFAULT 0,
    other_output_ml INTEGER DEFAULT 0,
    output_notes TEXT,
    
    -- Calculated totals (can be computed or stored)
    total_intake_ml INTEGER GENERATED ALWAYS AS (
        oral_intake_ml + iv_fluids_ml + blood_products_ml + 
        tube_feeding_ml + other_intake_ml
    ) STORED,
    total_output_ml INTEGER GENERATED ALWAYS AS (
        urine_output_ml + stool_output_ml + ng_drainage_ml + 
        wound_drainage_ml + chest_tube_ml + other_output_ml
    ) STORED,
    
    -- Metadata
    recorded_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(admission_id, recording_date, shift, hour_block)
);

-- 4. Nursing Orders Queue Table
CREATE TABLE IF NOT EXISTS nursing_orders_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id),
    
    -- Source of order
    source_type VARCHAR(50) NOT NULL, -- ward_round, consultation, prescription, direct
    source_id UUID, -- Reference to source record
    ward_round_note_id UUID REFERENCES ward_round_notes(id),
    
    -- Order details
    order_type VARCHAR(50) NOT NULL, -- medication, lab, procedure, nursing_care, diet, activity, monitoring
    instruction TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'routine', -- stat, urgent, routine
    frequency VARCHAR(100),
    duration TEXT,
    
    -- Status tracking
    status VARCHAR(30) DEFAULT 'pending', 
    -- pending, acknowledged, in_progress, completed, cancelled
    
    -- Ordering info
    ordered_by UUID NOT NULL REFERENCES staff(id),
    ordered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Acknowledgment
    acknowledged_by UUID REFERENCES staff(id),
    acknowledged_at TIMESTAMPTZ,
    
    -- Completion
    completed_by UUID REFERENCES staff(id),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_nursing_admission_assessment_admission ON nursing_admission_assessments(admission_id);
CREATE INDEX idx_mar_admission ON medication_administration_records(admission_id);
CREATE INDEX idx_mar_scheduled ON medication_administration_records(scheduled_date, scheduled_time);
CREATE INDEX idx_mar_status ON medication_administration_records(status) WHERE status = 'scheduled';
CREATE INDEX idx_io_admission ON intake_output_flowsheet(admission_id);
CREATE INDEX idx_io_date ON intake_output_flowsheet(recording_date DESC);
CREATE INDEX idx_nursing_orders_admission ON nursing_orders_queue(admission_id);
CREATE INDEX idx_nursing_orders_pending ON nursing_orders_queue(status) WHERE status IN ('pending', 'acknowledged');
```

### Priority: MEDIUM - Schema Modifications

```sql
-- Add admission_id to existing tables for IPD context
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES admissions(id);
ALTER TABLE daily_progress_notes ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES admissions(id);
ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES admissions(id);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES admissions(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shift_handovers_admission ON shift_handovers(admission_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_admission ON daily_progress_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_admission ON nursing_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_vitals_admission ON vitals(admission_id);
```

---

## 2.2 Phase 2: API Layer Enhancements

### New API Files Required

```typescript
// src/renderer/modules/nursing/api/nursing-ipd.api.ts
// IPD-specific nursing functions

// 1. Nursing Admission Assessment API
export async function createNursingAdmissionAssessment(
  admissionId: string,
  assessmentData: CreateNursingAssessmentDTO,
  userId: string
): Promise<NursingAdmissionAssessment>;

export async function getNursingAdmissionAssessment(
  admissionId: string
): Promise<NursingAdmissionAssessment | null>;

export async function updateNursingAdmissionAssessment(
  assessmentId: string,
  updates: Partial<CreateNursingAssessmentDTO>,
  userId: string
): Promise<NursingAdmissionAssessment>;

// 2. Medication Administration Record API
export async function getMARForAdmission(
  admissionId: string,
  date?: string
): Promise<MAREntry[]>;

export async function getMARSchedule(
  admissionId: string,
  shiftDate: string,
  shift: 'morning' | 'afternoon' | 'night'
): Promise<MAREntry[]>;

export async function recordMedicationAdministration(
  marId: string,
  administrationData: RecordMedicationDTO,
  userId: string
): Promise<MAREntry>;

export async function holdMedication(
  marId: string,
  reason: string,
  userId: string
): Promise<MAREntry>;

// 3. Intake/Output API
export async function getIOForAdmission(
  admissionId: string,
  startDate?: string,
  endDate?: string
): Promise<IOEntry[]>;

export async function recordIntakeOutput(
  admissionId: string,
  ioData: CreateIOEntryDTO,
  userId: string
): Promise<IOEntry>;

export async function getIOSummary(
  admissionId: string,
  date: string
): Promise<IOSummary>;

// 4. Nursing Orders Queue API
export async function getPendingOrdersForNurse(
  wardId: string
): Promise<NursingOrder[]>;

export async function getOrdersForAdmission(
  admissionId: string
): Promise<NursingOrder[]>;

export async function acknowledgeOrder(
  orderId: string,
  userId: string
): Promise<NursingOrder>;

export async function completeOrder(
  orderId: string,
  completionData: CompleteOrderDTO,
  userId: string
): Promise<NursingOrder>;

// 5. Ward Round Integration API
export async function getWardRoundNotesForNursing(
  admissionId: string
): Promise<WardRoundNote[]>;

export async function getNursingInstructionsFromRounds(
  wardId: string,
  date?: string
): Promise<NursingInstruction[]>;
```

### Modifications to Existing APIs

```typescript
// nursing.api.ts - Add admission context
export async function getVitalsForAdmission(
  admissionId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<Vital[]>;

export async function recordVitalsForAdmission(
  admissionId: string,
  vitalsData: CreateVitalsDTO,
  userId: string
): Promise<Vital>;

// Add to shift handover
export async function createShiftHandoverForAdmission(
  admissionId: string,
  handoverData: CreateHandoverDTO,
  userId: string
): Promise<ShiftHandover>;
```

---

## 2.3 Phase 3: Workflow Integrations

### Ward Round → Nursing Orders Flow

```typescript
// When ward round note is created with nursing_instructions:
// 1. Parse nursing_instructions into discrete orders
// 2. Create entries in nursing_orders_queue
// 3. Notify assigned nurses (real-time)

// In ward-rounds.api.ts - Modify createWardRoundNote:
export async function createWardRoundNote(noteData, userId) {
  // ... existing code ...
  
  // NEW: Route nursing instructions to orders queue
  if (noteData.nursing_instructions) {
    await createNursingOrderFromRound(noteData, userId);
  }
  
  // NEW: Route new_orders to appropriate queues
  if (noteData.new_orders?.length > 0) {
    await routeOrdersToQueues(noteData.new_orders, admissionId, userId);
  }
}
```

### Prescription → MAR Flow

```typescript
// When prescription is dispensed:
// 1. Get prescription schedule (frequency, duration)
// 2. Generate MAR entries for admission duration
// 3. Create scheduled administration times

// In pharmacy.api.ts - Modify dispenseMedication:
export async function dispenseMedication(prescriptionId, dispenseData, userId) {
  // ... existing code ...
  
  // NEW: If patient is admitted, generate MAR entries
  const admission = await getActiveAdmissionForPatient(prescriptionId.patient_id);
  if (admission) {
    await generateMAREntries(prescriptionId, admission.id);
  }
}
```

---

# PART 3: UI/UX APPLICATION

## 3.1 Nursing Module Restructure

### New Tab Structure

```
Nursing Module
├── 📋 OPD Queue          (existing - Patient Queue)
├── 📊 Care Records       (existing - vitals history)
├── 🏥 Ward Patients      (NEW - IPD patient list)
│   ├── Admission Assessment
│   ├── Patient Care Plan
│   └── Handover View
├── 💊 MAR               (NEW - Medication Administration)
├── 💧 I/O Charting      (NEW - Intake/Output)
├── 📝 Orders Queue      (NEW - Pending doctor orders)
├── 📄 Ward Rounds       (NEW - View round notes)
├── 🔄 Shift Handover    (existing - enhanced)
├── 📖 Progress Notes    (existing - per-shift)
└── 📁 Reports           (existing - nursing reports)
```

### 3.2 New Components Required

```
src/renderer/modules/nursing/components/
├── ipd/
│   ├── WardPatientsList.tsx         # List admitted patients
│   ├── AdmissionAssessmentForm.tsx  # Full nursing assessment
│   ├── PatientCarePlanView.tsx      # Care plan dashboard
│   └── PatientAdmissionCard.tsx     # Quick view card
├── mar/
│   ├── MARDashboard.tsx             # MAR main view
│   ├── MedicationSchedule.tsx       # Schedule view
│   ├── AdministrationModal.tsx      # Record administration
│   └── MARPrintView.tsx             # Printable MAR
├── io/
│   ├── IOFlowsheet.tsx              # Main I/O charting
│   ├── IOEntryForm.tsx              # Record I/O
│   └── IOSummaryCard.tsx            # Balance summary
├── orders/
│   ├── OrdersQueue.tsx              # Pending orders list
│   ├── OrderAcknowledgeModal.tsx    # Acknowledge order
│   └── OrderCompletionForm.tsx      # Complete order
└── ward-rounds/
    └── WardRoundNotesView.tsx       # View round notes (read-only)
```

### 3.3 Component Specifications

#### WardPatientsList.tsx
```typescript
/**
 * Ward Patients List - IPD Patient Dashboard for Nurses
 * 
 * Features:
 * - Filter by ward
 * - Quick view of patient status
 * - Link to assessment, care plan, MAR, I/O
 * - Priority indicators (fall risk, isolation, etc.)
 */
interface WardPatientsListProps {
  wardId?: string;
  nurseId?: string;
}

// Display columns:
// - Bed # | Patient | Diagnosis | Status | Alerts | Actions
```

#### AdmissionAssessmentForm.tsx
```typescript
/**
 * Nursing Admission Assessment Form
 * 
 * Sections:
 * 1. Skin Assessment (Braden scale)
 * 2. Fall Risk (Morse scale)
 * 3. Pain Assessment
 * 4. Nutritional Screening
 * 5. Functional Status
 * 6. Psychosocial Assessment
 * 7. Discharge Planning
 */
interface AdmissionAssessmentFormProps {
  admissionId: string;
  patientId: string;
  onComplete: () => void;
}
```

#### MARDashboard.tsx
```typescript
/**
 * Medication Administration Record
 * 
 * Views:
 * 1. Current Shift - medications due this shift
 * 2. 24-Hour View - full day schedule
 * 3. Administration History
 * 
 * Actions:
 * - Administer (with witness for controlled)
 * - Hold (with reason)
 * - Refuse (with documentation)
 */
interface MARDashboardProps {
  admissionId: string;
  shift?: 'morning' | 'afternoon' | 'night';
}
```

#### IOFlowsheet.tsx
```typescript
/**
 * Intake/Output Flowsheet
 * 
 * Modes:
 * 1. Per-Shift Entry (general wards)
 * 2. Hourly Entry (ICU)
 * 
 * Calculations:
 * - Running totals per shift
 * - 24-hour totals
 * - Fluid balance
 * - Trend indicators
 */
interface IOFlowsheetProps {
  admissionId: string;
  mode?: 'shift' | 'hourly';
}
```

---

## 3.4 Navigation & Access

### Updated menu.ts Configuration

```typescript
// In src/renderer/config/menu.ts

const nursingMenuItems = [
  {
    id: 'nursing-opd',
    label: 'OPD Nursing',
    icon: 'UserCheck',
    items: [
      { id: 'queue', label: 'Patient Queue', path: '/nursing/queue' },
      { id: 'vitals', label: 'Care Records', path: '/nursing/care-records' },
    ]
  },
  {
    id: 'nursing-ipd',
    label: 'Ward Nursing',
    icon: 'Hospital',
    items: [
      { id: 'ward-patients', label: 'Ward Patients', path: '/nursing/ward-patients' },
      { id: 'mar', label: 'Medication Administration', path: '/nursing/mar' },
      { id: 'io-charting', label: 'I/O Charting', path: '/nursing/io' },
      { id: 'orders', label: 'Orders Queue', path: '/nursing/orders' },
      { id: 'ward-rounds', label: 'Ward Rounds', path: '/nursing/ward-rounds' },
      { id: 'handover', label: 'Shift Handover', path: '/nursing/handover' },
      { id: 'progress-notes', label: 'Progress Notes', path: '/nursing/progress-notes' },
    ]
  },
  {
    id: 'nursing-reports',
    label: 'Reports',
    icon: 'FileText',
    items: [
      { id: 'nursing-reports', label: 'Nursing Reports', path: '/nursing/reports' },
      { id: 'doctor-notes', label: "Doctor's Notes", path: '/nursing/doctor-notes' },
    ]
  }
];
```

---

# PART 4: FINAL OUTPUT - IMPLEMENTATION README

## Gold Standard Nursing Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               NDC Medical Centre EMR - GOLD STANDARD NURSING WORKFLOW             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                        OPD NURSING FLOW                               ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                       ║  │
│  ║  Patient Registration → Payment → [NURSING QUEUE]                     ║  │
│  ║                                       │                               ║  │
│  ║                                       ▼                               ║  │
│  ║                              ┌─────────────────┐                      ║  │
│  ║                              │  RECORD VITALS  │                      ║  │
│  ║                              │  (Triage Form)  │                      ║  │
│  ║                              └────────┬────────┘                      ║  │
│  ║                                       │                               ║  │
│  ║                                       ▼                               ║  │
│  ║                            [AUTO-ROUTE TO DOCTOR]                     ║  │
│  ║                                       │                               ║  │
│  ║                                       ▼                               ║  │
│  ║                              Doctor Consultation                      ║  │
│  ║                                       │                               ║  │
│  ║                    ┌──────────────────┼──────────────────┐            ║  │
│  ║                    ▼                  ▼                  ▼            ║  │
│  ║              [TREATMENT]        [PRESCRIPTIONS]     [LAB/RAD]         ║  │
│  ║                    │                  │                  │            ║  │
│  ║                    ▼                  ▼                  ▼            ║  │
│  ║             Nurse Executes      Pharmacy            Lab/Radiology    ║  │
│  ║                    │                  │                  │            ║  │
│  ║                    └──────────────────┴──────────────────┘            ║  │
│  ║                                       │                               ║  │
│  ║                                       ▼                               ║  │
│  ║                              [PATIENT DISCHARGED]                     ║  │
│  ║                                                                       ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                        IPD NURSING FLOW (NEW)                         ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                       ║  │
│  ║  ADMISSION CREATED                                                    ║  │
│  ║         │                                                             ║  │
│  ║         ▼                                                             ║  │
│  ║  ┌─────────────────────────────────────────────────────────────────┐  ║  │
│  ║  │            NURSING ADMISSION ASSESSMENT (NEW)                   │  ║  │
│  ║  │  • Skin/Wound Assessment (Braden Scale)                         │  ║  │
│  ║  │  • Fall Risk Assessment (Morse Scale)                           │  ║  │
│  ║  │  • Pain Assessment                                              │  ║  │
│  ║  │  • Nutritional Screening                                        │  ║  │
│  ║  │  • Functional Status (ADL)                                      │  ║  │
│  ║  │  • Psychosocial Assessment                                      │  ║  │
│  ║  │  • Discharge Planning Initiation                                │  ║  │
│  ║  └─────────────────────────────────────────────────────────────────┘  ║  │
│  ║         │                                                             ║  │
│  ║         ▼                                                             ║  │
│  ║  ┌─────────────────────────────────────────────────────────────────┐  ║  │
│  ║  │                    DAILY CARE CYCLE                             │  ║  │
│  ║  │                                                                 │  ║  │
│  ║  │  ╭─────────────────────────────────────────────────────────────╮│  ║  │
│  ║  │  │ SHIFT START                                                 ││  ║  │
│  ║  │  │  • Review & Acknowledge Incoming Handover                   ││  ║  │
│  ║  │  │  • Check Pending Orders Queue                               ││  ║  │
│  ║  │  │  • Review MAR for Upcoming Medications                      ││  ║  │
│  ║  │  ╰─────────────────────────────────────────────────────────────╯│  ║  │
│  ║  │                         │                                       │  ║  │
│  ║  │                         ▼                                       │  ║  │
│  ║  │  ╭─────────────────────────────────────────────────────────────╮│  ║  │
│  ║  │  │ WARD ROUND                                                  ││  ║  │
│  ║  │  │  • Doctor Conducts Round                                    ││  ║  │
│  ║  │  │  • ➡️ Nursing Instructions AUTO-ROUTED to Queue            ││  ║  │
│  ║  │  │  • ➡️ New Orders AUTO-QUEUED for Acknowledgment            ││  ║  │
│  ║  │  ╰─────────────────────────────────────────────────────────────╯│  ║  │
│  ║  │                         │                                       │  ║  │
│  ║  │                         ▼                                       │  ║  │
│  ║  │  ╭─────────────────────────────────────────────────────────────╮│  ║  │
│  ║  │  │ ONGOING CARE                                                ││  ║  │
│  ║  │  │  • Execute Orders from Queue                                ││  ║  │
│  ║  │  │  • Administer Medications (MAR)                             ││  ║  │
│  ║  │  │  • Record Vitals (Per-Shift / Hourly ICU)                   ││  ║  │
│  ║  │  │  • I/O Charting (Intake/Output)                             ││  ║  │
│  ║  │  │  • Progress Notes (Per-Shift)                               ││  ║  │
│  ║  │  │  • Care Interventions                                       ││  ║  │
│  ║  │  ╰─────────────────────────────────────────────────────────────╯│  ║  │
│  ║  │                         │                                       │  ║  │
│  ║  │                         ▼                                       │  ║  │
│  ║  │  ╭─────────────────────────────────────────────────────────────╮│  ║  │
│  ║  │  │ SHIFT END                                                   ││  ║  │
│  ║  │  │  • Complete Shift Handover                                  ││  ║  │
│  ║  │  │  • Document Pending Items                                   ││  ║  │
│  ║  │  │  • Incoming Nurse Acknowledges                              ││  ║  │
│  ║  │  ╰─────────────────────────────────────────────────────────────╯│  ║  │
│  ║  │                                                                 │  ║  │
│  ║  │  ⟳ REPEAT DAILY UNTIL DISCHARGE                                │  ║  │
│  ║  │                                                                 │  ║  │
│  ║  └─────────────────────────────────────────────────────────────────┘  ║  │
│  ║         │                                                             ║  │
│  ║         ▼                                                             ║  │
│  ║  ┌─────────────────────────────────────────────────────────────────┐  ║  │
│  ║  │                    DISCHARGE PHASE                              │  ║  │
│  ║  │  • Doctor Issues Discharge Order                                │  ║  │
│  ║  │  • ➡️ Discharge Checklist Triggered                            │  ║  │
│  ║  │  • Final Nursing Assessment                                     │  ║  │
│  ║  │  • Remove IV Lines/Catheters                                    │  ║  │
│  ║  │  • Patient Education Documented                                 │  ║  │
│  ║  │  • Medication Reconciliation                                    │  ║  │
│  ║  │  • Nursing Sign-Off Complete                                    │  ║  │
│  ║  └─────────────────────────────────────────────────────────────────┘  ║  │
│  ║                                                                       ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority Matrix

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 HIGH | Nursing Admission Assessment | Medium | Critical for IPD |
| 🔴 HIGH | MAR (Medication Administration) | High | Patient safety |
| 🔴 HIGH | Nursing Orders Queue | Medium | Workflow efficiency |
| 🟠 MEDIUM | I/O Flowsheet | Medium | Clinical documentation |
| 🟠 MEDIUM | Ward Round Notes Access | Low | Information flow |
| 🟢 LOW | Add admission_id to existing tables | Low | Data integrity |

---

## Summary

### Current State
- ✅ OPD nursing workflow fully functional
- ✅ Basic vitals, shift handover, progress notes implemented
- ⚠️ IPD workflow disconnected from admissions
- ❌ No nursing admission assessment
- ❌ No MAR system
- ❌ No orders routing from doctors to nurses

### Target State
- Unified nursing module with OPD and IPD separation
- Full nursing admission assessment on patient admit
- MAR system integrated with pharmacy dispensing
- Real-time order routing from ward rounds to nursing queue
- Proper I/O charting with fluid balance calculations
- All IPD documentation linked to admission record

### Estimated Implementation Timeline
- Phase 1 (Database): 1-2 weeks
- Phase 2 (API): 2-3 weeks
- Phase 3 (UI Components): 3-4 weeks
- Phase 4 (Integration & Testing): 2-3 weeks
- **Total: 8-12 weeks**

---

*Document generated as part of NDC Medical Centre EMR nursing module audit.*
