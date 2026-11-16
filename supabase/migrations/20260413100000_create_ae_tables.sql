-- =============================================================================
-- Migration: Create A&E (Accident & Emergency) Tables
-- Creates: ae_arrivals, ae_timeline_events, ae_primary_surveys,
--          ae_dispositions, ae_fluid_charts, ae_procedures
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ae_arrivals — Registration of emergency patient arrivals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ae_arrivals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    encounter_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    arrival_time timestamptz NOT NULL DEFAULT now(),
    arrival_mode text NOT NULL CHECK (arrival_mode IN ('walk_in','ambulance','transfer','police','military_escort','other')),
    referral_source text NOT NULL CHECK (referral_source IN ('self','clinic','hospital','police','military','workplace','other')),
    referral_source_detail text,
    chief_complaint text NOT NULL,
    incident_type text CHECK (incident_type IN ('rta','assault','fall','burn','gunshot','blast','poisoning','drowning','medical','obstetric','pediatric','other')),
    incident_time timestamptz,
    incident_location text,
    medico_legal_flag boolean NOT NULL DEFAULT false,
    medico_legal_notes text,
    brought_by_name text,
    brought_by_phone text,
    brought_by_relationship text,
    created_by uuid NOT NULL REFERENCES public.staff(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES public.staff(id)
);

