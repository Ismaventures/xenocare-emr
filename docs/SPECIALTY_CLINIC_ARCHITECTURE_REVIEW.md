# SPECIALTY CLINIC ARCHITECTURE REVIEW & UPGRADE PLAN
## Revision 2 — Refined Classification, Field Framework, Pre-Consultation Triage

---

## 1. Executive Summary

This document covers **19 specialty clinics** (physiotherapy excluded — already complete). It provides:

1. **Current architecture assessment** — what exists, what works, what's missing
2. **Pre-consultation triage workflow** — Nigerian clinic reality where patients do tests BEFORE seeing the doctor
3. **Mandatory field-classification framework** — every data point tagged as one of 7 types
4. **Primary/secondary workflow types** — no specialty forced into a single rigid category
5. **Per-specialty analysis** — with field classifications, order sets, scoring, care plans
6. **Implementation order** — starting with the first specialty module

### Specialty Count: 19

| # | Specialty | Template Exists | Parallel Module |
|---|-----------|----------------|-----------------|
| 1 | Cardiology | Yes (7 sections) | No |
| 2 | Dermatology | Yes (5 sections) | No |
| 3 | Endocrinology | Yes (6 sections) | No |
| 4 | ENT | Yes (3 sections) | No |
| 5 | Gastroenterology | Yes (6 sections) | No |
| 6 | General Surgery | Yes (6 sections) | No |
| 7 | Gynaecology | Yes (8 sections) | ANC module (separate) |
| 8 | Nephrology | Yes (6 sections) | No |
| 9 | Neurology | Yes (5 sections) | No |
| 10 | Neuropsychiatry | Yes (7 sections) | No |
| 11 | Neurosurgery | Yes (6 sections) | No |
| 12 | Ophthalmology | Yes (6 sections) | Yes — `ophthalmology/` |
| 13 | Oral & Maxillofacial Surgery | Yes (6 sections) | No |
| 14 | Orthopaedics | Yes (6 sections) | No |
| 15 | Paediatrics | Yes (4 sections) | No |
| 16 | Plastic Surgery | Yes (6 sections) | No |
| 17 | Pulmonology | Yes (6 sections) | No |
| 18 | Urology | Yes (5 sections) | No |
| 19 | Dental | No (module only) | Yes — `dental/` |

---

## 2. Current Architecture Assessment

### What Exists Today

| Tier | Component | Purpose |
|------|-----------|---------|
| **Template-Driven Examination** | `SpecialtyExaminationRenderer` + 18 TypeScript templates | Dynamic examination forms per specialty — pure clinical findings capture |
| **SOAP Consultation Wizard** | `SpecialtyConsultationWizard` (7 steps) | Subjective → Objective → Assessment → Plan |
| **Generic Service Orders** | `SpecialtyOrdersStep` (8 tabs) | Lab, Radiology, Prescriptions, Procedures, Admission, Nursing Tasks, Internal Referrals, External NHIS Referrals |
| **Parallel Specialty Modules** | `ophthalmology/`, `dental/` | Standalone wizards with specialty-specific features (tooth charting, refraction) |
| **Physiotherapy Care Plan** | `physiotherapy/` | Plan → Session → Billing → Timeline (COMPLETE — reference implementation) |

### What Works Well

- All 18 examination templates correctly separate **clinical findings** from **service orders**
- `SpecialtyOrdersStep` is centralized — all specialties use the same ordering paradigm
- SOAP methodology enforced via 7-step wizard
- NHIS pre-authorization flags and billing integration built into order flow
- Physiotherapy demonstrates the full care plan → session → timeline → billing pattern

### What's Missing

| Gap | Impact |
|-----|--------|
| No **pre-consultation triage workflow** | Nurses cannot record clinic-specific tests before doctor sees patient |
| No **specialty-specific order set templates** | Doctors manually search for common tests every time |
| No **auto-calculated clinical scores** | GCS, IPSS, PHQ-9, NYHA etc. are plain fields, not computed |
| No **generic care plan / session tracking** | Only physiotherapy has longitudinal plan → session model |
| No **procedure result capture** | Procedures ordered and scheduled but findings have no structured form |
| Gynae **Pap Smear/Swabs** are radio buttons, not service orders | Specimen collected but no lab order auto-created |
| **Ophthalmology/Dental** diverge from template architecture | Parallel systems create maintenance burden |

---

## 3. Pre-Consultation Clinic Triage Workflow

### Clinical Reality in Nigerian Hospitals

In many specialty clinics, **patients perform diagnostic tests BEFORE seeing the doctor**. These are performed by nurses, technicians, or clinic assistants as part of clinic triage.

### Three Diagnostic Timing Scenarios

| Timing | Who Initiates | Who Performs | Where Results Go |
|--------|--------------|-------------|-----------------|
| **Pre-Consultation** | Clinic protocol (automatic) | Nurse / Technician | Visible in doctor's consultation screen |
| **During Consultation** | Doctor (service order) | Lab / Radiology / Diagnostics | Returns to patient record via result workflow |
| **Post-Consultation Same Visit** | Doctor (service order) | Clinic diagnostic unit | Returns to patient record, same encounter |

### Pre-Consultation Triage Tests by Specialty

| Specialty | Triage Tests (Before Doctor) | Performed By |
|-----------|------------------------------|-------------|
| **Ophthalmology** | Visual acuity, Tonometry (IOP), Autorefraction, Lensometry | Ophthalmic nurse/technician |
| **Cardiology** | Blood pressure, ECG, Pulse oximetry | Cardiac nurse/technician |
| **Gynaecology** | Weight, Blood pressure, Urine dipstick | Clinic nurse |
| **Paediatrics** | Weight, Height, Head circumference, Temperature | Paediatric nurse |
| **Nephrology** | Weight, Blood pressure, Urine dipstick | Clinic nurse |
| **Endocrinology** | Weight, Blood pressure, Random blood sugar | Clinic nurse |
| **Pulmonology** | SpO₂, Peak flow, Blood pressure | Respiratory nurse/technician |
| **Neurology** | Blood pressure, Weight | Clinic nurse |
| **Urology** | Blood pressure, Urine dipstick | Clinic nurse |
| **Neuropsychiatry** | Blood pressure, Weight, (PHQ-9 self-report questionnaire) | Clinic nurse |
| **Other surgical specialties** | Blood pressure, Weight, Wound inspection | Clinic nurse |

