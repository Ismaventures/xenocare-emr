-- =============================================================================
-- Migration: 062_idempotency_improvements.sql
-- Purpose: Production-grade improvements to idempotency system
-- Date: January 24, 2026
-- =============================================================================
-- 
-- WHAT THIS MIGRATION IMPROVES:
-- 
-- 1. TYPE SAFETY: Creates a reusable DOMAIN type (idempotency_key_t) that:
--    - Limits keys to 128 characters (prevents unbounded storage)
--    - Rejects blank/whitespace-only keys (prevents "empty" duplicates)
--    - Can be used consistently across all tables
--
-- 2. OBSERVABILITY: Adds timestamp tracking to know WHEN each idempotency
--    key was first used, critical for debugging duplicate requests
--
-- 3. PAYLOAD HASHING: Adds optional hash column to detect "same key but 
--    different data" bugs - catches client-side idempotency key reuse errors
--
-- 4. SECURITY: Removes the unsafe dynamic SQL check_idempotency() function
--    and replaces with type-safe, table-specific functions that cannot be
--    exploited via SQL injection
--
-- 5. UPSERT SUPPORT: Adds helper functions to return existing records on
--    conflict rather than erroring, enabling graceful duplicate handling
--
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE DOMAIN TYPE FOR IDEMPOTENCY KEYS
-- =============================================================================
-- A DOMAIN is like a custom type with built-in validation.
-- All tables will use this instead of plain TEXT.

DO $$ 
BEGIN
  -- Only create if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'idempotency_key_t') THEN
    CREATE DOMAIN idempotency_key_t AS VARCHAR(128)
      CONSTRAINT idempotency_key_not_blank 
      CHECK (VALUE IS NULL OR (LENGTH(TRIM(VALUE)) > 0 AND VALUE = TRIM(VALUE)));
      
    COMMENT ON DOMAIN idempotency_key_t IS 
      'Bounded idempotency key type. Max 128 chars, no blank/whitespace-only values.';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: DROP THE UNSAFE DYNAMIC SQL FUNCTION
-- =============================================================================
-- The old check_idempotency() function accepted any table name as text,
-- making it vulnerable to SQL injection if called with user input.
-- We remove it and recommend using UPSERT patterns instead.

DROP FUNCTION IF EXISTS check_idempotency(TEXT, TEXT);

-- =============================================================================
-- STEP 3: ADD OBSERVABILITY COLUMNS TO HIGH-PRIORITY TABLES
-- =============================================================================
-- We add idempotency_created_at to track when duplicate prevention occurred
-- and idempotency_hash to detect payload mismatches

-- Helper function to safely add columns if they don't exist
CREATE OR REPLACE FUNCTION _add_idempotency_columns(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
  -- Check if table exists first
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RAISE NOTICE 'Table % does not exist, skipping idempotency columns', p_table_name;
    RETURN;
  END IF;

  -- Add idempotency_created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name 
    AND column_name = 'idempotency_created_at'
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN idempotency_created_at TIMESTAMPTZ',
      p_table_name
    );
  END IF;
  
  -- Add idempotency_hash if missing (for payload comparison)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name 
    AND column_name = 'idempotency_hash'
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN idempotency_hash VARCHAR(64)',
      p_table_name
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add columns to critical financial/clinical tables
SELECT _add_idempotency_columns('billing_orders');
SELECT _add_idempotency_columns('receipts');
SELECT _add_idempotency_columns('lab_requests');
SELECT _add_idempotency_columns('radiology_requests');
SELECT _add_idempotency_columns('prescriptions');
SELECT _add_idempotency_columns('patients');
SELECT _add_idempotency_columns('encounters');
SELECT _add_idempotency_columns('admissions');

-- Drop the helper function (one-time use)
DROP FUNCTION _add_idempotency_columns(TEXT);

-- =============================================================================
-- STEP 4: MIGRATE EXISTING TEXT COLUMNS TO DOMAIN TYPE
-- =============================================================================
-- This safely converts existing idempotency_key TEXT columns to our new
-- bounded DOMAIN type. Existing NULL values remain valid.

-- We use a function to handle this safely for each table
CREATE OR REPLACE FUNCTION _migrate_idempotency_column(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
  -- Check if table exists first
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RAISE NOTICE 'Table % does not exist, skipping migration', p_table_name;
    RETURN;
  END IF;

  -- Check if column exists and is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name 
    AND column_name = 'idempotency_key'
    AND data_type = 'text'
  ) THEN
    -- First, trim any existing whitespace and truncate to 128 chars
    EXECUTE format(
      'UPDATE %I SET idempotency_key = LEFT(TRIM(idempotency_key), 128) 
       WHERE idempotency_key IS NOT NULL AND (
         LENGTH(idempotency_key) > 128 OR 
         idempotency_key != TRIM(idempotency_key)
       )',
      p_table_name
    );
    
    -- Set any blank strings to NULL
    EXECUTE format(
      'UPDATE %I SET idempotency_key = NULL 
       WHERE idempotency_key IS NOT NULL AND LENGTH(TRIM(idempotency_key)) = 0',
      p_table_name
    );
    
    -- Alter column type to DOMAIN
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN idempotency_key TYPE idempotency_key_t USING idempotency_key::idempotency_key_t',
      p_table_name
    );
    
    RAISE NOTICE 'Migrated idempotency_key on table %', p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Migrate all tables with idempotency_key columns