CREATE INDEX IF NOT EXISTS idx_ae_arrivals_encounter ON public.ae_arrivals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_ae_arrivals_patient ON public.ae_arrivals(patient_id);
CREATE INDEX IF NOT EXISTS idx_ae_arrivals_arrival_time ON public.ae_arrivals(arrival_time DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ae_timeline_events — Audit trail for all A&E actions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ae_timeline_events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    encounter_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    event_category text NOT NULL CHECK (event_category IN ('arrival','triage','assessment','order','treatment','result','procedure','medication','observation','disposition','note','alert','handover')),
    title text NOT NULL,
    description text,
    details jsonb,
    severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical','success')),
    source_table text,
    source_id uuid,
    performed_by uuid REFERENCES public.staff(id),
    performed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ae_timeline_encounter ON public.ae_timeline_events(encounter_id);
CREATE INDEX IF NOT EXISTS idx_ae_timeline_performed_at ON public.ae_timeline_events(performed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ae_primary_surveys — ABCDE assessment
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ae_primary_surveys (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    encounter_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    -- Airway
    airway_status text CHECK (airway_status IN ('patent','compromised','obstructed','intubated')),
    airway_interventions text[] DEFAULT '{}',
    airway_notes text,
    -- Breathing
    breathing_status text CHECK (breathing_status IN ('normal','labored','absent','assisted')),
    breathing_rate integer,
    spo2 integer,
    chest_findings text,
    breathing_interventions text[] DEFAULT '{}',
    breathing_notes text,
    -- Circulation
    circulation_status text CHECK (circulation_status IN ('stable','compromised','shock','arrest')),
    heart_rate integer,
    bp_systolic integer,
    bp_diastolic integer,
    capillary_refill text,
    bleeding_sites jsonb DEFAULT '[]',
    iv_access jsonb DEFAULT '[]',
    circulation_interventions text[] DEFAULT '{}',
    circulation_notes text,
    -- Disability
    gcs_eye integer CHECK (gcs_eye BETWEEN 1 AND 4),
    gcs_verbal integer CHECK (gcs_verbal BETWEEN 1 AND 5),
    gcs_motor integer CHECK (gcs_motor BETWEEN 1 AND 6),
    gcs_total integer CHECK (gcs_total BETWEEN 3 AND 15),
    pupil_left text,
    pupil_right text,
    consciousness text NOT NULL DEFAULT 'Alert' CHECK (consciousness IN ('Alert','Verbal','Pain','Unresponsive')),
    disability_notes text,
    -- Exposure
    exposure_findings text,
    injuries jsonb DEFAULT '[]',
    exposure_notes text,
    -- Meta
    survey_time timestamptz NOT NULL DEFAULT now(),
    performed_by uuid NOT NULL REFERENCES public.staff(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES public.staff(id)
);

CREATE INDEX IF NOT EXISTS idx_ae_primary_surveys_encounter ON public.ae_primary_surveys(encounter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ae_dispositions — Discharge/Admit/Transfer outcomes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ae_dispositions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    encounter_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    disposition_type text NOT NULL CHECK (disposition_type IN ('discharge','admit','transfer','refer','death','absconded','left_against_advice')),
    disposition_time timestamptz NOT NULL DEFAULT now(),
    final_diagnosis text,
    final_diagnosis_icd10 text,
    secondary_diagnoses jsonb DEFAULT '[]',
    condition_at_disposition text CHECK (condition_at_disposition IN ('stable','improved','unchanged','deteriorated','critical','deceased')),
    -- Discharge
    discharge_instructions text,
    return_precautions text,
    follow_up_date date,
    follow_up_clinic_id uuid REFERENCES public.clinics(id),
    medications_on_discharge jsonb DEFAULT '[]',
    -- Admission
    admission_ward_id uuid,
    admission_reason text,
    admission_id uuid,
    -- Transfer
    transfer_destination text,
    transfer_reason text,
    -- Handover
    handover_summary jsonb,
    -- Meta
    disposition_by uuid NOT NULL REFERENCES public.staff(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES public.staff(id)
);

CREATE INDEX IF NOT EXISTS idx_ae_dispositions_encounter ON public.ae_dispositions(encounter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ae_fluid_charts — IV fluid tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ae_fluid_charts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    encounter_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    fluid_type text NOT NULL,
    route text NOT NULL CHECK (route IN ('iv','oral','io','sc','other')),
    rate_ml_hr numeric(8,2),
    volume_ml numeric(8,2),
    start_time timestamptz NOT NULL DEFAULT now(),
    end_time timestamptz,
    urine_output_ml numeric(8,2),
    notes text,
    administered_by uuid NOT NULL REFERENCES public.staff(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ae_fluid_charts_encounter ON public.ae_fluid_charts(encounter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ae_procedures — Emergency procedures performed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ae_procedures (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    encounter_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    procedure_name text NOT NULL,
    procedure_catalogue_id uuid,
    consent_obtained boolean NOT NULL DEFAULT false,
    consent_notes text,
    indication text,
    technique text,
    findings text,
    outcome text CHECK (outcome IN ('successful','partial','failed','abandoned')),
    complications text,
    performed_by uuid NOT NULL REFERENCES public.staff(id),
    assisted_by jsonb DEFAULT '[]',
    start_time timestamptz NOT NULL DEFAULT now(),
    end_time timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ae_procedures_encounter ON public.ae_procedures(encounter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Add acuity_color to triage_assessments if not present
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'triage_assessments'
        AND column_name = 'acuity_color'
    ) THEN
        ALTER TABLE public.triage_assessments ADD COLUMN acuity_color varchar(20);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'triage_assessments'
        AND column_name = 'is_ae_triage'
    ) THEN
        ALTER TABLE public.triage_assessments ADD COLUMN is_ae_triage boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'triage_assessments'
        AND column_name = 'trauma_mechanism'
    ) THEN
        ALTER TABLE public.triage_assessments ADD COLUMN trauma_mechanism text;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'triage_assessments'
        AND column_name = 'red_flags'
    ) THEN
        ALTER TABLE public.triage_assessments ADD COLUMN red_flags text[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'triage_assessments'
        AND column_name = 'allergies_noted'
    ) THEN
        ALTER TABLE public.triage_assessments ADD COLUMN allergies_noted text;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'triage_assessments'
        AND column_name = 'triage_notes'
    ) THEN
        ALTER TABLE public.triage_assessments ADD COLUMN triage_notes text;
    END IF;
END $$;

-- =============================================================================
-- RLS Policies — Scoped by role following existing vitals/consultations patterns
-- =============================================================================

-- ─── ae_arrivals ─────────────────────────────────────────────────────────────
ALTER TABLE public.ae_arrivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY ae_arrivals_select ON public.ae_arrivals
    FOR SELECT TO authenticated
    USING (public.has_clinical_access());

CREATE POLICY ae_arrivals_insert ON public.ae_arrivals
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
        AND encounter_id IS NOT NULL
    );

CREATE POLICY ae_arrivals_update ON public.ae_arrivals
    FOR UPDATE TO authenticated
    USING (
        (created_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- ─── ae_timeline_events ─────────────────────────────────────────────────────
ALTER TABLE public.ae_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ae_timeline_select ON public.ae_timeline_events
    FOR SELECT TO authenticated
    USING (public.has_clinical_access());

CREATE POLICY ae_timeline_insert ON public.ae_timeline_events
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
    );

-- ─── ae_primary_surveys ─────────────────────────────────────────────────────
ALTER TABLE public.ae_primary_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY ae_primary_surveys_select ON public.ae_primary_surveys
    FOR SELECT TO authenticated
    USING (public.has_clinical_access());

CREATE POLICY ae_primary_surveys_insert ON public.ae_primary_surveys
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
        AND encounter_id IS NOT NULL
    );

CREATE POLICY ae_primary_surveys_update ON public.ae_primary_surveys
    FOR UPDATE TO authenticated
    USING (
        (performed_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- ─── ae_dispositions ────────────────────────────────────────────────────────
ALTER TABLE public.ae_dispositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ae_dispositions_select ON public.ae_dispositions
    FOR SELECT TO authenticated
    USING (public.has_clinical_access());

CREATE POLICY ae_dispositions_insert ON public.ae_dispositions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'super_admin')
        AND encounter_id IS NOT NULL
    );

CREATE POLICY ae_dispositions_update ON public.ae_dispositions
    FOR UPDATE TO authenticated
    USING (
        (disposition_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- ─── ae_fluid_charts ────────────────────────────────────────────────────────
ALTER TABLE public.ae_fluid_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ae_fluid_charts_select ON public.ae_fluid_charts
    FOR SELECT TO authenticated
    USING (public.has_clinical_access());

CREATE POLICY ae_fluid_charts_insert ON public.ae_fluid_charts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
        AND encounter_id IS NOT NULL
    );

CREATE POLICY ae_fluid_charts_update ON public.ae_fluid_charts
    FOR UPDATE TO authenticated
    USING (
        (administered_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- ─── ae_procedures ──────────────────────────────────────────────────────────
ALTER TABLE public.ae_procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY ae_procedures_select ON public.ae_procedures
    FOR SELECT TO authenticated
    USING (public.has_clinical_access());

CREATE POLICY ae_procedures_insert ON public.ae_procedures
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
        AND encounter_id IS NOT NULL
    );

CREATE POLICY ae_procedures_update ON public.ae_procedures
    FOR UPDATE TO authenticated
    USING (
        (performed_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- ─── Updated-at triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ae_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER ae_arrivals_updated_at
    BEFORE UPDATE ON public.ae_arrivals
    FOR EACH ROW EXECUTE FUNCTION public.ae_set_updated_at();

CREATE TRIGGER ae_primary_surveys_updated_at
    BEFORE UPDATE ON public.ae_primary_surveys
    FOR EACH ROW EXECUTE FUNCTION public.ae_set_updated_at();

CREATE TRIGGER ae_dispositions_updated_at
    BEFORE UPDATE ON public.ae_dispositions
    FOR EACH ROW EXECUTE FUNCTION public.ae_set_updated_at();

CREATE TRIGGER ae_fluid_charts_updated_at
    BEFORE UPDATE ON public.ae_fluid_charts
    FOR EACH ROW EXECUTE FUNCTION public.ae_set_updated_at();

CREATE TRIGGER ae_procedures_updated_at
    BEFORE UPDATE ON public.ae_procedures
    FOR EACH ROW EXECUTE FUNCTION public.ae_set_updated_at();
