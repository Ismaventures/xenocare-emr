-- ============================================================================
-- Migration: 217_step3_repair_triggers.sql
-- Purpose:
--   Repair trigger behavior and add compatibility sync triggers required by
--   identity bridge columns and legacy function references.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Staff compatibility for legacy function references (auth_user_id)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.staff
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

UPDATE public.staff
SET auth_user_id = user_id
WHERE auth_user_id IS DISTINCT FROM user_id;

CREATE OR REPLACE FUNCTION public.sync_staff_auth_user_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Keep legacy and canonical auth columns synchronized.
  IF NEW.user_id IS NOT NULL THEN
    NEW.auth_user_id := NEW.user_id;
  ELSIF NEW.auth_user_id IS NOT NULL THEN
    NEW.user_id := NEW.auth_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_sync_auth_user_id ON public.staff;
CREATE TRIGGER trg_staff_sync_auth_user_id
BEFORE INSERT OR UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.sync_staff_auth_user_id();

-- ---------------------------------------------------------------------------
-- 2) Radiology identifier sync trigger (legacy staff_id <-> UUID)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_radiology_staff_identifiers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_staff_id_text varchar(50);
  v_staff_uuid uuid;
BEGIN
  -- ordered_by/text -> ordered_by_uuid
  IF NEW.ordered_by_uuid IS NULL AND NEW.ordered_by IS NOT NULL THEN
    SELECT s.id INTO v_staff_uuid
    FROM public.staff s
    WHERE s.staff_id = NEW.ordered_by
    LIMIT 1;
    NEW.ordered_by_uuid := v_staff_uuid;
  END IF;

  -- ordered_by_uuid -> ordered_by/text
  IF NEW.ordered_by IS NULL AND NEW.ordered_by_uuid IS NOT NULL THEN
    SELECT s.staff_id INTO v_staff_id_text
    FROM public.staff s
    WHERE s.id = NEW.ordered_by_uuid
    LIMIT 1;
    NEW.ordered_by := v_staff_id_text;
  END IF;

  -- performed_by/text -> performed_by_uuid
  IF NEW.performed_by_uuid IS NULL AND NEW.performed_by IS NOT NULL THEN
    SELECT s.id INTO v_staff_uuid
    FROM public.staff s
    WHERE s.staff_id = NEW.performed_by
    LIMIT 1;
    NEW.performed_by_uuid := v_staff_uuid;
  END IF;

  -- performed_by_uuid -> performed_by/text
  IF NEW.performed_by IS NULL AND NEW.performed_by_uuid IS NOT NULL THEN
    SELECT s.staff_id INTO v_staff_id_text
    FROM public.staff s
    WHERE s.id = NEW.performed_by_uuid
    LIMIT 1;
    NEW.performed_by := v_staff_id_text;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_radiology_staff_identifiers ON public.radiology_requests;
CREATE TRIGGER trg_sync_radiology_staff_identifiers
BEFORE INSERT OR UPDATE ON public.radiology_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_radiology_staff_identifiers();

-- ---------------------------------------------------------------------------
-- 3) Re-assert optimistic-lock version triggers on key tables
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS consultations_version_trigger ON public.consultations;
CREATE TRIGGER consultations_version_trigger
BEFORE UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();

DROP TRIGGER IF EXISTS lab_requests_version_trigger ON public.lab_requests;
CREATE TRIGGER lab_requests_version_trigger
BEFORE UPDATE ON public.lab_requests
FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();

DROP TRIGGER IF EXISTS prescriptions_version_trigger ON public.prescriptions;
CREATE TRIGGER prescriptions_version_trigger
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();

COMMIT;

-- Rollback Guidance:
--   - Drop trg_sync_radiology_staff_identifiers and trg_staff_sync_auth_user_id.
--   - Drop functions sync_radiology_staff_identifiers and sync_staff_auth_user_id.
--   - Optionally drop staff.auth_user_id if no longer needed.
--   - Recreate prior trigger definitions if they differed.
