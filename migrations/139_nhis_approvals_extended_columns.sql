-- =============================================================================
-- Migration 139: Add extended columns to nhis_approvals & procedure_catalogue
-- These columns are used by the NHIS pre-authorization flow in createBatchOrders
-- =============================================================================

-- ============================================================================
-- PART 1: nhis_approvals extended columns (from migration 101 if not applied)
-- ============================================================================

-- clinical_findings: exam findings for NHIS desk context
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
      'Clinical examination findings from the requesting doctor';
  END IF;
END $$;

-- provisional_diagnosis: ICD-10 diagnosis for NHIS desk context
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
      'Provisional diagnosis from the consultation (ICD-10 codes/names)';
  END IF;
END $$;

-- service_category: group services by module (lab, radiology, procedure, pharmacy)
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
      'Category of the service: lab, radiology, procedure, pharmacy';
  END IF;
END $$;

-- patient_emr_number: for display in NHIS approval queue without extra joins
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
      'Patient EMR number for display (denormalized for NHIS desk efficiency)';
  END IF;
END $$;

-- patient_name: for display in NHIS approval queue without extra joins
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
      'Patient name for display (denormalized for NHIS desk efficiency)';
  END IF;
END $$;

-- Index on service_category for filtering
CREATE INDEX IF NOT EXISTS idx_nhis_approvals_category 
  ON public.nhis_approvals(status, service_category) 
  WHERE status = 'pending';

-- ============================================================================
-- PART 2: procedure_catalogue.requires_nhis_authorization (migration 087)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_catalogue' 
    AND column_name = 'requires_nhis_authorization'
  ) THEN
    ALTER TABLE public.procedure_catalogue 
    ADD COLUMN requires_nhis_authorization BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN public.procedure_catalogue.requires_nhis_authorization IS 
      'If true, this procedure requires NHIS desk pre-authorization before being performed for NHIS patients';
  END IF;
END $$;

-- Index for fast lookup of procedures requiring NHIS auth
CREATE INDEX IF NOT EXISTS idx_procedure_cat_nhis_auth 
  ON public.procedure_catalogue(requires_nhis_authorization) 
  WHERE requires_nhis_authorization = true;

-- ============================================================================
-- PART 3: Ensure lab_test_catalogue has requires_nhis_authorization
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_test_catalogue' 
    AND column_name = 'requires_nhis_authorization'
  ) THEN
    ALTER TABLE public.lab_test_catalogue 
    ADD COLUMN requires_nhis_authorization BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- PART 4: Ensure imaging_catalogue has requires_nhis_authorization
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'imaging_catalogue' 
    AND column_name = 'requires_nhis_authorization'
  ) THEN
    ALTER TABLE public.imaging_catalogue 
    ADD COLUMN requires_nhis_authorization BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- PART 5: Ensure drug_catalogue has requires_nhis_authorization
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drug_catalogue' 
    AND column_name = 'requires_nhis_authorization'
  ) THEN
    ALTER TABLE public.drug_catalogue 
    ADD COLUMN requires_nhis_authorization BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 139 complete: nhis_approvals extended columns + catalogue requires_nhis_authorization columns ensured';
END $$;
