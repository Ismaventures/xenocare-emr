# A&E (Accident & Emergency) Module — Execution Plan

> **Non-negotiable rule**: A&E is NOT a separate visit system. It is a `visit_type = 'A&E'` workflow
> that attaches to the **existing Encounter module** using the same `visits.id` (encounter_id) and
> the same encounter lifecycle already in place.

---

## 1. Current EMR Architecture Summary

### 1.1 Encounter / Visits Table

| Column | Type | Purpose |
|---|---|---|
| `id` (UUID) | PK | Primary encounter identifier — ALL FK references use this |
| `visit_id` (VARCHAR 50) | Unique | Human-readable display ID (`V-XXXXX`) |
| `encounter_number` | VARCHAR 50 | `ENC-YYYYMMDD-XXXX` display ID |
| `patient_id` | UUID FK → patients | The patient |
| `clinic_id` | UUID FK → clinics | Assigned clinic (CLN-040 = "Accident & Emergency") |
| `visit_type` | VARCHAR 50 | Free-text: "New Visit", "Follow-up", "Referred NHIS Patient (External)" etc. **A&E will add "A&E"** |
| `encounter_category` | VARCHAR 20 | `outpatient`, `inpatient`, `emergency`, `day_case` |
| `status` | ENUM `visit_status` | `Active` → `Completed` / `Cancelled` / `Discharged` / `Closed` |
| `priority` | ENUM `priority` | `Normal` / `Urgent` / `Emergency` |
| `chief_complaint` | TEXT | Free-text chief complaint |
| `payment_category` | ENUM `payment_method` | `Cash`, `POS`, `NHIS`, `DHML`, `Military_Free` etc. |
| `attending_doctor_id` | UUID FK → staff | Assigned clinician |
| `registered_by` | UUID FK → staff | Who registered |
| `current_stage` | TEXT | Workflow stage (`registered` → `payment` → `nursing_vitals` → `consultation` → …) |
| `start_time` / `end_time` | TIMESTAMPTZ | Encounter window |
| `admission_date`, `ward_location`, `bed_number` | Inpatient fields |
| `is_referral_encounter`, `source_referral_id` etc. | Referral chain fields |

**Creation**: `createEncounter()` in `src/renderer/lib/workflow/api.ts` inserts into `visits`, creates billing order, creates queue ticket.

**Closing**: `transitionEncounter()` sets `status = 'Completed'`, `end_time = now()`.

### 1.2 Existing Tables A&E Will Reuse

| Table | Linked via | A&E usage |
|---|---|---|
| `vitals` | `encounter_id`, `patient_id` | Triage vitals + repeat observations |
| `triage_assessments` | `visit_id`, `patient_id` | Already has triage fields (level, colour, AVPU, pain). **Extend for A&E** |
| `consultations` | `encounter_id` | SOAP notes — reuse for clinician assessment |
| `lab_requests` / `lab_results` | `encounter_id` | Lab orders with STAT priority |
| `radiology_requests` / `radiology_request_items` | `encounter_id` | Imaging orders |
| `prescriptions` | `encounter_id` | Medication orders |
| `billing_orders` | `visit_id`, `encounter_id` | Billing |
| `queue` | `visit_id`, `encounter_id` | Queue routing |
| `admissions` | `encounter_id` | Admission on disposition |
| `treatment_plans` / `treatment_tasks` | `encounter_id` | Nursing treatment tasks |
| `clinical_requests` | `encounter_id` | Referral/Transfer/Admission requests |
| `daily_progress_notes` | `encounter_id` | If extended stay |
| `ward_round_notes` | `encounter_id` | If admitted |
| `chief_complaint_catalogue` | N/A | Already has `Trauma_Emergency` category |
| `procedure_catalogue` | N/A | Existing procedures |

### 1.3 Existing Enums Relevant to A&E

| Enum | Values | A&E Impact |
|---|---|---|
| `visit_status` | Active, Completed, Cancelled, Created, Closed, Discharged, Registered | No change needed |
| `priority` | Normal, Urgent, Emergency | Already supports Emergency |
| `queue_location` | Reception, Registration, Nursing, Consultation, Lab, Radiology, Pharmacy, Billing, Cashier, CustomerService | **Need to add: `Emergency`, `Triage`, `Resuscitation`** |
| `consciousness_level` | Alert, Verbal, Pain, Unresponsive | Already AVPU — perfect for A&E |
| `triage_status` | Pending, In Progress, Completed, Cancelled | Reuse as-is |
| `clinical_urgency` | Routine, Urgent, Emergency | Reuse as-is |
| `source_module` | registration, consultation, nursing, lab, radiology, pharmacy, procedure | **Need to add: `emergency`** |
| `ward_type` | General, ICU, Emergency, Pediatric, Maternity, Surgical, Psychiatric, Isolation | Already has `Emergency` |
| `admission_source` | emergency, outpatient, referral, transfer, direct | Already has `emergency` |

