# AI Clinical Assistant — NDC Medical Centre EMR

## Overview

The AI Clinical Assistant is embedded in every **Consultation tab** of the NDC Medical Centre EMR. It enables doctors to query a patient's complete medical history using natural language, get clinical decision support, draft notes, and check documentation completeness — all within the patient's encounter context.

The system uses a **hybrid retrieval** approach (PostgreSQL full-text search + pgvector embeddings) scoped to the current patient, then feeds results to an LLM for clinical summarization with citations. Every interaction is audit-logged.

---

## How It Works

```
  Step 1                Step 2                 Step 3                 Step 4                Step 5
  ┌──────────┐     ┌───────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐
  │ Doctor   │     │ Hybrid Retrieval  │  │ Context Assembly │  │ LLM Summarizes  │  │ Audit Log    │
  │ asks a   │────▶│ FTS + Vector      │─▶│ Top records into │─▶│ with citations + │─▶│ userId,      │
  │ question │     │ scoped to         │  │ bounded context  │  │ no-hallucination │  │ patientId,   │
  │ (patient │     │ patientId +       │  │ window (≤8K      │  │ rules. Structured│  │ sources,     │
  │ context) │     │ RBAC/RLS          │  │ tokens)          │  │ response format  │  │ timestamp    │
  └──────────┘     └───────────────────┘  └──────────────────┘  └─────────────────┘  └──────────────┘
```

1. **Doctor asks a question** — within the currently opened patient's encounter context.
2. **Backend runs hybrid retrieval** — full-text search (GIN/tsvector) + vector similarity (pgvector/HNSW), both scoped to `patientId` with RBAC/RLS enforcement.
3. **Top records are assembled** into a bounded context window (≤8K tokens), with source metadata preserved.
4. **LLM summarizes** the results with citations, structured response format, and strict no-hallucination rules. Clinical notes are treated as **data, not instructions** (prompt-injection defense).
5. **Interaction is logged** — userId, patientId, encounterId, timestamp, request type, sources used, output summary.

---

## Key Features

- **Patient Timeline Summary** — Structured history from all prior encounters
- **Current Encounter Brief** — Snapshot of chief complaint, vitals, labs, active meds + missing data flags
- **Medication & Allergy Intelligence** — Cross-checks prescriptions against allergies and drug interactions
- **Lab & Vitals Trend Insights** — Detects clinically significant trends (rising creatinine, persistent hypertension, etc.)
- **Clinical Note Drafting** — SOAP / assessment / follow-up drafts (always doctor-approved before saving)
- **Differential Support** — Non-prescriptive differential suggestions with confidence levels
- **ICD-10 Coding Suggestions** — Diagnosis and procedure code suggestions from encounter data
- **Claim Readiness Checks** — Detects missing NHIS/Private/FFS claim-critical fields
- **Documentation Completeness Score** — "What's missing" checklist per encounter
- **Smart Record Search** — Hybrid full-text + vector search across all clinical tables
- **Clinical Citations** — Every AI answer includes source records (encounter date, record type, ID) for verification

---

## Security Model & Compliance

| Control | Implementation |
|---|---|
| **Patient scoping (server-side)** | AI can only access the currently opened patient's records. Enforced server-side — never trust UI. Cross-patient requests are blocked and logged. |
| **RBAC/RLS enforcement** | All retrieval queries run through Supabase RLS. Users only see what their role permits. AI responses cannot bypass existing access controls. |
| **Audit logging** | Every AI interaction is logged: `userId`, `patientId`, `encounterId`, `timestamp`, `request_type`, `sources_used`, `output_summary`. Supports compliance review. |
| **Prompt-injection defense** | Patient notes are injected as **data context**, never as instructions. System prompt is hardcoded server-side. User input is sanitized before LLM submission. |
| **PHI handling policy** | **Cloud (OpenAI):** PHI is sent to OpenAI API with BAA coverage. **On-premise (Ollama):** All data stays on local hardware, zero external calls. Facility chooses deployment mode via `AI_PROVIDER` env var. |
| **No hallucination policy** | If data is not found in the patient record, AI must respond "Not found in record". Never invents data. |
| **Access check in RPC** | Every database function validates that `auth.uid()` has access to `p_patient_id` before returning any data. |

---

## Limitations

- **Advisory only** — AI provides decision support, not final diagnosis or autonomous prescribing.
- **AI may miss context not documented** — Suggestions are only as good as the data entered into the EMR.
- **Requires clinician verification** — All AI outputs must be independently validated before clinical action.
- **Subject to error** — AI may suggest incorrect diagnoses, miss conditions, or generate responses based on incomplete records.
- **Not a substitute** for medical education, clinical experience, or professional consultation.
- **Data quality dependent** — Missing records, incomplete documentation, or data entry errors directly affect AI output quality.

---

## AI Clinical Assistant — Feature Specification (Consultation Tab)

The EMR includes an AI-powered clinical assistant embedded in every **Consultation tab**. It is designed to reduce time spent searching records, improve documentation quality, and support clinical decision-making — while enforcing strict privacy controls and audit logging.

---

### A. Core Clinical Features

#### A1. Patient Timeline Summary
- Summarizes key history from prior encounters (problem list, major diagnoses, procedures).
- Highlights chronic conditions, important events, and recent changes.
- Presents history in reverse-chronological order with encounter type labels.
- Example prompt: *"Summarize this patient's medical history"* → returns a structured timeline of major clinical events.

#### A2. Current Encounter Brief
- Generates a concise snapshot of the current encounter context:
  - Chief complaint
  - Current vitals
  - Recent labs (today / this encounter)
  - Active medications
- Flags **missing key information** that is usually required for documentation (e.g., no vitals recorded, no diagnosis entered yet).
- Designed to give the doctor an at-a-glance summary before they begin documenting.

#### A3. Medication & Allergy Intelligence
- Summarizes medication history (start/stop dates where available, adherence notes if recorded).
- Highlights **allergies and past adverse reactions** from `patients.known_allergies` and encounter records.
- Cross-checks current prescriptions against documented allergies.
- Flags known drug-drug interactions when prescriptions are entered.
- Example: *"Is this patient allergic to any antibiotics?"* → searches allergy records and past adverse events.

#### A4. Lab & Vitals Trend Insights
- Detects trends in longitudinal data:
  - Rising creatinine → possible renal decline
  - Persistent hypertension across visits → uncontrolled BP
  - Falling hemoglobin → chronic anemia or active bleeding
  - Worsening HbA1c → poor diabetic control
- Points clinicians to the **exact test dates and values** used for the trend analysis.
- Example prompt: *"Show me this patient's BP trend over the last 6 months"* → returns a date-ordered value list with trend direction.

#### A5. Clinical Note Drafting (Doctor-in-Control)
- Drafts structured notes based on existing encounter data:
  - **SOAP notes** — Subjective / Objective / Assessment / Plan
  - **Assessment & Plan** — Based on current complaints, vitals, and labs
  - **Follow-up notes** — Based on previous plan and current status
- **Always requires clinician review before saving** (human-in-the-loop).
- Draft is presented in an editable text area — doctor can accept, modify, or discard.
- Never auto-saves to the patient record without explicit doctor confirmation.

#### A6. Differential Support (Non-Prescriptive)
- Suggests possible differentials based on documented symptoms, history, vitals, and lab results.
- Clearly states **uncertainty level** and does not replace clinical judgment.
- Each suggestion includes:
  - Relevance indicator (High / Medium / Low)
  - Clinical basis (which patient data supports the suggestion)
  - Recommended confirmatory investigations
- Example: Doctor enters fever + elevated WBC + cough → AI suggests: *"Consider: Community-Acquired Pneumonia (High), Acute Bronchitis (Medium), TB (Low — order sputum AFB if risk factors present)."*

---

### B. Coding, Billing & Administrative Support

