-- Migration: Add Military_NHIS to insurance_type enum
-- This adds the new Military_NHIS value alongside DHML for compatibility

-- Add Military_NHIS to the insurance_type enum
ALTER TYPE insurance_type ADD VALUE IF NOT EXISTS 'Military_NHIS';

-- Add Retainership and GIFSHIP as well since they're used in the frontend
ALTER TYPE insurance_type ADD VALUE IF NOT EXISTS 'Retainership';
ALTER TYPE insurance_type ADD VALUE IF NOT EXISTS 'GIFSHIP';

-- Note: Existing DHML records remain valid. Military_NHIS is the new preferred value.
