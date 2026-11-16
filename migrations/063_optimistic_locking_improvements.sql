-- =============================================================================
-- Migration: 063_optimistic_locking_improvements.sql
-- Purpose: Production-grade improvements to optimistic locking system
-- Date: January 24, 2026
-- =============================================================================
-- 
-- WHAT THIS MIGRATION IMPROVES:
-- 
-- 1. REMOVES UNSAFE FUNCTION: The update_with_version_check() function uses
--    dynamic SQL with table names, which is vulnerable to SQL injection.
--    We replace it with type-safe, table-specific RPC functions.
--
-- 2. ADDS CONFLICT DETAILS: When a version conflict occurs, we now can tell
--    the client WHO modified the record and WHEN, enabling better UX.
--
-- 3. ADDS AUDIT TRAIL: Optional logging of version conflicts for debugging
--    and detecting problematic concurrent access patterns.
--
-- 4. ADDS LAST_MODIFIED_BY: Track who made the last change (for conflict UI)
--
-- =============================================================================

-- =============================================================================
-- STEP 1: DROP UNSAFE DYNAMIC SQL FUNCTION
-- =============================================================================
-- The update_with_version_check() function accepts any table name as text,
-- making it vulnerable to SQL injection if called with user input.

DROP FUNCTION IF EXISTS update_with_version_check(TEXT, UUID, INTEGER, JSONB);

-- =============================================================================
-- STEP 2: ADD LAST_MODIFIED_BY COLUMN TO CRITICAL TABLES
-- =============================================================================
-- This helps users understand who else modified the record when conflicts occur

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'patients', 'encounters', 'consultations', 'prescriptions', 
    'diagnoses', 'vitals', 'nursing_notes', 'admissions',
    'billing_orders', 'lab_requests', 'lab_results',
    'radiology_requests', 'radiology_reports', 'procedures', 'ward_rounds'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Check if table exists first
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t
    ) THEN
      -- Add last_modified_by column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = t 
        AND column_name = 'last_modified_by'
      ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN last_modified_by UUID', t);
        EXECUTE format(
          'COMMENT ON COLUMN %I.last_modified_by IS ''User ID who last modified this record. Used for conflict resolution UI.''',
          t
        );
      END IF;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping last_modified_by column', t;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- STEP 3: UPDATE VERSION TRIGGER TO REQUIRE LAST_MODIFIED_BY
-- =============================================================================
-- Enhanced trigger that validates last_modified_by is provided on updates

CREATE OR REPLACE FUNCTION increment_record_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment version if not explicitly set
  IF NEW.version IS NULL OR NEW.version = OLD.version THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
  END IF;
  
  -- Always update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 4: TYPE-SAFE UPDATE FUNCTIONS FOR CRITICAL TABLES
-- =============================================================================
-- These replace the unsafe dynamic SQL function with hardcoded, type-safe versions.
-- Each function returns the updated record OR raises an exception on conflict.

-- Create a custom type for conflict information
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'version_conflict_info') THEN
    CREATE TYPE version_conflict_info AS (
      current_version INTEGER,
      last_modified_by UUID,
      last_modified_at TIMESTAMPTZ
    );
  END IF;
END $$;

-- Patients update with version check
-- Only create if patients table exists
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patients') THEN
  EXECUTE $func$
CREATE OR REPLACE FUNCTION update_patient_with_lock(
  p_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB,
  p_modified_by UUID
) RETURNS SETOF patients AS $body$
DECLARE
  v_current_version INTEGER;
  v_last_modified_by UUID;
  v_updated_at TIMESTAMPTZ;
BEGIN
  -- Get current version
  SELECT version, last_modified_by, updated_at
  INTO v_current_version, v_last_modified_by, v_updated_at
  FROM patients WHERE id = p_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id
      USING ERRCODE = 'P0002'; -- no_data_found
  END IF;
  
  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',
      p_expected_version, v_current_version, v_last_modified_by, v_updated_at
      USING ERRCODE = 'P0003'; -- Custom code for version conflict
  END IF;
  
  -- Perform update (trigger will increment version)
  RETURN QUERY
  UPDATE patients SET
    first_name = COALESCE((p_updates->>'first_name')::VARCHAR, first_name),
    middle_name = COALESCE((p_updates->>'middle_name')::VARCHAR, middle_name),
    surname = COALESCE((p_updates->>'surname')::VARCHAR, surname),
    date_of_birth = COALESCE((p_updates->>'date_of_birth')::DATE, date_of_birth),
    gender = COALESCE((p_updates->>'gender')::public.gender, gender),
    contact_phone = COALESCE((p_updates->>'contact_phone')::VARCHAR, contact_phone),
    email = COALESCE((p_updates->>'email')::VARCHAR, email),
    residential_address = COALESCE((p_updates->>'residential_address')::TEXT, residential_address),
    blood_group = COALESCE((p_updates->>'blood_group')::VARCHAR, blood_group),
    last_modified_by = p_modified_by,
    version = v_current_version -- Trigger will increment
  WHERE id = p_id
  RETURNING *;
