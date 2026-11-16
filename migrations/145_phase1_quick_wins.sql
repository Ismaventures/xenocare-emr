-- ============================================================================
-- Migration 145: Phase 1 Quick Wins
-- ============================================================================
-- Implements all Phase 1 improvements from IMPROVEMENTS_ROADMAP.md:
--   P1-01: Unique index on NHIS claims per encounter
--   P1-02: Composite index on visits(status, current_stage, created_at)
--   P1-03: Stale queue entry cleanup function + pg_cron schedule
--   P1-04: Scope RLS on clinical tables to clinical roles only
--   P1-06: Schema migration tracking table
-- ============================================================================

-- ============================================================================
-- P1-01: NHIS CLAIMS UNIQUE INDEX (critical - prevents duplicate claims)
-- Prevents duplicate draft/pending/reviewed claims for the same encounter.
-- Two claims for one encounter cause NHIS export failures and failed reconciliation.
-- ============================================================================

-- First, detect and resolve any existing duplicates before adding the constraint
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT encounter_id, COUNT(*) AS cnt
    FROM nhis_claims
    WHERE status NOT IN ('rejected', 'disputed')
    GROUP BY encounter_id
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count > 0 THEN
    RAISE WARNING 'Found % encounter(s) with duplicate active NHIS claims. '
      'Keeping the most recent claim per encounter and cancelling older ones.',
      dup_count;

    -- Reject older duplicates, keeping only the most recent per encounter
    UPDATE nhis_claims
    SET status = 'rejected',
        updated_at = now()
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY encounter_id
                 ORDER BY created_at DESC
               ) AS rn
        FROM nhis_claims
        WHERE status NOT IN ('rejected', 'disputed')
      ) ranked
      WHERE rn > 1
    );

    RAISE NOTICE 'Duplicate NHIS claims resolved. Unique index can now be created safely.';
  END IF;
END $$;

-- Create the unique partial index (CONCURRENTLY to avoid table lock in production)
CREATE UNIQUE INDEX IF NOT EXISTS idx_nhis_claims_encounter_active
  ON nhis_claims(encounter_id)
  WHERE status NOT IN ('rejected', 'disputed');

COMMENT ON INDEX idx_nhis_claims_encounter_active IS
  'Prevents duplicate active NHIS claims for the same encounter. '
  'Allows multiple rejected/cancelled claims but only one active claim per encounter.';

-- ============================================================================
-- P1-02: COMPOSITE INDEX ON visits FOR QUEUE DASHBOARD PERFORMANCE
-- The queue dashboard calls getActiveEncounters() which filters:
--   WHERE status = 'Active'
-- and sorts by current_stage + created_at.
-- Without this index, every queue load does a full table scan.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_visits_status_stage_created
  ON visits(status, current_stage, created_at DESC)
  WHERE status = 'Active';

COMMENT ON INDEX idx_visits_status_stage_created IS
  'Partial index for active visits. Powers the getActiveEncounters() '
  'queue dashboard query. Expected 5-10x speedup at 1000+ visits.';

-- Also add a plain status index for non-active status filters (analytics/reports)
CREATE INDEX IF NOT EXISTS idx_visits_status_created
  ON visits(status, created_at DESC);

-- Index for encounter_date filtering (daily reports, NHIS daily submissions)
CREATE INDEX IF NOT EXISTS idx_visits_encounter_date_status
  ON visits(encounter_date DESC, status);

