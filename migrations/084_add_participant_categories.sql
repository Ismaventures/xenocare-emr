-- =============================================================================
-- Migration: Add Military Participant and Civilian Participant categories
-- Date: 2026-01-22
-- Description: Extends patient_category and staff_category enums to include 
--              participant categories for NHIS participants
-- =============================================================================

-- Add new enum values for patient_category
-- IF NOT EXISTS ensures this is idempotent and won't fail if already applied
ALTER TYPE patient_category ADD VALUE IF NOT EXISTS 'Military Participant';
ALTER TYPE patient_category ADD VALUE IF NOT EXISTS 'Civilian Participant';

-- Add new enum values for staff_category  
-- These are needed when registering patients who are participants/dependents
ALTER TYPE staff_category ADD VALUE IF NOT EXISTS 'Military Participant';
ALTER TYPE staff_category ADD VALUE IF NOT EXISTS 'Civilian Participant';

-- Verify the enum values
-- SELECT unnest(enum_range(NULL::patient_category));
-- SELECT unnest(enum_range(NULL::staff_category));