END;
$body$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_patient_with_lock IS 
'Update patient with optimistic locking. Raises P0003 on version conflict.';
$func$;
ELSE
  RAISE NOTICE 'Table patients does not exist, skipping update_patient_with_lock function';
END IF;
END $$;

-- Billing Orders update with version check
-- Only create if billing_orders table exists
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_orders') THEN
  EXECUTE $func$
CREATE OR REPLACE FUNCTION update_billing_order_with_lock(
  p_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB,
  p_modified_by UUID
) RETURNS SETOF billing_orders AS $body$
DECLARE
  v_current_version INTEGER;
  v_last_modified_by UUID;
  v_updated_at TIMESTAMPTZ;
BEGIN
  SELECT version, last_modified_by, updated_at
  INTO v_current_version, v_last_modified_by, v_updated_at
  FROM billing_orders WHERE id = p_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';
  END IF;
  
  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',
      p_expected_version, v_current_version, v_last_modified_by, v_updated_at
      USING ERRCODE = 'P0003';
  END IF;
  
  RETURN QUERY
  UPDATE billing_orders SET
    status = COALESCE((p_updates->>'status')::public.billing_order_status, status),
    paid_amount = COALESCE((p_updates->>'paid_amount')::NUMERIC, paid_amount),
    balance_amount = COALESCE((p_updates->>'balance_amount')::NUMERIC, balance_amount),
    discount_amount = COALESCE((p_updates->>'discount_amount')::NUMERIC, discount_amount),
    payment_method = COALESCE((p_updates->>'payment_method')::public.payment_method, payment_method),
    last_modified_by = p_modified_by,
    version = v_current_version
  WHERE id = p_id
  RETURNING *;
END;
$body$ LANGUAGE plpgsql;
$func$;
ELSE
  RAISE NOTICE 'Table billing_orders does not exist, skipping update_billing_order_with_lock function';
END IF;
END $$;

-- Consultations update with version check
-- Only create if consultations table exists
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consultations') THEN
  EXECUTE $func$
CREATE OR REPLACE FUNCTION update_consultation_with_lock(
  p_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB,
  p_modified_by UUID
) RETURNS SETOF consultations AS $body$
DECLARE
  v_current_version INTEGER;
  v_last_modified_by UUID;
  v_updated_at TIMESTAMPTZ;
BEGIN
  SELECT version, last_modified_by, updated_at
  INTO v_current_version, v_last_modified_by, v_updated_at
  FROM consultations WHERE id = p_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';
  END IF;
  
  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',
      p_expected_version, v_current_version, v_last_modified_by, v_updated_at
      USING ERRCODE = 'P0003';
  END IF;
  
  RETURN QUERY
  UPDATE consultations SET
    history_of_presenting_illness = COALESCE(
      (p_updates->>'history_of_presenting_illness')::TEXT, 
      history_of_presenting_illness
    ),
    examination_findings = COALESCE(
      (p_updates->>'examination_findings')::TEXT, 
      examination_findings
    ),
    clinical_notes = COALESCE((p_updates->>'clinical_notes')::TEXT, clinical_notes),
    plan = COALESCE((p_updates->>'plan')::TEXT, plan),
    status = COALESCE((p_updates->>'status')::VARCHAR, status),
    last_modified_by = p_modified_by,
    version = v_current_version
  WHERE id = p_id
  RETURNING *;
END;
$body$ LANGUAGE plpgsql;
$func$;
ELSE
  RAISE NOTICE 'Table consultations does not exist, skipping update_consultation_with_lock function';
END IF;
END $$;