### System Implementation — Clinic Pre-Consultation Observations

```typescript
interface ClinicTriageObservation {
  id: string;
  patient_id: string;
  encounter_id: string;
  clinic_type: SpecialtyCode;           // 'OPHTHALMOLOGY', 'CARDIOLOGY', etc.
  observation_type: string;             // 'visual_acuity_right', 'ecg_rhythm', 'bp_systolic'
  observation_value: string;            // The recorded value
  observation_unit?: string;            // 'mmHg', 'mmol/L', '6/6', etc.
  observation_category: string;         // Groups: 'vitals', 'screening', 'measurement'
  normal_range?: string;                // Reference range for flagging
  is_abnormal?: boolean;               // Auto-flagged if outside range
  performed_by: string;                 // Staff UUID (nurse/technician)
  performed_at: string;                 // Timestamp
  notes?: string;                       // Free text observation notes
}
```

### Clinic Triage Configuration (Admin-Managed)

```typescript
interface ClinicTriageConfig {
  specialty_code: SpecialtyCode;
  test_name: string;                    // 'Visual Acuity (Right Eye)'
  test_code: string;                    // 'va_right'
  input_type: 'text' | 'number' | 'select' | 'measurement';
  options?: string[];                   // For select inputs
  unit?: string;                        // 'mmHg', 'kg', etc.
  normal_range?: { min?: number; max?: number };
  is_required: boolean;
  display_order: number;
}
```

### Timeline Integration

All triage observations must appear chronologically in the patient timeline:

```
Patient Registration
       ↓
Clinic Triage Observations Recorded      ← NEW
       ↓
Doctor Consultation
       ↓
Service Orders Created
       ↓
Test Results Returned
       ↓
Procedure Performed
       ↓
Care Plan Created
       ↓
Session 1 Completed
```

### Permissions

| Role | Can Do |
|------|--------|
| Nurse / Technician | Record triage observations |
| Doctor | View triage observations, create service orders |
| Administrator | Configure clinic triage test lists |

---

## 4. Mandatory Field-Classification Framework

**Every field or action in a specialty clinic must be classified as one of the following 7 types.** This prevents workflows from mixing categories incorrectly and ensures proper routing, billing, and timeline representation.

### The 7 Field Classifications

| Code | Classification | Definition | Storage | Timeline | Billing |
|------|---------------|------------|---------|----------|---------|
| **CF** | **Consultation Field** | Information obtained during history taking. Subjective data from the patient or referral. | `consultations.complaints`, `consultations.clinical_notes`, HPI, PMH, FHx, SHx, ROS | No (part of consultation entry) | No |
| **EF** | **Examination Field** | Physical findings observed/measured during the clinical encounter. Objective data recorded by the clinician. | `consultations.specialty_data` (JSONB) via specialty templates | No (part of consultation entry) | No |
| **SO** | **Service Order** | A diagnostic test or investigation routed to another department for execution. Results return to the patient record. | `lab_requests`, `radiology_requests`, `procedure_requests` | Yes — "Order Created" + "Result Available" | Yes — billable |
| **PR** | **Procedure** | A clinical intervention performed during or after the consultation (therapeutic, not diagnostic). | `clinical_requests` (type=Procedure/Surgery) | Yes — "Procedure Completed" | Yes — billable |
| **CT** | **Care-Plan Trigger** | A clinical decision that initiates a longitudinal treatment plan with recurring sessions. | `specialty_careplans` (to be created) | Yes — "Care Plan Created" | Plan creation may be billable |
| **SD** | **Session Data** | Data recorded during a recurring care session within a care plan. | `careplan_sessions.session_data` (JSONB) | Yes — "Session N Completed" | Yes — per-session billing |
| **TE** | **Timeline Event** | Clinical milestones that must appear in the patient's chronological record. Not data entry — generated automatically from other actions. | Generated from CF/EF/SO/PR/CT/SD actions | Yes — always | Depends on source |

### Classification Rules

1. **A field MUST belong to exactly ONE classification.** No field may be both an Examination Field and a Service Order.
2. **Examination findings that trigger a service order** must be split: the finding = EF, the order = SO. Example: Gynae "Pap Smear Taken: Yes" = EF. The lab cytology request = SO (auto-created from the EF).
3. **Triage observations (pre-consultation)** are classified as **EF** but tagged with `source: 'triage'` to distinguish from doctor-recorded examination fields.
4. **Clinical scores** (GCS, IPSS, PHQ-9) are **EF** — they are computed from examination data and stored with the consultation.
5. **Prescriptions** are a special case of **SO** — they are service orders routed to the pharmacy.
6. **Admission orders** are a special case of **PR** — they trigger an inpatient procedure.
7. **Referrals** (internal/external) are **SO** — they route the patient to another service.

### Field Classification Audit Per Specialty

The following table shows how EVERY current template section maps to classifications. Misclassified fields are flagged for correction.

#### Cardiology — Field Classification

