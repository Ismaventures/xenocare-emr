-- =============================================================================
-- Migration: Add NHIS Pre-Authorization Required Flag to Drug Catalogue
-- This extends the NHIS pre-authorization requirement to pharmacy/medications
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
      'If true, this medication requires NHIS desk pre-authorization before being dispensed for NHIS patients';
  END IF;
END $$;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_drug_cat_nhis_auth 
  ON public.drug_catalogue(requires_nhis_authorization) 
  WHERE requires_nhis_authorization = true;

-- Grant permissions
GRANT SELECT, UPDATE ON public.drug_catalogue TO authenticated;

SELECT 'Migration 098 complete: Added NHIS pre-authorization field to drug_catalogue' AS status;
