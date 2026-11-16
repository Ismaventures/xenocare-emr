-- ============================================================================
-- Migration: 219_step5_enforce_tenant_isolation.sql
-- Purpose:
--   Enforce facility-based tenant isolation for core clinical data paths
--   (visits, consultations, lab_requests, radiology_requests).
--
-- Strategy:
--   1) Backfill visits.facility_id
--   2) Enforce NOT NULL + insert/update auto-fill trigger
--   3) Replace permissive policies with facility-scoped policies
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Canonical facility resolver function (fixes legacy drift)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_facility_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_facility_id uuid;
BEGIN
  -- Session variable path (fast path)
  BEGIN
    v_facility_id := current_setting('app.facility_id', true)::uuid;
  EXCEPTION WHEN others THEN
    v_facility_id := NULL;
  END;

  IF v_facility_id IS NOT NULL THEN
    RETURN v_facility_id;
  END IF;

  -- Canonical staff mapping
  SELECT s.facility_id INTO v_facility_id
  FROM public.staff s
  WHERE s.user_id = auth.uid()
  LIMIT 1;

  RETURN v_facility_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Backfill visits.facility_id from existing relational context
-- ---------------------------------------------------------------------------
UPDATE public.visits v
SET facility_id = s.facility_id
FROM public.staff s
WHERE v.facility_id IS NULL
  AND v.registered_by = s.id
  AND s.facility_id IS NOT NULL;

UPDATE public.visits v
SET facility_id = s.facility_id
FROM public.staff s
WHERE v.facility_id IS NULL
  AND v.attending_doctor_id = s.id
  AND s.facility_id IS NOT NULL;

UPDATE public.visits v
SET facility_id = p.registered_facility_id
FROM public.patients p
WHERE v.facility_id IS NULL
  AND v.patient_id = p.id
  AND p.registered_facility_id IS NOT NULL;

UPDATE public.visits v
SET facility_id = f.id
FROM (
  SELECT id
  FROM public.facilities
  ORDER BY created_at NULLS LAST, id
  LIMIT 1
) f
WHERE v.facility_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.visits WHERE facility_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce tenant isolation: visits.facility_id still contains NULL values';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) Auto-fill trigger for future visit writes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_visit_facility_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_facility_id uuid;
BEGIN
  IF NEW.facility_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve from current user facility
  IF v_facility_id IS NULL THEN
    v_facility_id := public.get_user_facility_id();
  END IF;

  -- Final fallback to default facility
  IF v_facility_id IS NULL THEN
    SELECT id INTO v_facility_id
    FROM public.facilities
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;
  END IF;

  NEW.facility_id := v_facility_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_visit_facility_id ON public.visits;
CREATE TRIGGER trg_assign_visit_facility_id
BEFORE INSERT OR UPDATE ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.assign_visit_facility_id();

ALTER TABLE public.visits
  ALTER COLUMN facility_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 4) Facility access helper functions for policies
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_facility(p_facility_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_user_facility uuid;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  v_role := public.get_user_role();

  IF v_role IN ('super_admin', 'admin', 'medical_director', 'config_admin') THEN
    RETURN true;
  END IF;

  v_user_facility := public.get_user_facility_id();

  RETURN p_facility_id IS NOT NULL
    AND v_user_facility IS NOT NULL
    AND p_facility_id = v_user_facility;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_encounter_facility(p_encounter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.can_access_facility(v.facility_id)
  FROM public.visits v
  WHERE v.id = p_encounter_id
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 5) Replace permissive policies with facility-scoped policies
-- ---------------------------------------------------------------------------
-- visits
DROP POLICY IF EXISTS "Allow all access" ON public.visits;

CREATE POLICY visits_select_facility_scoped
ON public.visits
FOR SELECT
TO authenticated
USING (
  public.get_user_role() <> 'anonymous'
  AND public.can_access_facility(facility_id)
);

CREATE POLICY visits_insert_facility_scoped
ON public.visits
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role() <> 'anonymous'
  AND public.can_access_facility(facility_id)
);