| Template Section | Fields | Classification | Status |
|-----------------|--------|---------------|--------|
| General CV Examination | Appearance, JVP, peripheral edema | EF | ✅ Correct |
| Pulse & Blood Pressure | Heart rate, rhythm, volume, bilateral BP | EF | ✅ Correct |
| Peripheral Pulses | Carotid, femoral, popliteal, dorsalis pedis, posterior tibial | EF | ✅ Correct |
| Precordial Examination | Apex beat, thrills, heave, S1/S2, additional sounds | EF | ✅ Correct |
| Murmur Assessment | Timing, grade, location, radiation, character | EF | ✅ Correct |
| Chest/Lung Examination | Breath sounds, added sounds | EF | ✅ Correct |
| — | ECG (12-lead) | **SO** | ⚠️ Not in template (correct), needs order set |
| — | Echocardiogram | **SO** | ⚠️ Not in template (correct), needs order set |
| — | Troponin, BNP, Lipid panel | **SO** | ⚠️ Needs order set |
| — | NYHA class, CHA₂DS₂-VASc | **EF** (score) | ❌ Missing — needs scoring calculator |
| Pre-consultation: BP, ECG, SpO₂ | Triage observations | **EF** (triage) | ❌ Missing — needs triage workflow |

#### Ophthalmology — Field Classification

| Template Section | Fields | Classification | Status |
|-----------------|--------|---------------|--------|
| Visual Acuity | VA R/L unaided, corrected, pinhole, near, colour | EF | ⚠️ Often done as pre-consultation triage |
| Intraocular Pressure | Method, IOP R/L, classification | EF | ⚠️ Often done as pre-consultation triage |
| Pupils & Ocular Motility | RAPD, pupil shape, EOM | EF | ✅ Correct |
| External Eye | Eyelids, conjunctiva, cornea bilateral | EF | ✅ Correct |
| Anterior Segment / Slit Lamp | AC, lens, iris bilateral | EF | ✅ Correct |
| Posterior Segment / Fundoscopy | Disc, macula, vessels bilateral | EF | ✅ Correct |
| — | OCT, Visual field test, B-scan | **SO** | ⚠️ Needs order set |
| — | Refraction / Glasses prescription | **SO** (optical) | ⚠️ In parallel module, not in template |
| — | Cataract surgery, Laser treatment | **PR** | ⚠️ In parallel module |
| — | Glaucoma follow-up plan | **CT** | ❌ Missing |
| — | IOP per session, VA per session | **SD** | ❌ Missing |
| Pre-consultation: VA, IOP, Autorefraction | Triage observations | **EF** (triage) | ❌ Missing |

#### Gynaecology — Field Classification

| Template Section | Fields | Classification | Status |
|-----------------|--------|---------------|--------|
| General Examination | General appearance, nutrition | EF | ✅ Correct |
| Abdominal Examination | 5 fields | EF | ✅ Correct |
| External Genitalia / Vulva | Findings | EF | ✅ Correct |
| Speculum — Pap Smear Taken (radio) | Yes/No | EF | ✅ Correct as EF |
| Speculum — Pap Smear Lab Order | Cytology request | **SO** | ❌ **MISSING** — should auto-create when radio = Yes |
| Speculum — Swabs Taken (radio) | Yes/No | EF | ✅ Correct as EF |
| Speculum — Swab Lab Order | M&CS request | **SO** | ❌ **MISSING** — should auto-create when radio = Yes |
| Bimanual (PV) Examination | Cervix, uterus, adnexae, cul-de-sac | EF | ✅ Correct |
| Rectovaginal Examination | 4 conditional fields | EF | ✅ Correct |
| Breast Examination | 5 conditional fields | EF | ✅ Correct |
| Consent & Chaperone | Documentation fields | CF | ✅ Correct |
| — | Pelvic USS, HSG, hormonal profile | **SO** | ⚠️ Needs order set |
| — | Cervical screening follow-up | **CT** | ❌ Missing |
| Pre-consultation: Weight, BP, urine dipstick | Triage observations | **EF** (triage) | ❌ Missing |

#### Neuropsychiatry — Field Classification

| Template Section | Fields | Classification | Status |
|-----------------|--------|---------------|--------|
| General Appearance & Behaviour | Consciousness, behaviour, eye contact, psychomotor | EF | ✅ Correct |
| Speech | Rate, volume, fluency, coherence, abnormalities | EF | ✅ Correct |
| Mood & Affect | Subjective mood, affect, congruence | EF | ✅ Correct |
| Thought Process & Content | Form, delusions (8 types), obsessions | EF | ✅ Correct |
| Thought Content — Suicidal Ideation | 5-level scale | EF | ✅ Correct — but needs **safety alert trigger** |
| Thought Content — Homicidal Ideation | 3-level scale | EF | ✅ Correct — but needs **safety alert trigger** |
| Perception | Hallucinations (5 modalities) | EF | ✅ Correct |
| Cognition | MMSE range, orientation, memory | EF | ✅ Correct |
| Insight & Judgment | Awareness, insight, judgment | EF | ✅ Correct |
| — | PHQ-9, GAD-7, MMSE full, PANSS | **EF** (score) | ❌ Missing — needs scoring calculators |
| — | Psychiatric care plan | **CT** | ❌ Missing |
| — | Session mood/risk/compliance | **SD** | ❌ Missing |
| — | Safety alert on high-risk ideation | **TE** | ❌ Missing |

*(Remaining specialty field audits follow the same pattern — all examination fields are correctly EF, all investigations need SO order sets.)*

#### Quick Summary — All 19 Specialties Field Audit

