-- ============================================================================
-- Migration: 215_step1_fix_function_drift.sql
-- Purpose:
--   Resolve schema/function drift in optimistic-locking + version-reader RPCs.
--   Keep existing RPC signatures for application compatibility.
--
-- Safe to run multiple times (CREATE OR REPLACE only).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- consultations: align key column + field names with current schema
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_consultation_with_lock(
  p_id uuid,
  p_expected_version integer,
  p_updates jsonb,
  p_modified_by uuid
)
RETURNS SETOF public.consultations
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version integer;
  v_last_modified_by uuid;
  v_updated_at timestamptz;
BEGIN
  SELECT version, last_modified_by, updated_at
    INTO v_current_version, v_last_modified_by, v_updated_at
  FROM public.consultations
  WHERE consultation_id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';
  END IF;

  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',
      p_expected_version, v_current_version, v_last_modified_by, v_updated_at
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  UPDATE public.consultations
  SET
    history_of_present_illness = COALESCE(
      NULLIF(p_updates->>'history_of_present_illness', '')::text,
      NULLIF(p_updates->>'history_of_presenting_illness', '')::text,
      history_of_present_illness
    ),
    examination_findings = COALESCE(
      NULLIF(p_updates->>'examination_findings', '')::text,
      examination_findings
    ),
    clinical_notes = COALESCE(
      NULLIF(p_updates->>'clinical_notes', '')::text,
      clinical_notes
    ),
    plan = COALESCE(
      NULLIF(p_updates->>'plan', '')::text,
      plan
    ),
    status = COALESCE(
      NULLIF(p_updates->>'status', '')::public.request_status,
      status
    ),
    last_modified_by = p_modified_by,
    version = v_current_version
  WHERE consultation_id = p_id
  RETURNING *;
END;
$$;

-- ---------------------------------------------------------------------------
-- lab_requests: align key column + enums + notes column
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_lab_request_with_lock(
  p_id uuid,
  p_expected_version integer,
  p_updates jsonb,
  p_modified_by uuid
)
RETURNS SETOF public.lab_requests
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version integer;
  v_last_modified_by uuid;
  v_updated_at timestamptz;
BEGIN
  SELECT version, last_modified_by, updated_at
    INTO v_current_version, v_last_modified_by, v_updated_at
  FROM public.lab_requests
  WHERE request_id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';
  END IF;

  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',
      p_expected_version, v_current_version, v_last_modified_by, v_updated_at
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  UPDATE public.lab_requests
  SET
    status = COALESCE(
      NULLIF(p_updates->>'status', '')::public.request_status,
      status
    ),
    priority = COALESCE(
      NULLIF(p_updates->>'priority', '')::public.priority,
      priority
    ),
    clinical_notes = COALESCE(
      NULLIF(p_updates->>'clinical_notes', '')::text,
      NULLIF(p_updates->>'notes', '')::text,
      clinical_notes
    ),
    result_notes = COALESCE(
      NULLIF(p_updates->>'result_notes', '')::text,
      result_notes
    ),
    interpretation = COALESCE(
      NULLIF(p_updates->>'interpretation', '')::text,
      interpretation
    ),
    last_modified_by = p_modified_by,
    version = v_current_version
  WHERE request_id = p_id
  RETURNING *;
END;
$$;

-- ---------------------------------------------------------------------------
-- prescriptions: align key column + status enum cast
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_prescription_with_lock(
  p_id uuid,
  p_expected_version integer,
  p_updates jsonb,
  p_modified_by uuid
)
RETURNS SETOF public.prescriptions
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version integer;
  v_last_modified_by uuid;
  v_updated_at timestamptz;
BEGIN
  SELECT version, last_modified_by, updated_at
    INTO v_current_version, v_last_modified_by, v_updated_at
  FROM public.prescriptions
  WHERE prescription_id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';
  END IF;

  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',
      p_expected_version, v_current_version, v_last_modified_by, v_updated_at
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  UPDATE public.prescriptions
  SET
    status = COALESCE(
      NULLIF(p_updates->>'status', '')::public.request_status,
      status
    ),
    quantity_dispensed = COALESCE(
      NULLIF(p_updates->>'quantity_dispensed', '')::integer,
      quantity_dispensed
    ),
    dispensed_by = COALESCE(
      NULLIF(p_updates->>'dispensed_by', '')::uuid,
      dispensed_by
    ),
    dispensed_at = COALESCE(
      NULLIF(p_updates->>'dispensed_at', '')::timestamptz,
      dispensed_at
    ),
    clinical_notes = COALESCE(
      NULLIF(p_updates->>'clinical_notes', '')::text,
      clinical_notes
    ),
    notes = COALESCE(
      NULLIF(p_updates->>'notes', '')::text,
      notes
    ),
    last_modified_by = p_modified_by,
    version = v_current_version
  WHERE prescription_id = p_id
  RETURNING *;
