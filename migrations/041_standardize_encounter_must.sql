-- =============================================================================
-- Migration: Standardize Encounter ID
-- Purpose: Use visits.id (UUID) as the SINGLE encounter identifier everywhere
-- This eliminates the visit_id vs encounter_id confusion
-- =============================================================================

-- PRINCIPLE:
-- - visits.id (UUID) = THE encounter identifier for all FKs
-- - visits.visit_id (VARCHAR) = Human-readable display ID (kept for display only)
-- - visits.encounter_number (VARCHAR) = Another human-readable ID (kept for display only)
-- - All tables should use encounter_id UUID referencing visits(id)

-- =============================================================================
-- 1. CONSULTATIONS - ensure encounter_id references visits(id)
-- =============================================================================
DO $$
BEGIN
    -- Add encounter_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consultations' AND column_name = 'encounter_id') THEN
        ALTER TABLE consultations ADD COLUMN encounter_id UUID;
    END IF;
    
    -- Drop old FK if exists (might reference wrong column)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'consultations_encounter_id_fkey' 
               AND table_name = 'consultations') THEN
        ALTER TABLE consultations DROP CONSTRAINT consultations_encounter_id_fkey;
    END IF;
    
    -- Add correct FK to visits(id)
    ALTER TABLE consultations 
    ADD CONSTRAINT consultations_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'consultations encounter_id setup: %', SQLERRM;
END $$;

-- Backfill encounter_id from visit_id for existing consultations
UPDATE consultations c
SET encounter_id = v.id
FROM visits v
WHERE c.visit_id = v.visit_id
AND c.encounter_id IS NULL;

-- =============================================================================
-- 2. LAB_REQUESTS - standardize to encounter_id UUID
-- =============================================================================
DO $$
BEGIN
    -- Add encounter_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lab_requests' AND column_name = 'encounter_id') THEN
        ALTER TABLE lab_requests ADD COLUMN encounter_id UUID;
    END IF;
    
    -- Drop old FK if exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'lab_requests_encounter_id_fkey' 
               AND table_name = 'lab_requests') THEN
        ALTER TABLE lab_requests DROP CONSTRAINT lab_requests_encounter_id_fkey;
    END IF;
    
    -- Add correct FK to visits(id)
    ALTER TABLE lab_requests 
    ADD CONSTRAINT lab_requests_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'lab_requests encounter_id setup: %', SQLERRM;
END $$;

-- Backfill encounter_id from visit_id
UPDATE lab_requests lr
SET encounter_id = v.id
FROM visits v
WHERE lr.visit_id = v.visit_id
AND lr.encounter_id IS NULL;

-- =============================================================================
-- 3. RADIOLOGY_REQUESTS - standardize to encounter_id UUID
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'radiology_requests' AND column_name = 'encounter_id') THEN
        ALTER TABLE radiology_requests ADD COLUMN encounter_id UUID;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'radiology_requests_encounter_id_fkey' 
               AND table_name = 'radiology_requests') THEN
        ALTER TABLE radiology_requests DROP CONSTRAINT radiology_requests_encounter_id_fkey;
    END IF;
    
    ALTER TABLE radiology_requests 
    ADD CONSTRAINT radiology_requests_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'radiology_requests encounter_id setup: %', SQLERRM;
END $$;

-- Backfill
UPDATE radiology_requests rr
SET encounter_id = v.id
FROM visits v
WHERE rr.visit_id = v.visit_id
AND rr.encounter_id IS NULL;

-- =============================================================================
-- 4. PRESCRIPTIONS - standardize to encounter_id UUID
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prescriptions' AND column_name = 'encounter_id') THEN
        ALTER TABLE prescriptions ADD COLUMN encounter_id UUID;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'prescriptions_encounter_id_fkey' 
               AND table_name = 'prescriptions') THEN
        ALTER TABLE prescriptions DROP CONSTRAINT prescriptions_encounter_id_fkey;
    END IF;
    
    ALTER TABLE prescriptions 
    ADD CONSTRAINT prescriptions_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'prescriptions encounter_id setup: %', SQLERRM;
