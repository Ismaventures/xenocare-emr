-- =============================================================================
-- Migration 102: Add NHIS Approval Workflow to Specialty Tables
-- =============================================================================
-- Adds nhis_approval_status column to dental and ophthalmology tables
-- so that specialty clinic orders for NHIS patients go through the NHIS 
-- approval queue before reaching the departments.
--
-- Flow for NHIS patients:
-- 1. Patient is referred to specialty clinic (dental/ophthalmology/physio)
-- 2. Specialist orders services (procedures, prescriptions, labs, etc.)
-- 3. Services go to NHIS Approval Queue with status = 'pending'
-- 4. NHIS desk officer reviews and approves
-- 5. Upon approval, services become visible in respective department queues
-- =============================================================================

-- Add nhis_approval_status to dental_procedures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dental_procedures' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.dental_procedures 
    ADD COLUMN nhis_approval_status VARCHAR(50) DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.dental_procedures.nhis_approval_status IS 
      'NHIS approval status: not_required (non-NHIS), pending (awaiting approval), approved, rejected, expired';
  END IF;
END $$;

-- Add nhis_approval_status to dental_prescriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dental_prescriptions' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.dental_prescriptions 
    ADD COLUMN nhis_approval_status VARCHAR(50) DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.dental_prescriptions.nhis_approval_status IS 
      'NHIS approval status: not_required (non-NHIS), pending (awaiting approval), approved, rejected, expired';
  END IF;
END $$;

-- Add nhis_approval_status to eye_exams (ophthalmology)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'eye_exams' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.eye_exams 
    ADD COLUMN nhis_approval_status VARCHAR(50) DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.eye_exams.nhis_approval_status IS 
      'NHIS approval status: not_required (non-NHIS), pending (awaiting approval), approved, rejected, expired';
  END IF;
END $$;

-- Add nhis_approval_status to eye_prescriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'eye_prescriptions' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.eye_prescriptions 
    ADD COLUMN nhis_approval_status VARCHAR(50) DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.eye_prescriptions.nhis_approval_status IS 
      'NHIS approval status: not_required (non-NHIS), pending (awaiting approval), approved, rejected, expired';
  END IF;
END $$;

-- Add nhis_approval_status to eye_procedures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'eye_procedures' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.eye_procedures 
    ADD COLUMN nhis_approval_status VARCHAR(50) DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.eye_procedures.nhis_approval_status IS 
      'NHIS approval status: not_required (non-NHIS), pending (awaiting approval), approved, rejected, expired';
  END IF;
END $$;

-- Add clinical context fields to specialty tables for NHIS approval display

-- Dental procedures clinical context
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dental_procedures' 
    AND column_name = 'clinical_findings'
  ) THEN
    ALTER TABLE public.dental_procedures 
    ADD COLUMN clinical_findings TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dental_procedures' 
    AND column_name = 'provisional_diagnosis'
  ) THEN
    ALTER TABLE public.dental_procedures 
    ADD COLUMN provisional_diagnosis TEXT;
  END IF;
END $$;

-- Eye prescriptions clinical context
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'eye_prescriptions' 
    AND column_name = 'clinical_findings'
  ) THEN
    ALTER TABLE public.eye_prescriptions 
    ADD COLUMN clinical_findings TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'eye_prescriptions' 
    AND column_name = 'provisional_diagnosis'
  ) THEN
    ALTER TABLE public.eye_prescriptions 
    ADD COLUMN provisional_diagnosis TEXT;
  END IF;
END $$;

-- Create indexes for faster NHIS pending lookups
CREATE INDEX IF NOT EXISTS idx_dental_procedures_nhis_pending 
  ON public.dental_procedures(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dental_prescriptions_nhis_pending 
  ON public.dental_prescriptions(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_eye_exams_nhis_pending 
  ON public.eye_exams(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_eye_prescriptions_nhis_pending 
  ON public.eye_prescriptions(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_eye_procedures_nhis_pending 
  ON public.eye_procedures(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

-- =============================================================================
-- Function to check if patient is NHIS from visit/encounter
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_encounter_nhis(p_encounter_id uuid)
RETURNS boolean AS $$
DECLARE
  v_insurance_type text;
BEGIN
  SELECT COALESCE(insurance_type, payment_category) INTO v_insurance_type
  FROM public.visits
  WHERE id = p_encounter_id;
  
  RETURN v_insurance_type IS NOT NULL AND UPPER(v_insurance_type) LIKE '%NHIS%';
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- Trigger function to auto-set nhis_approval_status on specialty orders
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_specialty_nhis_approval_status()
RETURNS TRIGGER AS $$
DECLARE
  v_is_nhis boolean;
BEGIN
  -- Check if encounter is NHIS
  IF NEW.encounter_id IS NOT NULL THEN
    v_is_nhis := public.is_encounter_nhis(NEW.encounter_id);
    
    -- If NHIS patient, set status to pending
    IF v_is_nhis THEN
      NEW.nhis_approval_status := 'pending';
    ELSE
      NEW.nhis_approval_status := 'not_required';
    END IF;
  ELSE
    NEW.nhis_approval_status := 'not_required';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for specialty tables
DROP TRIGGER IF EXISTS trg_dental_procedures_nhis_status ON public.dental_procedures;
CREATE TRIGGER trg_dental_procedures_nhis_status
  BEFORE INSERT ON public.dental_procedures
  FOR EACH ROW
  WHEN (NEW.nhis_approval_status IS NULL OR NEW.nhis_approval_status = 'not_required')
  EXECUTE FUNCTION public.set_specialty_nhis_approval_status();

DROP TRIGGER IF EXISTS trg_dental_prescriptions_nhis_status ON public.dental_prescriptions;
CREATE TRIGGER trg_dental_prescriptions_nhis_status
  BEFORE INSERT ON public.dental_prescriptions
  FOR EACH ROW
  WHEN (NEW.nhis_approval_status IS NULL OR NEW.nhis_approval_status = 'not_required')
  EXECUTE FUNCTION public.set_specialty_nhis_approval_status();

DROP TRIGGER IF EXISTS trg_eye_exams_nhis_status ON public.eye_exams;
CREATE TRIGGER trg_eye_exams_nhis_status
  BEFORE INSERT ON public.eye_exams
  FOR EACH ROW
  WHEN (NEW.nhis_approval_status IS NULL OR NEW.nhis_approval_status = 'not_required')
  EXECUTE FUNCTION public.set_specialty_nhis_approval_status();

DROP TRIGGER IF EXISTS trg_eye_prescriptions_nhis_status ON public.eye_prescriptions;
CREATE TRIGGER trg_eye_prescriptions_nhis_status
  BEFORE INSERT ON public.eye_prescriptions
  FOR EACH ROW
  WHEN (NEW.nhis_approval_status IS NULL OR NEW.nhis_approval_status = 'not_required')
  EXECUTE FUNCTION public.set_specialty_nhis_approval_status();

DROP TRIGGER IF EXISTS trg_eye_procedures_nhis_status ON public.eye_procedures;
CREATE TRIGGER trg_eye_procedures_nhis_status
  BEFORE INSERT ON public.eye_procedures
  FOR EACH ROW
  WHEN (NEW.nhis_approval_status IS NULL OR NEW.nhis_approval_status = 'not_required')
  EXECUTE FUNCTION public.set_specialty_nhis_approval_status();

SELECT 'Migration 102 complete: Added NHIS approval workflow to specialty tables' AS status;
