-- =============================================================================
-- Migration 048: Extended Encounters & Nursing Workflow Enhancements
-- Supports long-duration encounters (inpatient), shift handovers, and 
-- doctor-nurse communication
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend visits table for encounter categorization
-- -----------------------------------------------------------------------------

-- Add encounter category to distinguish outpatient vs inpatient
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS encounter_category VARCHAR(20) DEFAULT 'outpatient';

COMMENT ON COLUMN visits.encounter_category IS 'Type of encounter: outpatient, inpatient, emergency, day_case';

-- Add expected duration for planning
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS expected_duration_days INTEGER DEFAULT 1;

COMMENT ON COLUMN visits.expected_duration_days IS 'Expected duration of stay in days (1 for outpatient)';

-- Add admission/discharge tracking for inpatient
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS admission_date TIMESTAMPTZ;

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMPTZ;

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS ward_location VARCHAR(100);

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS bed_number VARCHAR(20);

-- Add index for encounter category queries
CREATE INDEX IF NOT EXISTS idx_visits_encounter_category ON visits(encounter_category);
CREATE INDEX IF NOT EXISTS idx_visits_admission_date ON visits(admission_date);

-- -----------------------------------------------------------------------------
-- 2. Daily Progress Notes table
-- For tracking daily clinical progress in long-term encounters
-- NOTE: encounter_id and patient_id use VARCHAR to match visits/patients table types
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_progress_notes (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id VARCHAR(50) NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Clinical Summary (Doctor's Input)
    subjective TEXT,              -- Patient's reported symptoms
    objective TEXT,               -- Clinical findings
    assessment TEXT,              -- Doctor's assessment
    plan TEXT,                    -- Treatment plan updates
    
    -- Nursing Summary
    nursing_summary TEXT,         -- Overall nursing observations
    vital_signs_summary TEXT,     -- Summary of day's vital signs
    
    -- Intake/Output (I/O) Tracking
    oral_intake_ml INTEGER DEFAULT 0,
    iv_intake_ml INTEGER DEFAULT 0,
    urine_output_ml INTEGER DEFAULT 0,
    other_output_ml INTEGER DEFAULT 0,
    io_notes TEXT,
    
    -- Status tracking
    patient_condition VARCHAR(50) DEFAULT 'stable',  -- critical, unstable, stable, improving, deteriorating
    alert_level VARCHAR(20) DEFAULT 'normal',        -- normal, caution, warning, critical
    
    -- Recorded by
    recorded_by UUID REFERENCES staff(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one progress note per encounter per day
    UNIQUE(encounter_id, note_date)
);

-- Indexes for daily progress notes
CREATE INDEX IF NOT EXISTS idx_progress_notes_encounter ON daily_progress_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_patient ON daily_progress_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_date ON daily_progress_notes(note_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_notes_alert ON daily_progress_notes(alert_level) WHERE alert_level != 'normal';

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_progress_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_progress_notes_updated_at ON daily_progress_notes;
CREATE TRIGGER trigger_progress_notes_updated_at
    BEFORE UPDATE ON daily_progress_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_progress_notes_timestamp();

-- -----------------------------------------------------------------------------
-- 3. Shift Handover Documentation table
-- For nursing continuity across shifts
-- NOTE: encounter_id and patient_id use VARCHAR to match visits/patients table types
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shift_handovers (
    handover_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id VARCHAR(50) NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    handover_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Shift information
    outgoing_shift VARCHAR(20) NOT NULL,   -- 'morning', 'afternoon', 'night'
    incoming_shift VARCHAR(20) NOT NULL,
    
    -- Patient status at handover
    patient_status TEXT NOT NULL,          -- Current condition summary
    consciousness_level VARCHAR(50),        -- Alert, Drowsy, Unconscious, etc.
    mobility_status VARCHAR(50),            -- Ambulatory, Bed-bound, etc.
    
    -- Critical information
    pending_tasks JSONB DEFAULT '[]',       -- Array of pending tasks
    special_instructions TEXT,              -- Critical information
    isolation_precautions TEXT,             -- Infection control measures
    fall_risk_level VARCHAR(20),            -- Low, Moderate, High
    
    -- Medications & Investigations
    medication_due JSONB DEFAULT '[]',      -- Upcoming medications
    investigations_pending JSONB DEFAULT '[]', -- Labs, radiology awaiting
    
    -- Vital signs trend
    last_vitals JSONB,                      -- Most recent vital signs
    vitals_trend TEXT,                      -- Trending up/down/stable
    
    -- IV/Lines
    iv_access JSONB DEFAULT '[]',           -- Current IV sites and fluids
    drains_catheters JSONB DEFAULT '[]',    -- Drains, catheters in place
    
    -- Nutrition
    diet_type VARCHAR(100),
    feeding_route VARCHAR(50),              -- Oral, NGT, PEG, NPO
    last_meal_time TIMESTAMPTZ,
    
    -- Concerns & Follow-up
    concerns TEXT,                          -- Nursing concerns
    follow_up_actions TEXT,                 -- Actions for incoming shift
    
    -- Staff involved
    outgoing_nurse_id UUID REFERENCES staff(id),
    incoming_nurse_id UUID REFERENCES staff(id),
    handover_time TIMESTAMPTZ DEFAULT NOW(),
    
    -- Acknowledgment
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for shift handovers
CREATE INDEX IF NOT EXISTS idx_handovers_encounter ON shift_handovers(encounter_id);
CREATE INDEX IF NOT EXISTS idx_handovers_patient ON shift_handovers(patient_id);
CREATE INDEX IF NOT EXISTS idx_handovers_date ON shift_handovers(handover_date DESC);
CREATE INDEX IF NOT EXISTS idx_handovers_outgoing_nurse ON shift_handovers(outgoing_nurse_id);
CREATE INDEX IF NOT EXISTS idx_handovers_incoming_nurse ON shift_handovers(incoming_nurse_id);
CREATE INDEX IF NOT EXISTS idx_handovers_unacknowledged ON shift_handovers(is_acknowledged) WHERE is_acknowledged = FALSE;

-- -----------------------------------------------------------------------------
-- 4. Doctor's Orders table (for nursing action items)
-- NOTE: encounter_id and patient_id use VARCHAR to match visits/patients table types
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS doctor_orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id VARCHAR(50) NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    
    -- Order details
    order_type VARCHAR(50) NOT NULL,       -- medication, monitoring, procedure, diet, activity, investigation
    order_category VARCHAR(50),             -- Sub-category
    instruction TEXT NOT NULL,              -- The actual order/instruction
    
    -- Timing
    frequency VARCHAR(100),                 -- Once, BD, TDS, QID, PRN, etc.
    duration VARCHAR(100),                  -- Duration of order
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    
    -- Priority & Status
    priority VARCHAR(20) DEFAULT 'routine', -- stat, urgent, routine
    status VARCHAR(30) DEFAULT 'pending',   -- pending, in_progress, completed, cancelled, on_hold
    
    -- Nursing workflow
    requires_nurse_action BOOLEAN DEFAULT TRUE,
    assigned_nurse_id UUID REFERENCES staff(id),
    acknowledged_by UUID REFERENCES staff(id),
    acknowledged_at TIMESTAMPTZ,
    completed_by UUID REFERENCES staff(id),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Ordering information
    ordered_by UUID NOT NULL REFERENCES staff(id),
    ordered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Cancellation tracking
    cancelled_by UUID REFERENCES staff(id),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for doctor orders
CREATE INDEX IF NOT EXISTS idx_doctor_orders_encounter ON doctor_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_doctor_orders_patient ON doctor_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_orders_status ON doctor_orders(status);
CREATE INDEX IF NOT EXISTS idx_doctor_orders_priority ON doctor_orders(priority);
CREATE INDEX IF NOT EXISTS idx_doctor_orders_nurse_action ON doctor_orders(requires_nurse_action) WHERE requires_nurse_action = TRUE;
CREATE INDEX IF NOT EXISTS idx_doctor_orders_pending ON doctor_orders(status, requires_nurse_action) WHERE status = 'pending' AND requires_nurse_action = TRUE;
CREATE INDEX IF NOT EXISTS idx_doctor_orders_ordered_by ON doctor_orders(ordered_by);
CREATE INDEX IF NOT EXISTS idx_doctor_orders_assigned_nurse ON doctor_orders(assigned_nurse_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_doctor_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_doctor_orders_updated_at ON doctor_orders;
CREATE TRIGGER trigger_doctor_orders_updated_at
    BEFORE UPDATE ON doctor_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_doctor_orders_timestamp();

-- -----------------------------------------------------------------------------
-- 5. Add requires_nurse_followup flag to consultations
-- -----------------------------------------------------------------------------

ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS requires_nurse_followup BOOLEAN DEFAULT FALSE;

ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS nurse_followup_instructions TEXT;

ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS nurse_acknowledged_by UUID REFERENCES staff(id);

ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS nurse_acknowledged_at TIMESTAMPTZ;

-- Index for consultations requiring nurse followup
CREATE INDEX IF NOT EXISTS idx_consultations_nurse_followup 
ON consultations(requires_nurse_followup) 
WHERE requires_nurse_followup = TRUE;

-- -----------------------------------------------------------------------------
-- 6. Comments for documentation
-- -----------------------------------------------------------------------------

COMMENT ON TABLE daily_progress_notes IS 'Daily clinical progress notes for long-term encounters (inpatient)';
COMMENT ON TABLE shift_handovers IS 'Nursing shift handover documentation for continuity of care';
COMMENT ON TABLE doctor_orders IS 'Doctor orders that require nursing action or acknowledgment';

-- -----------------------------------------------------------------------------
-- 7. Notify PostgREST to reload schema
-- -----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Migration complete
-- =============================================================================
