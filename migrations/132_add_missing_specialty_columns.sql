-- Migration: 132_add_missing_specialty_columns
-- Purpose: Add missing specialty consultation columns to consultations table
-- These columns are passed by the SpecialtyConsultationWizard but were never
-- added to the production database. Data has been silently dropped.
--
-- Missing columns:
--   1. specialty_data (JSONB) - All specialty-specific exam form data
--   2. specialty_template_id (UUID) - Reference to template version used
--   3. specialty_template_version (INTEGER) - Template version number
--
-- NOTE: specialty_code already exists in the table.
-- Created: 2026-02-07

-- =============================================================================
-- 1. Add specialty_data JSONB column
-- =============================================================================
-- This stores all specialty-specific examination form data entered in the wizard
-- e.g. Cardiology: chest_pain_assessment, ecg_findings, heart_sounds, etc.
-- e.g. Neurology: cranial_nerve_exam, motor_exam, sensory_exam, etc.

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS specialty_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.consultations.specialty_data IS
  'Specialty-specific examination form data in JSONB format. Contains all fields from the specialty consultation wizard template (e.g. cardiac exam, neuro exam, etc.)';

-- =============================================================================
-- 2. Add specialty_template_id column
-- =============================================================================
-- References which template version was used to render the form
-- Important for medico-legal: allows re-rendering the form exactly as it was

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS specialty_template_id UUID;

COMMENT ON COLUMN public.consultations.specialty_template_id IS
  'UUID of the specialty_templates record used for this consultation. Enables medico-legal re-rendering of the form as it appeared at time of consultation.';

-- =============================================================================
-- 3. Add specialty_template_version column
-- =============================================================================
-- Denormalized version number for quick reference without JOIN

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS specialty_template_version INTEGER;

COMMENT ON COLUMN public.consultations.specialty_template_version IS
  'Denormalized template version number at time of consultation. Quick reference without JOIN to specialty_templates.';

-- =============================================================================
-- 4. Performance indexes
-- =============================================================================

-- GIN index on specialty_data for searching within JSONB
CREATE INDEX IF NOT EXISTS idx_consultations_specialty_data
  ON public.consultations USING GIN (specialty_data)
  WHERE specialty_data IS NOT NULL AND specialty_data != '{}'::jsonb;

-- B-tree index on specialty_template_id for FK lookups
CREATE INDEX IF NOT EXISTS idx_consultations_specialty_template_id
  ON public.consultations (specialty_template_id)
  WHERE specialty_template_id IS NOT NULL;

-- =============================================================================
-- 5. Verify columns were added
-- =============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'consultations'
    AND column_name IN ('specialty_data', 'specialty_template_id', 'specialty_template_version');
  
  IF v_count = 3 THEN
    RAISE NOTICE '✓ All 3 specialty columns successfully added to consultations table';
  ELSE
    RAISE WARNING '✗ Only % of 3 specialty columns found - check for errors', v_count;
  END IF;
END $$;