| Specialty | EF Fields | Misclassified | SO Needed | PR Needed | CT Needed | SD Needed | Triage Needed |
|-----------|-----------|--------------|-----------|-----------|-----------|-----------|--------------|
| Cardiology | ~50 | 0 | Order sets | — | — | — | BP, ECG, SpO₂ |
| Dermatology | ~35 | 0 | Biopsy set | Biopsy | — | — | — |
| Endocrinology | ~40 | 0 | 4 order sets | — | — | — | Weight, BP, RBS |
| ENT | ~21 | 0 | Audiometry set | FESS | — | — | — |
| Gastroenterology | ~40 | 0 | 4 order sets | Endoscopy | — | — | — |
| General Surgery | ~35 | 0 | Pre-op set | Surgical | Future | — | BP, Weight |
| Gynaecology | ~50 | **2** (Pap/Swab) | 3 order sets | — | Cervical screening | — | Weight, BP, urine |
| Nephrology | ~35 | 0 | Renal set | Biopsy | Dialysis | Dialysis sessions | Weight, BP, urine |
| Neurology | ~36 | 0 | 4 order sets | LP | — | — | BP, Weight |
| Neuropsychiatry | ~45 | 0 | — | — | Psychiatric plan | Session data | BP, Weight, PHQ-9 |
| Neurosurgery | ~36 | 0 | 3 order sets | Craniotomy | Post-op plan | — | BP, GCS |
| Ophthalmology | ~42 | 0 | OCT/VF set | Cataract/Laser | Glaucoma plan | IOP/VA sessions | VA, IOP, Refraction |
| OMFS | ~45 | 0 | OPG/CBCT set | Surgical | — | — | BP |
| Orthopaedics | ~50+ | 0 | Fracture/Joint set | Surgical | Fracture mgmt | ROM sessions | BP, Weight |
| Paediatrics | ~30 | 0 | 2 order sets | — | Growth/Immunization | Growth data | Weight, Height, HC, Temp |
| Plastic Surgery | ~40 | 0 | Wound set | Graft/Flap | Wound mgmt | Wound sessions | BP, Weight |
| Pulmonology | ~35 | 0 | 4 order sets | Bronchoscopy | — | — | SpO₂, Peak flow, BP |
| Urology | ~35 | 0 | 3 order sets | Cystoscopy | — | — | BP, Urine dipstick |
| Dental | Module | N/A | Module | Procedures | Treatment plan | Procedure sessions | — |

---

## 5. Workflow Type Definitions (Primary / Secondary)

Instead of forcing each specialty into one rigid category, each specialty has a **primary workflow** and optionally **secondary workflows** it participates in.

### Workflow Types

| Type | Code | Pattern | What It Activates |
|------|------|---------|------------------|
| **Consultation-Dominant** | A | Single encounter: history → exam → diagnosis → prescriptions/referrals. Visit is self-contained. | SOAP wizard + generic orders |
| **Investigation/Procedure-Dominant** | B | Encounter drives significant test ordering or procedures. Results reviewed in follow-up. Scoring systems used. | SOAP wizard + **specialty order sets** + **scoring calculators** + procedure scheduling |
| **Longitudinal Care Plan** | C | Initial encounter creates a treatment plan. Patient returns for structured recurring sessions. Progress tracked over time. | SOAP wizard + orders + **care plan engine** + **session tracking** + **trend charts** |

### Specialty Workflow Classification

| # | Specialty | Primary | Secondary | Pre-Consultation Triage |
|---|-----------|---------|-----------|------------------------|
| 1 | Cardiology | **B** | C | BP, ECG, SpO₂ |
| 2 | Dermatology | **A** | B | — |
| 3 | Endocrinology | **B** | C | Weight, BP, RBS |
| 4 | ENT | **A** | B | — |
| 5 | Gastroenterology | **B** | — | — |
| 6 | General Surgery | **B** | C | BP, Weight |
| 7 | Gynaecology | **B** | C | Weight, BP, Urine dipstick |
| 8 | Nephrology | **B** | C | Weight, BP, Urine dipstick |
| 9 | Neurology | **B** | — | BP |
| 10 | Neuropsychiatry | **A** | C | BP, Weight, PHQ-9 |
| 11 | Neurosurgery | **B** | C | BP, GCS |
| 12 | Ophthalmology | **B** | C | VA, IOP, Autorefraction |
| 13 | OMFS | **B** | C | BP |
| 14 | Orthopaedics | **B** | C | BP, Weight |
| 15 | Paediatrics | **A** | B, C | Weight, Height, HC, Temp |
| 16 | Plastic Surgery | **B** | C | BP, Weight |
| 17 | Pulmonology | **B** | — | SpO₂, Peak flow, BP |
| 18 | Urology | **B** | — | BP, Urine dipstick |
| 19 | Dental | **B** | C | — |

### What Each Workflow Type Activates

**All specialties get** (baseline):
- SOAP consultation wizard (7 steps)
- Specialty examination template
- Generic service orders (8 tabs)
- Clinical timeline entries

**Type A adds**: Nothing beyond baseline — consultation is self-contained.

**Type B adds**:
- Specialty order set templates (pre-bundled investigation panels)
- Clinical scoring calculators (where applicable)
- Diagnosis-triggered order suggestions

**Type C adds** (on top of B):
- Generic care plan creation from consultation
- Session scheduling and tracking
- Per-session data recording forms
- Trend charts for longitudinal measurements
- Session-level billing

---

## 6. Per-Specialty Detailed Analysis

### 6.1 CARDIOLOGY — Primary B, Secondary C

**Template**: 7 sections, ~50 examination fields — all correctly classified as **EF**

**Pre-Consultation Triage**:
- Blood pressure (systolic/diastolic) — Nurse
- 12-lead ECG — Cardiac technician
- Pulse oximetry (SpO₂) — Nurse

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Chest Pain Workup | ECG, Troponin, CXR, Lipid panel |
| Heart Failure Workup | BNP/NT-proBNP, Echo (TTE), CXR, U&E, LFTs |
| AF Assessment | ECG, Echo, TFTs, Coagulation, Holter |
| Cardiac Catheterization | ECG, FBC, U&E, Coag, G&S, Echo |

**Scoring Calculators** (EF — computed):
| Score | Items | Auto-Classification |
|-------|-------|-------------------|
| NYHA Class | 4 classes from symptom description | I (no limitation) → IV (symptoms at rest) |
| CHA₂DS₂-VASc | 7 risk factors, max score 9 | 0 (low) → ≥2 (anticoagulate) |
| Framingham Risk | Age, sex, cholesterol, BP, smoking, diabetes | 10-year CV risk % |

**Care Plan (Secondary C)**: Heart failure management — medication titration, serial echo, BNP trending

---

### 6.2 DERMATOLOGY — Primary A, Secondary B

**Template**: 5 sections, ~35 fields — all **EF**

