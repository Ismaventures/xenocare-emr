-- =============================================================================
-- ANC (Antenatal Care) Module — Database Migration
-- Creates pregnancy-specific tables that integrate with existing EMR tables
-- =============================================================================

-- 1. pregnancy_episodes — Foundation: tracks one pregnancy from booking to delivery
CREATE TABLE IF NOT EXISTS public.pregnancy_episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL DEFAULT 1,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    lmp DATE,
    edd DATE,
    gestational_age_at_booking INTEGER,
    gravida INTEGER DEFAULT 1,
    parity INTEGER DEFAULT 0,
    abortions INTEGER DEFAULT 0,
    living_children INTEGER DEFAULT 0,
    blood_group VARCHAR(10),
    rhesus_factor VARCHAR(10),
    genotype VARCHAR(10),
    booking_status VARCHAR(20) DEFAULT 'booked' CHECK (booking_status IN ('booked','confirmed')),
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low','moderate','high')),
    primary_doctor_id UUID REFERENCES public.staff(id),
    primary_midwife_id UUID REFERENCES public.staff(id),
    department_id UUID REFERENCES public.departments(id),
    clinic_id UUID REFERENCES public.clinics(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','delivered','transferred','lost_to_followup','closed')),
    obstetric_history JSONB DEFAULT '[]',
    medical_history TEXT,
    surgical_history TEXT,
    family_history TEXT,
    allergy_history TEXT,
    created_by UUID REFERENCES public.staff(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enforce single active pregnancy per patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_pregnancy_episodes_active_patient
    ON public.pregnancy_episodes (patient_id)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pregnancy_episodes_patient ON public.pregnancy_episodes(patient_id);
CREATE INDEX IF NOT EXISTS idx_pregnancy_episodes_status ON public.pregnancy_episodes(status);
CREATE INDEX IF NOT EXISTS idx_pregnancy_episodes_edd ON public.pregnancy_episodes(edd);

-- 2. anc_visits — Links a pregnancy episode to a real encounter
CREATE TABLE IF NOT EXISTS public.anc_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pregnancy_episode_id UUID NOT NULL REFERENCES public.pregnancy_episodes(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    visit_number INTEGER NOT NULL DEFAULT 1,
    visit_type VARCHAR(30) NOT NULL DEFAULT 'routine_followup' CHECK (visit_type IN ('booking','routine_followup','urgent_review')),
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gestational_age_weeks INTEGER,
    gestational_age_days INTEGER,
    trimester INTEGER CHECK (trimester IN (1,2,3)),
    nurse_completed BOOLEAN DEFAULT false,
    doctor_completed BOOLEAN DEFAULT false,
    next_visit_date DATE,
    visit_status VARCHAR(20) DEFAULT 'in_progress' CHECK (visit_status IN ('in_progress','completed','cancelled')),
    created_by UUID REFERENCES public.staff(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anc_visits_pregnancy ON public.anc_visits(pregnancy_episode_id);
CREATE INDEX IF NOT EXISTS idx_anc_visits_encounter ON public.anc_visits(encounter_id);
CREATE INDEX IF NOT EXISTS idx_anc_visits_date ON public.anc_visits(visit_date);

-- 3. anc_observations — Structured maternal and fetal observations per visit
CREATE TABLE IF NOT EXISTS public.anc_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anc_visit_id UUID NOT NULL REFERENCES public.anc_visits(id) ON DELETE CASCADE,
    pregnancy_episode_id UUID NOT NULL REFERENCES public.pregnancy_episodes(id) ON DELETE CASCADE,
    -- Maternal vitals
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    weight_kg NUMERIC(6,2),
    height_cm NUMERIC(6,2),
    bmi NUMERIC(5,2),
    temperature NUMERIC(4,1),
    pulse INTEGER,
    respiratory_rate INTEGER,
    -- Urine
    urine_protein VARCHAR(20) CHECK (urine_protein IN ('nil','trace','+','++','+++')),
    urine_glucose VARCHAR(20) CHECK (urine_glucose IN ('nil','trace','+','++','+++')),
    -- Maternal examination
    edema VARCHAR(20) CHECK (edema IN ('none','mild','moderate','severe')),
    pallor VARCHAR(20) CHECK (pallor IN ('none','mild','moderate','severe')),
    breast_exam VARCHAR(50),
    -- Fetal assessment
    fundal_height_cm NUMERIC(5,1),
    fetal_heart_rate INTEGER,
    fetal_movement VARCHAR(20) CHECK (fetal_movement IN ('present','reduced','absent')),
    fetal_presentation VARCHAR(30) CHECK (fetal_presentation IN ('cephalic','breech','transverse','unstable')),
    fetal_lie VARCHAR(20) CHECK (fetal_lie IN ('longitudinal','oblique','transverse')),
    number_of_fetuses INTEGER DEFAULT 1,
    -- Danger signs
    vaginal_bleeding BOOLEAN DEFAULT false,
    liquor_status VARCHAR(20) CHECK (liquor_status IN ('adequate','reduced','excessive')),
    cervix_status VARCHAR(50),
    contractions BOOLEAN DEFAULT false,
    -- Clinical notes
    maternal_complaints TEXT,
    danger_signs TEXT[],
    interventions TEXT,
    counseling_notes TEXT,
    notes TEXT,
    -- Meta
    recorded_by UUID REFERENCES public.staff(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anc_observations_visit ON public.anc_observations(anc_visit_id);
CREATE INDEX IF NOT EXISTS idx_anc_observations_pregnancy ON public.anc_observations(pregnancy_episode_id);

-- 4. anc_risk_flags — Track high-risk indicators
CREATE TABLE IF NOT EXISTS public.anc_risk_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pregnancy_episode_id UUID NOT NULL REFERENCES public.pregnancy_episodes(id) ON DELETE CASCADE,
    anc_visit_id UUID REFERENCES public.anc_visits(id),
    risk_code VARCHAR(50) NOT NULL,
    risk_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'moderate' CHECK (severity IN ('low','moderate','high','critical')),
    active BOOLEAN DEFAULT true,
    detected_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.staff(id)
);

CREATE INDEX IF NOT EXISTS idx_anc_risk_flags_pregnancy ON public.anc_risk_flags(pregnancy_episode_id);
CREATE INDEX IF NOT EXISTS idx_anc_risk_flags_active ON public.anc_risk_flags(pregnancy_episode_id) WHERE active = true;

-- 5. pregnancy_outcomes — Close pregnancy episode after delivery
CREATE TABLE IF NOT EXISTS public.pregnancy_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pregnancy_episode_id UUID NOT NULL UNIQUE REFERENCES public.pregnancy_episodes(id) ON DELETE CASCADE,
    delivery_date DATE NOT NULL,
    gestational_age_at_delivery INTEGER,
    place_of_delivery VARCHAR(50) CHECK (place_of_delivery IN ('this_facility','other_hospital','home','en_route')),
    delivery_mode VARCHAR(30) CHECK (delivery_mode IN ('svd','elective_cs','emergency_cs','instrumental','vacuum','forceps')),
    maternal_outcome VARCHAR(20) CHECK (maternal_outcome IN ('alive','deceased')),
    maternal_complications TEXT[],
    baby_weight_grams INTEGER,
    baby_sex VARCHAR(10) CHECK (baby_sex IN ('male','female','ambiguous')),
    apgar_1 INTEGER CHECK (apgar_1 BETWEEN 0 AND 10),
    apgar_5 INTEGER CHECK (apgar_5 BETWEEN 0 AND 10),
    neonatal_outcome VARCHAR(20) CHECK (neonatal_outcome IN ('alive','stillbirth','neonatal_death')),
    neonatal_complications TEXT[],
    blood_loss_ml INTEGER,
    placenta_complete BOOLEAN,
    notes TEXT,
    recorded_by UUID REFERENCES public.staff(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pregnancy_outcomes_episode ON public.pregnancy_outcomes(pregnancy_episode_id);

-- =============================================================================
-- Row Level Security (RLS) — match existing EMR pattern
-- =============================================================================
ALTER TABLE public.pregnancy_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anc_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anc_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anc_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregnancy_outcomes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (staff) full access — matches existing EMR RLS
CREATE POLICY "Staff can manage pregnancy_episodes" ON public.pregnancy_episodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can manage anc_visits" ON public.anc_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can manage anc_observations" ON public.anc_observations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can manage anc_risk_flags" ON public.anc_risk_flags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can manage pregnancy_outcomes" ON public.pregnancy_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role bypass
CREATE POLICY "Service role bypass pregnancy_episodes" ON public.pregnancy_episodes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass anc_visits" ON public.anc_visits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass anc_observations" ON public.anc_observations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass anc_risk_flags" ON public.anc_risk_flags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass pregnancy_outcomes" ON public.pregnancy_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pregnancy_episodes_updated') THEN
        CREATE TRIGGER trg_pregnancy_episodes_updated BEFORE UPDATE ON public.pregnancy_episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_anc_visits_updated') THEN
        CREATE TRIGGER trg_anc_visits_updated BEFORE UPDATE ON public.anc_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_anc_observations_updated') THEN
        CREATE TRIGGER trg_anc_observations_updated BEFORE UPDATE ON public.anc_observations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;
