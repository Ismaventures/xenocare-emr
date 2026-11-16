-- =============================================================================
-- Migration 191: Add nhis_approval_status to admissions table
-- Enables NHIS approval routing for admission requests
-- =============================================================================

-- 1. Add nhis_approval_status column to admissions
ALTER TABLE public.admissions
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

-- 2. Create index for efficient NHIS approval filtering
CREATE INDEX IF NOT EXISTS idx_admissions_nhis_approval_status 
  ON admissions(nhis_approval_status) 
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

COMMENT ON COLUMN admissions.nhis_approval_status IS 
  'NHIS approval status for admission requests. Routes to NHIS approval queue for NHIS patients.';