**Pre-Consultation Triage**: None (direct consultation)

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Dermatology Quick Orders | Skin biopsy (punch/excisional/shave), patch testing, KOH prep, fungal culture |
| Topical Treatment Set | Common topicals (grouped by potency class) |

**Procedures** (PR): Skin biopsy, cryotherapy, excision

**No care plan needed** — consultations are self-contained. Photo documentation attachment recommended.

---

### 6.3 ENDOCRINOLOGY — Primary B, Secondary C

**Template**: 6 sections, ~40 fields — all **EF**

**Pre-Consultation Triage**: Weight, BP, Random blood sugar

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Diabetes Workup | HbA1c, FBG, lipid panel, U&E, eGFR, urinary ACR |
| Thyroid Workup | TSH, fT3, fT4, thyroid antibodies, thyroid USS |
| Pituitary Workup | Prolactin, cortisol, ACTH, GH, IGF-1, gonadotropins, MRI pituitary |
| Adrenal Workup | Cortisol (AM/PM), ACTH stimulation, 24h urinary cortisol, adrenal CT |

**Scoring Calculators** (EF): HbA1c trend tracking, Diabetic complication screening checklist

**Care Plan (Secondary C)**: Diabetic annual review — eyes, feet, kidneys, CVS screening

---

### 6.4 ENT — Primary A, Secondary B

**Template**: 3 sections, ~21 fields — all **EF**

**Pre-Consultation Triage**: None (direct consultation)

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| ENT Infection Set | Throat/ear swab M&CS, FBC |
| Hearing Assessment | Audiometry, tympanometry |
| Sinus Workup | CT sinuses, nasal endoscopy |

**Procedures** (PR): FESS, tonsillectomy, myringotomy, nasal endoscopy

**Template Enhancement**: Add optional "Endoscopy Findings" section (conditional on endoscopy performed in-office)

---

### 6.5 GASTROENTEROLOGY — Primary B

**Template**: 6 sections, ~40 fields — all **EF**

**Pre-Consultation Triage**: None standard

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Liver Screen | LFTs, hepatitis serology (A/B/C), autoimmune screen, iron studies, AFP, liver USS |
| Upper GI Workup | H. pylori, OGD, barium swallow |
| Lower GI Workup | Colonoscopy, stool M/C/S, stool occult blood, CT abdomen |
| Pancreatitis Workup | Amylase, lipase, CT abdomen, MRCP |

**Scoring Calculators** (EF):
- **Child-Pugh Score** — bilirubin, albumin, INR, ascites, encephalopathy → Class A/B/C
- **MELD Score** — bilirubin, INR, creatinine → transplant listing priority

**Procedures** (PR): OGD, colonoscopy — add structured endoscopy findings section

---

### 6.6 GENERAL SURGERY — Primary B, Secondary C

**Template**: 6 sections, ~35 fields — all **EF**

**Pre-Consultation Triage**: BP, Weight

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Surgical Pre-Op | FBC, U&E, coagulation, G&S, CXR, ECG (>40y), urinalysis |
| Acute Abdomen | FBC, U&E, LFTs, amylase, AXR, USS abdomen |

**Procedures** (PR): Hernia repair, appendicectomy, cholecystectomy — surgical booking + scheduling

**Template Enhancement**: Add conditional "Pre-operative Assessment" section (ASA grade, anaesthesia fitness, consent)

**Care Plan (Secondary C)**: Post-operative wound healing tracking (future)

---

### 6.7 GYNAECOLOGY — Primary B, Secondary C

**Template**: 8 sections, ~50 fields — mostly **EF**, **2 fields misclassified**

**Pre-Consultation Triage**: Weight, BP, Urine dipstick

**Misclassification Fix Required**:
- "Pap Smear Taken: Yes" (EF) → must auto-create **cytology lab order** (SO)
- "Swabs Taken: Yes" (EF) → must auto-create **M&CS lab order** (SO)

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Fertility Workup | FSH, LH, E2, progesterone, AMH, prolactin, TFT, pelvic USS, HSG |
| Cervical Screening | Pap smear, HPV DNA, colposcopy |
| Menorrhagia Workup | FBC, TFT, coagulation, pelvic USS, endometrial biopsy |

**Procedures** (PR): Colposcopy, cervical biopsy, D&C, laparoscopy

**Care Plan (Secondary C)**: Cervical screening pathway — Pap → result → colposcopy → biopsy → treatment → follow-up

**ANC Integration**: Link to existing `anc/` module when pregnancy confirmed

---

### 6.8 NEPHROLOGY — Primary B, Secondary C

**Template**: 6 sections, ~35 fields — all **EF**

**Pre-Consultation Triage**: Weight, BP, Urine dipstick

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Renal Workup | U&E, eGFR, urinalysis, 24h urine protein, renal USS |
| CKD Monitoring | U&E, eGFR, calcium, phosphate, PTH, albumin, HbA1c |
| Dialysis Pre-Assessment | FBC, U&E, LFTs, coag, hepatitis B/C, HIV, blood group |

**Scoring Calculators** (EF):
- **CKD Stage** — auto from eGFR (G1-G5) + albuminuria (A1-A3)

**Procedures** (PR): Renal biopsy, AVF creation, catheter insertion

**Care Plan (Secondary C)**: Dialysis session tracking — Kt/V, URR, fluid removal, access monitoring per session

---

### 6.9 NEUROLOGY — Primary B

**Template**: 5 sections, ~36 fields — all **EF**

**Pre-Consultation Triage**: BP

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Stroke Protocol | CT Brain (urgent), FBC, coag, G&S, lipid panel, HbA1c, ECG, Echo |
| Seizure Workup | EEG, MRI Brain, FBC, U&E, calcium, magnesium, prolactin |
| Headache Workup | CT/MRI Brain, ESR, CRP |
| Neuropathy Workup | EMG/NCS, HbA1c, B12, TFT, HIV |

**Scoring Calculators** (EF):
- **GCS** — auto-sum E + V + M components (already captured, needs auto-total)
- **NIHSS** — 11-item stroke severity score
- **mRS** — Modified Rankin Scale (0-6)