### 1.4 Existing UI Patterns

- **Routing**: `MemoryRouter` with `<Route path="/ae" …>` under `<Layout />` (protected)
- **Sidebar**: `src/renderer/config/menu.ts` — array of `MenuItem` with `to`, `icon`, `label`, `module`
- **Module structure**: Each module is a folder under `src/renderer/modules/` with `index.tsx`, `components/`, `hooks/`, `api/`, `dtos/`
- **Consultation wizard**: 7-step SOAP flow in `ConsultationWizard.tsx` — A&E assessment will use same pattern
- **Queue**: `queue` table with `location`, `status`, `priority`, real-time subscriptions
- **Permissions**: `useAuth().hasRole([...])` for role-gating, `<ModuleRoute module="ae">` for route-level
- **Forms**: React Hook Form + Zod validation, optimistic UI, Supabase client

### 1.5 Existing Clinics & Departments

- **CLN-040**: "Accident & Emergency" (A&E) already exists in clinics table
- **Ward type `Emergency`**: Already in `ward_type` enum
- **Admission source `emergency`**: Already in admissions constraint

### 1.6 Workflow Stage Machine

Current stages (24):
```
registration → payment → queue_waiting → nursing_vitals → consultation
→ lab_pending → lab_results → radiology_pending → radiology_results
→ procedure_pending → doctor_review → pharmacy_pending → pharmacy_dispense
→ billing_final → completed
+ specialty stages (dental, ophthalmology, physiotherapy)
```

**A&E stages to add**:
```
ae_arrival → ae_triage → ae_assessment → ae_treatment → ae_disposition → completed
```

### 1.7 Staff Roles

| Role | A&E Access |
|---|---|
| `nurse` | Arrival, Triage, Vitals, Nursing Notes, Med Admin, Observations |
| `doctor` | Primary Survey, Assessment, Orders, Procedures, Disposition |
| `admin` / `super_admin` | Full access + audit |
| `receptionist` | Arrival registration only |
| `lab_technician` | Lab results (existing module) |
| `radiologist` | Radiology results (existing module) |
| `pharmacist` | Medication dispensing (existing module) |
| `billing_clerk` | Billing (existing module) |

---

## 2. Integration Plan — What We Reuse vs. What We Create

### 2.1 REUSE (No Changes)

| Component | How |
|---|---|
| `vitals` table | A&E vitals are just vitals records linked to the A&E encounter_id |
| `consultations` table | A&E clinician assessment = a consultation with A&E template |
| `lab_requests` / `lab_results` | Same lab ordering, add STAT priority flag |
| `radiology_requests` | Same imaging ordering |
| `prescriptions` | Same prescription workflow |
| `billing_orders` | Same billing (auto-created at encounter start) |
| `admissions` table | Disposition "Admit" creates admission record linked to A&E encounter |
| `treatment_plans` / `treatment_tasks` | Nursing treatment tracking |
| `clinical_requests` | Referral/Transfer/Admission routing |
| `queue` table | Queue routing with new A&E locations |
| Existing order components | `LabOrderForm`, `RadiologyOrderForm`, `PrescriptionForm` |
| ICD-10 diagnosis search | Same `ICDDiagnosisSearch` component |
| Chief complaint catalogue | Already has `Trauma_Emergency` category |
| Patient registration | Same patient lookup/search |

### 2.2 EXTEND (Minor Changes to Existing)

| Item | Change |
|---|---|
| `visits` table | No column changes — use `visit_type = 'A&E'`, `encounter_category = 'emergency'` |
| `triage_assessments` table | Add columns: `acuity_color`, `trauma_mechanism`, `red_flags` (JSONB), `allergies_noted` |
| `queue_location` enum | Add values: `Emergency`, `Triage`, `Resuscitation` |
| `source_module` enum | Add value: `emergency` |
| `WorkflowStage` type | Add: `ae_arrival`, `ae_triage`, `ae_assessment`, `ae_treatment`, `ae_disposition` |
| `createEncounter()` | Add A&E-specific path: skip billing for Emergency priority, route to Triage queue |
| `canTransition()` | Add A&E stage transitions |
| `menu.ts` | Add A&E menu item |
| `App.tsx` | Add `/ae` route |

### 2.3 CREATE (New A&E-Specific)

