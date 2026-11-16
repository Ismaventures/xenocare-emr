-- =============================================================================
-- Migration 212: Fix dental enum type mismatches
-- Converts gingival_status column from enum to text for flexible dropdown values
-- Adds new urgency levels to dental_urgency enum
-- =============================================================================

-- 1. Convert gingival_status column from enum to text
--    Old enum values: Healthy, Gingivitis, Mild_Periodontitis, Moderate_Periodontitis, Severe_Periodontitis
--    New dropdown values: Healthy, Mild_Gingivitis, Moderate_Gingivitis, Severe_Gingivitis, Periodontitis, Gingival_Recession
ALTER TABLE dental_exams
  ALTER COLUMN gingival_status DROP DEFAULT,
  ALTER COLUMN gingival_status TYPE text USING gingival_status::text,
  ALTER COLUMN gingival_status SET DEFAULT 'Healthy';

-- 2. Add new urgency values to dental_urgency enum
--    Existing: Routine, Urgent, Emergency
--    Adding: Priority, Elective
DO $$ BEGIN
  ALTER TYPE dental_urgency ADD VALUE IF NOT EXISTS 'Priority';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE dental_urgency ADD VALUE IF NOT EXISTS 'Elective';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
