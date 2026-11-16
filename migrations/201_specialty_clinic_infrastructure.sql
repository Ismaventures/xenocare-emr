-- =============================================================================
-- Migration 201: Specialty Clinic Infrastructure
-- =============================================================================
-- Creates shared tables for:
--   1. clinic_triage_observations   – Pre-consultation nurse/tech recordings
--   2. clinic_triage_configs        – Admin-managed triage test definitions per specialty
--   3. specialty_order_sets         – Facility-customized investigation panels
--   4. specialty_careplans          – Generic longitudinal care plans (all specialties)
--   5. careplan_sessions            – Individual sessions within a care plan
-- =============================================================================

-- ─── 1. Clinic Triage Observations ──────────────────────────────────────────
-- Pre-consultation tests recorded by nurses/technicians before doctor sees patient

CREATE TABLE IF NOT EXISTS clinic_triage_observations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    encounter_id    UUID NOT NULL REFERENCES visits(id),
    clinic_type     VARCHAR(50) NOT NULL,          -- SpecialtyCode: 'CARDIOLOGY', 'OPHTHALMOLOGY', etc.
    observation_type VARCHAR(100) NOT NULL,         -- 'bp_systolic', 'visual_acuity_right', 'ecg_rhythm'
    observation_value TEXT NOT NULL,                 -- The recorded value
    observation_unit VARCHAR(30),                    -- 'mmHg', 'mmol/L', '6/6'
    observation_category VARCHAR(50) DEFAULT 'vitals', -- 'vitals', 'screening', 'measurement', 'questionnaire'
    normal_range    TEXT,                            -- Reference range for display
    is_abnormal     BOOLEAN DEFAULT FALSE,          -- Auto-flagged if outside normal range
    performed_by    UUID NOT NULL REFERENCES staff(id),
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_triage_obs_encounter ON clinic_triage_observations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_triage_obs_patient ON clinic_triage_observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_obs_clinic ON clinic_triage_observations(clinic_type);

-- Enable RLS
ALTER TABLE clinic_triage_observations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clinic_triage_observations' AND policyname = 'clinic_triage_obs_all'
    ) THEN
        CREATE POLICY clinic_triage_obs_all ON clinic_triage_observations
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─── 2. Clinic Triage Configs ───────────────────────────────────────────────
-- Admin-managed triage test definitions per specialty clinic

CREATE TABLE IF NOT EXISTS clinic_triage_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialty_code  VARCHAR(50) NOT NULL,           -- 'CARDIOLOGY', 'OPHTHALMOLOGY', etc.
    test_name       VARCHAR(200) NOT NULL,          -- 'Blood Pressure (Systolic)'
    test_code       VARCHAR(100) NOT NULL,          -- 'bp_systolic'
    input_type      VARCHAR(30) NOT NULL DEFAULT 'number', -- 'text', 'number', 'select', 'measurement'
    options         JSONB,                          -- For select inputs: ["Normal","Abnormal"]
    unit            VARCHAR(30),                    -- 'mmHg', 'kg', 'bpm'
    normal_min      NUMERIC,                        -- Lower bound of normal range
    normal_max      NUMERIC,                        -- Upper bound of normal range
    is_required     BOOLEAN DEFAULT FALSE,
    display_order   INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(specialty_code, test_code)
);

-- Enable RLS
ALTER TABLE clinic_triage_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clinic_triage_configs' AND policyname = 'clinic_triage_configs_all'
    ) THEN
        CREATE POLICY clinic_triage_configs_all ON clinic_triage_configs
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─── 3. Specialty Order Sets ────────────────────────────────────────────────
-- Facility-customized investigation panels (supplements TypeScript defaults)