| Item | Purpose |
|---|---|
| **Table: `ae_arrivals`** | A&E arrival data: mode, referral source, incident type/time/location, medico-legal flag |
| **Table: `ae_primary_surveys`** | ABCDE trauma survey (conditional for trauma/critical) |
| **Table: `ae_dispositions`** | Disposition data: type, final diagnosis, condition, instructions, handover |
| **Table: `ae_observations`** | Repeated observations (vitals charted over time) — or use `vitals` table directly with timestamps |
| **Table: `ae_timeline_events`** | Every action in A&E logged: who, what, when (audit trail) |
| **Table: `ae_fluid_charts`** | IV fluids: type, rate, start/stop, urine output |
| **Table: `ae_procedures`** | A&E procedures: type, consent, findings, complications |
| **Module: `src/renderer/modules/ae/`** | Full UI module |
| **Migration: `xxx_ae_module.sql`** | Schema changes |

---

## 3. Database Schema — New Tables

### 3.1 `ae_arrivals`

```sql
CREATE TABLE ae_arrivals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  arrival_time TIMESTAMPTZ DEFAULT now() NOT NULL,
  arrival_mode VARCHAR(30) NOT NULL CHECK (arrival_mode IN ('walk_in','ambulance','transfer','police','military_escort','other')),
  referral_source VARCHAR(30) NOT NULL CHECK (referral_source IN ('self','clinic','hospital','police','military','workplace','other')),
  referral_source_detail TEXT,
  chief_complaint TEXT NOT NULL,
  incident_type VARCHAR(30) CHECK (incident_type IN ('rta','assault','fall','burn','gunshot','blast','poisoning','drowning','medical','obstetric','pediatric','other')),
  incident_time TIMESTAMPTZ,
  incident_location TEXT,
  medico_legal_flag BOOLEAN DEFAULT false,
  medico_legal_notes TEXT,
  brought_by_name TEXT,
  brought_by_phone VARCHAR(20),
  brought_by_relationship VARCHAR(50),
  created_by UUID NOT NULL REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES staff(id)
);
CREATE INDEX idx_ae_arrivals_encounter ON ae_arrivals(encounter_id);
CREATE INDEX idx_ae_arrivals_patient ON ae_arrivals(patient_id);
```

### 3.2 `ae_primary_surveys`

```sql
CREATE TABLE ae_primary_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  -- Airway
  airway_status VARCHAR(30) CHECK (airway_status IN ('patent','compromised','obstructed','intubated')),
  airway_interventions JSONB DEFAULT '[]',
  airway_notes TEXT,
  -- Breathing
  breathing_status VARCHAR(30) CHECK (breathing_status IN ('normal','labored','absent','assisted')),
  breathing_rate INTEGER,
  spo2 INTEGER,
  chest_findings TEXT,
  breathing_interventions JSONB DEFAULT '[]',
  breathing_notes TEXT,
  -- Circulation
  circulation_status VARCHAR(30) CHECK (circulation_status IN ('stable','compromised','shock','arrest')),
  heart_rate INTEGER,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  capillary_refill VARCHAR(10),
  bleeding_sites JSONB DEFAULT '[]',
  iv_access JSONB DEFAULT '[]',
  circulation_interventions JSONB DEFAULT '[]',
  circulation_notes TEXT,
  -- Disability
  gcs_eye INTEGER CHECK (gcs_eye BETWEEN 1 AND 4),
  gcs_verbal INTEGER CHECK (gcs_verbal BETWEEN 1 AND 5),
  gcs_motor INTEGER CHECK (gcs_motor BETWEEN 1 AND 6),
  gcs_total INTEGER GENERATED ALWAYS AS (gcs_eye + gcs_verbal + gcs_motor) STORED,
  pupil_left VARCHAR(30),
  pupil_right VARCHAR(30),
  consciousness consciousness_level DEFAULT 'Alert',
  disability_notes TEXT,
  -- Exposure
  exposure_findings TEXT,
  injuries JSONB DEFAULT '[]',
  exposure_notes TEXT,
  -- Meta
  survey_time TIMESTAMPTZ DEFAULT now(),
  performed_by UUID NOT NULL REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES staff(id)
);
CREATE INDEX idx_ae_primary_surveys_encounter ON ae_primary_surveys(encounter_id);
```

### 3.3 `ae_dispositions`