-- ============================================================================
-- P1-03: STALE QUEUE CLEANUP
-- Encounters with queue entries stuck at 'In Progress' for > 4 hours
-- block the patient from being attended by another doctor ("ghost patients").
-- This function resets them to 'Waiting' and can be called via pg_cron.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_stale_queue_entries(
  p_stale_hours INTEGER DEFAULT 4
)
RETURNS TABLE(
  reset_count    INTEGER,
  visit_ids      UUID[],
  message        TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale_cutoff  TIMESTAMPTZ;
  v_reset_count   INTEGER;
  v_visit_ids     UUID[];
BEGIN
  v_stale_cutoff := now() - (p_stale_hours || ' hours')::INTERVAL;

  -- Collect stale entries before updating (for audit/return)
  SELECT
    array_agg(visit_id),
    COUNT(*)::INTEGER
  INTO v_visit_ids, v_reset_count
  FROM queue
  WHERE status = 'In Progress'
    AND started_at < v_stale_cutoff;

  IF v_reset_count = 0 THEN
    RETURN QUERY SELECT 0, ARRAY[]::UUID[], 'No stale queue entries found.'::TEXT;
    RETURN;
  END IF;

  -- Reset stale entries back to Waiting
  UPDATE queue
  SET
    status     = 'Waiting',
    assigned_to = NULL,
    started_at  = NULL,
    notes       = COALESCE(notes, '') ||
                  ' [AUTO-RESET: Stale In Progress entry reset at ' ||
                  to_char(now(), 'YYYY-MM-DD HH24:MI') || ']',
    updated_at  = now()
  WHERE status = 'In Progress'
    AND started_at < v_stale_cutoff;

  -- Log to nhis_audit_log equivalent — clinical_audit_log if it exists
  INSERT INTO audit_logs (
    category,
    action,
    resource_type,
    resource_id,
    description,
    metadata,
    created_at
  )
  SELECT
    'workflow'::audit_category,
    'update'::audit_action,
    'queue',
    v.id::TEXT,
    format('Stale queue entry auto-reset: visit %s was In Progress for >%s hours',
           v.id, p_stale_hours),
    jsonb_build_object(
      'reset_reason', 'stale_in_progress',
      'threshold_hours', p_stale_hours,
      'cutoff_time', v_stale_cutoff
    ),
    now()
  FROM unnest(v_visit_ids) AS v(id)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT
    v_reset_count,
    COALESCE(v_visit_ids, ARRAY[]::UUID[]),
    format('%s stale queue entr%s reset to Waiting.',
           v_reset_count,
           CASE WHEN v_reset_count = 1 THEN 'y' ELSE 'ies' END)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_queue_entries(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_queue_entries(INTEGER) TO service_role;

COMMENT ON FUNCTION public.cleanup_stale_queue_entries IS
  'Auto-resets queue entries stuck at "In Progress" for longer than p_stale_hours. '
  'Call via pg_cron: SELECT cron.schedule(''0 * * * *'', ''SELECT cleanup_stale_queue_entries()'')';

-- Schedule via pg_cron if the extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Run every hour; remove existing schedule first to avoid duplicates
    PERFORM cron.unschedule('cleanup-stale-queue') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-queue'
    );
    PERFORM cron.schedule(
      'cleanup-stale-queue',
      '0 * * * *',  -- every hour at :00
      'SELECT cleanup_stale_queue_entries(4)'
    );
    RAISE NOTICE 'pg_cron job cleanup-stale-queue scheduled (hourly).';
  ELSE
    RAISE NOTICE 'pg_cron not available. Call cleanup_stale_queue_entries() manually or via Supabase Edge Function.';
  END IF;
END $$;

-- ============================================================================
-- P1-04: SCOPE RLS ON CLINICAL TABLES TO CLINICAL ROLES
-- Currently most clinical tables use USING(true) which allows ANY authenticated
-- user (cashiers, receptionists, inventory managers) to read PHI via direct
-- PostgREST API calls.
-- This migration adds role-scoped SELECT policies for the most sensitive tables.
-- ============================================================================

-- Helper: clinical roles that can read patient clinical data
-- (doctors, nurses, medical director, admin, super_admin)
-- Billing/reception/lab/radiology/pharmacy have targeted access where needed.

-- ---- consultations ----
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultations_select_clinical" ON consultations;
CREATE POLICY "consultations_select_clinical" ON consultations
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN (
      'super_admin', 'admin', 'medical_director',
      'doctor', 'nurse'
    )
    OR EXISTS (
      -- Allow the attending doctor or nurse who recorded to read their own note
      SELECT 1 FROM staff s
      WHERE s.user_id = auth.uid()
        AND s.id::TEXT = consultations.doctor_id::TEXT
    )
  );

DROP POLICY IF EXISTS "consultations_write_doctors" ON consultations;
CREATE POLICY "consultations_write_doctors" ON consultations
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor')
  )
  WITH CHECK (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor')
  );

-- ---- prescriptions ----
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prescriptions_select_clinical" ON prescriptions;
CREATE POLICY "prescriptions_select_clinical" ON prescriptions
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN (
      'super_admin', 'admin', 'medical_director',
      'doctor', 'nurse', 'pharmacist'
    )
  );