#### B1. Diagnosis & Procedure Coding Suggestions
- Suggests **ICD-10 codes** (and optional procedure codes) based on documented problems and encounter details.
- Designed to reduce missing or incorrect coding (final selection remains with clinician/billing team).
- Reads from `consultations.diagnosis`, `consultations.assessment`, `consultations.plan` to infer appropriate codes.
- Example: Doctor documents "Type 2 Diabetes Mellitus with peripheral neuropathy" → AI suggests: *E11.40 — Type 2 diabetes mellitus with diabetic neuropathy, unspecified*.

#### B2. Claim Readiness Checks (NHIS / Private / Fee-for-Service)
- Detects **missing claim-critical fields** before submission/export:
  - Diagnosis linkage to the encounter
  - Encounter completeness (vitals recorded, consultation documented)
  - Required documentation for NHIS claims
- Highlights gaps and provides a "fix list" for the clinician or billing team.
- Example: *"This encounter is missing a linked diagnosis and discharge notes — required for NHIS claim submission."*

#### B3. Documentation Completeness Score
- Checks if required fields exist for the current encounter:
  - Vitals recorded? ✅ / ❌
  - Chief complaint documented? ✅ / ❌
  - Diagnosis entered? ✅ / ❌
  - Plan documented? ✅ / ❌
  - Follow-up instructions? ✅ / ❌
  - Medication list updated? ✅ / ❌
- Provides a **"what's missing" checklist** for the clinician.
- Score displayed as a percentage (e.g., "Documentation: 4/6 fields complete — 67%").

---

### C. Search & Retrieval (Data Access Features)

#### C1. Smart Record Search
- Finds relevant past notes, diagnoses, labs, and prescriptions using structured filters.
- Supports natural language queries: *"Has this patient ever been treated for malaria?"*
- Uses **hybrid search** (full-text + vector similarity) for accurate retrieval across all clinical tables.
- **V2 (Optional):** Semantic search across free-text notes using embeddings + pgvector for fuzzy/contextual matching.

#### C2. Clinical Citations
- **Every AI answer includes "sources used"** to support verification:
  - Encounter dates
  - Record types (consultation, lab result, radiology, nursing note, etc.)
  - Source record IDs (clickable links to navigate to the original record)
- Example: *"Based on consultation from 2025-11-15 (Enc: NDC-ENC-0042) and lab result from 2025-11-16 (Lab: FBC-0089)."*
- Ensures doctors can always trace back and verify AI outputs against the actual record.

---

### D. Safety, Privacy & Compliance (Non-Negotiable)

#### D1. Strict Patient Scoping
- The AI can **only access the currently opened patient's records** (`patientId` + `encounterId` context).
- Cross-patient requests are **blocked and logged**.
- No population-level queries — the AI operates strictly within the single patient scope.

#### D2. Role-Based Access Control (RBAC)
- AI responses respect **existing RBAC/RLS rules**: users can only see what they already have permission to see.
- Non-clinical staff cannot access the AI clinical assistant.
- Admin can configure which roles have access to AI features.

#### D3. Audit Logging
- Logs **every AI interaction**:
  - `userId` — who asked
  - `patientId` — which patient
  - `encounterId` — which encounter
  - `timestamp` — when
  - `request_type` — query / draft / differential / coding suggestion
  - `sources_used` — which records were accessed
  - `output_summary` — summarized AI response
- Supports compliance review, accountability, and usage analytics.

#### D4. No Hallucination Policy
- If a data element is **not found** in the patient record, the AI must respond with **"Not found in record"**.
- The AI **never invents, guesses, or extrapolates data** that doesn't exist in the EMR.
- All outputs are traceable to specific source records.

#### D5. Clinical Disclaimer (Always Visible)
- The AI provides **decision support**, not final diagnosis or autonomous prescribing.
- Clinicians must validate outputs before acting or saving.
- A disclaimer banner is permanently visible on the AI panel:
  > *"AI suggestions are advisory only. The clinician is solely responsible for all clinical decisions."*

---

### E. Roadmap — Optional Enhancements (Future Releases)

| Feature | Description | Priority |
|---|---|---|
| **Risk Flagging Rules** | Detects risk signals (e.g., repeated abnormal labs, uncontrolled vitals) and suggests follow-up actions (non-prescriptive). Configurable thresholds per facility. | Medium |
| **Smart Order Suggestions** | Suggests relevant investigations/orders based on documented guidelines (e.g., diabetic patient overdue for HbA1c). Configurable per facility protocol. | Medium |
| **Patient Education Generator** | Generates patient-friendly explanations of diagnoses, medications, and discharge instructions in plain language. Supports multiple languages. | Low |
| **Voice / Dictation Integration** | Supports speech-to-text note drafting (optional module). Doctor dictates → AI transcribes → structured SOAP note draft. | Low |
| **Clinical Protocol Templates** | Pre-built AI prompts for common clinical scenarios (antenatal care checklist, post-op assessment, chronic disease review). | Medium |
| **Multi-Encounter Comparison** | Side-by-side comparison of clinical data across encounters to track disease progression. | Low |

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOCTOR'S WORKSTATION                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  AI Query Panel (React Component)                         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  "Show me all diabetic labs for NDC-0042 last 6mo"  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │         │                                                  │  │
│  │         ▼                                                  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  AI Response Panel                                   │  │  │
│  │  │  1) Direct Answer                                    │  │  │
│  │  │  2) Supporting Evidence (date + source)              │  │  │
│  │  │  3) Missing Data warnings                            │  │  │
│  │  │  4) Clinical Cautions                                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ IPC / API call
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ELECTRON MAIN PROCESS                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  AI Query Handler (ipcMain)                               │  │
│  │  1. Parse query → extract patient_id + intent             │  │
│  │  2. Run hybrid search (full-text + vector)                │  │
│  │  3. Assemble context window from matched records          │  │
│  │  4. Send to LLM with system prompt                        │  │
│  │  5. Return structured clinical response                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SQL / RPC
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE / POSTGRESQL                         │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │  FULL-TEXT INDEX  │  │  VECTOR STORE (pgvector)             │ │
│  │  (GIN / tsvector) │  │  patient_record_embeddings           │ │
│  │                   │  │  ┌────────────────────────────────┐  │ │
│  │  patients.doc     │  │  │ id | patient_id | source_table │  │ │
│  │  consultations.doc│  │  │ source_id | chunk_text         │  │ │
│  │  nursing_notes.doc│  │  │ embedding(1536) | metadata     │  │ │
│  │  lab_requests.doc │  │  │ created_at | updated_at        │  │ │
│  │  vitals.doc       │  │  └────────────────────────────────┘  │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  EXISTING CLINICAL TABLES (unchanged)                     │   │
│  │  patients | visits | consultations | vitals               │   │
│  │  prescriptions | lab_requests | lab_results               │   │
│  │  radiology_requests | scan_results | nursing_notes        │   │
│  │  daily_progress_notes | ward_round_notes                  │   │
│  │  treatment_plans | treatment_tasks | referrals            │   │
│  │  patient_chief_complaints | admissions | procedures       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Your Existing Data Model — Fields Used for AI Context

### 2.1 Patient Demographics (table: `patients`)

| Field | Use in AI Context |
|-------|-------------------|
| `emr_number` | Patient identifier for query matching |
| `first_name`, `surname`, `middle_name` | Name matching |
| `gender`, `date_of_birth` | Age/sex context for clinical reasoning |
| `blood_group` | Critical for transfusion queries |
| `known_allergies` (text[]) | **HIGH PRIORITY** — allergy safety checks |
| `clinical_summary` | Pre-existing clinical overview |
| `patient_category`, `insurance_type` | Administrative context |
| `nhis_number` | Insurance context |
| `current_status` | OPD / In-Patient / Discharged / Deceased |

### 2.2 Encounters (table: `visits`)

| Field | Use in AI Context |
|-------|-------------------|
| `encounter_number` | Encounter reference |
| `encounter_date` | Timeline ordering |
| `visit_type` | Type of visit |
| `chief_complaint` | Primary reason for visit |
| `encounter_category` | outpatient / inpatient / emergency / day_case |
| `status` | Active / Closed |
| `discharge_notes` | Discharge summary text |
| `stage_history` (jsonb) | Workflow progression |