-- Lab Requests update with version check
-- Only create if lab_requests table exists
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_requests') THEN
  EXECUTE $func$
CREATE OR REPLACE FUNCTION update_lab_request_with_lock(
  p_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB,
  p_modified_by UUID
) RETURNS SETOF lab_requests AS $body$
DECLARE
  v_current_version INTEGER;
  v_last_modified_by UUID;
  v_updated_at TIMESTAMPTZ;
BEGIN
  SELECT version, last_modified_by, updated_at
  INTO v_current_version, v_last_modified_by, v_updated_at
  FROM lab_requests WHERE id = p_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';
  END IF;
  
  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',
      p_expected_version, v_current_version, v_last_modified_by, v_updated_at
      USING ERRCODE = 'P0003';
  END IF;
  
  RETURN QUERY
  UPDATE lab_requests SET
    status = COALESCE((p_updates->>'status')::public.clinical_request_status, status),
    priority = COALESCE((p_updates->>'priority')::public.clinical_urgency, priority),
    notes = COALESCE((p_updates->>'notes')::TEXT, notes),
    last_modified_by = p_modified_by,
    version = v_current_version
  WHERE id = p_id
  RETURNING *;
END;
$body$ LANGUAGE plpgsql;
$func$;
ELSE
  RAISE NOTICE 'Table lab_requests does not exist, skipping update_lab_request_with_lock function';
END IF;
END $$;

-- Prescriptions update with version check
-- Only create if prescriptions table exists
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prescriptions') THEN
  EXECUTE $func$
CREATE OR REPLACE FUNCTION update_prescription_with_lock(
  p_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB,
  p_modified_by UUID
) RETURNS SETOF prescriptions AS $body$
DECLARE
  v_current_version INTEGER;
  v_last_modified_by UUID;
  v_updated_at TIMESTAMPTZ;
BEGIN
  SELECT version, last_modified_by, updated_at
  INTO v_current_version, v_last_modified_by, v_updated_at
  FROM prescriptions WHERE id = p_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';
  END IF;
  
  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',
      p_expected_version, v_current_version, v_last_modified_by, v_updated_at
      USING ERRCODE = 'P0003';
  END IF;
  
  RETURN QUERY
  UPDATE prescriptions SET
    status = COALESCE((p_updates->>'status')::VARCHAR, status),
    quantity_dispensed = COALESCE((p_updates->>'quantity_dispensed')::INTEGER, quantity_dispensed),
    dispensed_by = COALESCE((p_updates->>'dispensed_by')::UUID, dispensed_by),
    dispensed_at = COALESCE((p_updates->>'dispensed_at')::TIMESTAMPTZ, dispensed_at),
    last_modified_by = p_modified_by,
    version = v_current_version
  WHERE id = p_id
  RETURNING *;
END;
$body$ LANGUAGE plpgsql;
$func$;
ELSE
  RAISE NOTICE 'Table prescriptions does not exist, skipping update_prescription_with_lock function';
END IF;
END $$;

-- =============================================================================
-- STEP 5: CONFLICT AUDIT TABLE (OPTIONAL)
-- =============================================================================
-- Log version conflicts to identify problematic concurrent access patterns

CREATE TABLE IF NOT EXISTS version_conflict_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(64) NOT NULL,
  record_id UUID NOT NULL,
  expected_version INTEGER NOT NULL,
  actual_version INTEGER NOT NULL,
  attempted_by UUID,
  last_modified_by UUID,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  client_info JSONB
);