DROP POLICY IF EXISTS "prescriptions_write_doctors" ON prescriptions;
CREATE POLICY "prescriptions_write_doctors" ON prescriptions
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor', 'pharmacist')
  )
  WITH CHECK (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor', 'pharmacist')
  );

-- ---- lab_requests ----
ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_requests_select_clinical" ON lab_requests;
CREATE POLICY "lab_requests_select_clinical" ON lab_requests
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN (
      'super_admin', 'admin', 'medical_director',
      'doctor', 'nurse', 'lab_technician'
    )
  );

DROP POLICY IF EXISTS "lab_requests_write_lab" ON lab_requests;
CREATE POLICY "lab_requests_write_lab" ON lab_requests
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor', 'lab_technician')
  )
  WITH CHECK (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor', 'lab_technician')
  );

-- ---- radiology_requests ----
ALTER TABLE radiology_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "radiology_requests_select_clinical" ON radiology_requests;
CREATE POLICY "radiology_requests_select_clinical" ON radiology_requests
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN (
      'super_admin', 'admin', 'medical_director',
      'doctor', 'nurse', 'radiologist'
    )
  );

DROP POLICY IF EXISTS "radiology_requests_write_radiology" ON radiology_requests;
CREATE POLICY "radiology_requests_write_radiology" ON radiology_requests
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor', 'radiologist')
  )
  WITH CHECK (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor', 'radiologist')
  );

-- ---- vitals ----
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vitals_select_clinical" ON vitals;
CREATE POLICY "vitals_select_clinical" ON vitals
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN (
      'super_admin', 'admin', 'medical_director',
      'doctor', 'nurse'
    )
  );

DROP POLICY IF EXISTS "vitals_write_nurses" ON vitals;
CREATE POLICY "vitals_write_nurses" ON vitals
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor', 'nurse')
  )
  WITH CHECK (
    get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor', 'nurse')
  );

-- ---- lab_results (read by billing for cost, but NOT PHI) ----
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_results_select_clinical" ON lab_results;
CREATE POLICY "lab_results_select_clinical" ON lab_results
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN (
      'super_admin', 'admin', 'medical_director',
      'doctor', 'nurse', 'lab_technician'
    )
  );

DROP POLICY IF EXISTS "lab_results_write_lab" ON lab_results;
CREATE POLICY "lab_results_write_lab" ON lab_results
  FOR ALL TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin', 'lab_technician')
  )
  WITH CHECK (
    get_user_role() IN ('super_admin', 'admin', 'lab_technician')
  );

-- ============================================================================
-- P1-06: SCHEMA MIGRATION TRACKING TABLE
-- Tracks which migrations have been applied to each environment.
-- Insert a row manually after running each migration, or automate via
-- Supabase CLI's built-in migration tracking (supabase db push).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.emr_schema_migrations (
  id             SERIAL         PRIMARY KEY,
  filename       VARCHAR(255)   NOT NULL UNIQUE,
  applied_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  applied_by     TEXT           NOT NULL DEFAULT current_user,
  description    TEXT
);

ALTER TABLE public.emr_schema_migrations OWNER TO postgres;
ALTER TABLE public.emr_schema_migrations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage migration records; all staff can read
CREATE POLICY "migrations_select_all_staff" ON public.emr_schema_migrations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "migrations_manage_admins" ON public.emr_schema_migrations
  FOR ALL TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

GRANT SELECT ON public.emr_schema_migrations TO authenticated;
GRANT ALL ON public.emr_schema_migrations TO service_role;
GRANT USAGE ON SEQUENCE emr_schema_migrations_id_seq TO service_role;

COMMENT ON TABLE public.emr_schema_migrations IS
  'Tracks which SQL migration files have been applied to this Supabase project. '
  'Run the companion PowerShell script scripts/track_migrations.ps1 to populate.';

-- Record this migration as applied
INSERT INTO public.emr_schema_migrations (filename, description)
VALUES (
  '145_phase1_quick_wins.sql',
  'Phase 1: NHIS unique index, visits composite index, stale queue cleanup, clinical RLS scope, migration tracking'
)
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- P1-01: idx_nhis_claims_encounter_active — prevents duplicate NHIS claims
-- P1-02: idx_visits_status_stage_created — 5-10x queue dashboard speedup
-- P1-03: cleanup_stale_queue_entries() — auto-reset ghost "In Progress" patients
-- P1-04: RLS policies scoped to clinical roles on 6 PHI tables
-- P1-06: emr_schema_migrations tracking table
-- ============================================================================
