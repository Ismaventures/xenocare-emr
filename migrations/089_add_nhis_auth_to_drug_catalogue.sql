-- =============================================================================
-- Migration: Add requires_nhis_authorization to drug_catalogue
-- This allows admin to mark specific drugs that require NHIS desk approval
-- =============================================================================

-- Add requires_nhis_authorization to drug_catalogue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drug_catalogue' 
    AND column_name = 'requires_nhis_authorization'
  ) THEN
    ALTER TABLE public.drug_catalogue 
    ADD COLUMN requires_nhis_authorization boolean DEFAULT false;
    
    COMMENT ON COLUMN public.drug_catalogue.requires_nhis_authorization IS 
      'If true, this drug requires NHIS desk pre-authorization before being dispensed to NHIS patients';
  END IF;
END $$;

-- Create index for faster lookup of drugs requiring authorization
CREATE INDEX IF NOT EXISTS idx_drug_catalogue_nhis_auth 
  ON public.drug_catalogue(requires_nhis_authorization) 
  WHERE requires_nhis_authorization = true;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 089 completed: Added requires_nhis_authorization to drug_catalogue';
END $$;
