-- =============================================================================
-- SPECIALTY CLINICAL MODULES - Queue Integration
-- Migration: 049_specialty_queue_locations.sql
-- Description: Adds specialty departments to queue location enum for
--              Dental, Ophthalmology, and Physiotherapy workflow integration
-- =============================================================================

-- =============================================================================
-- QUEUE LOCATION ENUM - Add Specialty Departments
-- =============================================================================

-- Add new queue location values for specialty modules
-- Note: The enum is named 'queue_location' (not 'queue_location_enum')
ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Dental';
ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Ophthalmology';
ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Physiotherapy';

-- =============================================================================
-- BILLING INTEGRATION - Add service types if not exists
-- =============================================================================

-- These may already exist but ensure they're available for billing
DO $$ BEGIN
    -- Check if service_type column exists and update if needed
    -- The billing_items and billing_orders tables should accept these service types
    -- This is handled in TypeScript layer (billing-order.dto.ts SERVICE_TYPES)
    NULL;
END $$;

-- =============================================================================
-- ADD WORKFLOW STAGE TRACKING FOR SPECIALTY MODULES
-- =============================================================================

-- Add specialty workflow stages to encounter tracking (if workflow_stage_enum exists)
DO $$ 
BEGIN
    -- Only attempt if the enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_stage_enum') THEN
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'dental_pending';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'dental_exam';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'dental_procedure';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'ophthalmology_pending';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'ophthalmology_exam';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'ophthalmology_procedure';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'physiotherapy_pending';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'physiotherapy_assessment';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        
        BEGIN
            ALTER TYPE workflow_stage_enum ADD VALUE IF NOT EXISTS 'physiotherapy_session';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;
END $$;

-- =============================================================================
-- INDEXES FOR QUEUE PERFORMANCE ON SPECIALTY MODULES
-- =============================================================================

-- Note: Partial index with new enum values cannot be created in same transaction
-- as ALTER TYPE. Create a general index instead, or run partial index separately.
CREATE INDEX IF NOT EXISTS idx_queue_location ON queue(location);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON INDEX idx_queue_location IS 'Index for queue location lookups including specialty departments';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify enum values were added (using text comparison to avoid transaction issues)
DO $$
DECLARE
    enum_count INT;
BEGIN
    SELECT COUNT(*) INTO enum_count
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'queue_location'
    AND e.enumlabel::text IN ('Dental', 'Ophthalmology', 'Physiotherapy');
    
    IF enum_count < 3 THEN
        RAISE WARNING 'Not all specialty locations were added to queue_location enum. Found: %', enum_count;
    ELSE
        RAISE NOTICE 'Successfully added % specialty locations to queue_location enum', enum_count;
    END IF;
END $$;