```sql
CREATE TABLE ae_dispositions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  disposition_type VARCHAR(30) NOT NULL CHECK (disposition_type IN (
    'discharge','admit','transfer','refer','death','absconded','left_against_advice'
  )),
  disposition_time TIMESTAMPTZ DEFAULT now() NOT NULL,
  final_diagnosis TEXT,
  final_diagnosis_icd10 VARCHAR(20),
  secondary_diagnoses JSONB DEFAULT '[]',
  condition_at_disposition VARCHAR(30) CHECK (condition_at_disposition IN (
    'stable','improved','unchanged','deteriorated','critical','deceased'
  )),
  -- Discharge fields
  discharge_instructions TEXT,
  return_precautions TEXT,
  follow_up_date DATE,
  follow_up_clinic_id UUID REFERENCES clinics(clinic_id),
  medications_on_discharge JSONB DEFAULT '[]',
  -- Admission fields
  admission_ward_id UUID REFERENCES wards(id),
  admission_reason TEXT,
  admission_id UUID REFERENCES admissions(id),
  -- Transfer fields
  transfer_destination TEXT,
  transfer_reason TEXT,
  -- Handover summary (auto-generated, stored for reference)
  handover_summary JSONB,
  -- Meta
  disposition_by UUID NOT NULL REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES staff(id)
);
CREATE INDEX idx_ae_dispositions_encounter ON ae_dispositions(encounter_id);
```

### 3.4 `ae_timeline_events`

```sql
CREATE TABLE ae_timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  event_type VARCHAR(50) NOT NULL,
  event_category VARCHAR(30) NOT NULL CHECK (event_category IN (
    'arrival','triage','assessment','order','treatment','result','procedure',
    'medication','observation','disposition','note','alert','handover'
  )),
  title TEXT NOT NULL,
  details JSONB,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info','warning','critical','success')),
  source_table VARCHAR(50),
  source_id UUID,
  performed_by UUID REFERENCES staff(id),
  performed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ae_timeline_encounter ON ae_timeline_events(encounter_id);
CREATE INDEX idx_ae_timeline_time ON ae_timeline_events(performed_at DESC);
```

### 3.5 `ae_fluid_charts`

```sql
CREATE TABLE ae_fluid_charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  fluid_type VARCHAR(100) NOT NULL,
  route VARCHAR(30) NOT NULL CHECK (route IN ('iv','oral','io','sc','other')),
  rate_ml_hr INTEGER,
  volume_ml INTEGER,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  urine_output_ml INTEGER,
  notes TEXT,
  administered_by UUID NOT NULL REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ae_fluid_charts_encounter ON ae_fluid_charts(encounter_id);
```

### 3.6 `ae_procedures`

```sql
CREATE TABLE ae_procedures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  procedure_name VARCHAR(200) NOT NULL,
  procedure_catalogue_id UUID REFERENCES procedure_catalogue(id),
  consent_obtained BOOLEAN DEFAULT false,
  consent_notes TEXT,
  indication TEXT,
  technique TEXT,
  findings TEXT,
  outcome VARCHAR(30) CHECK (outcome IN ('successful','partial','failed','abandoned')),
  complications TEXT,
  performed_by UUID NOT NULL REFERENCES staff(id),
  assisted_by JSONB DEFAULT '[]',
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ae_procedures_encounter ON ae_procedures(encounter_id);
```

### 3.7 Extensions to Existing Tables

```sql
-- Extend triage_assessments for A&E-specific fields
ALTER TABLE triage_assessments
  ADD COLUMN IF NOT EXISTS acuity_color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS trauma_mechanism TEXT,
  ADD COLUMN IF NOT EXISTS red_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS allergies_noted TEXT,
  ADD COLUMN IF NOT EXISTS triage_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_ae_triage BOOLEAN DEFAULT false;

-- Add A&E queue locations
ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Emergency';
ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Triage';
ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Resuscitation';

-- Add emergency source module
ALTER TYPE source_module ADD VALUE IF NOT EXISTS 'emergency';
```

---

## 4. UI Module Structure

