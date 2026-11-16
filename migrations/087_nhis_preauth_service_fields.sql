-- =============================================================================
-- Migration: Add NHIS Pre-Authorization Required Flag to Service Tables
-- This allows admin to mark specific services that require NHIS desk approval
-- =============================================================================

-- Add requires_nhis_authorization to procedure_catalogue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_catalogue' 
    AND column_name = 'requires_nhis_authorization'
  ) THEN
    ALTER TABLE public.procedure_catalogue 
    ADD COLUMN requires_nhis_authorization boolean DEFAULT false;
    
    COMMENT ON COLUMN public.procedure_catalogue.requires_nhis_authorization IS 
      'If true, this procedure requires NHIS desk pre-authorization before being performed for NHIS patients';
  END IF;
END $$;

-- Add requires_nhis_authorization to lab_test_catalogue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_test_catalogue' 
    AND column_name = 'requires_nhis_authorization'
  ) THEN
    ALTER TABLE public.lab_test_catalogue 
    ADD COLUMN requires_nhis_authorization boolean DEFAULT false;
    
    COMMENT ON COLUMN public.lab_test_catalogue.requires_nhis_authorization IS 
      'If true, this lab test requires NHIS desk pre-authorization before being performed for NHIS patients';
  END IF;
END $$;

-- Add requires_nhis_authorization to imaging_catalogue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'imaging_catalogue' 
    AND column_name = 'requires_nhis_authorization'
  ) THEN
    ALTER TABLE public.imaging_catalogue 
    ADD COLUMN requires_nhis_authorization boolean DEFAULT false;
    
    COMMENT ON COLUMN public.imaging_catalogue.requires_nhis_authorization IS 
      'If true, this imaging exam requires NHIS desk pre-authorization before being performed for NHIS patients';
  END IF;
END $$;

-- Add price and nhis_price columns to wards if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'wards' 
    AND column_name = 'price'
  ) THEN
    ALTER TABLE public.wards 
    ADD COLUMN price numeric(12,2) DEFAULT 0;
    
    COMMENT ON COLUMN public.wards.price IS 'Daily rate for private patients';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'wards' 
    AND column_name = 'nhis_price'
  ) THEN
    ALTER TABLE public.wards 
    ADD COLUMN nhis_price numeric(12,2) DEFAULT 0;
    
    COMMENT ON COLUMN public.wards.nhis_price IS 'Daily rate for NHIS patients (NHIS tariff)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'wards' 
    AND column_name = 'is_nhis_covered'
  ) THEN
    ALTER TABLE public.wards 
    ADD COLUMN is_nhis_covered boolean DEFAULT true;
    
    COMMENT ON COLUMN public.wards.is_nhis_covered IS 'Whether bed charges in this ward can be billed to NHIS';
  END IF;
END $$;

-- Add category-specific coverage percentages to nhis_config if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'nhis_config' 
    AND column_name = 'lab_coverage_percentage'
  ) THEN
    ALTER TABLE public.nhis_config 
    ADD COLUMN lab_coverage_percentage integer DEFAULT 0,
    ADD COLUMN radiology_coverage_percentage integer DEFAULT 0,
    ADD COLUMN pharmacy_coverage_percentage integer DEFAULT 0,
    ADD COLUMN procedure_coverage_percentage integer DEFAULT 0,
    ADD COLUMN bed_coverage_percentage integer DEFAULT 0;
    
    -- Update existing configs to use the default coverage_percentage
    UPDATE public.nhis_config SET 
      lab_coverage_percentage = coverage_percentage,
      radiology_coverage_percentage = coverage_percentage,
      pharmacy_coverage_percentage = coverage_percentage,
      procedure_coverage_percentage = coverage_percentage,
      bed_coverage_percentage = coverage_percentage
    WHERE lab_coverage_percentage IS NULL OR lab_coverage_percentage = 0;
  END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_proc_cat_nhis_auth 
  ON public.procedure_catalogue(requires_nhis_authorization) 
  WHERE requires_nhis_authorization = true;

CREATE INDEX IF NOT EXISTS idx_lab_cat_nhis_auth 
  ON public.lab_test_catalogue(requires_nhis_authorization) 
  WHERE requires_nhis_authorization = true;

CREATE INDEX IF NOT EXISTS idx_imaging_cat_nhis_auth 
  ON public.imaging_catalogue(requires_nhis_authorization) 
  WHERE requires_nhis_authorization = true;

-- Set some common high-cost procedures to require NHIS authorization by default
UPDATE public.procedure_catalogue SET requires_nhis_authorization = true
WHERE category IN ('major', 'surgical', 'cardiovascular', 'neurological', 'orthopedic')
  AND base_price > 50000
  AND requires_nhis_authorization IS NOT true;

-- Grant permissions
GRANT SELECT, UPDATE ON public.procedure_catalogue TO authenticated;
GRANT SELECT, UPDATE ON public.lab_test_catalogue TO authenticated;
GRANT SELECT, UPDATE ON public.imaging_catalogue TO authenticated;
GRANT SELECT, UPDATE ON public.wards TO authenticated;
GRANT SELECT, UPDATE ON public.nhis_config TO authenticated;

SELECT 'Migration 087 complete: Added NHIS pre-authorization fields to service catalogues' AS status;
