-- =============================================================================
-- Migration: Add Course and Title fields for Participants and Civilians
-- Date: 2026-01-04
-- Description: 
--   - Adds 'course' field for Military Participant and Civilian Participant
--     to filter participants by course (e.g., Course 34)
--   - Adds 'title' field for Civilian and Civilian Participant
--     to store titles like Dr., Prof., Engr., Chief
-- =============================================================================

-- Add course column for participants
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS course VARCHAR(100) DEFAULT NULL;

-- Add title column for civilians
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS title VARCHAR(50) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN patients.course IS 'Course name for Military/Civilian Participants (e.g., Course 34)';
COMMENT ON COLUMN patients.title IS 'Title/Rank for Civilian and Civilian Participant (e.g., Dr., Prof., Engr., Chief)';

-- Create index for course to enable filtering by course
CREATE INDEX IF NOT EXISTS idx_patients_course ON patients(course) WHERE course IS NOT NULL;

-- =============================================================================
-- Verification query (run after migration to confirm)
-- =============================================================================
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'patients' AND column_name IN ('course', 'title');