END $$;

-- Backfill
UPDATE prescriptions p
SET encounter_id = v.id
FROM visits v
WHERE p.visit_id = v.visit_id
AND p.encounter_id IS NULL;

-- =============================================================================
-- 5. BILLING_ORDERS - standardize to encounter_id UUID
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'billing_orders' AND column_name = 'encounter_id') THEN
        ALTER TABLE billing_orders ADD COLUMN encounter_id UUID;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'billing_orders_encounter_id_fkey' 
               AND table_name = 'billing_orders') THEN
        ALTER TABLE billing_orders DROP CONSTRAINT billing_orders_encounter_id_fkey;
    END IF;
    
    ALTER TABLE billing_orders 
    ADD CONSTRAINT billing_orders_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'billing_orders encounter_id setup: %', SQLERRM;
END $$;

-- Backfill from visit_id (UUID referencing visits.id)
UPDATE billing_orders bo
SET encounter_id = bo.visit_id
WHERE bo.encounter_id IS NULL AND bo.visit_id IS NOT NULL;

-- =============================================================================
-- 6. RECEIPTS - standardize to encounter_id UUID
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'receipts' AND column_name = 'encounter_id') THEN
        ALTER TABLE receipts ADD COLUMN encounter_id UUID;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'receipts_encounter_id_fkey' 
               AND table_name = 'receipts') THEN
        ALTER TABLE receipts DROP CONSTRAINT receipts_encounter_id_fkey;
    END IF;
    
    ALTER TABLE receipts 
    ADD CONSTRAINT receipts_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'receipts encounter_id setup: %', SQLERRM;
END $$;

-- Backfill from visit_id (VARCHAR) - look up UUID from visits table
UPDATE receipts r
SET encounter_id = v.id
FROM visits v
WHERE r.visit_id::text = v.visit_id
AND r.encounter_id IS NULL;

-- =============================================================================
-- 7. VITALS - standardize to encounter_id UUID
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vitals' AND column_name = 'encounter_id') THEN
        ALTER TABLE vitals ADD COLUMN encounter_id UUID;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'vitals_encounter_id_fkey' 
               AND table_name = 'vitals') THEN
        ALTER TABLE vitals DROP CONSTRAINT vitals_encounter_id_fkey;
    END IF;
    
    ALTER TABLE vitals 
    ADD CONSTRAINT vitals_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vitals encounter_id setup: %', SQLERRM;
END $$;

-- Backfill - only if vitals has visit_id column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'vitals' AND column_name = 'visit_id') THEN
        EXECUTE 'UPDATE vitals SET encounter_id = visit_id WHERE encounter_id IS NULL AND visit_id IS NOT NULL';
    END IF;
END $$;

-- =============================================================================
-- 8. NURSING_CARE - standardize to encounter_id UUID (if table exists)
-- =============================================================================
DO $$
BEGIN
    -- Only proceed if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nursing_care') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'nursing_care' AND column_name = 'encounter_id') THEN
            ALTER TABLE nursing_care ADD COLUMN encounter_id UUID;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'nursing_care_encounter_id_fkey' 
                   AND table_name = 'nursing_care') THEN
            ALTER TABLE nursing_care DROP CONSTRAINT nursing_care_encounter_id_fkey;
        END IF;
        
        ALTER TABLE nursing_care 
        ADD CONSTRAINT nursing_care_encounter_id_fkey 
        FOREIGN KEY (encounter_id) REFERENCES visits(id);
        
        -- Backfill if visit_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'nursing_care' AND column_name = 'visit_id') THEN
            EXECUTE 'UPDATE nursing_care SET encounter_id = visit_id WHERE encounter_id IS NULL AND visit_id IS NOT NULL';
        END IF;
    ELSE
        RAISE NOTICE 'nursing_care table does not exist, skipping';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'nursing_care encounter_id setup: %', SQLERRM;