CREATE TABLE IF NOT EXISTS specialty_order_sets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialty_code  VARCHAR(50) NOT NULL,
    set_name        VARCHAR(200) NOT NULL,          -- 'Chest Pain Workup'
    description     TEXT,
    clinical_scenario TEXT,                          -- 'New patient with acute chest pain'
    orders          JSONB NOT NULL DEFAULT '{}',    -- { lab_tests: [...], imaging: [...], procedures: [...] }
    is_default      BOOLEAN DEFAULT FALSE,
    is_system       BOOLEAN DEFAULT FALSE,          -- true = shipped with EMR
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES staff(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_sets_specialty ON specialty_order_sets(specialty_code);

-- Enable RLS
ALTER TABLE specialty_order_sets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'specialty_order_sets' AND policyname = 'specialty_order_sets_all'
    ) THEN
        CREATE POLICY specialty_order_sets_all ON specialty_order_sets
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─── 4. Specialty Care Plans (Generic) ──────────────────────────────────────
-- Longitudinal treatment plans for all specialty clinics (except physiotherapy which has its own tables)

CREATE TABLE IF NOT EXISTS specialty_careplans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    encounter_id    UUID REFERENCES visits(id),
    specialty_code  VARCHAR(50) NOT NULL,
    plan_type       VARCHAR(100) NOT NULL,          -- 'heart_failure_management', 'glaucoma_management'
    plan_name       TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Completed','Cancelled','On_Hold')),
    diagnosis       TEXT[],                         -- ICD-10 codes
    goals           TEXT[],
    baseline_data   JSONB DEFAULT '{}',             -- Initial measurements
    total_sessions  INT,                            -- NULL = ongoing
    frequency       VARCHAR(50),                    -- 'Weekly', 'Biweekly', 'Monthly'
    expected_duration VARCHAR(50),                  -- '6 weeks', '12 months', 'Ongoing'
    nhis_code       VARCHAR(20),                    -- NHIS tariff code if applicable
    billing_category VARCHAR(50) DEFAULT 'GENERAL', -- 'GENERAL', 'NHIS', 'PRIVATE'
    created_by      UUID NOT NULL REFERENCES staff(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_careplans_patient ON specialty_careplans(patient_id);
CREATE INDEX IF NOT EXISTS idx_careplans_specialty ON specialty_careplans(specialty_code);
CREATE INDEX IF NOT EXISTS idx_careplans_status ON specialty_careplans(status);

-- Enable RLS
ALTER TABLE specialty_careplans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'specialty_careplans' AND policyname = 'specialty_careplans_all'
    ) THEN
        CREATE POLICY specialty_careplans_all ON specialty_careplans
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─── 5. Care Plan Sessions ─────────────────────────────────────────────────
-- Individual sessions within a care plan

CREATE TABLE IF NOT EXISTS careplan_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    careplan_id     UUID NOT NULL REFERENCES specialty_careplans(id) ON DELETE CASCADE,
    session_number  INT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Scheduled'
                    CHECK (status IN ('Scheduled','Completed','Missed','Cancelled')),
    scheduled_date  DATE,
    completed_date  TIMESTAMPTZ,
    session_data    JSONB NOT NULL DEFAULT '{}',    -- Specialty-specific measurements per session
    notes           TEXT,
    assessment      TEXT,
    plan_for_next   TEXT,
    recorded_by     UUID REFERENCES staff(id),
    billing_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(careplan_id, session_number)
);

CREATE INDEX IF NOT EXISTS idx_careplan_sessions_plan ON careplan_sessions(careplan_id);
CREATE INDEX IF NOT EXISTS idx_careplan_sessions_status ON careplan_sessions(status);

-- Enable RLS
ALTER TABLE careplan_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'careplan_sessions' AND policyname = 'careplan_sessions_all'
    ) THEN
        CREATE POLICY careplan_sessions_all ON careplan_sessions
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─── Seed Cardiology Triage Config ──────────────────────────────────────────

