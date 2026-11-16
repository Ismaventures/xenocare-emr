-- =============================================================================
-- Migration: 060_add_idempotency_keys.sql
-- Purpose: Add idempotency key columns to prevent duplicate record creation
-- Date: January 24, 2026
-- =============================================================================

-- This migration adds idempotency_key columns to tables where duplicate
-- creation could cause data integrity issues. The column is nullable to
-- support legacy records and optional usage, but has a unique constraint
-- to enforce uniqueness when provided.

-- =============================================================================
-- HELPER FUNCTION: Safely add idempotency column to a table
-- =============================================================================

CREATE OR REPLACE FUNCTION _add_idempotency_key_if_table_exists(p_table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = p_table_name 
      AND column_name = 'idempotency_key'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN idempotency_key TEXT', p_table_name);
      RAISE NOTICE 'Added idempotency_key column to %', p_table_name;
    END IF;
    
    -- Create unique index if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = p_table_name 
      AND indexname = format('idx_%s_idempotency_key', p_table_name)
    ) THEN
      EXECUTE format(
        'CREATE UNIQUE INDEX idx_%s_idempotency_key ON %I(idempotency_key) WHERE idempotency_key IS NOT NULL',
        p_table_name, p_table_name
      );
      RAISE NOTICE 'Created idempotency index on %', p_table_name;
    END IF;
  ELSE
    RAISE NOTICE 'Table % does not exist, skipping', p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ADD IDEMPOTENCY COLUMNS TO ALL TARGET TABLES
-- =============================================================================

-- Billing Module
SELECT _add_idempotency_key_if_table_exists('billing_orders');
SELECT _add_idempotency_key_if_table_exists('receipts');

-- Clinical Orders Module
SELECT _add_idempotency_key_if_table_exists('lab_requests');
SELECT _add_idempotency_key_if_table_exists('radiology_requests');
SELECT _add_idempotency_key_if_table_exists('prescriptions');

-- Patient & Encounter Module
SELECT _add_idempotency_key_if_table_exists('patients');
SELECT _add_idempotency_key_if_table_exists('encounters');

-- Consultation Module
SELECT _add_idempotency_key_if_table_exists('consultations');
SELECT _add_idempotency_key_if_table_exists('diagnoses');

-- Nursing Module
SELECT _add_idempotency_key_if_table_exists('vitals');
SELECT _add_idempotency_key_if_table_exists('nursing_notes');

-- Inpatient Module
SELECT _add_idempotency_key_if_table_exists('admissions');
SELECT _add_idempotency_key_if_table_exists('procedures');
SELECT _add_idempotency_key_if_table_exists('ward_rounds');

-- Queue Module
SELECT _add_idempotency_key_if_table_exists('queue');

-- Clean up helper function
DROP FUNCTION _add_idempotency_key_if_table_exists(TEXT);

-- =============================================================================
-- ADD COMMENTS (only for tables that exist)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_orders' AND column_name = 'idempotency_key') THEN
    COMMENT ON COLUMN billing_orders.idempotency_key IS 
      'Client-generated unique key to prevent duplicate order creation. Format: {userId}-{action}-{timestamp}-{random}';
  END IF;
END $$;

-- =============================================================================
-- HELPER FUNCTION: Check idempotency before insert
-- =============================================================================

CREATE OR REPLACE FUNCTION check_idempotency(
  p_table_name TEXT,
  p_idempotency_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RETURN FALSE; -- No idempotency key, allow insert
  END IF;

  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM %I WHERE idempotency_key = $1)',
    p_table_name
  ) INTO v_exists USING p_idempotency_key;

  RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_idempotency IS 
'Check if an idempotency key already exists in a table. Returns TRUE if duplicate.';

-- =============================================================================
-- RECORD MIGRATION METADATA
-- =============================================================================

DO $$
BEGIN
  -- Try to record this migration (handle different schema_migrations structures)
  BEGIN
    INSERT INTO schema_migrations (version, name, executed_at)
    VALUES ('060', 'add_idempotency_keys', NOW())
    ON CONFLICT (version) DO NOTHING;
  EXCEPTION
    WHEN undefined_column THEN
      -- schema_migrations might not have 'name' column, try without it
      BEGIN
        INSERT INTO schema_migrations (version, executed_at)
        VALUES ('060', NOW())
        ON CONFLICT (version) DO NOTHING;
      EXCEPTION
        WHEN undefined_column THEN
          -- Try just version
          INSERT INTO schema_migrations (version)
          VALUES ('060')
          ON CONFLICT (version) DO NOTHING;
      END;
    WHEN undefined_table THEN
      -- schema_migrations table doesn't exist, that's okay
      NULL;
  END;
END;
$$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