SELECT _migrate_idempotency_column('billing_orders');
SELECT _migrate_idempotency_column('receipts');
SELECT _migrate_idempotency_column('lab_requests');
SELECT _migrate_idempotency_column('radiology_requests');
SELECT _migrate_idempotency_column('prescriptions');
SELECT _migrate_idempotency_column('patients');
SELECT _migrate_idempotency_column('encounters');
SELECT _migrate_idempotency_column('consultations');
SELECT _migrate_idempotency_column('diagnoses');
SELECT _migrate_idempotency_column('vitals');
SELECT _migrate_idempotency_column('nursing_notes');
SELECT _migrate_idempotency_column('admissions');
SELECT _migrate_idempotency_column('procedures');
SELECT _migrate_idempotency_column('ward_rounds');
SELECT _migrate_idempotency_column('queue');

-- Drop the migration helper function
DROP FUNCTION _migrate_idempotency_column(TEXT);

-- =============================================================================
-- STEP 5: ADD COMMENTS FOR DOCUMENTATION (only for existing tables)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_orders' AND column_name = 'idempotency_key') THEN
    COMMENT ON COLUMN billing_orders.idempotency_key IS 
      'Client-generated unique key to prevent duplicate orders. Format: {userId}-{action}-{timestamp}-{hash}. Max 128 chars.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_orders' AND column_name = 'idempotency_created_at') THEN
    COMMENT ON COLUMN billing_orders.idempotency_created_at IS 
      'Timestamp when idempotency key was first used. Set automatically on INSERT.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_orders' AND column_name = 'idempotency_hash') THEN
    COMMENT ON COLUMN billing_orders.idempotency_hash IS 
      'SHA256 hash of request payload. Used to detect key reuse with different data (bug).';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'idempotency_key') THEN
    COMMENT ON COLUMN receipts.idempotency_key IS 
      'Client-generated unique key to prevent duplicate payment records.';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'idempotency_key') THEN
    COMMENT ON COLUMN patients.idempotency_key IS 
      'Client-generated unique key to prevent duplicate patient registration.';
  END IF;
END $$;

-- =============================================================================
-- STEP 6: CREATE TRIGGER TO AUTO-SET idempotency_created_at
-- =============================================================================
-- This trigger automatically sets idempotency_created_at when a new
-- idempotency_key is inserted, ensuring consistent timestamp tracking.

CREATE OR REPLACE FUNCTION set_idempotency_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set timestamp if idempotency_key is provided and timestamp is not already set
  IF NEW.idempotency_key IS NOT NULL AND NEW.idempotency_created_at IS NULL THEN
    NEW.idempotency_created_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_idempotency_timestamp() IS 
  'Trigger function to auto-set idempotency_created_at timestamp on INSERT.';

-- Apply trigger to critical tables (only if they exist)
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'billing_orders', 'receipts', 'lab_requests', 'radiology_requests',
    'prescriptions', 'patients', 'encounters', 'admissions'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Check if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- Drop existing trigger if any
      EXECUTE format('DROP TRIGGER IF EXISTS trg_set_idempotency_ts ON %I', t);
      
      -- Create new trigger
      EXECUTE format(
        'CREATE TRIGGER trg_set_idempotency_ts 
         BEFORE INSERT ON %I 
         FOR EACH ROW 
         EXECUTE FUNCTION set_idempotency_timestamp()',
        t
      );
      RAISE NOTICE 'Created idempotency timestamp trigger on %', t;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping trigger', t;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- STEP 7: TYPE-SAFE IDEMPOTENCY CHECK FUNCTIONS (OPTIONAL USE)
-- =============================================================================
-- These functions are safe alternatives to the removed dynamic SQL function.
-- They are type-safe (no SQL injection risk) and return the existing record
-- ID if found, allowing the client to decide whether to return it or error.
--
-- RECOMMENDED: Use UPSERT (INSERT ... ON CONFLICT) instead of these functions.
-- These are provided for compatibility with code that can't use UPSERT.