**Procedures** (PR): Lumbar puncture

---

### 6.10 NEUROPSYCHIATRY — Primary A, Secondary C

**Template**: 7 sections, ~45 fields — all **EF** — **Outstanding quality**

**Pre-Consultation Triage**: BP, Weight, PHQ-9 self-report questionnaire

**Scoring Calculators** (EF):
| Score | Items | Classification |
|-------|-------|---------------|
| PHQ-9 | 9 questions | Minimal (0-4) → Severe (20-27) |
| GAD-7 | 7 questions | Minimal → Severe |
| MMSE | 30 items | Normal (24-30) → Severe (<10) |
| PANSS | 30 items (P7 + N7 + G16) | Positive/Negative/General scales |
| AUDIT | 10 questions | Low risk → Dependence |
| CAGE | 4 questions | 0-1 low → ≥2 problem drinking |

**Safety Alert System** (TE):
- When suicidal ideation = "active_with_plan" or "active_with_intent" → **mandatory safety protocol**
- Consultation cannot be completed without documented safety assessment and plan
- Notification to supervising clinician

**Care Plan (Secondary C)**: Psychiatric treatment plan —
- Per-session: mood scores, risk reassessment, medication compliance, side effects
- Medication titration tracking
- Psychotherapy session notes (CBT, IPT, psychodynamic)
- Crisis intervention level tracking
- Mood/symptom trend charts (PHQ-9, GAD-7 over sessions)

---

### 6.11 NEUROSURGERY — Primary B, Secondary C

**Template**: 6 sections, ~36 fields — all **EF**

**Pre-Consultation Triage**: BP, GCS (if emergency)

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Emergency Head Injury | CT Brain (urgent), FBC, coag, G&S, CT C-spine |
| Spinal Surgery Workup | MRI spine, CT myelogram, NCS, pre-op bloods |
| Brain Tumour Workup | MRI Brain + contrast, CT staging, hormonal profile |

**Scoring Calculators** (EF): GCS auto-sum + GCS trend tracking

**Care Plan (Secondary C)**: Post-craniotomy/spinal surgery follow-up plan

---

### 6.12 OPHTHALMOLOGY — Primary B, Secondary C

**Template**: 6 sections, ~42 fields — all **EF**
**Parallel Module**: `ophthalmology/` (EyeExamWizard, refraction, procedures)

**Pre-Consultation Triage** (heavy):
- Visual acuity R/L (unaided, corrected, pinhole)
- Intraocular pressure R/L
- Autorefraction R/L
- Lensometry

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Glaucoma Assessment | Visual field test, OCT (RNFL), gonioscopy, pachymetry |
| Diabetic Eye Screening | Fundal photography, OCT (macula), FFA |
| Cataract Pre-Op | Biometry (IOL calculation), FBC, RBS, BP |
| Retinal Assessment | OCT, FFA, B-scan USS |

**Procedures** (PR): Cataract surgery, laser (YAG/SLT/PRP), intravitreal injection

**Care Plan (Secondary C)**:
- Glaucoma management — IOP tracking per session, medication compliance, visual field progression
- Post-surgical follow-up — VA tracking, wound status, IOP monitoring

**Module Strategy**: Keep standalone ophthalmology module for specialized UI (refraction, slit lamp grids), share data layer with template system for consistency

---

### 6.13 OMFS — Primary B, Secondary C

**Template**: 6 sections, ~45 fields — all **EF**

**Pre-Consultation Triage**: BP

**Order Sets Needed** (SO): OPG, CBCT, CT maxillofacial, biopsy

**Procedures** (PR): Tooth extraction, osteotomy, fracture fixation, reconstruction

**Shared Component**: Reuse dental `DentalChart.tsx` for tooth-by-tooth charting

---

### 6.14 ORTHOPAEDICS — Primary B, Secondary C

**Template**: 6 sections, ~50+ fields (includes 20+ special tests) — all **EF**

**Pre-Consultation Triage**: BP, Weight

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Fracture Workup | X-ray (AP + lateral), CT, FBC, coag |
| Joint Workup | X-ray, MRI, arthrocentesis + synovial fluid analysis |
| Pre-Op Ortho | FBC, U&E, coag, G&S, CXR, ECG |

**Scoring Calculators** (EF): ROM progression tracking

**Care Plan (Secondary C)**: Fracture management plan —
- Per-session: X-ray comparison, ROM measurement, weight-bearing status
- Outcome: union / malunion / non-union
- Cross-referral to physiotherapy

---

### 6.15 PAEDIATRICS — Primary A, Secondary B+C

**Template**: 4 sections, ~30 fields — all **EF**

**Pre-Consultation Triage**: Weight, Height, Head circumference (age <2), Temperature

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Neonatal Workup | Bilirubin, blood group, Coombs, TFT, metabolic screen |
| Febrile Child | FBC, blood culture, urinalysis + M/C/S, malaria parasite, CRP, CXR |

**Care Plan (Secondary C)**:
- **Growth monitoring** — WHO growth charts, weight/height/HC plotted longitudinally with percentile/Z-score
- **Immunization schedule** — NPI schedule with due dates, catch-up tracking
- **Developmental milestones** — Age-gated screening (Denver/ASQ)

**Special Feature**: Weight-based dosing calculator for prescriptions

---

### 6.16 PLASTIC SURGERY — Primary B, Secondary C

**Template**: 6 sections, ~40 fields — all **EF**

**Pre-Consultation Triage**: BP, Weight

**Order Sets Needed** (SO): Wound swab C&S, tissue biopsy, photography order

**Procedures** (PR): Debridement, skin graft, flap surgery, burn excision

**Care Plan (Secondary C)**: Chronic wound management — serial wound measurements (L×W×D), healing trajectory, dressing protocol

---

### 6.17 PULMONOLOGY — Primary B

**Template**: 6 sections, ~35 fields — all **EF**