CREATE POLICY visits_update_facility_scoped
ON public.visits
FOR UPDATE
TO authenticated
USING (
  public.get_user_role() <> 'anonymous'
  AND public.can_access_facility(facility_id)
)
WITH CHECK (
  public.get_user_role() <> 'anonymous'
  AND public.can_access_facility(facility_id)
);

CREATE POLICY visits_delete_facility_scoped
ON public.visits
FOR DELETE
TO authenticated
USING (
  public.get_user_role() <> 'anonymous'
  AND public.can_access_facility(facility_id)
);

-- consultations
DROP POLICY IF EXISTS "Allow all access" ON public.consultations;
DROP POLICY IF EXISTS consultations_insert_doctor ON public.consultations;
DROP POLICY IF EXISTS consultations_select_clinical ON public.consultations;
DROP POLICY IF EXISTS consultations_update_owner ON public.consultations;
DROP POLICY IF EXISTS consultations_write_doctors ON public.consultations;

CREATE POLICY consultations_select_facility_scoped
ON public.consultations
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','nurse'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY consultations_insert_facility_scoped
ON public.consultations
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY consultations_update_facility_scoped
ON public.consultations
FOR UPDATE
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','nurse'])
  AND public.can_access_encounter_facility(encounter_id)
)
WITH CHECK (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','nurse'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY consultations_delete_facility_scoped
ON public.consultations
FOR DELETE
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor'])
  AND public.can_access_encounter_facility(encounter_id)
);

-- lab_requests
DROP POLICY IF EXISTS "Allow all access" ON public.lab_requests;
DROP POLICY IF EXISTS lab_requests_all_access ON public.lab_requests;
DROP POLICY IF EXISTS lab_requests_insert_doctor ON public.lab_requests;
DROP POLICY IF EXISTS lab_requests_select_clinical ON public.lab_requests;
DROP POLICY IF EXISTS lab_requests_update_authorized ON public.lab_requests;
DROP POLICY IF EXISTS lab_requests_write_lab ON public.lab_requests;

CREATE POLICY lab_requests_select_facility_scoped
ON public.lab_requests
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','nurse','lab_technician'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY lab_requests_insert_facility_scoped
ON public.lab_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','lab_technician'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY lab_requests_update_facility_scoped
ON public.lab_requests
FOR UPDATE
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','lab_technician'])
  AND public.can_access_encounter_facility(encounter_id)
)
WITH CHECK (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','lab_technician'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY lab_requests_delete_facility_scoped
ON public.lab_requests
FOR DELETE
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','lab_technician'])
  AND public.can_access_encounter_facility(encounter_id)
);

-- radiology_requests
DROP POLICY IF EXISTS "Allow all access" ON public.radiology_requests;
DROP POLICY IF EXISTS radiology_requests_select_clinical ON public.radiology_requests;
DROP POLICY IF EXISTS radiology_requests_write_radiology ON public.radiology_requests;

CREATE POLICY radiology_requests_select_facility_scoped
ON public.radiology_requests
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','nurse','radiologist'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY radiology_requests_insert_facility_scoped
ON public.radiology_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','radiologist'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY radiology_requests_update_facility_scoped
ON public.radiology_requests
FOR UPDATE
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','radiologist'])
  AND public.can_access_encounter_facility(encounter_id)
)
WITH CHECK (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','radiologist'])
  AND public.can_access_encounter_facility(encounter_id)
);

CREATE POLICY radiology_requests_delete_facility_scoped
ON public.radiology_requests
FOR DELETE
TO authenticated
USING (
  public.get_user_role() = ANY (ARRAY['super_admin','admin','medical_director','doctor','radiologist'])
  AND public.can_access_encounter_facility(encounter_id)
);

COMMIT;

-- Rollback Guidance:
--   1) Restore previous policies from schema snapshot/migration history.
--   2) Remove new helper functions and trigger if rollback is required.
--   3) If reverting NOT NULL on visits.facility_id: ALTER TABLE public.visits
--      ALTER COLUMN facility_id DROP NOT NULL;
