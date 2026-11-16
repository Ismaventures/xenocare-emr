-- =============================================================================
-- Migration 101: Add Clinical Fields to NHIS Approvals
-- =============================================================================
-- Adds clinical examination findings and provisional diagnosis fields
-- to the nhis_approvals table for NHIS desk officers to review
-- before approving service requests (lab, radiology, pharmacy, procedures)
-- =============================================================================

-- Add clinical_findings column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_approvals' 
    AND column_name = 'clinical_findings'
  ) THEN
    ALTER TABLE public.nhis_approvals 
    ADD COLUMN clinical_findings TEXT;
    
    COMMENT ON COLUMN public.nhis_approvals.clinical_findings IS 
      'Clinical examination findings from the consultation';
  END IF;
END $$;

-- Add provisional_diagnosis column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_approvals' 
    AND column_name = 'provisional_diagnosis'
  ) THEN
    ALTER TABLE public.nhis_approvals 
    ADD COLUMN provisional_diagnosis TEXT;
    
    COMMENT ON COLUMN public.nhis_approvals.provisional_diagnosis IS 
      'Provisional diagnosis for the patient';
  END IF;
END $$;

-- Add authorization_code column (for NHIS desk to enter)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_approvals' 
    AND column_name = 'authorization_code'
  ) THEN
    ALTER TABLE public.nhis_approvals 
    ADD COLUMN authorization_code VARCHAR(100);
    
    COMMENT ON COLUMN public.nhis_approvals.authorization_code IS 
      'NHIS authorization code entered by NHIS desk officer';
  END IF;
END $$;

-- Add authorization_date column (for NHIS desk to enter)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_approvals' 
    AND column_name = 'authorization_date'
  ) THEN
    ALTER TABLE public.nhis_approvals 
    ADD COLUMN authorization_date DATE;
    
    COMMENT ON COLUMN public.nhis_approvals.authorization_date IS 
      'Date of the NHIS authorization code';
  END IF;
END $$;

-- Add authorization_expiry_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_approvals' 
    AND column_name = 'authorization_expiry_date'
  ) THEN
    ALTER TABLE public.nhis_approvals 
    ADD COLUMN authorization_expiry_date DATE;
    
    COMMENT ON COLUMN public.nhis_approvals.authorization_expiry_date IS 
      'Expiry date of the NHIS authorization';
  END IF;
END $$;

-- Add service_category column (lab, radiology, pharmacy, procedure, specialty)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_approvals' 
    AND column_name = 'service_category'
  ) THEN
    ALTER TABLE public.nhis_approvals 
    ADD COLUMN service_category VARCHAR(50);
    
    COMMENT ON COLUMN public.nhis_approvals.service_category IS 
      'Category of service: lab, radiology, pharmacy, procedure, specialty';
  END IF;
END $$;

-- Add patient_emr_number for easier lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_approvals' 
    AND column_name = 'patient_emr_number'
  ) THEN
    ALTER TABLE public.nhis_approvals 
    ADD COLUMN patient_emr_number VARCHAR(50);
    
    COMMENT ON COLUMN public.nhis_approvals.patient_emr_number IS 
      'Patient EMR number for display purposes';
  END IF;
END $$;

-- Add patient_name for easier display
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_approvals' 
    AND column_name = 'patient_name'
  ) THEN
    ALTER TABLE public.nhis_approvals 
    ADD COLUMN patient_name VARCHAR(255);
    
    COMMENT ON COLUMN public.nhis_approvals.patient_name IS 
      'Patient full name for display purposes';
  END IF;
END $$;

-- Create index for faster pending lookups with clinical info
CREATE INDEX IF NOT EXISTS idx_nhis_approvals_pending_service 
  ON public.nhis_approvals(status, service_category) 
  WHERE status = 'pending';

SELECT 'Migration 101 complete: Added clinical fields to nhis_approvals' AS status;
