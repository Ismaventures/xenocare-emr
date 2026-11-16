-- ============================================================================
-- Migration 146: Phase 2 Scale-Readiness
-- ============================================================================
-- Implements Phase 2 improvements from IMPROVEMENTS_ROADMAP.md:
--   P2-01: active_encounter_queue view (eliminates double round-trip)
--   P2-04: Server-side parameterised search RPCs (replaces .or() injection risk)
--   P2-05: get_user_role() session variable caching (already partially in place)
--   P2-06: Audit log archival functions and archive tables
-- ============================================================================

-- ============================================================================
-- P2-01: ACTIVE ENCOUNTER QUEUE VIEW
-- Replaces the two-query pattern in getActiveEncounters():
--   1. SELECT * FROM visits WHERE status='Active'
--   2. SELECT * FROM queue WHERE visit_id IN (...)
-- With a single JOIN view consumed as one PostgREST query.
-- ============================================================================

DROP VIEW IF EXISTS active_encounter_queue CASCADE;

CREATE OR REPLACE VIEW public.active_encounter_queue AS
SELECT
  -- Visit / Encounter fields
  v.id                    AS id,
  v.visit_id              AS visit_id,
  v.patient_id            AS patient_id,
  v.clinic_id             AS clinic_id,
  v.visit_type            AS visit_type,
  v.encounter_number      AS encounter_number,
  v.encounter_date        AS encounter_date,
  v.priority              AS priority,
  v.chief_complaint       AS chief_complaint,
  v.payment_category      AS payment_category,
  v.insurance_type        AS insurance_type,
  v.status                AS status,
  v.current_stage         AS current_stage,
  v.stage_updated_at      AS stage_updated_at,
  v.start_time            AS start_time,
  v.end_time              AS end_time,
  v.attending_doctor_id   AS attending_doctor_id,
  v.registered_by         AS registered_by,
  v.opd_classification    AS opd_classification,
  v.created_at            AS created_at,
  v.updated_at            AS updated_at,

  -- Patient fields (denormalized to avoid second join in client)
  p.id                    AS p_id,
  p.patient_id            AS p_patient_id,
  p.first_name            AS p_first_name,
  p.surname               AS p_surname,
  p.date_of_birth         AS p_date_of_birth,
  p.gender                AS p_gender,
  p.contact_phone         AS p_contact_phone,
  p.emr_number            AS p_emr_number,
  p.nhis_number           AS p_nhis_number,
  p.insurance_type        AS p_insurance_type,
  p.patient_type          AS p_patient_type,

  -- Queue entry fields (LEFT JOIN — patient may not yet have a queue entry)
  q.id                    AS q_id,
  q.status                AS q_status,
  q.location              AS q_location,
  q.assigned_to           AS q_assigned_to,
  q.called_at             AS q_called_at,
  q.started_at            AS q_started_at,
  q.completed_at          AS q_completed_at,
  q.ticket_number         AS q_ticket_number,
  q.specialty_code        AS q_specialty_code,
  q.notes                 AS q_notes,
  q.department_id         AS q_department_id,
  q.created_at            AS q_created_at

FROM public.visits v
JOIN public.patients p ON p.id = v.patient_id
LEFT JOIN LATERAL (
  -- Take only the single most-recent active queue entry per visit
  SELECT *
  FROM public.queue qinner
  WHERE qinner.visit_id = v.id
    AND qinner.status IN ('Waiting', 'In Progress', 'Called')
  ORDER BY qinner.created_at DESC
  LIMIT 1
) q ON TRUE
WHERE v.status = 'Active';

-- Grant access
GRANT SELECT ON public.active_encounter_queue TO authenticated;
GRANT SELECT ON public.active_encounter_queue TO anon;

-- RLS on a view is inherited from underlying tables.
-- Ensure visits + patients tables have appropriate read policies.

COMMENT ON VIEW public.active_encounter_queue IS
  'Single-query replacement for the two-round-trip getActiveEncounters() pattern. '
  'Joins visits + patients + queue in one query with LATERAL to pick the latest '
  'active queue entry per visit. Eliminates N+1 on queue dashboard load.';

-- ============================================================================
-- P2-04: SERVER-SIDE PARAMETERISED SEARCH RPCs
-- Replace PostgREST .or() string interpolation with safe server-side search
-- functions. These accept TEXT parameters and build the ILIKE filter internally,
-- never interpolating user input into filter syntax.
-- ============================================================================

