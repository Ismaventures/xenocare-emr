-- =============================================================================
-- Migration 195: Add encounter_category column to visits table
-- Required by A&E module — queries filter visits by encounter_category='emergency'
-- =============================================================================

-- Add encounter category column (outpatient by default)
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS encounter_category VARCHAR(20) DEFAULT 'outpatient';

COMMENT ON COLUMN visits.encounter_category IS 'Type of encounter: outpatient, inpatient, emergency, day_case';

-- Add index for efficient category-based filtering
CREATE INDEX IF NOT EXISTS idx_visits_encounter_category ON visits(encounter_category);
