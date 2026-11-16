-- =============================================================================
-- Migration: 061_add_optimistic_locking.sql
-- Purpose: Add version columns for optimistic locking to prevent concurrent conflicts
-- Date: January 24, 2026
-- =============================================================================

-- This migration adds a `version` column to critical tables that tracks
-- the number of times a record has been updated. This enables optimistic
-- locking where updates only succeed if the version matches.

-- =============================================================================
-- VERSION INCREMENT TRIGGER FUNCTION
-- =============================================================================

-- Create a function that auto-increments version on update
CREATE OR REPLACE FUNCTION increment_record_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if version wasn't explicitly set by the update
  IF NEW.version = OLD.version THEN
    NEW.version := OLD.version + 1;
  END IF;
  -- Also update the updated_at timestamp if column exists
  IF TG_TABLE_NAME IN (
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  ) THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_record_version IS 
'Trigger function to auto-increment version column on record update for optimistic locking.';

-- =============================================================================
-- HELPER FUNCTION: Safely add version column and trigger to a table
-- =============================================================================

CREATE OR REPLACE FUNCTION _add_version_column_if_table_exists(p_table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    -- Add version column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = p_table_name 
      AND column_name = 'version'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN version INTEGER DEFAULT 1 NOT NULL', p_table_name);
      RAISE NOTICE 'Added version column to %', p_table_name;
    END IF;
    
    -- Drop existing trigger if any
    EXECUTE format('DROP TRIGGER IF EXISTS %I_version_trigger ON %I', p_table_name, p_table_name);
    
    -- Create trigger for version increment
    EXECUTE format(
      'CREATE TRIGGER %I_version_trigger BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION increment_record_version()',
      p_table_name, p_table_name
    );
    RAISE NOTICE 'Created version trigger on %', p_table_name;
  ELSE
    RAISE NOTICE 'Table % does not exist, skipping', p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ADD VERSION COLUMNS TO ALL TARGET TABLES
-- =============================================================================

-- Patient & Encounter Module
SELECT _add_version_column_if_table_exists('patients');
SELECT _add_version_column_if_table_exists('encounters');

-- Consultation Module
SELECT _add_version_column_if_table_exists('consultations');
SELECT _add_version_column_if_table_exists('diagnoses');

-- Prescriptions
SELECT _add_version_column_if_table_exists('prescriptions');

-- Nursing Module
SELECT _add_version_column_if_table_exists('vitals');
SELECT _add_version_column_if_table_exists('nursing_notes');

-- Inpatient Module
SELECT _add_version_column_if_table_exists('admissions');
SELECT _add_version_column_if_table_exists('procedures');
SELECT _add_version_column_if_table_exists('ward_rounds');

-- Billing Module
SELECT _add_version_column_if_table_exists('billing_orders');

-- Lab Module
SELECT _add_version_column_if_table_exists('lab_requests');
SELECT _add_version_column_if_table_exists('lab_results');

-- Radiology Module
SELECT _add_version_column_if_table_exists('radiology_requests');
SELECT _add_version_column_if_table_exists('radiology_reports');

-- Inventory Module
SELECT _add_version_column_if_table_exists('inventory_items');

-- Clean up helper function
DROP FUNCTION _add_version_column_if_table_exists(TEXT);

-- =============================================================================
-- HELPER FUNCTION: Update with version check
-- =============================================================================

-- This function performs an update only if the version matches
-- Returns the number of rows affected (0 if version mismatch, 1 if success)
CREATE OR REPLACE FUNCTION update_with_version_check(
  p_table_name TEXT,
  p_id UUID,
  p_expected_version INTEGER,
  p_update_data JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_affected INTEGER;
  v_sql TEXT;
  v_set_clause TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Build SET clause from JSONB
  v_set_clause := '';
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_update_data)
  LOOP
    IF v_set_clause != '' THEN
      v_set_clause := v_set_clause || ', ';
    END IF;
    v_set_clause := v_set_clause || format('%I = %L', v_key, v_value);
  END LOOP;

  -- Execute update with version check
  v_sql := format(
    'UPDATE %I SET %s WHERE id = $1 AND version = $2',
    p_table_name,
    v_set_clause
  );
  
  EXECUTE v_sql USING p_id, p_expected_version;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  
  RETURN v_affected;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_with_version_check IS 
'Performs an update only if the record version matches expected. Returns row count (0 = conflict, 1 = success).';

-- =============================================================================
-- RECORD MIGRATION METADATA
-- =============================================================================

DO $$
BEGIN
  BEGIN
    INSERT INTO schema_migrations (version, name, executed_at)
    VALUES ('061', 'add_optimistic_locking', NOW())
    ON CONFLICT (version) DO NOTHING;
  EXCEPTION
    WHEN undefined_column THEN
      BEGIN
        INSERT INTO schema_migrations (version, executed_at)
        VALUES ('061', NOW())
        ON CONFLICT (version) DO NOTHING;
      EXCEPTION
        WHEN undefined_column THEN
          INSERT INTO schema_migrations (version)
          VALUES ('061')
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