INSERT INTO clinic_triage_configs (specialty_code, test_name, test_code, input_type, unit, normal_min, normal_max, is_required, display_order)
VALUES
    ('CARDIOLOGY', 'Blood Pressure (Systolic)',  'bp_systolic',  'number', 'mmHg', 90,  140, true,  1),
    ('CARDIOLOGY', 'Blood Pressure (Diastolic)', 'bp_diastolic', 'number', 'mmHg', 60,  90,  true,  2),
    ('CARDIOLOGY', 'Heart Rate',                 'heart_rate',   'number', 'bpm',  60,  100, true,  3),
    ('CARDIOLOGY', 'SpO₂',                      'spo2',         'number', '%',    95,  100, true,  4),
    ('CARDIOLOGY', 'ECG Rhythm',                 'ecg_rhythm',   'select', NULL,   NULL, NULL, false, 5),
    ('CARDIOLOGY', 'ECG Summary',                'ecg_summary',  'text',   NULL,   NULL, NULL, false, 6),
    ('CARDIOLOGY', 'Weight',                     'weight',       'number', 'kg',   NULL, NULL, false, 7)
ON CONFLICT (specialty_code, test_code) DO NOTHING;

-- Update ECG Rhythm options
UPDATE clinic_triage_configs
SET options = '["Normal Sinus Rhythm","Sinus Bradycardia","Sinus Tachycardia","Atrial Fibrillation","Atrial Flutter","SVT","VT","Heart Block","Other"]'::JSONB
WHERE specialty_code = 'CARDIOLOGY' AND test_code = 'ecg_rhythm';

-- ─── Seed Ophthalmology Triage Config ───────────────────────────────────────

INSERT INTO clinic_triage_configs (specialty_code, test_name, test_code, input_type, unit, normal_min, normal_max, is_required, display_order)
VALUES
    ('OPHTHALMOLOGY', 'Visual Acuity (Right Eye)', 'va_right',         'text',   NULL,  NULL, NULL, true,  1),
    ('OPHTHALMOLOGY', 'Visual Acuity (Left Eye)',  'va_left',          'text',   NULL,  NULL, NULL, true,  2),
    ('OPHTHALMOLOGY', 'IOP (Right Eye)',           'iop_right',        'number', 'mmHg', 10,  21,   true,  3),
    ('OPHTHALMOLOGY', 'IOP (Left Eye)',            'iop_left',         'number', 'mmHg', 10,  21,   true,  4),
    ('OPHTHALMOLOGY', 'Autorefraction (Right)',    'autorefraction_right', 'text', NULL,  NULL, NULL, false, 5),
    ('OPHTHALMOLOGY', 'Autorefraction (Left)',     'autorefraction_left',  'text', NULL,  NULL, NULL, false, 6)
ON CONFLICT (specialty_code, test_code) DO NOTHING;

-- ─── Seed Gynaecology Triage Config ─────────────────────────────────────────

INSERT INTO clinic_triage_configs (specialty_code, test_name, test_code, input_type, unit, normal_min, normal_max, is_required, display_order)
VALUES
    ('GYNAECOLOGY', 'Weight',                     'weight',       'number', 'kg',   NULL, NULL, true,  1),
    ('GYNAECOLOGY', 'Blood Pressure (Systolic)',  'bp_systolic',  'number', 'mmHg', 90,  140, true,  2),
    ('GYNAECOLOGY', 'Blood Pressure (Diastolic)', 'bp_diastolic', 'number', 'mmHg', 60,  90,  true,  3),
    ('GYNAECOLOGY', 'Urine Protein',              'urine_protein','select', NULL,   NULL, NULL, false, 4),
    ('GYNAECOLOGY', 'Urine Glucose',              'urine_glucose','select', NULL,   NULL, NULL, false, 5)
ON CONFLICT (specialty_code, test_code) DO NOTHING;

UPDATE clinic_triage_configs
SET options = '["Negative","Trace","+","++","+++"]'::JSONB
WHERE specialty_code = 'GYNAECOLOGY' AND test_code IN ('urine_protein', 'urine_glucose');

-- ─── Seed Paediatrics Triage Config ─────────────────────────────────────────

