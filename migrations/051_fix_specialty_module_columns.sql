-- Migration: Add missing columns to specialty module tables
-- The APIs expect these columns but they don't exist in the tables
-- =============================================================================

-- =============================================================================
-- PHYSIOTHERAPY MODULE FIXES
-- =============================================================================

-- Add missing columns to physio_sessions table
ALTER TABLE physio_sessions 
ADD COLUMN IF NOT EXISTS compliance_level VARCHAR(50);

ALTER TABLE physio_sessions
ADD COLUMN IF NOT EXISTS plan_modifications TEXT;

ALTER TABLE physio_sessions
ADD COLUMN IF NOT EXISTS next_session_focus TEXT;

ALTER TABLE physio_sessions
ADD COLUMN IF NOT EXISTS outcome_measure_used VARCHAR(100);

ALTER TABLE physio_sessions
ADD COLUMN IF NOT EXISTS outcome_measure_score DECIMAL(10,2);

ALTER TABLE physio_sessions
ADD COLUMN IF NOT EXISTS treated_at TIMESTAMP WITH TIME ZONE;

-- Comments for physio_sessions columns
COMMENT ON COLUMN physio_sessions.compliance_level IS 'Patient compliance level (Good, Fair, Poor)';
COMMENT ON COLUMN physio_sessions.plan_modifications IS 'Any modifications made to the treatment plan during this session';
COMMENT ON COLUMN physio_sessions.next_session_focus IS 'Focus areas for the next session';
COMMENT ON COLUMN physio_sessions.outcome_measure_used IS 'Outcome measure instrument used (ODI, NDI, DASH, KOOS, WOMAC)';
COMMENT ON COLUMN physio_sessions.outcome_measure_score IS 'Score from the outcome measure assessment';
COMMENT ON COLUMN physio_sessions.treated_at IS 'Timestamp when treatment was actually provided';


-- =============================================================================
-- DENTAL MODULE FIXES
-- =============================================================================

-- Add missing columns to dental_procedures table
ALTER TABLE dental_procedures
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;

ALTER TABLE dental_procedures
ADD COLUMN IF NOT EXISTS follow_up_date DATE;

ALTER TABLE dental_procedures
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2);

ALTER TABLE dental_procedures
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10,2);

-- Comments for dental_procedures columns
COMMENT ON COLUMN dental_procedures.follow_up_required IS 'Whether follow-up is required after procedure';
COMMENT ON COLUMN dental_procedures.follow_up_date IS 'Scheduled follow-up date';
COMMENT ON COLUMN dental_procedures.estimated_cost IS 'Estimated cost of the procedure';
COMMENT ON COLUMN dental_procedures.actual_cost IS 'Actual cost after procedure completion';
