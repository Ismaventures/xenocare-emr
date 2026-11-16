# ANC (Antenatal Care) Module — Integration Plan

## Overview

ANC is implemented as a **pregnancy care workflow** that plugs into the existing patient, encounter, nursing, consultation, lab, radiology, pharmacy, queue, and booking architecture. It is **not** a standalone module — it extends the current EMR with pregnancy-specific clinical structures.

### Architectural Model

```
Patient
 └── Pregnancy Episode (one active at a time)
      ├── ANC Booking Encounter (first visit) → existing encounter engine
      ├── ANC Follow-up Encounters (repeat visits)
      │    ├── Nursing Assessment (ANC-specific vitals template)
      │    ├── Doctor Review (ANC-specific SOAP template)
      │    ├── Lab Orders → existing lab_requests table
      │    ├── Imaging Orders → existing radiology_requests table
      │    ├── Prescriptions → existing prescriptions table
      │    └── Follow-up Booking → existing appointments table
      └── Delivery Outcome / Episode Closure
```

---

## Phase 1: Database Schema

### New Tables

#### 1. `pregnancy_episodes`
Foundation for tracking one pregnancy from booking to delivery/closure.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | |
| patient_id | UUID | FK → patients.id, NOT NULL | |
| episode_number | INTEGER | NOT NULL, DEFAULT 1 | Auto-increment per patient |
| enrollment_date | DATE | NOT NULL | Date of first ANC booking |
| lmp | DATE | | Last menstrual period |
| edd | DATE | | Estimated delivery date (LMP + 280 days) |
| gestational_age_at_booking | INTEGER | | Weeks at booking |
| gravida | INTEGER | DEFAULT 1 | Total pregnancies |
| parity | INTEGER | DEFAULT 0 | Deliveries ≥28 weeks |
| abortions | INTEGER | DEFAULT 0 | Losses <28 weeks |
| living_children | INTEGER | DEFAULT 0 | |
| blood_group | VARCHAR(10) | | A+, O-, etc. |
| rhesus_factor | VARCHAR(10) | | Positive / Negative |
| genotype | VARCHAR(10) | | AA, AS, SS, AC, SC |
| booking_status | VARCHAR(20) | DEFAULT 'booked' | booked, confirmed |
| risk_level | VARCHAR(20) | DEFAULT 'low' | low, moderate, high |
| primary_doctor_id | UUID | FK → staff.id | Assigned OBGYN |
| primary_midwife_id | UUID | FK → staff.id | Assigned midwife |
| department_id | UUID | FK → departments.id | ANC clinic department |
| clinic_id | UUID | FK → clinics.id | ANC clinic |
| status | VARCHAR(20) | DEFAULT 'active' | active, delivered, transferred, lost_to_followup, closed |
| created_by | UUID | FK → staff.id | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Constraints:**
- Only one `status = 'active'` per patient_id (enforced by partial unique index)

#### 2. `anc_visits`
Links a pregnancy episode to a real encounter. One row per ANC visit.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| pregnancy_episode_id | UUID | FK → pregnancy_episodes.id, NOT NULL | |
| encounter_id | UUID | FK → visits.id, NOT NULL | Reuses existing encounter engine |
| visit_number | INTEGER | NOT NULL | Sequential per pregnancy |
| visit_type | VARCHAR(30) | NOT NULL | booking, routine_followup, urgent_review |
| visit_date | DATE | NOT NULL | |
| gestational_age_weeks | INTEGER | | Calculated from LMP |
| gestational_age_days | INTEGER | | Remainder days |
| trimester | INTEGER | | 1, 2, or 3 |
| nurse_completed | BOOLEAN | DEFAULT false | |
| doctor_completed | BOOLEAN | DEFAULT false | |
| next_visit_date | DATE | | Schedule for next appointment |
| visit_status | VARCHAR(20) | DEFAULT 'in_progress' | in_progress, completed, cancelled |
| created_by | UUID | FK → staff.id | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

#### 3. `anc_observations`
Structured maternal and fetal observations per visit.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| anc_visit_id | UUID | FK → anc_visits.id, NOT NULL | |
| pregnancy_episode_id | UUID | FK → pregnancy_episodes.id, NOT NULL | |
| systolic_bp | INTEGER | | mmHg |
| diastolic_bp | INTEGER | | mmHg |
| weight_kg | NUMERIC(6,2) | | |
| height_cm | NUMERIC(6,2) | | Recorded at booking |
| bmi | NUMERIC(5,2) | | Calculated |
| temperature | NUMERIC(4,1) | | °C |
| pulse | INTEGER | | bpm |
| respiratory_rate | INTEGER | | |
| urine_protein | VARCHAR(20) | | nil, trace, +, ++, +++ |
| urine_glucose | VARCHAR(20) | | nil, trace, +, ++, +++ |
| edema | VARCHAR(20) | | none, mild, moderate, severe |
| pallor | VARCHAR(20) | | none, mild, moderate, severe |
| fundal_height_cm | NUMERIC(5,1) | | Symphysis-fundal height |
| fetal_heart_rate | INTEGER | | bpm (normal 110–160) |
| fetal_movement | VARCHAR(20) | | present, reduced, absent |
| fetal_presentation | VARCHAR(30) | | cephalic, breech, transverse, unstable |
| fetal_lie | VARCHAR(20) | | longitudinal, oblique, transverse |
| number_of_fetuses | INTEGER | DEFAULT 1 | |
| vaginal_bleeding | BOOLEAN | DEFAULT false | |
| liquor_status | VARCHAR(20) | | adequate, reduced, excessive |
| cervix_status | VARCHAR(50) | | closed, dilating, etc. |
| contractions | BOOLEAN | DEFAULT false | |
| maternal_complaints | TEXT | | |
| danger_signs | TEXT[] | | Array of flagged danger signs |
| interventions | TEXT | | IPTp, TT, iron/folic given etc. |
| counseling_notes | TEXT | | Health education delivered |
| notes | TEXT | | General notes |
| recorded_by | UUID | FK → staff.id | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

