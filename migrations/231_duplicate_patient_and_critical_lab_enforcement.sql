-- =============================================================================
-- 231_duplicate_patient_and_critical_lab_enforcement.sql
-- Enforce high-confidence duplicate-patient checks and critical lab escalation.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_text_token(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(lower(btrim(regexp_replace(COALESCE(p_value, ''), '\s+', ' ', 'g'))), '');
$$;

CREATE OR REPLACE FUNCTION public.enforce_patient_duplicate_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_conflict_patient_id text;
BEGIN
  IF NEW.nhis_number IS NOT NULL AND btrim(NEW.nhis_number) <> '' THEN
    SELECT p.patient_id
    INTO v_conflict_patient_id
    FROM public.patients p
    WHERE p.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND public.normalize_text_token(p.nhis_number) = public.normalize_text_token(NEW.nhis_number)
    LIMIT 1;

    IF v_conflict_patient_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate patient detected: NHIS number already exists for patient %', v_conflict_patient_id;
    END IF;
  END IF;

  IF NEW.national_id IS NOT NULL AND btrim(NEW.national_id) <> '' THEN
    SELECT p.patient_id
    INTO v_conflict_patient_id
    FROM public.patients p
    WHERE p.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND public.normalize_text_token(p.national_id) = public.normalize_text_token(NEW.national_id)
    LIMIT 1;

    IF v_conflict_patient_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate patient detected: national ID already exists for patient %', v_conflict_patient_id;
    END IF;
  END IF;

  IF NEW.service_number IS NOT NULL AND btrim(NEW.service_number) <> '' THEN
    SELECT p.patient_id
    INTO v_conflict_patient_id
    FROM public.patients p
    WHERE p.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND public.normalize_text_token(p.service_number) = public.normalize_text_token(NEW.service_number)
    LIMIT 1;

    IF v_conflict_patient_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate patient detected: service number already exists for patient %', v_conflict_patient_id;
    END IF;
  END IF;

  IF NEW.date_of_birth IS NOT NULL
     AND public.normalize_text_token(NEW.first_name) IS NOT NULL
     AND public.normalize_text_token(NEW.surname) IS NOT NULL
     AND (
       public.normalize_text_token(NEW.contact_phone) IS NOT NULL
       OR public.normalize_text_token(NEW.email) IS NOT NULL
     ) THEN
    SELECT p.patient_id
    INTO v_conflict_patient_id
    FROM public.patients p
    WHERE p.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND public.normalize_text_token(p.first_name) = public.normalize_text_token(NEW.first_name)
      AND public.normalize_text_token(p.surname) = public.normalize_text_token(NEW.surname)
      AND p.date_of_birth = NEW.date_of_birth
      AND p.gender = NEW.gender
      AND (
        (
          public.normalize_text_token(NEW.contact_phone) IS NOT NULL
          AND public.normalize_text_token(p.contact_phone) = public.normalize_text_token(NEW.contact_phone)
        )
        OR (
          public.normalize_text_token(NEW.email) IS NOT NULL
          AND public.normalize_text_token(p.email) = public.normalize_text_token(NEW.email)
        )
      )
    LIMIT 1;

    IF v_conflict_patient_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate patient detected: matching name, DOB, gender, and contact details already exist for patient %', v_conflict_patient_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_patient_duplicate_guard ON public.patients;
CREATE TRIGGER trg_enforce_patient_duplicate_guard
BEFORE INSERT OR UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.enforce_patient_duplicate_guard();

CREATE INDEX IF NOT EXISTS idx_patients_duplicate_name_dob_phone
ON public.patients (
  lower(btrim(first_name)),
  lower(btrim(surname)),
  date_of_birth,
  gender,
  lower(btrim(contact_phone))
)
WHERE contact_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_duplicate_name_dob_email
ON public.patients (
  lower(btrim(first_name)),
  lower(btrim(surname)),
  date_of_birth,
  gender,
  lower(btrim(email))
)
WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_critical_lab_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_critical, false)
     AND lower(COALESCE(NEW.workflow_status, '')) IN ('approved', 'released')
     AND NEW.critical_notified_at IS NULL THEN
    RAISE EXCEPTION 'Critical lab results must include a notification timestamp before approval or release';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_critical_lab_escalation ON public.lab_results;
CREATE TRIGGER trg_enforce_critical_lab_escalation
BEFORE INSERT OR UPDATE ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.enforce_critical_lab_escalation();

DELETE FROM public.lab_critical_notifications lcn
WHERE EXISTS (
  SELECT 1
  FROM public.lab_critical_notifications newer
  WHERE newer.lab_result_id = lcn.lab_result_id
    AND (
      newer.created_at > lcn.created_at
      OR (newer.created_at = lcn.created_at AND newer.id > lcn.id)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_critical_notifications_result
ON public.lab_critical_notifications(lab_result_id);

CREATE OR REPLACE FUNCTION public.sync_lab_critical_notifications()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_patient_external_id text;
  v_notified_to uuid;
BEGIN
  IF NOT COALESCE(NEW.is_critical, false) OR NEW.critical_notified_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT lr.patient_id, lr.ordered_by
  INTO v_patient_external_id, v_notified_to
  FROM public.lab_requests lr
  WHERE lr.request_id = NEW.request_id;

  INSERT INTO public.lab_critical_notifications (
    lab_result_id,
    patient_id,
    critical_value,
    critical_type,
    notified_to,
    notification_method,
    notification_status,
    notified_at,
    notes
  )
  VALUES (
    NEW.id,
    v_patient_external_id,
    NEW.result_value,
    CASE WHEN NEW.is_abnormal THEN 'Critical Result' ELSE 'Critical Value' END,
    v_notified_to,
    'system',
    'Pending',
    NEW.critical_notified_at,
    COALESCE(NEW.comments, NEW.interpretation)
  )
  ON CONFLICT (lab_result_id)
  DO UPDATE SET
    patient_id = EXCLUDED.patient_id,
    critical_value = EXCLUDED.critical_value,
    critical_type = EXCLUDED.critical_type,
    notified_to = EXCLUDED.notified_to,
    notification_method = EXCLUDED.notification_method,
    notified_at = EXCLUDED.notified_at,
    notes = EXCLUDED.notes;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lab_critical_notifications ON public.lab_results;
CREATE TRIGGER trg_sync_lab_critical_notifications
AFTER INSERT OR UPDATE ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.sync_lab_critical_notifications();

COMMIT;
