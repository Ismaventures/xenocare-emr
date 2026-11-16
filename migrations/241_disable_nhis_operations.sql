-- =============================================================================
-- Migration: Disable NHIS operations for non-NHIS-accredited facilities
--
-- This deployment is not NHIS-accredited and does not participate in the NHIS
-- programme. This migration deactivates NHIS background processing:
--   1. Disables all NHIS-named triggers (approval enforcement, referral queue,
--      claim syncing, payer mapping, NHIS audit triggers).
--   2. Zeroes NHIS coverage configuration.
--   3. Removes NHIS coverage/authorization flags from service catalogues and
--      ward/bed pricing so billing falls back to standard private rates.
--   4. Marks pending/expired NHIS approvals as not required so legacy records
--      cannot block clinical workflows.
--
-- Application code also short-circuits NHIS logic via the central feature flag
-- in src/renderer/config/features.ts.
-- =============================================================================

-- 1. Disable NHIS-related triggers across the schema.
DO $$
DECLARE
  trigger_row RECORD;
BEGIN
  FOR trigger_row IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND t.tgname ILIKE '%nhis%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DISABLE TRIGGER %I',
      trigger_row.schema_name,
      trigger_row.table_name,
      trigger_row.trigger_name
    );
  END LOOP;
END $$;

-- 2. Zero NHIS coverage configuration.
DO $$
BEGIN
  IF to_regclass('public.nhis_config') IS NOT NULL THEN
    UPDATE public.nhis_config
    SET
      coverage_percentage = 0,
      consultation_fully_covered = false,
      is_active = false;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'nhis_config'
        AND column_name = 'lab_coverage_percentage'
    ) THEN
      UPDATE public.nhis_config
      SET
        lab_coverage_percentage = 0,
        radiology_coverage_percentage = 0,
        pharmacy_coverage_percentage = 0,
        procedure_coverage_percentage = 0,
        bed_coverage_percentage = 0;
    END IF;
  END IF;
END $$;

-- 3. Remove NHIS coverage and authorization flags from catalogues and pricing.
DO $$
DECLARE
  target_table TEXT;
  set_clause TEXT;
  tables TEXT[] := ARRAY[
    'lab_test_catalogue',
    'imaging_catalogue',
    'drug_catalogue',
    'procedure_catalogue',
    'wards',
    'beds'
  ];
BEGIN
  FOREACH target_table IN ARRAY tables LOOP
    IF to_regclass('public.' || target_table) IS NOT NULL THEN
      set_clause := '';

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'is_nhis_covered'
      ) THEN
        set_clause := set_clause || 'is_nhis_covered = false, ';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'nhis_percentage'
      ) THEN
        set_clause := set_clause || 'nhis_percentage = 0, ';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'requires_nhis_authorization'
      ) THEN
        set_clause := set_clause || 'requires_nhis_authorization = false, ';
      END IF;

      IF length(set_clause) > 0 THEN
        set_clause := left(set_clause, length(set_clause) - 2);
        EXECUTE format(
          'UPDATE public.%I SET %s',
          target_table,
          set_clause
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- 4. Release legacy approvals so they cannot gate workflows.
DO $$
BEGIN
  IF to_regclass('public.nhis_approvals') IS NOT NULL THEN
    UPDATE public.nhis_approvals
    SET
      status = 'not_required',
      updated_at = NOW()
    WHERE status IN ('pending', 'expired');
  END IF;
END $$;
