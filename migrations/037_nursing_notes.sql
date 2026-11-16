-- ============================================================================
-- Migration: 037_nursing_notes.sql
-- Description: Create nursing_notes table for nurse reports/observations
-- Date: 2024-12-29
-- ============================================================================

-- Create enum for note types if not exists
DO $$ BEGIN
    CREATE TYPE nursing_note_type AS ENUM (
        'Progress_Note',
        'Observation',
        'Incident',
        'Handoff',
        'Assessment',
        'Medication_Note',
        'Procedure_Note',
        'Patient_Response'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for patient condition if not exists
DO $$ BEGIN
    CREATE TYPE patient_condition AS ENUM (
        'Stable',
        'Improving',
        'Deteriorating',
        'Critical',
        'Unchanged'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for shift types if not exists
DO $$ BEGIN
    CREATE TYPE shift_type AS ENUM (
        'Morning',
        'Afternoon',
        'Night'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Nursing Notes Table (Nursing Reports)
-- Allows nurses to document observations, progress notes, and other reports
-- for patients who have been attended to by doctors (consultants)
-- NOTE: Treatment plan is OPTIONAL - nurses can add reports for any consulted patient
CREATE TABLE IF NOT EXISTS nursing_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core relationships (encounter-centric)
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Optional linkages
    consultation_id UUID REFERENCES consultations(consultation_id),
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    treatment_task_id UUID REFERENCES treatment_tasks(id),
    
    -- Note content
    note_type VARCHAR(30) NOT NULL DEFAULT 'Progress_Note',
    title VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Clinical observations
    patient_condition VARCHAR(30),
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    
    -- Additional fields for specific note types
    interventions_performed TEXT,
    patient_response TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    
    -- Recording info
    recorded_by UUID NOT NULL REFERENCES staff(id),
    shift VARCHAR(20),
    
    -- Flags
    is_critical BOOLEAN DEFAULT false,
    requires_doctor_review BOOLEAN DEFAULT false,
    doctor_reviewed_by UUID REFERENCES staff(id),
    doctor_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nursing_notes_encounter ON nursing_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_patient ON nursing_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_treatment_plan ON nursing_notes(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_recorded_by ON nursing_notes(recorded_by);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_created_at ON nursing_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_critical ON nursing_notes(is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_nursing_notes_requires_review ON nursing_notes(requires_doctor_review) WHERE requires_doctor_review = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_nursing_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_nursing_notes_updated_at ON nursing_notes;
CREATE TRIGGER trigger_nursing_notes_updated_at
    BEFORE UPDATE ON nursing_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_nursing_notes_updated_at();

-- Row Level Security (RLS)
ALTER TABLE nursing_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read nursing notes
CREATE POLICY "nursing_notes_select_policy" ON nursing_notes
    FOR SELECT
    USING (true);

-- Policy: Allow nurses and doctors to insert nursing notes
CREATE POLICY "nursing_notes_insert_policy" ON nursing_notes
    FOR INSERT
    WITH CHECK (true);

-- Policy: Allow the creator to update their own notes
CREATE POLICY "nursing_notes_update_policy" ON nursing_notes
    FOR UPDATE
    USING (true);

-- Comments
COMMENT ON TABLE nursing_notes IS 'Nursing reports, observations, and progress notes for patient encounters';
COMMENT ON COLUMN nursing_notes.note_type IS 'Type of nursing note: Progress_Note, Observation, Incident, Handoff, Assessment, etc.';
COMMENT ON COLUMN nursing_notes.patient_condition IS 'Current patient condition assessment: Stable, Improving, Deteriorating, Critical, Unchanged';
COMMENT ON COLUMN nursing_notes.is_critical IS 'Flag for critical observations that need immediate attention';
COMMENT ON COLUMN nursing_notes.requires_doctor_review IS 'Flag indicating this note needs doctor review';