END;
$$;

-- ---------------------------------------------------------------------------
-- generic version reader: align per-table keys; add encounters->visits alias
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_record_version(
  p_table_name character varying,
  p_record_id uuid
)
RETURNS TABLE(
  current_version integer,
  last_modified_by uuid,
  last_modified_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  CASE lower(p_table_name)
    WHEN 'patients' THEN
      RETURN QUERY
      SELECT p.version, p.last_modified_by, p.updated_at
      FROM public.patients p
      WHERE p.id = p_record_id;

    WHEN 'encounters' THEN
      RETURN QUERY
      SELECT v.version, v.last_modified_by, v.updated_at
      FROM public.visits v
      WHERE v.id = p_record_id;

    WHEN 'visits' THEN
      RETURN QUERY
      SELECT v.version, v.last_modified_by, v.updated_at
      FROM public.visits v
      WHERE v.id = p_record_id;

    WHEN 'consultations' THEN
      RETURN QUERY
      SELECT c.version, c.last_modified_by, c.updated_at
      FROM public.consultations c
      WHERE c.consultation_id = p_record_id;

    WHEN 'billing_orders' THEN
      RETURN QUERY
      SELECT b.version, b.last_modified_by, b.updated_at
      FROM public.billing_orders b
      WHERE b.id = p_record_id;

    WHEN 'prescriptions' THEN
      RETURN QUERY
      SELECT pr.version, pr.last_modified_by, pr.updated_at
      FROM public.prescriptions pr
      WHERE pr.prescription_id = p_record_id;

    WHEN 'lab_requests' THEN
      RETURN QUERY
      SELECT lr.version, lr.last_modified_by, lr.updated_at
      FROM public.lab_requests lr
      WHERE lr.request_id = p_record_id;

    WHEN 'radiology_requests' THEN
      RETURN QUERY
      SELECT rr.version, rr.last_modified_by, rr.updated_at
      FROM public.radiology_requests rr
      WHERE rr.request_id = p_record_id;

    WHEN 'admissions' THEN
      RETURN QUERY
      SELECT a.version, a.last_modified_by, a.updated_at
      FROM public.admissions a
      WHERE a.id = p_record_id;

    WHEN 'procedures' THEN
      RETURN QUERY
      SELECT proc.version, proc.last_modified_by, proc.updated_at
      FROM public.procedures proc
      WHERE proc.id = p_record_id;

    WHEN 'vitals' THEN
      RETURN QUERY
      SELECT v.version, v.last_modified_by, v.updated_at
      FROM public.vitals v
      WHERE v.id = p_record_id;

    WHEN 'nursing_notes' THEN
      RETURN QUERY
      SELECT nn.version, nn.last_modified_by, nn.updated_at
      FROM public.nursing_notes nn
      WHERE nn.id = p_record_id;

    WHEN 'diagnoses' THEN
      IF to_regclass('public.diagnoses') IS NOT NULL THEN
        RETURN QUERY EXECUTE
          'SELECT d.version, d.last_modified_by, d.updated_at
           FROM public.diagnoses d
           WHERE d.id = $1'
        USING p_record_id;
      END IF;

    WHEN 'ward_rounds' THEN
      IF to_regclass('public.ward_rounds') IS NOT NULL THEN
        RETURN QUERY EXECUTE
          'SELECT wr.version, wr.last_modified_by, wr.updated_at
           FROM public.ward_rounds wr
           WHERE wr.id = $1'
        USING p_record_id;
      END IF;

    ELSE
      RAISE EXCEPTION 'Unsupported table: %', p_table_name
        USING ERRCODE = 'P0001';
  END CASE;
END;
$$;

COMMIT;

-- Rollback Guidance:
--   Re-run the previous migration snapshot that defined these functions
--   (for example, migrations/063_optimistic_locking_improvements.sql)
--   if an immediate rollback is required.
