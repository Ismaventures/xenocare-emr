-- =============================================================================
-- Migration: Add authorization_code to nhis_approvals
-- 
-- Purpose: Store NHIS authorization/approval codes when requests are approved
-- This allows tracking of NHIS approval codes for billing and claims
-- =============================================================================

-- Add authorization_code column to nhis_approvals table
ALTER TABLE nhis_approvals 
ADD COLUMN IF NOT EXISTS authorization_code VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN nhis_approvals.authorization_code IS 
  'NHIS authorization/approval code entered when request is approved';

-- Create index for searching by authorization code
CREATE INDEX IF NOT EXISTS idx_nhis_approvals_auth_code 
ON nhis_approvals(authorization_code) 
WHERE authorization_code IS NOT NULL;