```
src/renderer/modules/ae/
├── index.tsx                          # Main A&E page with tab navigation
├── api/
│   ├── ae.api.ts                      # All A&E Supabase queries
│   └── ae.types.ts                    # TypeScript interfaces
├── hooks/
│   ├── useAe.ts                       # React Query hooks
│   ├── useAeTimeline.ts               # Timeline events hook
│   └── useAeQueue.ts                  # A&E-specific queue hook
├── dtos/
│   └── ae.dto.ts                      # Zod schemas + DTOs
├── components/
│   ├── AeDashboard.tsx                # A&E overview: active patients, bed status, stats
│   ├── AePatientBoard.tsx             # Kanban/tracking board of all A&E patients
│   ├── AeEncounterView.tsx            # Single patient A&E encounter (tabbed)
│   │
│   ├── arrival/
│   │   └── ArrivalForm.tsx            # Form A: Arrival & Registration
│   │
│   ├── triage/
│   │   ├── TriageForm.tsx             # Form B: Triage (extends existing TriageForm)
│   │   └── TriageAcuityBadge.tsx      # Color-coded acuity display
│   │
│   ├── primary-survey/
│   │   └── PrimarySurveyForm.tsx      # Form C: ABCDE Trauma Survey
│   │
│   ├── assessment/
│   │   └── AeAssessmentForm.tsx       # Form D: Clinician Assessment (reuses SOAP pattern)
│   │
│   ├── orders/
│   │   └── AeOrdersPanel.tsx          # Form E: Orders — wraps existing Lab/Radiology/Rx forms
│   │
│   ├── treatment/
│   │   ├── AeMedicationForm.tsx       # Form F1: ED MAR (medication admin)
│   │   ├── AeProcedureForm.tsx        # Form F2: Procedures
│   │   ├── AeFluidChartForm.tsx       # Form F3: Fluids/IO
│   │   └── AeNursingNotesForm.tsx     # Form F4: Nursing notes + obs chart
│   │
│   ├── results/
│   │   └── AeResultsPanel.tsx         # Results review: lab + radiology linked to encounter
│   │
│   ├── disposition/
│   │   ├── DispositionForm.tsx         # Form G: Disposition decision
│   │   └── HandoverSummary.tsx         # Auto-generated handover on admit/transfer
│   │
│   └── timeline/
│       └── AeTimeline.tsx              # Right-side timeline panel (audit trail)
```

### 4.1 Main Page (`index.tsx`) — Tab Layout

```
┌─────────────────────────────────────────────────────────┐
│  🚑 Accident & Emergency                                │
│  ┌──────────┬──────────┬───────────┐                    │
│  │ Dashboard│ Patients │ My Queue  │                    │
│  └──────────┴──────────┴───────────┘                    │
│                                                         │
│  [Dashboard Tab]                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ Active │ │Waiting │ │Critical│ │ Today  │          │
│  │   12   │ │    5   │ │    2   │ │   28   │          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
│                                                         │
│  [Patient Board — Kanban columns]                       │
│  Arrival → Triage → Assessment → Treatment → Dispo     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Single Patient Encounter View (`AeEncounterView.tsx`)

```
┌───────────────────────────────────────────┬─────────────────┐
│  Patient: Cpl John Doe (EMR-001234)       │                 │
│  Priority: 🔴 CRITICAL  Acuity: RED       │   TIMELINE      │
│                                            │                 │
│  ┌────────┬────────┬────────┬────────┐    │  14:32 Arrived  │
│  │Arrival │ Triage │ Survey │ Assess │    │  14:35 Triaged  │
│  ├────────┼────────┼────────┼────────┤    │  14:36 Survey   │
│  │ Orders │ Treat  │Results │ Dispo  │    │  14:40 Lab Ord  │
│  └────────┴────────┴────────┴────────┘    │  14:42 IV Start │
│                                            │  14:55 Lab Res  │
│  [Active Tab Content Here]                 │  15:10 Assess   │
│                                            │  15:20 Dispo    │
│                                            │                 │
└───────────────────────────────────────────┴─────────────────┘
```

---

## 5. Workflow Stages & Routing

### 5.1 A&E Stage Flow

```
ae_arrival
  ↓
ae_triage  (Nurse: acuity + vitals)
  ↓
  ├── [Critical] → ae_assessment (immediate clinician)
  │                  ↓
  │                ae_treatment (orders + procedures)
  │                  ↓
  │                ae_disposition
  │
  └── [Non-critical] → queue_waiting (Emergency department queue)
                         ↓
                       ae_assessment (when called)
                         ↓
                       ae_treatment
                         ↓
                       ae_disposition