### 2.3 Consultations (table: `consultations`)

| Field | Use in AI Context |
|-------|-------------------|
| `subjective` | Patient-reported symptoms (SOAP-S) |
| `objective` | Clinical exam findings (SOAP-O) |
| `assessment` | Doctor's assessment (SOAP-A) |
| `plan` | Treatment plan (SOAP-P) |
| `diagnosis` (text[]) | ICD codes / diagnoses |
| `differential_diagnosis` (text[]) | DDx list |
| `complaints` | Chief complaints text |
| `history_of_present_illness` | HPI narrative |
| `past_medical_history` | PMH narrative |
| `examination_findings` | Physical exam |
| `clinical_notes` | Free-text clinical notes |
| `treatment_plan` | Treatment plan text |
| `follow_up_notes` | Follow-up instructions |

### 2.4 Vitals (table: `vitals`)

| Field | Use in AI Context |
|-------|-------------------|
| `temperature`, `blood_pressure_systolic/diastolic` | Vital signs |
| `pulse`, `respiratory_rate`, `oxygen_saturation` | Vital signs |
| `weight`, `height`, `bmi` | Anthropometrics |
| `blood_glucose` | Metabolic monitoring |
| `pain_level` | Pain assessment |
| `is_critical` | Critical flag |
| `date_recorded` | Timeline |

### 2.5 Lab Requests & Results (tables: `lab_requests`, `lab_results`)

| Field | Use in AI Context |
|-------|-------------------|
| `clinical_notes` | Why test was ordered |
| `result_value`, `result_unit` | Quantitative results |
| `result_status` | Normal / Abnormal / Critical |
| `reference_range` | For comparison |
| `interpretation` | Clinical interpretation |
| `is_critical` | Critical flags |
| `is_abnormal` | Abnormal flags |

### 2.6 Prescriptions (table: `prescriptions`)

| Field | Use in AI Context |
|-------|-------------------|
| `drug_name` | Medication name |
| `dosage`, `frequency`, `duration`, `route` | Dosing details |
| `quantity_prescribed`, `quantity_dispensed` | Compliance tracking |
| `instructions` | Special instructions |
| `status` | Pending / Dispensed |

### 2.7 Radiology (tables: `radiology_requests`, `scan_results`)

| Field | Use in AI Context |
|-------|-------------------|
| `imaging_type`, `body_part` | What was scanned |
| `clinical_indication` | Why it was ordered |
| `findings`, `impression` | Radiologist report |
| `recommendation` | Follow-up recommendation |

### 2.8 Nursing Notes (table: `nursing_notes`)

| Field | Use in AI Context |
|-------|-------------------|
| `note_type` | Progress_Note / Observation / Assessment |
| `content` | Note body |
| `patient_condition` | Stable / Improving / Deteriorating / Critical |
| `pain_level` | Pain score |
| `interventions_performed` | What was done |
| `patient_response` | How patient responded |
| `is_critical` | Critical flag |

### 2.9 Ward Round Notes (table: `ward_round_notes`)

| Field | Use in AI Context |
|-------|-------------------|
| `subjective_notes`, `objective_findings` | SOAP notes |
| `assessment`, `plan` | SOAP continued |
| `vital_signs` | Vitals snapshot |
| `patient_condition` | Clinical status |
| `nursing_instructions` | Nurse orders |
| `new_orders`, `discontinued_orders` | Medication changes |

### 2.10 Additional Tables

| Table | Key Fields |
|-------|------------|
| `daily_progress_notes` | subjective, objective, assessment, plan, patient_condition, io_notes |
| `treatment_plans` | title, description, instructions, status |
| `treatment_tasks` | task_type, description, status, result_value |
| `triage_assessments` | all vitals + triage_level, triage_color, consciousness |
| `patient_chief_complaints` | complaint linkage with duration |
| `referrals` | reason_for_referral, clinical_summary, status |
| `referral_outcomes` | outcome_type, outcome_description |
| `admissions` | admission_status, acuity_level, primary_diagnosis |
| `procedures` | procedure details and outcomes |
| `medical_reports` | report_type, report_content |
| `doctor_orders` | order details |

---

## 3. Database Setup — SQL Migration

### 3.1 Enable pgvector Extension

```sql
-- Migration: 001_enable_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3.2 Create Vector Store Table

```sql
-- Migration: 002_create_patient_record_embeddings.sql

CREATE TABLE IF NOT EXISTS public.patient_record_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Link to patient
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Source record tracking
  source_table varchar(50) NOT NULL,       -- 'consultations', 'lab_requests', etc.
  source_id uuid NOT NULL,                 -- PK of the source row
  encounter_id uuid,                       -- FK to visits.id
  
  -- Text chunk (what was embedded)
  chunk_text text NOT NULL,
  chunk_type varchar(30) NOT NULL,         -- 'soap_note', 'lab_result', 'vitals', 'nursing', 'prescription', etc.
  
  -- The embedding vector (OpenAI text-embedding-3-small = 1536 dims)
  embedding vector(1536) NOT NULL,
  
  -- Metadata for filtering
  record_date timestamptz,                 -- When the clinical event occurred
  metadata jsonb DEFAULT '{}',             -- Extra tags: {diagnosis: [...], is_critical: true}
  
  -- Housekeeping
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast vector similarity search (HNSW — recommended by Supabase for robustness)
-- HNSW requires no ANALYZE/tuning and performs well as data grows/changes.
-- If you prefer IVFFlat: USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- but you'll need to run ANALYZE and tune lists/probes periodically.
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON patient_record_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Index for patient-scoped queries
CREATE INDEX idx_embeddings_patient ON patient_record_embeddings(patient_id);
CREATE INDEX idx_embeddings_source ON patient_record_embeddings(source_table, source_id);
CREATE INDEX idx_embeddings_date ON patient_record_embeddings(record_date DESC);
CREATE INDEX idx_embeddings_chunk_type ON patient_record_embeddings(chunk_type);
```

### 3.3 Add Full-Text Search Columns

```sql
-- Migration: 003_add_fulltext_search.sql

-- Consultations full-text index
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE consultations SET search_document = to_tsvector('english',
  coalesce(subjective, '') || ' ' ||
  coalesce(objective, '') || ' ' ||
  coalesce(assessment, '') || ' ' ||
  coalesce(plan, '') || ' ' ||
  coalesce(complaints, '') || ' ' ||
  coalesce(history_of_present_illness, '') || ' ' ||
  coalesce(past_medical_history, '') || ' ' ||
  coalesce(examination_findings, '') || ' ' ||
  coalesce(clinical_notes, '') || ' ' ||
  coalesce(diagnosis_text, '') || ' ' ||
  coalesce(array_to_string(diagnosis, ' '), '') || ' ' ||
  coalesce(array_to_string(differential_diagnosis, ' '), '')
);

CREATE INDEX idx_consultations_fts ON consultations USING GIN(search_document);