-- 2-04a: Search patients by name / EMR / phone
CREATE OR REPLACE FUNCTION public.search_patients(
  p_query      TEXT,
  p_limit      INTEGER DEFAULT 50,
  p_offset     INTEGER DEFAULT 0
)
RETURNS TABLE(
  id             UUID,
  patient_id     TEXT,
  first_name     TEXT,
  surname        TEXT,
  date_of_birth  DATE,
  gender         TEXT,
  contact_phone  TEXT,
  emr_number     TEXT,
  nhis_number    TEXT,
  patient_type   TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern TEXT := '%' || trim(p_query) || '%';
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.patient_id,
    pt.first_name,
    pt.surname,
    pt.date_of_birth,
    pt.gender::TEXT,
    pt.contact_phone,
    pt.emr_number,
    pt.nhis_number,
    pt.patient_type::TEXT
  FROM patients pt
  WHERE
    pt.first_name    ILIKE v_pattern OR
    pt.surname       ILIKE v_pattern OR
    (pt.first_name || ' ' || pt.surname) ILIKE v_pattern OR
    pt.emr_number    ILIKE v_pattern OR
    pt.contact_phone ILIKE v_pattern OR
    pt.nhis_number   ILIKE v_pattern
  ORDER BY
    -- Exact prefix matches first
    CASE WHEN pt.emr_number ILIKE (trim(p_query) || '%') THEN 0 ELSE 1 END,
    pt.surname, pt.first_name
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_patients(TEXT, INTEGER, INTEGER) TO authenticated;

-- 2-04b: Search drug catalogue by name / code
CREATE OR REPLACE FUNCTION public.search_drug_catalogue(
  p_query   TEXT,
  p_limit   INTEGER DEFAULT 100,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE(
  id                UUID,
  name              TEXT,
  generic_name      TEXT,
  drug_code         TEXT,
  form              TEXT,
  strength          TEXT,
  unit              TEXT,
  stock_quantity    NUMERIC,
  unit_price        NUMERIC,
  is_active         BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern TEXT := '%' || trim(p_query) || '%';
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.name,
    dc.generic_name,
    dc.drug_code,
    dc.form::TEXT,
    dc.strength,
    dc.unit,
    dc.stock_quantity,
    dc.unit_price,
    dc.is_active
  FROM drug_catalogue dc
  WHERE
    dc.name         ILIKE v_pattern OR
    dc.generic_name ILIKE v_pattern OR
    dc.drug_code    ILIKE v_pattern
  ORDER BY
    CASE WHEN dc.name ILIKE (trim(p_query) || '%') THEN 0 ELSE 1 END,
    dc.name
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_drug_catalogue(TEXT, INTEGER, INTEGER) TO authenticated;

-- 2-04c: Search services / procedure catalogue by name or code
CREATE OR REPLACE FUNCTION public.search_service_catalogue(
  p_query     TEXT,
  p_limit     INTEGER DEFAULT 100,
  p_offset    INTEGER DEFAULT 0
)
RETURNS TABLE(
  id            UUID,
  name          TEXT,
  code          TEXT,
  category      TEXT,
  unit_price    NUMERIC,
  nhis_tariff   NUMERIC,
  is_active     BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern TEXT := '%' || trim(p_query) || '%';
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.name,
    pc.code,
    pc.category::TEXT,
    pc.unit_price,
    pc.nhis_tariff,
    pc.is_active
  FROM procedure_catalogue pc
  WHERE
    pc.name ILIKE v_pattern OR
    pc.code ILIKE v_pattern
  ORDER BY
    CASE WHEN pc.name ILIKE (trim(p_query) || '%') THEN 0 ELSE 1 END,
    pc.name
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_service_catalogue(TEXT, INTEGER, INTEGER) TO authenticated;

-- 2-04d: Search NHIS profiles by patient name / NHIS number / HMO
CREATE OR REPLACE FUNCTION public.search_nhis_profiles(
  p_query   TEXT,
  p_limit   INTEGER DEFAULT 50,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE(
  id              UUID,
  patient_id      UUID,
  nhis_number     TEXT,
  hmo_name        TEXT,
  enrollment_date DATE,
  expiry_date     DATE,
  status          TEXT,
  first_name      TEXT,
  surname         TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern TEXT := '%' || trim(p_query) || '%';
BEGIN
  RETURN QUERY
  SELECT
    np.id,
    np.patient_id,
    np.nhis_number,
    np.hmo_name,
    np.enrollment_date,
    np.expiry_date,
    np.status::TEXT,
    pt.first_name,
    pt.surname
  FROM nhis_profiles np
  JOIN patients pt ON pt.id = np.patient_id
  WHERE
    np.nhis_number ILIKE v_pattern OR
    np.hmo_name    ILIKE v_pattern OR
    pt.first_name  ILIKE v_pattern OR
    pt.surname     ILIKE v_pattern OR
    (pt.first_name || ' ' || pt.surname) ILIKE v_pattern
  ORDER BY pt.surname, pt.first_name
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_nhis_profiles(TEXT, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- P2-05: VERIFY get_user_role() SESSION VARIABLE SUPPORT
-- The get_user_role() function already checks current_setting('app.user_role')
-- first (confirmed in schema dump). This migration adds a helper RPC that the
-- Supabase Auth hook or Edge Function can call on login to set the session var,
-- reducing per-row staff table lookups in RLS policies.
-- ============================================================================

-- Function: Set the session role variable for the current connection
-- Call this immediately after login via a Supabase Edge Function or DB webhook.
CREATE OR REPLACE FUNCTION public.set_session_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Fetch from staff table
  SELECT role::TEXT INTO v_role
  FROM staff
  WHERE user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;

  IF v_role IS NULL THEN
    v_role := 'anonymous';
  END IF;

  -- Set for this transaction/connection
  PERFORM set_config('app.user_role', v_role, false);  -- false = not transaction-local

  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_session_user_role() TO authenticated;

COMMENT ON FUNCTION public.set_session_user_role IS
  'Sets app.user_role session variable from the staff table for the current auth.uid(). '
  'Call immediately after login. get_user_role() checks this variable first, '
  'avoiding per-row staff table lookups in RLS policies. '
  'Usage: SELECT set_session_user_role(); in a post-login trigger or Edge Function.';

-- ============================================================================
-- P2-06: AUDIT LOG ARCHIVAL
-- Creates archive tables + archival function for the three main audit log tables:
--   - audit_logs (general EMR audit)
--   - nhis_audit_log (NHIS-specific audit)
--   - billing_audit_log (billing events)
-- Rows older than 90 days are moved to *_archive tables monthly.
-- ============================================================================

-- Archive table: audit_logs_archive
CREATE TABLE IF NOT EXISTS public.audit_logs_archive (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category          TEXT,
  action            TEXT,
  severity          TEXT DEFAULT 'info',
  user_id           UUID,
  user_role         VARCHAR(50),
  user_name         VARCHAR(200),
  user_ip           VARCHAR(45),
  user_agent        TEXT,
  session_id        VARCHAR(255),
  request_id        VARCHAR(255),
  resource_type     VARCHAR(100),
  resource_id       VARCHAR(255),
  resource_name     VARCHAR(500),
  patient_id        VARCHAR(50),
  patient_name      VARCHAR(200),
  encounter_id      UUID,
  description       TEXT,
  old_values        JSONB,
  new_values        JSONB,
  changed_fields    TEXT[],
  metadata          JSONB DEFAULT '{}'::jsonb,
  reason            TEXT,
  authorization_ref VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  retention_until   DATE,
  is_archived       BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_archive_select_admins" ON public.audit_logs_archive;
CREATE POLICY "audit_archive_select_admins" ON public.audit_logs_archive
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin', 'medical_director'));

COMMENT ON TABLE public.audit_logs_archive IS
  'Long-term storage for audit_logs entries older than 90 days. '
  'Written by archive_old_audit_logs() — never deleted, only archived.';

-- Archive table: nhis_audit_log_archive
CREATE TABLE IF NOT EXISTS public.nhis_audit_log_archive (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type          VARCHAR(100) NOT NULL,
  action_description   TEXT,
  entity_type          VARCHAR(50),
  entity_id            UUID,
  patient_id           UUID,
  encounter_id         UUID,
  old_state            JSONB,
  new_state            JSONB,
  performed_by         UUID,
  performed_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address           VARCHAR(45),
  user_agent           TEXT,
  session_id           VARCHAR(100),
  is_emergency_action  BOOLEAN DEFAULT FALSE,
  emergency_reason     TEXT
);

ALTER TABLE public.nhis_audit_log_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nhis_audit_archive_select" ON public.nhis_audit_log_archive;
CREATE POLICY "nhis_audit_archive_select" ON public.nhis_audit_log_archive
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin', 'medical_director'));

-- Archive table: billing_audit_log_archive
CREATE TABLE IF NOT EXISTS public.billing_audit_log_archive (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type            TEXT NOT NULL,
  entity_type           VARCHAR(50) NOT NULL,
  entity_id             UUID NOT NULL,
  encounter_id          UUID,
  patient_id            UUID,
  billing_order_id      UUID,
  billing_item_id       UUID,
  category_invoice_id   UUID,
  category_receipt_id   UUID,
  old_value             JSONB,
  new_value             JSONB,
  changes_summary       TEXT,
  performed_by          UUID NOT NULL,
  performed_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address            INET,
  user_agent            TEXT,
  notes                 TEXT,
  metadata              JSONB
);

ALTER TABLE public.billing_audit_log_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_audit_archive_select" ON public.billing_audit_log_archive;
CREATE POLICY "billing_audit_archive_select" ON public.billing_audit_log_archive
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin', 'billing_clerk', 'medical_director'));

-- ---- Archival function ----
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs(
  p_older_than_days INTEGER DEFAULT 90
)
RETURNS TABLE(
  table_name           TEXT,
  rows_archived        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff        TIMESTAMPTZ := now() - (p_older_than_days || ' days')::INTERVAL;
  v_archived_al   BIGINT := 0;
  v_archived_nhis BIGINT := 0;
  v_archived_bill BIGINT := 0;
BEGIN
  -- Archive audit_logs
  WITH moved AS (
    DELETE FROM audit_logs
    WHERE created_at < v_cutoff
    RETURNING *
  )
  INSERT INTO audit_logs_archive SELECT * FROM moved;
  GET DIAGNOSTICS v_archived_al = ROW_COUNT;

  -- Archive nhis_audit_log
  WITH moved AS (
    DELETE FROM nhis_audit_log
    WHERE performed_at < v_cutoff
    RETURNING *
  )
  INSERT INTO nhis_audit_log_archive SELECT * FROM moved;
  GET DIAGNOSTICS v_archived_nhis = ROW_COUNT;

  -- Archive billing_audit_log
  WITH moved AS (
    DELETE FROM billing_audit_log
    WHERE performed_at < v_cutoff
    RETURNING *
  )
  INSERT INTO billing_audit_log_archive SELECT * FROM moved;
  GET DIAGNOSTICS v_archived_bill = ROW_COUNT;

  RETURN QUERY VALUES
    ('audit_logs',          v_archived_al),
    ('nhis_audit_log',      v_archived_nhis),
    ('billing_audit_log',   v_archived_bill);
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_old_audit_logs(INTEGER) TO service_role;

COMMENT ON FUNCTION public.archive_old_audit_logs IS
  'Moves audit log entries older than p_older_than_days to *_archive tables. '
  'Schedule monthly: SELECT cron.schedule(''0 2 1 * *'', ''SELECT archive_old_audit_logs(90)'')';

-- Schedule monthly archival if pg_cron is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('archive-audit-logs') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'archive-audit-logs'
    );
    PERFORM cron.schedule(
      'archive-audit-logs',
      '0 2 1 * *',  -- 2am on the 1st of each month
      'SELECT archive_old_audit_logs(90)'
    );
    RAISE NOTICE 'pg_cron job archive-audit-logs scheduled (monthly).';
  END IF;
END $$;

-- Record this migration
INSERT INTO public.emr_schema_migrations (filename, description)
VALUES (
  '146_phase2_scale_readiness.sql',
  'Phase 2: active_encounter_queue view, parameterised search RPCs, session role helper, audit log archival'
)
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- P2-01: active_encounter_queue view — single-query queue load
-- P2-04: search_patients/drug/service/nhis RPCs — safe parameterised search
-- P2-05: set_session_user_role() — pre-warm role cache for RLS
-- P2-06: *_archive tables + archive_old_audit_logs() — DB growth control
-- ============================================================================
