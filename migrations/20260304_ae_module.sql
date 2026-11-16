-- =============================================================================
-- A&E (Accident & Emergency) Module Migration
-- Creates A&E-specific tables and extends existing enums/tables
-- All A&E data links back to visits.id (encounter_id) — no separate visit system
-- =============================================================================

BEGIN;

-- =============================================================================
-- 0. Add encounter_category to visits (required for A&E filtering)
-- =============================================================================
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS encounter_category VARCHAR(20) DEFAULT 'outpatient';

COMMENT ON COLUMN visits.encounter_category IS 'Type of encounter: outpatient, inpatient, emergency, day_case';

CREATE INDEX IF NOT EXISTS idx_visits_encounter_category ON visits(encounter_category);

-- =============================================================================
-- 1. Extend existing enums
-- =============================================================================

-- Add A&E queue locations
DO $$ BEGIN
  ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Emergency';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Triage';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Resuscitation';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add emergency source module
DO $$ BEGIN
  ALTER TYPE source_module ADD VALUE IF NOT EXISTS 'emergency';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. Extend triage_assessments for A&E-specific fields
-- =============================================================================

ALTER TABLE triage_assessments
  ADD COLUMN IF NOT EXISTS acuity_color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS trauma_mechanism TEXT,
  ADD COLUMN IF NOT EXISTS red_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS allergies_noted TEXT,
  ADD COLUMN IF NOT EXISTS triage_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_ae_triage BOOLEAN DEFAULT false;

-- =============================================================================
-- 3. New A&E Tables
-- =============================================================================

-- 3a. ae_arrivals — Arrival registration data
CREATE TABLE IF NOT EXISTS ae_arrivals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_ae_arrivals_encounter ON ae_arrivals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_ae_arrivals_patient ON ae_arrivals(patient_id);

-- 3b. ae_primary_surveys — ABCDE Trauma Survey
CREATE TABLE IF NOT EXISTS ae_primary_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_ae_primary_surveys_encounter ON ae_primary_surveys(encounter_id);

-- 3c. ae_dispositions — Disposition / outcome
CREATE TABLE IF NOT EXISTS ae_dispositions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
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
  follow_up_clinic_id UUID,
  medications_on_discharge JSONB DEFAULT '[]',
  -- Admission fields
  admission_ward_id UUID,
  admission_reason TEXT,
  admission_id UUID,
  -- Transfer fields
  transfer_destination TEXT,
  transfer_reason TEXT,
  -- Handover
  handover_summary JSONB,
  -- Meta
  disposition_by UUID NOT NULL REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES staff(id)
);
CREATE INDEX IF NOT EXISTS idx_ae_dispositions_encounter ON ae_dispositions(encounter_id);

-- 3d. ae_timeline_events — Audit trail for every A&E action
CREATE TABLE IF NOT EXISTS ae_timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_ae_timeline_encounter ON ae_timeline_events(encounter_id);
CREATE INDEX IF NOT EXISTS idx_ae_timeline_time ON ae_timeline_events(performed_at DESC);

-- 3e. ae_fluid_charts — IV fluids and IO tracking
CREATE TABLE IF NOT EXISTS ae_fluid_charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_ae_fluid_charts_encounter ON ae_fluid_charts(encounter_id);

-- 3f. ae_procedures — A&E bedside procedures
CREATE TABLE IF NOT EXISTS ae_procedures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  procedure_name VARCHAR(200) NOT NULL,
  procedure_catalogue_id UUID,
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
CREATE INDEX IF NOT EXISTS idx_ae_procedures_encounter ON ae_procedures(encounter_id);

COMMIT;