END $$;

-- =============================================================================
-- 9. QUEUE_ENTRIES - standardize to encounter_id UUID (if table exists)
-- =============================================================================
DO $$
BEGIN
    -- Only proceed if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'queue_entries' AND column_name = 'encounter_id') THEN
            ALTER TABLE queue_entries ADD COLUMN encounter_id UUID;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'queue_entries_encounter_id_fkey' 
                   AND table_name = 'queue_entries') THEN
            ALTER TABLE queue_entries DROP CONSTRAINT queue_entries_encounter_id_fkey;
        END IF;
        
        ALTER TABLE queue_entries 
        ADD CONSTRAINT queue_entries_encounter_id_fkey 
        FOREIGN KEY (encounter_id) REFERENCES visits(id);
        
        -- Backfill if visit_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'queue_entries' AND column_name = 'visit_id') THEN
            EXECUTE 'UPDATE queue_entries SET encounter_id = visit_id WHERE encounter_id IS NULL AND visit_id IS NOT NULL';
        END IF;
    ELSE
        RAISE NOTICE 'queue_entries table does not exist, skipping';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'queue_entries encounter_id setup: %', SQLERRM;
END $$;

-- =============================================================================
-- 10. QUEUE table (main queue) - standardize to encounter_id UUID (if table exists)
-- =============================================================================
DO $$
BEGIN
    -- Only proceed if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'queue' AND column_name = 'encounter_id') THEN
            ALTER TABLE queue ADD COLUMN encounter_id UUID;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'queue_encounter_id_fkey' 
                   AND table_name = 'queue') THEN
            ALTER TABLE queue DROP CONSTRAINT queue_encounter_id_fkey;
        END IF;
        
        ALTER TABLE queue 
        ADD CONSTRAINT queue_encounter_id_fkey 
        FOREIGN KEY (encounter_id) REFERENCES visits(id);
        
        -- Backfill if visit_id column exists (queue.visit_id is UUID)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'queue' AND column_name = 'visit_id') THEN
            EXECUTE 'UPDATE queue SET encounter_id = visit_id WHERE encounter_id IS NULL AND visit_id IS NOT NULL';
        END IF;
    ELSE
        RAISE NOTICE 'queue table does not exist, skipping';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'queue encounter_id setup: %', SQLERRM;
END $$;

-- =============================================================================
-- 10. Create indexes for better join performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_consultations_encounter_id ON consultations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter_id ON lab_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_encounter_id ON radiology_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter_id ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_encounter_id ON billing_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_receipts_encounter_id ON receipts(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);

-- Conditional indexes for tables that may not exist
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nursing_care') THEN
        CREATE INDEX IF NOT EXISTS idx_nursing_care_encounter_id ON nursing_care(encounter_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue_entries') THEN
        CREATE INDEX IF NOT EXISTS idx_queue_entries_encounter_id ON queue_entries(encounter_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue') THEN
        CREATE INDEX IF NOT EXISTS idx_queue_encounter_id ON queue(encounter_id);
    END IF;
END $$;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================
COMMENT ON COLUMN visits.id IS 'PRIMARY encounter identifier (UUID). Use this for all FK references.';
COMMENT ON COLUMN visits.visit_id IS 'Human-readable visit ID (V-XXXXX). Display only, do not use for FKs.';
COMMENT ON COLUMN visits.encounter_number IS 'Human-readable encounter number (ENC-YYYYMMDD-XXXX). Display only.';

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- After this migration:
-- 1. ALL tables use encounter_id (UUID) referencing visits(id)
-- 2. visit_id column kept on visits table for display purposes only
-- 3. Code should pass visits.id (UUID) as the encounter identifier
-- 4. Joins should use: table.encounter_id = visits.id
-- =============================================================================