```

### 5.2 Stage Transitions to Add

| From | To | Condition |
|---|---|---|
| `ae_arrival` | `ae_triage` | Arrival form saved |
| `ae_triage` | `ae_assessment` | Critical acuity |
| `ae_triage` | `queue_waiting` | Non-critical (wait for clinician) |
| `queue_waiting` | `ae_assessment` | Clinician starts |
| `ae_assessment` | `ae_treatment` | Assessment done, treatment begins |
| `ae_assessment` | `lab_pending`, `radiology_pending` | Orders placed (parallel) |
| `ae_treatment` | `ae_assessment` | Re-assessment needed |
| `ae_treatment` | `ae_disposition` | Ready for disposition |
| `ae_disposition` | `completed` | Discharged |
| `ae_disposition` | `ae_admission` | Admit (creates admission record, transitions encounter) |

### 5.3 Payment Gating

- **Emergency patients bypass payment** on arrival. Billing is deferred to disposition.
- This aligns with existing `requiresPaymentFirst()` returning false for `Emergency` priority.
- Billing order is still auto-created at encounter start (for audit), but with status `Pending`.

---

## 6. Detailed Form Specifications

### Form A: Arrival & Registration

| Field | Type | Required | Notes |
|---|---|---|---|
| `arrival_time` | datetime | Yes (auto) | Auto-set to now() |
| `arrival_mode` | select | Yes | walk_in, ambulance, transfer, police, military_escort, other |
| `referral_source` | select | Yes | self, clinic, hospital, police, military, workplace, other |
| `referral_source_detail` | text | No | Free text if "other" |
| `chief_complaint` | text + quickpick | Yes | Uses existing `chief_complaint_catalogue` (Trauma_Emergency category) |
| `incident_type` | select | No | rta, assault, fall, burn, gunshot, blast, poisoning, drowning, medical, obstetric, pediatric, other |
| `incident_time` | datetime | No | When did it happen? |
| `incident_location` | text | No | Where? |
| `medico_legal_flag` | checkbox | No | Police / medico-legal case? |
| `brought_by_name` / `phone` / `relationship` | text | No | Who brought patient |

**On Save**:
1. If no encounter exists: call `createEncounter()` with `visit_type = 'A&E'`, `encounter_category = 'emergency'`, `clinic_id = CLN-040`
2. Insert into `ae_arrivals`
3. Log timeline event: `{ event_type: 'arrival', category: 'arrival' }`
4. Set `current_stage = 'ae_arrival'`
5. Route to queue: `location = 'Triage'`

### Form B: Triage

| Field | Type | Required | Notes |
|---|---|---|---|
| Vitals block | vitals group | Yes | BP, HR, RR, Temp, SpO2, Pain — saves to `vitals` table |
| `triage_level` | 1-5 select | Yes | ESI scale (1=Resuscitation, 2=Emergent, 3=Urgent, 4=Less Urgent, 5=Non-Urgent) |
| `acuity_color` | auto from level | Auto | Red (1-2), Yellow (3), Green (4-5) |
| `consciousness` | AVPU select | Yes | Existing enum |
| `gcs` (optional) | 3-input | No | Eye + Verbal + Motor (auto-sums) |
| `allergies_noted` | text | No | Quick allergy capture |
| `red_flags` | checklist | No | Structured red flag items (JSONB) |
| `triage_notes` | text | No | Narrative |
| `triage_time` | datetime | Auto | Auto-set |

**Red Flags Checklist** (configurable):
- Chest pain / Difficulty breathing / Altered consciousness / Active bleeding / Pregnancy complications / Seizure / Anaphylaxis / Stroke signs / Burns >20% / Penetrating trauma

**On Save**:
1. Insert into `vitals` (encounter_id, patient_id, nurse_id)
2. Insert/update `triage_assessments` (visit_id, patient_id) with extended A&E fields
3. Log timeline event: `{ event_type: 'triage', category: 'triage', details: { acuity, color } }`
4. Set `current_stage = 'ae_triage'`
5. **Route based on acuity**:
   - Level 1-2 (Critical): Move queue to `Resuscitation`, auto-set `priority = 'Emergency'`
   - Level 3 (Urgent): Move queue to `Emergency`, set `priority = 'Urgent'`
   - Level 4-5: Move queue to `Emergency` waiting area, `priority = 'Normal'`

### Form C: Primary Survey (ABCDE) — Conditional

**Show when**: `incident_type` is trauma-related (`rta`, `assault`, `fall`, `burn`, `gunshot`, `blast`) OR `triage_level` ≤ 2

| Section | Fields |
|---|---|
| **Airway** | status (patent/compromised/obstructed/intubated), interventions (multiselect: jaw thrust, chin lift, OPA, NPA, intubation, surgical airway), notes |
| **Breathing** | status (normal/labored/absent/assisted), rate, SpO2, chest findings (text), interventions (multiselect: O2 mask, bag-valve-mask, chest drain, needle decompression), notes |
| **Circulation** | status (stable/compromised/shock/arrest), HR, BP, capillary refill, bleeding sites (JSONB), IV access (JSONB: site, gauge, type), interventions (multiselect: IV fluid bolus, blood products, tourniquet, direct pressure, CPR), notes |
| **Disability** | GCS (E+V+M), pupil left/right (equal reactive, dilated, constricted, fixed), consciousness (AVPU), notes |
| **Exposure** | findings (text), injuries (JSONB: body part, type, description), notes |

**On Save**:
1. Insert into `ae_primary_surveys`
2. Log timeline event: `{ event_type: 'primary_survey', category: 'assessment', details: { gcs_total } }`

### Form D: Clinician Assessment

**Reuses** the existing SOAP consultation pattern from `ConsultationWizard` but with A&E defaults:

| Field | Maps to `consultations` column |
|---|---|
| HPI | `history_of_present_illness` |
| PMH / Meds / Allergies | `past_medical_history` (pull from patient profile) |
| Focused Exam | `examination_findings` |
| Working Diagnosis | `diagnosis` (ICD-10 array) |
| Differential | `differential_diagnosis` |
| Plan | `treatment_plan` |

**On Save**:
1. Insert into `consultations` (encounter_id)
2. Log timeline event: `{ event_type: 'assessment', category: 'assessment' }`
3. Set `current_stage = 'ae_assessment'`

### Form E: Orders

Reuses existing order components wrapped in an A&E panel:
- **Lab Orders**: Existing `LabOrderForm` — pre-set priority to STAT for critical patients
- **Imaging Orders**: Existing `RadiologyOrderForm` — pre-set priority
- **ECG**: Placeholder order type (radiology category or custom)
- **Medications**: Existing `PrescriptionForm` — STAT meds

Each order creates a timeline event automatically.

### Form F: Treatments

**F1: Medications (ED MAR)**
| Field | Type |
|---|---|
| drug (search) | drug catalogue lookup |
| dose | text |
| route | select: IV, IM, SC, Oral, Nebulized, Topical, PR, SL |
| is_stat | boolean (default true) |
| administered_at | datetime (auto) |
| administered_by | current nurse (auto) |

Saves to `prescriptions` with encounter_id + timeline event.

**F2: Procedures**
Saves to `ae_procedures` table + timeline event.

**F3: Fluids/IO**
Saves to `ae_fluid_charts` + timeline event.

**F4: Nursing Notes / Observation Chart**
- Repeat vitals at configurable intervals (saves to `vitals` table with timestamps)
- Pain reassessment
- Neuro observations (if GCS < 15)
- Free-text nursing notes

### Form G: Disposition

| Field | Type | Required |
|---|---|---|
| `disposition_type` | select | Yes |
| `final_diagnosis` + ICD-10 | text + search | Yes |
| `condition_at_disposition` | select | Yes |
| `disposition_time` | datetime | Auto |

**Conditional fields by disposition type**:

| Type | Additional Fields |
|---|---|
| **Discharge** | discharge_instructions, return_precautions, follow_up_date, follow_up_clinic, medications_on_discharge |
| **Admit** | admission_ward, admission_reason → auto-creates `admissions` record |
| **Transfer** | transfer_destination, transfer_reason → auto-creates `clinical_requests` type=Transfer |
| **Refer** | → creates `clinical_requests` type=Referral |
| **Death** | time_of_death, cause_of_death (certification data) |
| **Absconded/Left AMA** | notes only |

**On Save**:
1. Insert into `ae_dispositions`
2. Log timeline event
3. **If Discharge**: Close encounter (`status = 'Completed'`, `end_time = now()`)
4. **If Admit**: Create `admissions` record with `encounter_id`, `admission_source = 'emergency'`, transition encounter to inpatient
5. **If Transfer**: Create `clinical_requests` with type=Transfer
6. Auto-generate `handover_summary` JSONB (chief complaint, triage acuity, vitals snapshot, key events, treatments given, results, pending items, recommended ward)

---

## 7. Safety Rules

| Rule | Implementation |
|---|---|
| Critical acuity banner | Persistent red banner at top of encounter view when `triage_level` ≤ 2 |
| Critical results alert | Banner when `lab_results.is_critical = true` or `lab_requests.is_critical = true` for this encounter |
| Require disposition before close | Block encounter completion (`status = 'Completed'`) unless `ae_dispositions` exists |
| Block discharge with unreviewed critical results | On disposition save, check for unreviewed critical lab results; show warning (configurable: block or warn) |
| Duplicate encounter guard | Check for active A&E encounter for same patient before creating new one |

---

## 8. Permissions Matrix

| Action | nurse | doctor | admin/super_admin | receptionist |
|---|---|---|---|---|
| Arrival form | ✅ | ✅ | ✅ | ✅ |
| Triage | ✅ | ✅ | ✅ | ❌ |
| Primary Survey | ❌ | ✅ | ✅ | ❌ |
| Assessment | ❌ | ✅ | ✅ | ❌ |
| Orders (lab/imaging/Rx) | ❌ | ✅ | ✅ | ❌ |
| Med administration | ✅ | ✅ | ✅ | ❌ |
| Procedures | ❌ | ✅ | ✅ | ❌ |
| Fluids/IO | ✅ | ✅ | ✅ | ❌ |
| Nursing Notes | ✅ | ✅ | ✅ | ❌ |
| Disposition | ❌ | ✅ | ✅ | ❌ |
| View All | ✅ | ✅ | ✅ | ❌ |
| Timeline | ✅ | ✅ | ✅ | ❌ |

---

## 9. Implementation Phases

### Phase 1: Foundation (Database + Core API)
1. Migration SQL: new tables + enum extensions
2. `ae.api.ts`: CRUD for all A&E tables
3. `ae.types.ts`: TypeScript interfaces
4. `ae.dto.ts`: Zod validation schemas
5. Extend `WorkflowStage` type with A&E stages
6. Extend `canTransition()` for A&E flows
7. Extend `createEncounter()` for A&E path
8. Add A&E queue locations

### Phase 2: Core Forms
1. `ArrivalForm.tsx` — arrival registration
2. `TriageForm.tsx` — triage (extends existing)
3. `PrimarySurveyForm.tsx` — ABCDE
4. `AeAssessmentForm.tsx` — clinician assessment (reuses SOAP)
5. `DispositionForm.tsx` — disposition + handover

### Phase 3: Orders & Treatment
1. `AeOrdersPanel.tsx` — wraps existing order forms
2. `AeMedicationForm.tsx` — ED MAR
3. `AeProcedureForm.tsx`
4. `AeFluidChartForm.tsx`
5. `AeNursingNotesForm.tsx`

### Phase 4: UI Integration
1. `AeEncounterView.tsx` — tabbed single-patient view
2. `AeTimeline.tsx` — right-side audit trail
3. `AeDashboard.tsx` — department overview
4. `AePatientBoard.tsx` — tracking board
5. Main `index.tsx` page
6. Route + menu item registration

### Phase 5: Safety & Polish
1. Critical acuity banner
2. Critical results alerts
3. Disposition requirement guard
4. Unreviewed critical results block
5. Duplicate encounter check
6. Handover summary auto-generation

---

## 10. Files to Create / Modify

### New Files
| File | Purpose |
|---|---|
| `migrations/xxx_ae_module.sql` | Schema migration |
| `src/renderer/modules/ae/index.tsx` | Module entry |
| `src/renderer/modules/ae/api/ae.api.ts` | API layer |
| `src/renderer/modules/ae/api/ae.types.ts` | Types |
| `src/renderer/modules/ae/hooks/useAe.ts` | React Query hooks |
| `src/renderer/modules/ae/hooks/useAeTimeline.ts` | Timeline hook |
| `src/renderer/modules/ae/hooks/useAeQueue.ts` | Queue hook |
| `src/renderer/modules/ae/dtos/ae.dto.ts` | Validation |
| `src/renderer/modules/ae/components/*.tsx` | ~15 components (see §4) |

### Modified Files
| File | Change |
|---|---|
| `src/renderer/config/menu.ts` | Add A&E menu item |
| `src/renderer/App.tsx` | Add `/ae` route |
| `src/renderer/lib/workflow/types.ts` | Add A&E WorkflowStages |
| `src/renderer/lib/workflow/api.ts` | A&E encounter creation path + transitions |
| `src/renderer/modules/queue/dtos/queue.dto.ts` | Add Emergency/Triage/Resuscitation locations |

---

## 11. Acceptance Criteria

- [ ] A&E visit completes end-to-end: Arrival → Triage → Assessment → Orders → Treatment → Results → Disposition
- [ ] Everything tied to ONE encounter (same `visits.id`)
- [ ] Vitals use the existing `vitals` table
- [ ] Lab/Radiology/Pharmacy orders use existing tables & modules
- [ ] Admission from A&E creates `admissions` record linked to A&E encounter
- [ ] Nurses see only nurse-appropriate tabs (Arrival, Triage, Meds, Fluids, Notes)
- [ ] Doctors see all tabs including Assessment, Orders, Primary Survey, Disposition
- [ ] Timeline panel shows complete audit trail with timestamps and actors
- [ ] No duplicate encounters for the same A&E visit
- [ ] No breaking changes to existing non-A&E encounter workflow
- [ ] Critical acuity banner displays for Level 1-2 patients
- [ ] Disposition required before encounter can be closed
- [ ] Queue routing works: Triage → Emergency/Resuscitation based on acuity
- [ ] Handover summary auto-generated on Admit/Transfer disposition