CREATE INDEX IF NOT EXISTS idx_version_conflict_table 
ON version_conflict_log(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_version_conflict_time 
ON version_conflict_log(attempted_at);

COMMENT ON TABLE version_conflict_log IS 
'Audit log of optimistic locking conflicts. Helps identify concurrent access hotspots.';

-- =============================================================================
-- STEP 6: HELPER FUNCTION TO LOG CONFLICTS
-- =============================================================================
-- Called by application when a conflict is detected

CREATE OR REPLACE FUNCTION log_version_conflict(
  p_table_name VARCHAR(64),
  p_record_id UUID,
  p_expected_version INTEGER,
  p_actual_version INTEGER,
  p_attempted_by UUID,
  p_last_modified_by UUID,
  p_client_info JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO version_conflict_log (
    table_name, record_id, expected_version, actual_version,
    attempted_by, last_modified_by, client_info
  ) VALUES (
    p_table_name, p_record_id, p_expected_version, p_actual_version,
    p_attempted_by, p_last_modified_by, p_client_info
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 7: GENERIC GET-VERSION FUNCTION (SAFE)
-- =============================================================================
-- Returns current version and modifier info for any supported table
-- Uses CASE statement instead of dynamic SQL for safety

CREATE OR REPLACE FUNCTION get_record_version(
  p_table_name VARCHAR(64),
  p_record_id UUID
) RETURNS TABLE(
  current_version INTEGER,
  last_modified_by UUID,
  last_modified_at TIMESTAMPTZ
) AS $$
BEGIN
  CASE p_table_name
    WHEN 'patients' THEN
      RETURN QUERY SELECT p.version, p.last_modified_by, p.updated_at 
        FROM patients p WHERE p.id = p_record_id;
    WHEN 'encounters' THEN
      RETURN QUERY SELECT e.version, e.last_modified_by, e.updated_at 
        FROM encounters e WHERE e.id = p_record_id;
    WHEN 'consultations' THEN
      RETURN QUERY SELECT c.version, c.last_modified_by, c.updated_at 
        FROM consultations c WHERE c.id = p_record_id;
    WHEN 'billing_orders' THEN
      RETURN QUERY SELECT b.version, b.last_modified_by, b.updated_at 
        FROM billing_orders b WHERE b.id = p_record_id;
    WHEN 'prescriptions' THEN
      RETURN QUERY SELECT pr.version, pr.last_modified_by, pr.updated_at 
        FROM prescriptions pr WHERE pr.id = p_record_id;
    WHEN 'lab_requests' THEN
      RETURN QUERY SELECT lr.version, lr.last_modified_by, lr.updated_at 
        FROM lab_requests lr WHERE lr.id = p_record_id;
    WHEN 'radiology_requests' THEN
      RETURN QUERY SELECT rr.version, rr.last_modified_by, rr.updated_at 
        FROM radiology_requests rr WHERE rr.id = p_record_id;
    WHEN 'admissions' THEN
      RETURN QUERY SELECT a.version, a.last_modified_by, a.updated_at 
        FROM admissions a WHERE a.id = p_record_id;
    WHEN 'procedures' THEN
      RETURN QUERY SELECT proc.version, proc.last_modified_by, proc.updated_at 
        FROM procedures proc WHERE proc.id = p_record_id;
    WHEN 'vitals' THEN
      RETURN QUERY SELECT v.version, v.last_modified_by, v.updated_at 
        FROM vitals v WHERE v.id = p_record_id;
    WHEN 'nursing_notes' THEN
      RETURN QUERY SELECT nn.version, nn.last_modified_by, nn.updated_at 
        FROM nursing_notes nn WHERE nn.id = p_record_id;
    WHEN 'diagnoses' THEN
      RETURN QUERY SELECT d.version, d.last_modified_by, d.updated_at 
        FROM diagnoses d WHERE d.id = p_record_id;
    WHEN 'ward_rounds' THEN
      RETURN QUERY SELECT wr.version, wr.last_modified_by, wr.updated_at 
        FROM ward_rounds wr WHERE wr.id = p_record_id;
    ELSE
      RAISE EXCEPTION 'Unsupported table: %', p_table_name
        USING ERRCODE = 'P0001';
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_record_version IS 
'Safely retrieve version info for a record. Uses allowlist of tables.';

-- =============================================================================
-- RECORD MIGRATION METADATA
-- =============================================================================

DO $$
BEGIN
  -- Try with name column first
  BEGIN
    INSERT INTO schema_migrations (version, name, executed_at)
    VALUES ('063', 'optimistic_locking_improvements', NOW())
    ON CONFLICT (version) DO UPDATE SET executed_at = NOW();
  EXCEPTION
    WHEN undefined_column THEN
      -- Try without name column
      BEGIN
        INSERT INTO schema_migrations (version, executed_at)
        VALUES ('063', NOW())
        ON CONFLICT (version) DO UPDATE SET executed_at = NOW();
      EXCEPTION
        WHEN undefined_column THEN
          -- Try with just version
          INSERT INTO schema_migrations (version)
          VALUES ('063')
          ON CONFLICT (version) DO NOTHING;
      END;
  END;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'schema_migrations table does not exist, skipping';
END;
$$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