#### 4. `anc_risk_flags`
Track high-risk indicators with alert support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| pregnancy_episode_id | UUID | FK → pregnancy_episodes.id, NOT NULL | |
| anc_visit_id | UUID | FK → anc_visits.id, NULLABLE | Visit where detected |
| risk_code | VARCHAR(50) | NOT NULL | e.g., 'severe_anemia', 'preeclampsia_risk' |
| risk_name | VARCHAR(100) | NOT NULL | Human-readable name |
| severity | VARCHAR(20) | DEFAULT 'moderate' | low, moderate, high, critical |
| active | BOOLEAN | DEFAULT true | |
| detected_at | TIMESTAMPTZ | DEFAULT now() | |
| resolved_at | TIMESTAMPTZ | | NULL until resolved |
| notes | TEXT | | |
| created_by | UUID | FK → staff.id | |

#### 5. `pregnancy_outcomes`
Close the pregnancy episode after delivery.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| pregnancy_episode_id | UUID | FK → pregnancy_episodes.id, UNIQUE, NOT NULL | One outcome per episode |
| delivery_date | DATE | NOT NULL | |
| gestational_age_at_delivery | INTEGER | | Weeks |
| place_of_delivery | VARCHAR(50) | | this_facility, other_hospital, home, en_route |
| delivery_mode | VARCHAR(30) | | svd, elective_cs, emergency_cs, instrumental |
| maternal_outcome | VARCHAR(20) | | alive, deceased |
| maternal_complications | TEXT[] | | Array |
| baby_weight_grams | INTEGER | | |
| baby_sex | VARCHAR(10) | | male, female, ambiguous |
| apgar_1 | INTEGER | | 0-10 |
| apgar_5 | INTEGER | | 0-10 |
| neonatal_outcome | VARCHAR(20) | | alive, stillbirth, neonatal_death |
| neonatal_complications | TEXT[] | | Array |
| notes | TEXT | | |
| recorded_by | UUID | FK → staff.id | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## Phase 2: Module File Structure

```
src/renderer/modules/anc/
├── index.tsx                          -- Module entry (dashboard + pregnancy list + visit view)
├── api/
│   ├── anc.types.ts                   -- TypeScript interfaces for all ANC entities
│   └── anc.api.ts                     -- Supabase API layer
├── dtos/
│   └── anc.dto.ts                     -- Zod schemas + form DTOs
├── hooks/
│   └── useAnc.ts                      -- React Query hooks
├── components/
│   ├── dashboard/
│   │   └── AncDashboard.tsx           -- ANC clinic dashboard (stats, today's list, alerts)
│   ├── pregnancy/
│   │   ├── PregnancyEnrollmentForm.tsx -- New pregnancy episode form (booking)
│   │   ├── PregnancyEpisodeView.tsx   -- Full pregnancy timeline view
│   │   └── PregnancySummaryCard.tsx   -- Sticky header with GA, EDD, risk, alerts
│   ├── visit/
│   │   ├── AncVisitView.tsx           -- Tabbed ANC visit (Summary, Nursing, Doctor, Labs, Meds, Follow-up)
│   │   └── AncVisitHistory.tsx        -- List of all visits for this pregnancy
│   ├── nursing/
│   │   └── AncNursingForm.tsx         -- ANC-specific nursing assessment form
│   ├── doctor/
│   │   └── AncDoctorReviewForm.tsx    -- ANC consultation form (SOAP + risk + plan)
│   ├── risk/
│   │   └── AncRiskFlags.tsx           -- Risk flag banner + management
│   └── outcome/
│       └── DeliveryOutcomeForm.tsx     -- Pregnancy closure form
```

---

## Phase 3: Integration Points with Existing Modules

### A. Encounter Module
- ANC visits create encounters via existing `visits` table with `visit_type = 'Antenatal'`
- `encounter_category = 'outpatient'` (default)
- Each ANC visit auto-creates an `anc_visits` row linking encounter → pregnancy episode

### B. Nursing Module
- ANC nursing template adds pregnancy-specific fields (fundal height, FHR, urine, fetal movement)
- Saves to BOTH `vitals` table (standard vitals) AND `anc_observations` (pregnancy-specific)
- Standard vitals (BP, weight, temp, pulse) flow through existing vitals pipeline