**Pre-Consultation Triage**: SpO₂, Peak flow, BP

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| COPD Workup | Spirometry, CXR, ABG, sputum M/C/S |
| Asthma Workup | Spirometry + reversibility, peak flow diary, allergy testing |
| Lung Mass Workup | CT chest, bronchoscopy + BAL, sputum cytology, PET-CT |
| TB Workup | Sputum AFB (×3), GeneXpert, Mantoux, CXR |

**Scoring Calculators** (EF):
- **GOLD Staging** — COPD severity from FEV₁ (Stage I-IV)
- **ACT Score** — 5-question Asthma Control Test (≤19 = uncontrolled)

**Procedures** (PR): Bronchoscopy, thoracentesis

---

### 6.18 UROLOGY — Primary B

**Template**: 5 sections, ~35 fields — all **EF**

**Pre-Consultation Triage**: BP, Urine dipstick

**Order Sets Needed** (SO):
| Order Set | Tests |
|-----------|-------|
| Prostate Workup | PSA, free PSA, U&E, urinalysis, PVR USS, TRUS |
| Stone Workup | U&E, calcium, uric acid, urinalysis, KUB X-ray, CT KUB |
| Hematuria Workup | Urinalysis, urine cytology, USS KUB, CT urogram, cystoscopy |

**Scoring Calculators** (EF):
- **IPSS** — upgrade from single number to 7-item questionnaire with auto-sum and severity (mild 0-7, moderate 8-19, severe 20-35)
- **PSA trend** tracking

**Procedures** (PR): Cystoscopy, TURP, lithotripsy

---

### 6.19 DENTAL — Primary B, Secondary C

**Module Only**: `dental/` — DentalChart, DentalExamWizard, DentalProcedureList

**Pre-Consultation Triage**: None standard

**Procedures** (PR): Scaling, extraction, filling, RCT, crown, implant

**Care Plan (Secondary C)**: Dental treatment plan → sessions (each session = procedures on specific teeth)

**Shared Component**: Share `DentalChart.tsx` with OMFS template

---

## 7. Order Set Architecture

### Proposed Structure

```typescript
interface SpecialtyOrderSet {
  id: string;
  specialty_code: SpecialtyCode;
  name: string;                  // "Chest Pain Workup"
  description: string;
  clinical_scenario: string;     // "New patient with acute chest pain"
  orders: {
    lab_tests: OrderItem[];      // { id, name, specimen_type }
    imaging: OrderItem[];        // { id, name, modality, body_part }
    procedures: OrderItem[];     // { id, name, category }
    prescriptions?: DrugConfig[];
  };
  is_default: boolean;
  is_system: boolean;            // true = shipped with EMR, false = facility-created
  created_by?: string;
}
```

**Storage Strategy**: TypeScript constants for system defaults + DB table for facility-customized sets. Admin UI for creating/editing custom order sets.

---

## 8. Care Plan Engine (Generic)

### Database Schema

```sql
-- Generic care plan table (all specialties except physiotherapy which is already done)
CREATE TABLE specialty_careplans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  encounter_id UUID REFERENCES visits(id),
  specialty_code VARCHAR(50) NOT NULL,
  plan_type VARCHAR(100) NOT NULL,       -- 'glaucoma_management', 'dialysis', etc.
  plan_name TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Active',   -- Active, Completed, Cancelled, On_Hold
  diagnosis TEXT[],                       -- ICD-10 codes
  goals TEXT[],
  baseline_data JSONB,                   -- Initial measurements
  total_sessions INT,                    -- NULL = ongoing
  frequency VARCHAR(50),                 -- 'Weekly', 'Monthly', etc.
  expected_duration VARCHAR(50),
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE careplan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  careplan_id UUID NOT NULL REFERENCES specialty_careplans(id),
  session_number INT NOT NULL,
  status VARCHAR(20) DEFAULT 'Scheduled', -- Scheduled, Completed, Missed, Cancelled
  scheduled_date DATE,
  completed_date TIMESTAMPTZ,
  session_data JSONB NOT NULL DEFAULT '{}',  -- Specialty-specific session data
  notes TEXT,
  assessment TEXT,
  plan_for_next TEXT,
  recorded_by UUID REFERENCES staff(id),
  billing_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Session Data Shapes by Specialty

| Specialty | session_data JSONB shape |
|-----------|------------------------|
| Ophthalmology | `{ iop_right, iop_left, va_right, va_left, medication_compliance, visual_field_md }` |
| Neuropsychiatry | `{ phq9_score, gad7_score, suicidal_ideation, medication_compliance, side_effects, therapy_notes }` |
| Orthopaedics | `{ rom_flexion, rom_extension, pain_level, weight_bearing_status, xray_comparison }` |
| Nephrology (dialysis) | `{ kt_v, urr, fluid_removed_ml, pre_weight, post_weight, access_assessment }` |
| Paediatrics (growth) | `{ weight_kg, height_cm, head_circumference_cm, bmi, percentile, z_score }` |
| Dental | `{ teeth_treated: [...], procedures_done: [...], next_teeth_planned: [...] }` |
| Plastic Surgery (wound) | `{ wound_length, wound_width, wound_depth, wound_edges, granulation_pct }` |

---

## 9. Clinical Scoring Engine

### Generic Scoring Template

```typescript
interface ClinicalScoreDefinition {
  id: string;
  name: string;                   // "PHQ-9"
  full_name: string;              // "Patient Health Questionnaire-9"
  specialty_codes: SpecialtyCode[]; // Which specialties use this
  items: ScoreItem[];
  max_score: number;
  severity_ranges: SeverityRange[];
  interpretation_notes?: string;
}

interface ScoreItem {
  id: string;
  question: string;
  options: { value: number; label: string }[];
}

