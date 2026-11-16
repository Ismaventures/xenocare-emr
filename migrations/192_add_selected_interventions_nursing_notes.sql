-- Migration 192: Add selected_interventions column to nursing_notes table
-- Description: Adds a column to store an array of selected intervention codes within the nursing note

-- Add the column as a TEXT array (TEXT[]) to store multiple intervention IDs/Codes
ALTER TABLE nursing_notes
ADD COLUMN IF NOT EXISTS selected_interventions TEXT[] DEFAULT '{}';

COMMENT ON COLUMN nursing_notes.selected_interventions IS 'Array of intervention codes selected for this nursing note (e.g. ["IV_CHECK", "VITALS"])';
