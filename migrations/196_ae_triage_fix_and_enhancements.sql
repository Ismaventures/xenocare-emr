-- =============================================================================
-- Migration 196: Fix triage_assessments for A&E and add unique constraint
-- =============================================================================

BEGIN;

-- Add unique constraint on visit_id so upsert works correctly
-- First handle any duplicates by keeping only the most recent entry per visit
DELETE FROM triage_assessments t1
USING triage_assessments t2
WHERE t1.visit_id = t2.visit_id
  AND t1.id < t2.id
  AND t1.visit_id IS NOT NULL;

-- Now add the unique constraint
ALTER TABLE triage_assessments
  DROP CONSTRAINT IF EXISTS triage_assessments_visit_id_unique;

ALTER TABLE triage_assessments
  ADD CONSTRAINT triage_assessments_visit_id_unique UNIQUE (visit_id);

-- Ensure A&E columns exist (idempotent)
ALTER TABLE triage_assessments
  ADD COLUMN IF NOT EXISTS acuity_color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS trauma_mechanism TEXT,
  ADD COLUMN IF NOT EXISTS red_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS allergies_noted TEXT,
  ADD COLUMN IF NOT EXISTS triage_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_ae_triage BOOLEAN DEFAULT false;

COMMIT;