interface SeverityRange {
  min: number;
  max: number;
  label: string;                  // "Mild", "Moderate", "Severe"
  color: string;                  // For UI display
  clinical_action?: string;       // "Consider treatment", "Urgent referral"
}
```

### Scores to Implement

| Score | Specialty | Items | Max | Severity Ranges |
|-------|-----------|-------|-----|-----------------|
| GCS | Neurology, Neurosurgery | 3 (E+V+M) | 15 | 3-8 Severe, 9-12 Moderate, 13-15 Mild |
| NYHA | Cardiology | 4 classes | IV | I-IV |
| CHA₂DS₂-VASc | Cardiology | 7 factors | 9 | 0 Low, 1 Moderate, ≥2 High |
| Child-Pugh | Gastroenterology | 5 factors | 15 | A (5-6), B (7-9), C (10-15) |
| MELD | Gastroenterology | 3 labs | 40 | <10 Low, 10-19 Moderate, ≥20 High |
| IPSS | Urology | 7 questions | 35 | 0-7 Mild, 8-19 Moderate, 20-35 Severe |
| PHQ-9 | Neuropsychiatry | 9 questions | 27 | 0-4 Min, 5-9 Mild, 10-14 Mod, 15-19 ModSev, 20-27 Severe |
| GAD-7 | Neuropsychiatry | 7 questions | 21 | 0-4 Min, 5-9 Mild, 10-14 Mod, 15-21 Severe |
| MMSE | Neuropsychiatry | 30 items | 30 | 24-30 Normal, 18-23 Mild, 10-17 Moderate, <10 Severe |
| NIHSS | Neurology | 11 items | 42 | 0 No stroke, 1-4 Minor, 5-15 Moderate, 16-20 ModSevere, 21-42 Severe |
| GOLD | Pulmonology | FEV₁ % predicted | — | I (≥80), II (50-79), III (30-49), IV (<30) |
| ACT | Pulmonology | 5 questions | 25 | ≤19 Uncontrolled, 20-24 Partly, 25 Well controlled |
| CKD Stage | Nephrology | eGFR value | — | G1 (≥90), G2 (60-89), G3a (45-59), G3b (30-44), G4 (15-29), G5 (<15) |

---

## 10. Architecture Decisions

### Decision 1: Order Set Storage
**Approach**: TypeScript constants for system defaults + DB table for facility-customized sets.

### Decision 2: Care Plan Architecture
**Approach**: Generic `specialty_careplans` + `careplan_sessions` tables with JSONB session data. Physiotherapy keeps its existing dedicated tables. New specialties use the generic system.

### Decision 3: Ophthalmology Module Strategy
**Approach**: Keep standalone ophthalmology module for specialized UI (refraction, slit lamp). Share data layer with generic care plan system for glaucoma/post-op tracking.

### Decision 4: Scoring Calculator Framework
**Approach**: Reusable `ClinicalScoreCalculator` component library. Score definitions as TypeScript constants. Component renders questions, auto-calculates, auto-classifies severity.

### Decision 5: Psychiatric Safety Alert
**Approach**: Visual alert + forced documentation (safety plan required before consultation completion) + supervisor notification on high-risk ideation.

### Decision 6: Pre-Consultation Triage
**Approach**: `clinic_triage_observations` table + configurable triage test lists per specialty + Nurse/Technician triage interface + auto-display in doctor's consultation screen.

---

## 11. Implementation Order

### Execution Approach: One Specialty at a Time

Each specialty implementation includes:
1. Pre-consultation triage configuration (if applicable)
2. Order set definitions
3. Scoring calculators (if applicable)
4. Care plan + session forms (if Secondary C)
5. Template field corrections (if misclassified)
6. UI integration + timeline events

### Recommended Starting Specialty: **CARDIOLOGY**

**Why Cardiology first:**
- Primary B workflow — establishes order set pattern
- Secondary C — establishes care plan pattern (heart failure)
- Has pre-consultation triage (BP, ECG, SpO₂) — establishes triage workflow
- 3 scoring calculators (NYHA, CHA₂DS₂-VASc, Framingham) — establishes scoring engine
- Template is excellent (7 sections, ~50 fields) — no corrections needed
- Most Nigerian hospitals have cardiology clinics
- Clean, well-defined — sets the pattern for all other specialties

### Full Implementation Sequence

| Order | Specialty | Why This Order |
|-------|-----------|---------------|
| 1 | **Cardiology** | Establishes B+C+triage+scoring patterns |
| 2 | **Ophthalmology** | Heaviest triage, existing module to integrate |
| 3 | **Neuropsychiatry** | Safety-critical scoring, care plan for psychiatric tracking |
| 4 | **Gynaecology** | Fixes Pap/Swab misclassification, cervical screening plan |
| 5 | **Nephrology** | Dialysis care plan, CKD staging |
| 6 | **Orthopaedics** | Fracture care plan, ROM tracking, physio cross-referral |
| 7 | **Paediatrics** | Growth chart, immunization tracker |
| 8 | **Neurology** | GCS/NIHSS scoring, stroke protocol order sets |
| 9 | **Gastroenterology** | Child-Pugh/MELD scoring, endoscopy findings |
| 10 | **Endocrinology** | Diabetes/thyroid order sets, HbA1c trending |
| 11 | **Pulmonology** | GOLD/ACT scoring, spirometry integration |
| 12 | **Urology** | IPSS upgrade, prostate/stone order sets |
| 13 | **General Surgery** | Pre-op order set, surgical booking |
| 14 | **Neurosurgery** | Emergency order sets, GCS trending, post-op plan |
| 15 | **Dental** | Treatment plan sessions, share chart with OMFS |
| 16 | **OMFS** | Shared dental chart, surgical order sets |
| 17 | **Plastic Surgery** | Wound tracking care plan |
| 18 | **ENT** | Quick orders, endoscopy section |
| 19 | **Dermatology** | Biopsy order set, photo documentation |

---

*Document generated from comprehensive codebase analysis of 18 specialty examination templates, 36 renderer modules, consultation wizard, order system, clinical requests, treatment plans, and existing parallel modules (ophthalmology, dental). Physiotherapy excluded — already complete.*