INSERT INTO clinic_triage_configs (specialty_code, test_name, test_code, input_type, unit, normal_min, normal_max, is_required, display_order)
VALUES
    ('PAEDIATRICS', 'Weight',              'weight',             'number', 'kg',  NULL, NULL, true,  1),
    ('PAEDIATRICS', 'Height',              'height',             'number', 'cm',  NULL, NULL, true,  2),
    ('PAEDIATRICS', 'Head Circumference',  'head_circumference', 'number', 'cm',  NULL, NULL, false, 3),
    ('PAEDIATRICS', 'Temperature',         'temperature',        'number', '°C',  36.1, 37.5, true, 4)
ON CONFLICT (specialty_code, test_code) DO NOTHING;

-- ─── Seed Nephrology Triage Config ──────────────────────────────────────────

INSERT INTO clinic_triage_configs (specialty_code, test_name, test_code, input_type, unit, normal_min, normal_max, is_required, display_order)
VALUES
    ('NEPHROLOGY', 'Weight',                     'weight',       'number', 'kg',   NULL, NULL, true,  1),
    ('NEPHROLOGY', 'Blood Pressure (Systolic)',  'bp_systolic',  'number', 'mmHg', 90,  140, true,  2),
    ('NEPHROLOGY', 'Blood Pressure (Diastolic)', 'bp_diastolic', 'number', 'mmHg', 60,  90,  true,  3),
    ('NEPHROLOGY', 'Urine Protein',              'urine_protein','select', NULL,   NULL, NULL, false, 4),
    ('NEPHROLOGY', 'Urine Glucose',              'urine_glucose','select', NULL,   NULL, NULL, false, 5)
ON CONFLICT (specialty_code, test_code) DO NOTHING;

UPDATE clinic_triage_configs
SET options = '["Negative","Trace","+","++","+++"]'::JSONB
WHERE specialty_code = 'NEPHROLOGY' AND test_code IN ('urine_protein', 'urine_glucose');

-- ─── Seed Endocrinology Triage Config ───────────────────────────────────────

INSERT INTO clinic_triage_configs (specialty_code, test_name, test_code, input_type, unit, normal_min, normal_max, is_required, display_order)
VALUES
    ('ENDOCRINOLOGY', 'Weight',                     'weight',       'number', 'kg',     NULL, NULL,  true,  1),
    ('ENDOCRINOLOGY', 'Blood Pressure (Systolic)',  'bp_systolic',  'number', 'mmHg',   90,   140,   true,  2),
    ('ENDOCRINOLOGY', 'Blood Pressure (Diastolic)', 'bp_diastolic', 'number', 'mmHg',   60,   90,    true,  3),
    ('ENDOCRINOLOGY', 'Random Blood Sugar',         'rbs',          'number', 'mmol/L', 3.9,  7.8,   true,  4)
ON CONFLICT (specialty_code, test_code) DO NOTHING;

-- ─── Seed Pulmonology Triage Config ─────────────────────────────────────────

INSERT INTO clinic_triage_configs (specialty_code, test_name, test_code, input_type, unit, normal_min, normal_max, is_required, display_order)
VALUES
    ('PULMONOLOGY', 'SpO₂',                       'spo2',         'number', '%',     95,  100, true,  1),
    ('PULMONOLOGY', 'Peak Flow',                   'peak_flow',    'number', 'L/min', NULL, NULL, false, 2),
    ('PULMONOLOGY', 'Blood Pressure (Systolic)',   'bp_systolic',  'number', 'mmHg',  90,  140, true,  3),
    ('PULMONOLOGY', 'Blood Pressure (Diastolic)',  'bp_diastolic', 'number', 'mmHg',  60,  90,  true,  4),
    ('PULMONOLOGY', 'Respiratory Rate',            'resp_rate',    'number', '/min',  12,  20,  false, 5)
ON CONFLICT (specialty_code, test_code) DO NOTHING;

-- ─── Done ───────────────────────────────────────────────────────────────────
-- Run: node scripts/run-migration-201.mjs
-- Or paste directly in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/wseumhbzroyznxeuipwa/sql/new