-- Trigger to auto-update on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_consultation_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.subjective, '') || ' ' ||
    coalesce(NEW.objective, '') || ' ' ||
    coalesce(NEW.assessment, '') || ' ' ||
    coalesce(NEW.plan, '') || ' ' ||
    coalesce(NEW.complaints, '') || ' ' ||
    coalesce(NEW.history_of_present_illness, '') || ' ' ||
    coalesce(NEW.past_medical_history, '') || ' ' ||
    coalesce(NEW.examination_findings, '') || ' ' ||
    coalesce(NEW.clinical_notes, '') || ' ' ||
    coalesce(NEW.diagnosis_text, '') || ' ' ||
    coalesce(array_to_string(NEW.diagnosis, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.differential_diagnosis, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consultation_fts
  BEFORE INSERT OR UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_consultation_search_doc();

-- Nursing notes full-text index
ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE nursing_notes SET search_document = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(content, '') || ' ' ||
  coalesce(interventions_performed, '') || ' ' ||
  coalesce(patient_response, '') || ' ' ||
  coalesce(follow_up_notes, '')
);

CREATE INDEX idx_nursing_notes_fts ON nursing_notes USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_nursing_note_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.content, '') || ' ' ||
    coalesce(NEW.interventions_performed, '') || ' ' ||
    coalesce(NEW.patient_response, '') || ' ' ||
    coalesce(NEW.follow_up_notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nursing_note_fts
  BEFORE INSERT OR UPDATE ON nursing_notes
  FOR EACH ROW EXECUTE FUNCTION update_nursing_note_search_doc();

-- Lab requests full-text index
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE lab_requests SET search_document = to_tsvector('english',
  coalesce(clinical_notes, '') || ' ' ||
  coalesce(result_notes, '') || ' ' ||
  coalesce(interpretation, '') || ' ' ||
  coalesce(methodology, '')
);

CREATE INDEX idx_lab_requests_fts ON lab_requests USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_lab_request_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.clinical_notes, '') || ' ' ||
    coalesce(NEW.result_notes, '') || ' ' ||
    coalesce(NEW.interpretation, '') || ' ' ||
    coalesce(NEW.methodology, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lab_request_fts
  BEFORE INSERT OR UPDATE ON lab_requests
  FOR EACH ROW EXECUTE FUNCTION update_lab_request_search_doc();

-- Daily progress notes full-text index
ALTER TABLE daily_progress_notes ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE daily_progress_notes SET search_document = to_tsvector('english',
  coalesce(subjective, '') || ' ' ||
  coalesce(objective, '') || ' ' ||
  coalesce(assessment, '') || ' ' ||
  coalesce(plan, '') || ' ' ||
  coalesce(nursing_summary, '') || ' ' ||
  coalesce(io_notes, '')
);

CREATE INDEX idx_progress_notes_fts ON daily_progress_notes USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_progress_note_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.subjective, '') || ' ' ||
    coalesce(NEW.objective, '') || ' ' ||
    coalesce(NEW.assessment, '') || ' ' ||
    coalesce(NEW.plan, '') || ' ' ||
    coalesce(NEW.nursing_summary, '') || ' ' ||
    coalesce(NEW.io_notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_progress_note_fts
  BEFORE INSERT OR UPDATE ON daily_progress_notes
  FOR EACH ROW EXECUTE FUNCTION update_progress_note_search_doc();

-- Ward round notes full-text index
ALTER TABLE ward_round_notes ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE ward_round_notes SET search_document = to_tsvector('english',
  coalesce(subjective_notes, '') || ' ' ||
  coalesce(objective_findings, '') || ' ' ||
  coalesce(assessment, '') || ' ' ||
  coalesce(plan, '') || ' ' ||
  coalesce(nursing_instructions, '') || ' ' ||
  coalesce(discharge_planning_notes, '')
);

CREATE INDEX idx_ward_round_fts ON ward_round_notes USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_ward_round_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.subjective_notes, '') || ' ' ||
    coalesce(NEW.objective_findings, '') || ' ' ||
    coalesce(NEW.assessment, '') || ' ' ||
    coalesce(NEW.plan, '') || ' ' ||
    coalesce(NEW.nursing_instructions, '') || ' ' ||
    coalesce(NEW.discharge_planning_notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ward_round_fts
  BEFORE INSERT OR UPDATE ON ward_round_notes
  FOR EACH ROW EXECUTE FUNCTION update_ward_round_search_doc();
```

### 3.4 Hybrid Search RPC Function

> **Implementation notes:**
> - Uses `websearch_to_tsquery` instead of `plainto_tsquery` for more natural "Google-like" doctor queries (e.g., `"treated for hypertension last year"` works without special syntax).
> - Every function includes a **patient access check** — verifies `auth.uid()` has permission to access `p_patient_id` before returning data. This is non-negotiable in EMR practice.
> - If using `SECURITY DEFINER`, also `SET search_path = public` and validate user role.
> - **PK field name note:** Replace PK field names in SQL with your actual schema PKs (e.g., `id` vs `consultation_id` vs `request_id`). Check `schema.sql` before running migrations.

```sql
-- Migration: 004_hybrid_search_rpc.sql

-- ============================================================
-- ACCESS CHECK HELPER
-- Verifies the calling user can access the given patient.
-- Adapt to your access model (e.g., patient_access table,
-- facility assignment, or care team membership).
-- ============================================================
CREATE OR REPLACE FUNCTION verify_patient_access(p_patient_id uuid)
RETURNS void AS $$
BEGIN
  -- Option 1: Direct access table
  IF NOT EXISTS (
    SELECT 1 FROM patient_access
    WHERE user_id = auth.uid() AND patient_id = p_patient_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user % cannot access patient %',
      auth.uid(), p_patient_id;
  END IF;

  -- Option 2 (alternative): Check via facility/care team
  -- IF NOT EXISTS (
  --   SELECT 1 FROM staff s
  --   JOIN patients p ON p.facility_id = s.facility_id
  --   WHERE s.user_id = auth.uid() AND p.id = p_patient_id
  -- ) THEN
  --   RAISE EXCEPTION 'Access denied';
  -- END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- FULL-TEXT SEARCH (websearch_to_tsquery for natural queries)
-- ============================================================
CREATE OR REPLACE FUNCTION search_patient_records_fulltext(
  p_patient_id uuid,
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  encounter_id uuid,
  record_date timestamptz,
  snippet text,
  rank real
) AS $$
BEGIN
  -- Access control: verify caller can access this patient
  PERFORM verify_patient_access(p_patient_id);

  RETURN QUERY

  -- Consultations
  SELECT 
    'consultations'::text,
    c.consultation_id,          -- ⚠️ Replace with actual PK from your schema
    c.encounter_id,
    c.consultation_date,
    ts_headline('english', 
      coalesce(c.subjective,'') || ' ' || coalesce(c.assessment,'') || ' ' || coalesce(c.plan,''),
      websearch_to_tsquery('english', p_query),
      'MaxWords=60, MinWords=20'
    ),
    ts_rank(c.search_document, websearch_to_tsquery('english', p_query))
  FROM consultations c
  JOIN visits v ON c.encounter_id = v.id
  WHERE v.patient_id = p_patient_id
    AND c.search_document @@ websearch_to_tsquery('english', p_query)

  UNION ALL

  -- Nursing notes
  SELECT
    'nursing_notes'::text,
    n.id,
    n.encounter_id,
    n.created_at,
    ts_headline('english', n.content, websearch_to_tsquery('english', p_query), 'MaxWords=60, MinWords=20'),
    ts_rank(n.search_document, websearch_to_tsquery('english', p_query))
  FROM nursing_notes n
  WHERE n.patient_id = p_patient_id
    AND n.search_document @@ websearch_to_tsquery('english', p_query)

  UNION ALL

  -- Lab requests
  SELECT
    'lab_requests'::text,
    lr.request_id,              -- ⚠️ Replace with actual PK from your schema
    lr.encounter_id,
    lr.created_at,
    ts_headline('english',
      coalesce(lr.clinical_notes,'') || ' ' || coalesce(lr.interpretation,''),
      websearch_to_tsquery('english', p_query),
      'MaxWords=60, MinWords=20'
    ),
    ts_rank(lr.search_document, websearch_to_tsquery('english', p_query))
  FROM lab_requests lr
  JOIN visits v ON lr.encounter_id = v.id
  WHERE v.patient_id = p_patient_id
    AND lr.search_document @@ websearch_to_tsquery('english', p_query)

  UNION ALL

  -- Daily progress notes
  SELECT
    'daily_progress_notes'::text,
    dpn.progress_id,            -- ⚠️ Replace with actual PK from your schema
    v.id,
    dpn.recorded_at,
    ts_headline('english',
      coalesce(dpn.subjective,'') || ' ' || coalesce(dpn.assessment,'') || ' ' || coalesce(dpn.plan,''),
      websearch_to_tsquery('english', p_query),
      'MaxWords=60, MinWords=20'
    ),
    ts_rank(dpn.search_document, websearch_to_tsquery('english', p_query))
  FROM daily_progress_notes dpn
  JOIN visits v ON dpn.encounter_id::uuid = v.id
  WHERE v.patient_id = p_patient_id
    AND dpn.search_document @@ websearch_to_tsquery('english', p_query)

  UNION ALL

  -- Ward round notes
  SELECT
    'ward_round_notes'::text,
    wrn.id,
    wrn.encounter_id,
    wrn.created_at,
    ts_headline('english',
      coalesce(wrn.subjective_notes,'') || ' ' || coalesce(wrn.assessment,'') || ' ' || coalesce(wrn.plan,''),
      websearch_to_tsquery('english', p_query),
      'MaxWords=60, MinWords=20'
    ),
    ts_rank(wrn.search_document, websearch_to_tsquery('english', p_query))
  FROM ward_round_notes wrn
  WHERE wrn.encounter_id IN (SELECT id FROM visits WHERE patient_id = p_patient_id)
    AND wrn.search_document @@ websearch_to_tsquery('english', p_query)

  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- VECTOR SIMILARITY SEARCH
-- ============================================================
CREATE OR REPLACE FUNCTION search_patient_records_vector(
  p_patient_id uuid,
  p_query_embedding vector(1536),
  p_limit int DEFAULT 20,
  p_similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  encounter_id uuid,
  record_date timestamptz,
  chunk_text text,
  chunk_type text,
  similarity float
) AS $$
BEGIN
  -- Access control: verify caller can access this patient
  PERFORM verify_patient_access(p_patient_id);

  RETURN QUERY
  SELECT
    pre.source_table,
    pre.source_id,
    pre.encounter_id,
    pre.record_date,
    pre.chunk_text,
    pre.chunk_type::text,
    1 - (pre.embedding <=> p_query_embedding) AS similarity
  FROM patient_record_embeddings pre
  WHERE pre.patient_id = p_patient_id
    AND 1 - (pre.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY pre.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- COMBINED HYBRID SEARCH: full-text + vector re-ranking
-- ============================================================
CREATE OR REPLACE FUNCTION search_patient_records_hybrid(
  p_patient_id uuid,
  p_query text,
  p_query_embedding vector(1536),
  p_limit int DEFAULT 15,
  p_fulltext_weight float DEFAULT 0.4,
  p_vector_weight float DEFAULT 0.6
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  encounter_id uuid,
  record_date timestamptz,
  content_snippet text,
  combined_score float
) AS $$
BEGIN
  -- Access control: verify caller can access this patient
  -- (also checked inside sub-functions, but defense-in-depth)
  PERFORM verify_patient_access(p_patient_id);

  RETURN QUERY
  WITH fulltext_hits AS (
    SELECT ft.source_table, ft.source_id, ft.encounter_id, ft.record_date,
           ft.snippet, ft.rank::float AS ft_score
    FROM search_patient_records_fulltext(p_patient_id, p_query, 50) ft
  ),
  vector_hits AS (
    SELECT vs.source_table, vs.source_id, vs.encounter_id, vs.record_date,
           vs.chunk_text, vs.similarity AS vec_score
    FROM search_patient_records_vector(p_patient_id, p_query_embedding, 50, 0.5) vs
  ),
  combined AS (
    SELECT
      COALESCE(f.source_table, v.source_table) AS source_table,
      COALESCE(f.source_id, v.source_id) AS source_id,
      COALESCE(f.encounter_id, v.encounter_id) AS encounter_id,
      COALESCE(f.record_date, v.record_date) AS record_date,
      COALESCE(f.snippet, v.chunk_text) AS content_snippet,
      (COALESCE(f.ft_score, 0) * p_fulltext_weight + COALESCE(v.vec_score, 0) * p_vector_weight) AS combined_score
    FROM fulltext_hits f
    FULL OUTER JOIN vector_hits v ON f.source_table = v.source_table AND f.source_id = v.source_id
  )
  SELECT c.source_table, c.source_id, c.encounter_id, c.record_date, c.content_snippet, c.combined_score
  FROM combined c
  ORDER BY c.combined_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 4. Embedding Generation Pipeline

### 4.1 Chunking Strategy

> **Key principle: Don't embed everything equally.** Embed narrative fields (high semantic value). Use SQL for structured/numeric data (vitals trends, lab values, prescription records). This reduces cost, improves relevance, and keeps the system fast.

#### What to Embed (High Semantic Value — narrative text)

| Source Table | Chunk Template |
|---|---|
| `consultations` | `"Consultation on {date}: Chief Complaint: {complaints}. HPI: {history_of_present_illness}. Exam: {examination_findings}. Assessment: {assessment}. Diagnosis: {diagnosis}. Plan: {plan}."` |
| `radiology_requests` | `"Imaging {imaging_type} ({body_part}) on {date}: Indication: {clinical_indication}. Findings: {findings}. Impression: {impression}"` |
| `nursing_notes` | `"Nursing {note_type} on {date}: {content}. Condition: {patient_condition}. Pain: {pain_level}/10. Interventions: {interventions_performed}. Response: {patient_response}"` |
| `ward_round_notes` | `"Ward Round on {date}: S: {subjective_notes}. O: {objective_findings}. A: {assessment}. P: {plan}. Condition: {patient_condition}. Nursing Instructions: {nursing_instructions}"` |
| `daily_progress_notes` | `"Progress Note {date}: S: {subjective}. O: {objective}. A: {assessment}. P: {plan}. Condition: {patient_condition}. I/O: {io_notes}"` |
| `referrals` | `"Referral on {date}: Reason: {reason_for_referral}. Clinical Summary: {clinical_summary}. Status: {status}"` |
| `admissions` | `"Admission on {date}: Diagnosis: {primary_diagnosis}. Acuity: {acuity_level}. Status: {admission_status}"` |
| `visits` (discharge) | `"Discharge on {date}: Notes: {discharge_notes}."` |

#### What NOT to Embed (Use SQL Instead)

| Source Table | Why SQL is Better | Retrieval Method |
|---|---|---|
| `vitals` | Numeric values — trend detection is more accurate with SQL `ORDER BY date_recorded` + window functions (rising/falling analysis) | Direct SQL query with date range + `LAG()` for trends |
| `lab_results` | Numeric results with reference ranges — SQL can filter `is_abnormal`, `is_critical`, and compute deltas between tests | Direct SQL query filtering by `result_status`, date, test name |
| `prescriptions` | Structured fields (drug_name, dosage, frequency) — exact match SQL is cleaner than semantic search | Direct SQL query on `drug_name`, `status`, date range |

#### Hybrid Retrieval Strategy

```
Doctor asks: "Is this patient's kidney function declining?"

  Vectors → Search narrative notes for mentions of "renal", "kidney", "dialysis", "creatinine concerns"
  SQL    → Query lab_results WHERE test_name LIKE '%creatinine%' ORDER BY date → compute trend
  SQL    → Query vitals for BP trends (hypertension compounds renal issues)

  Context window = narrative hits + structured trend data → LLM summarizes
```

This means `chunkBuilder.ts` only generates embeddings for narrative tables, while `aiService.ts` runs direct SQL for structured data and merges both into the LLM context window.

### 4.2 Embedding Model Options

| Provider | Model | Dimensions | Cost | Offline? |
|----------|-------|------------|------|----------|
| **OpenAI** | `text-embedding-3-small` | 1536 | $0.02/1M tokens | No |
| **OpenAI** | `text-embedding-3-large` | 3072 | $0.13/1M tokens | No |
| **HuggingFace** | `all-MiniLM-L6-v2` | 384 | Free | Yes (local) |
| **Ollama** | `nomic-embed-text` | 768 | Free | Yes (local) |

**Recommendation:** For a fully local/offline deployment, pair **Ollama `phi3:latest`** for chat with **Ollama `nomic-embed-text`** for embeddings. Use **OpenAI `text-embedding-3-small`** only when you explicitly want a cloud setup.

### 4.3 When to Generate Embeddings

| Event | Action |
|-------|--------|
| New consultation saved | Generate embedding for consultation chunk |
| Nursing note created | Generate embedding for nursing note chunk |
| Radiology report uploaded | Generate embedding for radiology chunk |
| Ward round note saved | Generate embedding for ward round chunk |
| Daily progress note saved | Generate embedding for progress note chunk |
| Referral created | Generate embedding for referral chunk |
| Admission recorded | Generate embedding for admission chunk |
| Patient discharged | Generate embedding for discharge notes chunk |
| Patient allergies updated | Re-generate patient demographics embedding |

> **Not embedded on write:** Vitals, lab results, and prescriptions. These are queried via direct SQL with trend/filter logic at query time.

---

## 5. LLM Clinical Prompt System

### 5.1 System Prompt Template

```
You are an AI clinical assistant inside the NDC Medical Centre EMR system.
You are helping a doctor query a specific patient's medical records.

RULES:
1. Only use the provided patient context data. NEVER guess or fabricate data.
2. If asked for data outside this patient, refuse politely.
3. If asked to prescribe, provide clinical guidance and ask the clinician to verify.
4. Always cite the source: encounter date + record type (consultation/lab/vitals/meds/imaging/nursing).
5. Flag any critical findings or safety concerns.
6. Note any missing data that would be clinically relevant.

RESPONSE FORMAT:
1) **Direct Answer** — Short, clear answer to the doctor's question
2) **Supporting Evidence** — List of evidence with (date | source_type)
3) **Missing Data** — Any gaps in the record
4) **Clinical Caution** — Safety alerts, drug interactions, allergy warnings

PATIENT CONTEXT:
{patient_demographics}

RELEVANT RECORDS (from hybrid search):
{search_results}

KNOWN ALLERGIES: {allergies}
```

### 5.2 LLM Provider Options

| Provider | Model | Context Window | Cost | Offline? |
|----------|-------|---------------|------|----------|
| **OpenAI** | `gpt-4o` | 128K tokens | $2.50/1M input | No |
| **OpenAI** | `gpt-4o-mini` | 128K tokens | $0.15/1M input | No |
| **Ollama** | `llama3.1:8b` | 128K | Free | Yes (local) |
| **Ollama** | `mistral:7b` | 32K | Free | Yes (local) |

**Recommendation:** For quality clinical reasoning, use **gpt-4o-mini** (cheap + accurate). For fully offline, use **Ollama llama3.1:8b**.

---

## 6. Implementation — File Structure

```
src/
├── main/
│   ├── aiService.ts                    # Main process AI handler (IPC)
│   └── aiAuditLogger.ts                # AI interaction audit logging
│
├── renderer/
│   ├── modules/
│   │   └── ai-assistant/
│   │       ├── components/
│   │       │   ├── AIChatPanel.tsx      # Main chat UI (embedded in Consultation tab)
│   │       │   ├── AIQueryInput.tsx     # Query input with quick-prompt suggestions
│   │       │   ├── AIResponseCard.tsx   # Structured clinical response display
│   │       │   ├── AISourceCitation.tsx # Clickable evidence citations → navigate to record
│   │       │   ├── AIDifferentialPanel.tsx    # Differential diagnosis suggestion panel
│   │       │   ├── AINoteDraftEditor.tsx      # Clinical note draft (editable, human-in-loop)
│   │       │   ├── AICompletenessScore.tsx    # Documentation completeness score widget
│   │       │   ├── AICodingSuggestions.tsx    # ICD-10 / procedure code suggestions
│   │       │   ├── AIClaimReadiness.tsx       # Claim readiness check results
│   │       │   ├── AITrendInsights.tsx        # Lab & vitals trend visualizations
│   │       │   ├── AITimelineSummary.tsx      # Patient history timeline summary
│   │       │   ├── AIEncounterBrief.tsx       # Current encounter snapshot
│   │       │   ├── AIMedicationIntel.tsx      # Medication & allergy intelligence
│   │       │   └── AIDisclaimer.tsx           # Persistent clinical disclaimer banner
│   │       ├── api/
│   │       │   └── ai.api.ts           # Renderer-side API (IPC calls)
│   │       ├── hooks/
│   │       │   ├── useAIQuery.ts       # React hook for AI queries
│   │       │   ├── useAINoteDraft.ts   # Hook for clinical note drafting
│   │       │   ├── useAITrends.ts      # Hook for lab/vitals trend analysis
│   │       │   ├── useAICoding.ts      # Hook for ICD-10 coding suggestions
│   │       │   └── useAICompleteness.ts # Hook for documentation completeness
│   │       ├── utils/
│   │       │   ├── completenessChecker.ts  # Field-level completeness logic
│   │       │   ├── claimValidator.ts       # Claim readiness validation rules
│   │       │   └── trendDetector.ts        # Trend detection algorithms
│   │       └── types/
│   │           └── ai.types.ts         # TypeScript types
│   │
│   └── lib/
│       └── embeddings/
│           ├── chunkBuilder.ts         # Text chunk templates per table
│           ├── embeddingClient.ts      # OpenAI/Ollama embedding API
│           └── embeddingSync.ts        # Background sync for new records
│
├── supabase/
│   └── migrations/
│       ├── 001_enable_pgvector.sql
│       ├── 002_create_embeddings_table.sql
│       ├── 003_add_fulltext_search.sql
│       ├── 004_hybrid_search_rpc.sql
│       └── 005_ai_audit_log_table.sql
```

---

## 7. Execution Phases

### Phase 1: Database Foundation (Week 1)
- [ ] Enable pgvector extension on Supabase
- [ ] Run migration 001-004 (embeddings table + FTS columns + RPC functions)
- [ ] Verify indexes are created

### Phase 2: Embedding Pipeline (Week 2)
- [ ] Build `chunkBuilder.ts` — text chunk templates for each clinical table
- [ ] Build `embeddingClient.ts` — wrapper for OpenAI/Ollama embedding API
- [ ] Build `embeddingSync.ts` — background job to embed existing records
- [ ] Add `.env` keys: `OPENAI_API_KEY` or Ollama endpoint
- [ ] Run initial bulk embedding of all existing patient records

### Phase 3: Search API (Week 3)
- [ ] Build `aiService.ts` in main process with IPC handlers:
  - `ai:query` — accepts doctor query + patient_id, returns AI response
  - `ai:search` — raw hybrid search (for debugging)
  - `ai:embed-patient` — force re-embed all records for a patient
- [ ] Build `ai.api.ts` renderer-side IPC wrapper
- [ ] Build `useAIQuery.ts` React hook

### Phase 4: LLM Integration (Week 3-4)
- [ ] Add LLM client (OpenAI GPT-4o-mini or Ollama)
- [ ] Implement system prompt with patient context injection
- [ ] Implement structured response parsing (Direct Answer / Evidence / Missing / Caution)
- [ ] Add allergy and drug interaction checks before LLM call

### Phase 5: Core UI — Chat & Search (Week 4-5)
- [ ] Build `AIChatPanel.tsx` — embedded panel in Consultation tab
- [ ] Build `AIQueryInput.tsx` — input with quick-prompt suggestions
- [ ] Build `AIResponseCard.tsx` — structured clinical response display
- [ ] Build `AISourceCitation.tsx` — clickable citations that navigate to source record
- [ ] Build `AIDisclaimer.tsx` — persistent clinical disclaimer banner
- [ ] Integrate into existing `PatientEncounterContext`

### Phase 6: Clinical Intelligence Features (Week 5-6)
- [ ] Build `AITimelineSummary.tsx` — patient history timeline
- [ ] Build `AIEncounterBrief.tsx` — current encounter snapshot + missing data flags
- [ ] Build `AIMedicationIntel.tsx` — medication history + allergy cross-check
- [ ] Build `AITrendInsights.tsx` — lab & vitals trend detection and display
- [ ] Build `useAITrends.ts` hook + `trendDetector.ts` utility
- [ ] Build `AIDifferentialPanel.tsx` — non-prescriptive differential suggestions
- [ ] Build `AINoteDraftEditor.tsx` — SOAP note drafting (doctor-editable, human-in-loop)
- [ ] Build `useAINoteDraft.ts` hook

### Phase 7: Coding, Billing & Completeness (Week 6-7)
- [ ] Build `AICodingSuggestions.tsx` — ICD-10 code suggestions from encounter data
- [ ] Build `useAICoding.ts` hook
- [ ] Build `AIClaimReadiness.tsx` — NHIS/Private/FFS claim gap detection
- [ ] Build `claimValidator.ts` — claim readiness validation rules
- [ ] Build `AICompletenessScore.tsx` — documentation completeness checklist
- [ ] Build `useAICompleteness.ts` hook + `completenessChecker.ts` utility

### Phase 8: Security, Audit & Privacy (Week 7-8)
- [ ] Run migration `005_ai_audit_log_table.sql` — create `ai_interaction_logs` table
- [ ] Build `aiAuditLogger.ts` — log userId, patientId, encounterId, request type, sources, output
- [ ] Add role-based access (only authorized roles can use AI features)
- [ ] Enforce strict patient scoping — block and log cross-patient requests
- [ ] Add rate limiting (prevent abuse)
- [ ] PHI protection — strip sensitive data from LLM context if needed
- [ ] Implement no-hallucination guardrails ("Not found in record" for missing data)

### Phase 9: Testing & Optimization (Week 8-9)
- [ ] Test with real patient data (anonymized)
- [ ] Tune similarity thresholds and FTS weights
- [ ] Benchmark query latency (<2s target)
- [ ] Test edge cases: empty records, multiple encounters, critical labs
- [ ] Verify claim readiness checks against real NHIS claim requirements
- [ ] Test documentation completeness scoring across encounter types
- [ ] Validate differential suggestion quality with clinical team
- [ ] Audit log integrity verification

---

## 8. Example Queries & Expected Behavior

| Doctor Query | Hybrid Search Action | AI Response |
|---|---|---|
| "What are this patient's allergies?" | Direct lookup from `patients.known_allergies` | Lists allergies with clinical caution |
| "Show all abnormal labs in last 6 months" | FTS: "abnormal" + vector: lab context + date filter | Table of abnormal results with dates and values |
| "Has this patient been treated for hypertension?" | FTS: "hypertension" across consultations + prescriptions | Lists all hypertension-related encounters, meds, BP trends |
| "Summarize the last admission" | Vector: admission context + ward rounds + progress notes | Chronological summary of admission events |
| "Any drug allergies before prescribing amoxicillin?" | Allergy check + FTS: "amoxicillin" in past records | Safety alert if allergy exists, past reactions |
| "What was the outcome of the last referral?" | FTS+Vector: referral + referral_outcomes | Referral summary with outcome and follow-up |

---

## 9. Environment Variables (add to .env)

```env
# AI Clinical Assistant
AI_PROVIDER=ollama                    # openai | ollama

# For offline/on-premise (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=phi3:latest

# Search tuning
AI_FULLTEXT_WEIGHT=0.4
AI_VECTOR_WEIGHT=0.6
AI_SIMILARITY_THRESHOLD=0.7
AI_MAX_CONTEXT_TOKENS=8000
```

---

## 10. Cost Estimation (OpenAI GPT-4o-mini)

**Pricing reference** (as of 2025):
- Embeddings (`text-embedding-3-small`): **$0.02 / 1M tokens**
- LLM Input (`gpt-4o-mini`): **$0.15 / 1M tokens**
- LLM Output (`gpt-4o-mini`): **$0.60 / 1M tokens**

### Scenario 1: Small Clinic (~1,000 queries/month)

| Operation | Volume | Cost |
|---|---|---|
| Embeddings (new records) | ~2,000 chunks × 200 tokens | ~$0.008 |
| Search queries (embedding) | 1,000 queries × 50 tokens | ~$0.001 |
| LLM Input (context) | 1,000 queries × 4,000 tokens | ~$0.60 |
| LLM Output (responses) | 1,000 queries × 800 tokens | ~$0.48 |
| **Monthly total** | | **~$1.10** |

### Scenario 2: Medium Facility (~10,000 queries/month)

| Operation | Volume | Cost |
|---|---|---|
| Embeddings (new records) | ~10,000 chunks × 200 tokens | ~$0.04 |
| Search queries (embedding) | 10,000 queries × 50 tokens | ~$0.01 |
| LLM Input (context) | 10,000 queries × 4,000 tokens | ~$6.00 |
| LLM Output (responses) | 10,000 queries × 800 tokens | ~$4.80 |
| **Monthly total** | | **~$11** |

### Scenario 3: Heavy Usage (~100,000 queries/month)

| Operation | Volume | Cost |
|---|---|---|
| Embeddings (new records) | ~50,000 chunks × 200 tokens | ~$0.20 |
| Search queries (embedding) | 100,000 queries × 50 tokens | ~$0.10 |
| LLM Input (context) | 100,000 queries × 4,000 tokens | ~$60.00 |
| LLM Output (responses) | 100,000 queries × 800 tokens | ~$48.00 |
| **Monthly total** | | **~$108** |

### One-Time Initial Bulk Embedding

| Operation | Volume | Cost |
|---|---|---|
| Embed all existing records | ~50,000 chunks × 200 tokens | ~$0.20 |

For fully offline (**Ollama**): **$0/month** — runs entirely on local hardware, no API calls.

---

## 11. AI-Assisted Clinical Decision Support

### 11.1 Purpose & Philosophy

The AI Clinical Assistant is designed to **augment** — never replace — the doctor's clinical judgment. The goal is to help doctors work more effectively by surfacing relevant patterns, potential diagnoses, and clinical considerations based on the patient's recorded data. Doctors remain the sole decision-makers.

**Core Principles:**
- AI is a **tool**, not a replacement for clinical expertise
- All suggestions are **advisory only** and require doctor verification
- The system should encourage thorough clinical reasoning, not shortcuts
- Doctors must independently validate any AI-generated suggestions before acting

### 11.2 Diagnostic Suggestion Engine

When a doctor enters clinical data (vitals, lab results, examination findings, symptoms), the AI can **suggest possible diagnoses or health challenges** the patient may be facing, based on:

| Input Source | What AI Analyzes |
|---|---|
| **Chief complaints** | Symptom patterns and common associated conditions |
| **Vital signs** | Abnormal values → possible underlying conditions (e.g., persistent hypertension, tachycardia patterns) |
| **Lab results** | Abnormal markers → differential diagnoses (e.g., elevated HbA1c → diabetes, elevated WBC → infection) |
| **Examination findings** | Physical exam data → correlated conditions |
| **Past medical history** | Chronic conditions, recurrent patterns, comorbidity risks |
| **Medication history** | Side effects, drug interactions, treatment response patterns |
| **Combined data** | Cross-referencing all available data for multi-system conditions |

### 11.3 How It Works

**Doctor-Initiated Queries:**
- Doctor can explicitly ask: *"What could be causing these symptoms?"*
- Doctor can request: *"Suggest differential diagnoses based on the current vitals and lab results"*
- Doctor can prompt: *"Are there any health challenges I should watch for given this patient's history?"*

**Contextual Auto-Suggestions (on doctor opt-in):**
- When a doctor enters data (e.g., records new lab results, enters SOAP notes), the AI can offer a non-intrusive suggestion panel
- Suggestions appear as a collapsible sidebar — doctor chooses whether to view them
- Suggestions include confidence indicators (Low / Medium / High relevance)

**Example Scenarios:**

| Doctor Action | AI Suggestion |
|---|---|
| Records BP 160/100, BMI 32, fasting glucose 140 mg/dL | *"Consider evaluating for: Metabolic Syndrome, Type 2 Diabetes Mellitus, Essential Hypertension. Recommend: HbA1c, lipid panel, renal function tests."* |
| Enters lab result: WBC 18,000, temp 38.8°C, RR 22 | *"Elevated WBC with fever and tachypnea may indicate: Bacterial Infection (pneumonia, UTI, sepsis). Consider: blood cultures, chest X-ray, urinalysis."* |
| Notes: recurrent headaches, visual disturbances, BP trends rising over 3 visits | *"Pattern noted: Progressive hypertension with visual symptoms. Consider evaluating for: Hypertensive Emergency, Secondary Hypertension (renal artery stenosis, pheochromocytoma). Recommend: fundoscopy, renal doppler."* |
| Prescribes amoxicillin; patient has penicillin allergy on record | *"⚠️ SAFETY ALERT: Patient has documented penicillin allergy. Amoxicillin is a penicillin-class antibiotic. Cross-reactivity risk exists. Please verify and consider alternative antibiotics."* |

### 11.4 Suggestion Response Format

Every AI diagnostic suggestion follows this structured format:

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 AI Clinical Suggestion                                   │
│                                                              │
│  POSSIBLE CONDITIONS:                                        │
│  1. [Condition Name] — Relevance: High/Medium/Low            │
│     Basis: [which patient data supports this]                │
│                                                              │
│  2. [Condition Name] — Relevance: High/Medium/Low            │
│     Basis: [which patient data supports this]                │
│                                                              │
│  RECOMMENDED INVESTIGATIONS:                                 │
│  • [Test/procedure to confirm or rule out]                   │
│                                                              │
│  PATIENT HISTORY FLAGS:                                      │
│  • [Any past records relevant to current presentation]       │
│                                                              │
│  ⚠️ SAFETY ALERTS:                                           │
│  • [Allergies, drug interactions, contraindications]         │
│                                                              │
│  ──────────────────────────────────────────────────────────── │
│  ⚕️ DISCLAIMER: This AI suggestion is generated based on     │
│  pattern analysis and is NOT a definitive diagnosis.         │
│  Clinical judgment must always take precedence.              │
│  The doctor is solely responsible for all clinical           │
│  decisions. See full disclaimer below.                       │
└──────────────────────────────────────────────────────────────┘
```

### 11.5 Integration Points in Existing Workflow

| EMR Module | AI Feature |
|---|---|
| **Consultation (SOAP)** | After entering S/O/A, AI can suggest diagnoses for the Assessment field |
| **Lab Results View** | When viewing abnormal results, AI can suggest clinical significance and next steps |
| **Vitals Recording** | When critical vitals are recorded, AI flags potential conditions |
| **Prescription Entry** | AI checks drug-allergy conflicts, drug-drug interactions, and dose appropriateness |
| **Patient History Review** | Doctor can ask AI to summarize patterns across all encounters |
| **Ward Rounds** | AI can highlight changes since last round and flag deterioration patterns |

### 11.6 Updated System Prompt (with Diagnostic Suggestions)

```
You are an AI clinical assistant inside the NDC Medical Centre EMR system.
You assist doctors by querying patient records AND suggesting possible
diagnoses or health challenges based on clinical data.

RULES:
1. Only use the provided patient context data. NEVER fabricate data.
2. Suggestions are ADVISORY ONLY — the doctor makes all final decisions.
3. Always explain the clinical basis for each suggestion.
4. Rank suggestions by relevance (High / Medium / Low).
5. Flag safety concerns: allergies, drug interactions, critical values.
6. If data is insufficient for a reliable suggestion, say so explicitly.
7. Never present suggestions as definitive diagnoses.
8. Encourage the doctor to order confirmatory tests where appropriate.
9. Reference standard medical practice and clinical guidelines.

RESPONSE FORMAT:
1) **Direct Answer** — Clear response to the doctor's query
2) **Possible Conditions** — Ranked list with clinical basis
3) **Recommended Investigations** — Tests to confirm/rule out
4) **Supporting Evidence** — Patient data cited (date | source_type)
5) **Safety Alerts** — Allergies, interactions, contraindications
6) **Missing Data** — Gaps that limit the analysis
7) **Disclaimer** — AI advisory notice (always included)
```

---

## 12. Important Disclaimers & Limitations

### ⚠️ AI CLINICAL DISCLAIMER

> **THIS AI SYSTEM IS AN ADVISORY TOOL ONLY.**
>
> All AI-generated responses, suggestions, diagnostic possibilities, and clinical recommendations are:
>
> 1. **NOT definitive diagnoses.** AI responses are pattern-based suggestions that may be inaccurate, incomplete, or clinically inappropriate for the specific patient context.
>
> 2. **NOT a substitute for clinical judgment.** The attending physician bears full responsibility for all clinical decisions, diagnoses, treatment plans, and patient care outcomes.
>
> 3. **Subject to error.** The AI may:
>    - Suggest incorrect or irrelevant diagnoses
>    - Miss critical conditions not represented in the data
>    - Generate responses based on incomplete or outdated records
>    - Fail to account for nuances only a trained clinician would recognize
>
> 4. **Dependent on data quality.** AI suggestions are only as good as the data entered into the EMR. Missing records, incomplete documentation, or data entry errors will directly affect AI output quality.
>
> 5. **Not intended to replace medical education, clinical experience, or professional medical consultation.**
>
> **By using this feature, the clinician acknowledges and accepts that:**
> - All AI output requires independent clinical verification before any action is taken
> - The AI system is designed to assist, not replace, the doctor's expertise
> - The hospital, software vendor, and AI provider are not liable for clinical decisions made based on AI suggestions
> - Patient safety remains the sole responsibility of the attending clinician
>
> **The goal of this AI system is to help doctors do their jobs more effectively — not to make doctors lazy or dependent on technology. Clinical competence and thorough patient evaluation remain paramount.**

### Guardrails to Prevent Over-Dependence

| Guardrail | Implementation |
|---|---|
| **No auto-fill diagnoses** | AI never auto-populates the diagnosis field — doctor must type/select manually |
| **Suggestion panel is collapsible** | Doctor must actively choose to view suggestions |
| **Confidence indicators** | Low-confidence suggestions are clearly marked to prevent blind acceptance |
| **"Why?" links** | Each suggestion has an expandable explanation so doctors understand the reasoning |
| **Audit trail** | All AI queries are logged — admin can review usage patterns for dependency concerns |
| **Usage limits** | Optional configurable daily query limits per doctor to encourage independent thinking |
| **Mandatory confirmation** | If a doctor uses an AI suggestion, they must check a box: *"I have independently verified this suggestion"* |
| **Training mode** | New doctors see AI suggestions AFTER entering their own assessment, not before — encouraging independent clinical reasoning |

---

## Summary

This plan delivers a comprehensive AI Clinical Assistant embedded in every Consultation tab, covering:

| Category | Features |
|---|---|
| **Core Clinical** | Patient Timeline Summary, Encounter Brief, Medication & Allergy Intelligence, Lab & Vitals Trends, Clinical Note Drafting (SOAP), Differential Diagnosis Support |
| **Coding & Billing** | ICD-10 Code Suggestions, Claim Readiness Checks (NHIS/Private/FFS), Documentation Completeness Scoring |
| **Search & Retrieval** | Smart Record Search (hybrid full-text + vector), Clinical Citations with Source Traceability |
| **Safety & Compliance** | Strict Patient Scoping, RBAC Enforcement, Full Audit Logging, No-Hallucination Policy, Persistent Clinical Disclaimer |
| **Roadmap** | Risk Flagging, Smart Order Suggestions, Patient Education Generator, Voice/Dictation Integration |

The system uses your existing 20+ clinical tables unchanged, adds a lightweight vector + full-text search layer on top, and provides doctors with a natural language interface to query any patient's complete medical history. The hybrid approach ensures both keyword accuracy (full-text) and semantic understanding (vectors) for the best clinical search results.

The AI diagnostic suggestion engine adds clinical decision support that helps doctors identify potential health challenges, differential diagnoses, and safety concerns — all while maintaining strict guardrails to ensure doctors remain the primary decision-makers and do not become over-reliant on AI assistance.

**The goal is not to replace doctors with AI, but to enable doctors to do their jobs more effectively — while ensuring they never become lazy or overly dependent on technology.**