### C. Consultation Module
- Doctor review saves to existing `consultations` table (SOAP format)
- ANC-specific form sections: obstetric review, risk classification, delivery planning
- Orders (lab, imaging, prescriptions) use existing order placement infrastructure

### D. Lab Module
- Lab orders from ANC flow through existing `lab_requests` table
- ANC-specific test panels: FBC, blood group, genotype, HIV, HBsAg, VDRL, urinalysis, glucose

### E. Radiology Module
- Imaging orders flow through existing `radiology_requests` table
- ANC scans: obstetric USS, anomaly scan, growth scan

### F. Pharmacy Module
- Prescriptions flow through existing `prescriptions` table
- Common ANC medications: iron, folic acid, calcium, IPTp

### G. Booking/Appointments
- When `next_visit_date` is set, auto-create appointment in `appointments` table
- Assign to ANC clinic, correct doctor/midwife

### H. Queue Module
- ANC patients enter queue with existing logic
- Queue location: 'Consultation' filtered by ANC clinic, or new 'Antenatal' location

---

## Phase 4: UI Integration

### Navigation
- New sidebar item: `/anc` → ANC Module
- Icon: Baby (lucide-react)
- Module permission: `anc`

### ANC Module Views
1. **Dashboard** — Today's ANC schedule, upcoming visits, high-risk patients, stats
2. **Pregnancy List** — All active pregnancy episodes with search/filter
3. **Pregnancy Episode View** — Full pregnancy timeline, risk alerts, labs, scans, medications
4. **ANC Visit View** — Tabbed encounter: Summary | Nursing | Doctor Review | Labs | Medications | Follow-up

### Sticky Pregnancy Summary Header
On every ANC screen, display:
- Patient name, G/P/A, GA (weeks+days), EDD, blood group/genotype
- Risk level badge, active alerts, next appointment

---

## Phase 5: Clinical Workflows

### A. First ANC Booking
1. Patient retrieved from existing patient registry
2. Confirm pregnancy → Create pregnancy episode
3. Auto-create ANC booking encounter (visit_type='Antenatal')
4. Nurse completes ANC booking observations
5. Doctor completes full ANC booking review
6. Baseline investigations ordered (lab/imaging)
7. Medications prescribed
8. Next visit booked

### B. Routine Follow-up
1. Patient arrives for scheduled ANC visit
2. Load active pregnancy episode
3. Auto-create ANC follow-up encounter
4. Nurse records routine ANC observations
5. Doctor reviews and updates plan
6. Orders placed as needed
7. Next visit creates real appointment
8. Visit closed

### C. High-Risk Escalation
If danger signs detected:
- Activate risk flag → Display banner alert
- Suggest doctor review / urgent review
- Cannot close visit without doctor signoff (if high-risk)

### D. Delivery Closure
1. Open delivery outcome form
2. Capture maternal + neonatal outcomes
3. Close pregnancy episode (status → 'delivered')
4. Archive pregnancy history on patient record

---

## Phase 6: Permissions

| Level | Roles | Can Do |
|-------|-------|--------|
| **ANC Full** | OBGYN, ANC doctors, midwives, ANC nurses | View/edit all ANC, order, prescribe, classify risk |
| **ANC Clinician** | Assigned doctors, residents | Review, document, order, prescribe |
| **ANC Nursing** | Midwives, ANC nurses | Record vitals, fetal monitoring, counseling, flag danger |
| **ANC Read-Only** | A&E doctors, pharmacy, lab, radiology, admin | View pregnancy summary, process orders |

---

## Phase 7: Automations

1. **Gestational age calculator** — Auto from LMP + current date
2. **EDD calculator** — LMP + 280 days (Naegele's rule)
3. **Follow-up scheduling** — Suggest interval based on GA and risk
4. **Risk alert triggers** — BP ≥140/90, proteinuria, bleeding, reduced FM, previous CS
5. **Missing workup reminders** — Booking labs incomplete, scan overdue, Hb repeat due
6. **Single active pregnancy rule** — Prevent duplicate active episodes per patient

---

## Execution Order

1. **Migration SQL** — Create all 5 tables with indexes and RLS policies
2. **Types + DTOs** — anc.types.ts + anc.dto.ts with Zod validation
3. **API layer** — anc.api.ts Supabase CRUD operations
4. **Hooks** — useAnc.ts React Query hooks
5. **Dashboard** — AncDashboard.tsx module entry
6. **Pregnancy Enrollment** — PregnancyEnrollmentForm.tsx
7. **Visit View** — AncVisitView.tsx tabbed encounter
8. **Nursing Form** — AncNursingForm.tsx ANC-specific vitals
9. **Doctor Review** — AncDoctorReviewForm.tsx SOAP + risk
10. **Risk Flags** — AncRiskFlags.tsx banner + management
11. **Delivery Outcome** — DeliveryOutcomeForm.tsx
12. **Routing + Menu** — App.tsx route, menu.ts entry
13. **Compilation check** — TypeScript verification