-- Billing Orders idempotency check
CREATE OR REPLACE FUNCTION check_billing_order_idempotency(
  p_idempotency_key idempotency_key_t,
  p_idempotency_hash VARCHAR(64) DEFAULT NULL
) RETURNS TABLE(
  existing_id UUID,
  hash_mismatch BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bo.id AS existing_id,
    CASE 
      WHEN p_idempotency_hash IS NOT NULL AND bo.idempotency_hash IS NOT NULL 
           AND bo.idempotency_hash != p_idempotency_hash
      THEN TRUE 
      ELSE FALSE 
    END AS hash_mismatch
  FROM billing_orders bo
  WHERE bo.idempotency_key = p_idempotency_key
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION check_billing_order_idempotency IS 
  'Check if a billing order with given idempotency key exists. Returns existing ID and hash mismatch flag.';

-- Receipts idempotency check
CREATE OR REPLACE FUNCTION check_receipt_idempotency(
  p_idempotency_key idempotency_key_t,
  p_idempotency_hash VARCHAR(64) DEFAULT NULL
) RETURNS TABLE(
  existing_id UUID,
  hash_mismatch BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS existing_id,
    CASE 
      WHEN p_idempotency_hash IS NOT NULL AND r.idempotency_hash IS NOT NULL 
           AND r.idempotency_hash != p_idempotency_hash
      THEN TRUE 
      ELSE FALSE 
    END AS hash_mismatch
  FROM receipts r
  WHERE r.idempotency_key = p_idempotency_key
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Patients idempotency check
CREATE OR REPLACE FUNCTION check_patient_idempotency(
  p_idempotency_key idempotency_key_t,
  p_idempotency_hash VARCHAR(64) DEFAULT NULL
) RETURNS TABLE(
  existing_id UUID,
  hash_mismatch BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS existing_id,
    CASE 
      WHEN p_idempotency_hash IS NOT NULL AND p.idempotency_hash IS NOT NULL 
           AND p.idempotency_hash != p_idempotency_hash
      THEN TRUE 
      ELSE FALSE 
    END AS hash_mismatch
  FROM patients p
  WHERE p.idempotency_key = p_idempotency_key
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- STEP 8: HASH MISMATCH LOGGING TABLE (FOR DEBUGGING)
-- =============================================================================
-- Optional table to log when same idempotency key is used with different payload
-- This helps detect bugs in client-side idempotency key generation

CREATE TABLE IF NOT EXISTS idempotency_hash_mismatches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(64) NOT NULL,
  idempotency_key idempotency_key_t NOT NULL,
  original_hash VARCHAR(64),
  attempted_hash VARCHAR(64),
  original_record_id UUID,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  client_info JSONB
);

CREATE INDEX IF NOT EXISTS idx_idem_hash_mismatch_key 
ON idempotency_hash_mismatches(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_idem_hash_mismatch_time 
ON idempotency_hash_mismatches(attempted_at);

COMMENT ON TABLE idempotency_hash_mismatches IS 
  'Audit log of attempted duplicate inserts where payload hash differs. Indicates client-side bugs.';

-- =============================================================================
-- STEP 9: FACILITY-SCOPED UNIQUENESS ANALYSIS
-- =============================================================================
-- 
-- ANALYSIS: Should idempotency be global or facility-scoped?
--
-- CURRENT STATE:
-- - Most tables (patients, billing_orders, encounters) do NOT have facility_id
-- - Some tables (admissions, procedures, wards) DO have facility_id
-- - This EMR appears to be single-facility or has facility as metadata only
--
-- RECOMMENDATION FOR THIS EMR: GLOBAL UNIQUENESS (current approach)
-- 
-- Reasons:
-- 1. Idempotency keys are client-generated with timestamp+random components
-- 2. Collision probability is already negligible (~1 in 2^80 for UUIDs)
-- 3. Adding facility_id would require schema changes to tables without it
-- 4. Global uniqueness is simpler and safer (prevents ANY duplicate)
-- 5. If needed later, can ALTER UNIQUE INDEX to include facility_id
--
-- TRADEOFF:
-- - Global: Simpler, slightly larger index if multi-facility
-- - Scoped: Allows same key in different facilities (but why would you want that?)
--
-- FOR TABLES WITH facility_id (admissions, procedures), you COULD use:
--   UNIQUE(facility_id, idempotency_key) WHERE idempotency_key IS NOT NULL
-- But we recommend against it for consistency.
--
-- =============================================================================

-- =============================================================================
-- RECORD MIGRATION METADATA
-- =============================================================================

DO $$
BEGIN
  BEGIN
    INSERT INTO schema_migrations (version, name, executed_at)
    VALUES ('062', 'idempotency_improvements', NOW())
    ON CONFLICT (version) DO UPDATE SET executed_at = NOW();
  EXCEPTION
    WHEN undefined_column THEN
      BEGIN
        INSERT INTO schema_migrations (version, executed_at)
        VALUES ('062', NOW())
        ON CONFLICT (version) DO UPDATE SET executed_at = NOW();
      EXCEPTION
        WHEN undefined_column THEN
          INSERT INTO schema_migrations (version)
          VALUES ('062')
          ON CONFLICT (version) DO NOTHING;
      END;
    WHEN undefined_table THEN
      NULL;
  END;
END;
$$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
