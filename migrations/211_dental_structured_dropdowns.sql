-- =============================================================================
-- Migration 211: Add structured dropdown fields to dental_exams
-- Adds new columns for structured dental consultation data entry
-- =============================================================================

-- Primary complaint description (dropdown value)
ALTER TABLE dental_exams ADD COLUMN IF NOT EXISTS complaint_description text;

-- Calculus type (No calculus / Supragingival / Subgingival / Both)
ALTER TABLE dental_exams ADD COLUMN IF NOT EXISTS calculus_type text;

-- Examination notes (optional free-text notes for oral examination step)
ALTER TABLE dental_exams ADD COLUMN IF NOT EXISTS examination_notes text;
