-- =============================================================================
-- Fix: Do not run duplicate-patient checks for unrelated patient updates
--
-- The allergy-summary trigger updates patients.known_allergies. Previously
-- that update re-ran enforce_patient_duplicate_guard() even though no
-- duplicate-relevant field had changed, blocking the allergy backfill on
-- installations that already contain legacy duplicate service numbers.
--
-- Duplicate checks still run on INSERT and whenever a duplicate-relevant
-- field changes.
-- =============================================================================

DO $$
BEGIN
  IF to_regprocedure('public.enforce_patient_duplicate_guard()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_enforce_patient_duplicate_guard ON public.patients;
    DROP TRIGGER IF EXISTS trg_enforce_patient_duplicate_guard_insert ON public.patients;
    DROP TRIGGER IF EXISTS trg_enforce_patient_duplicate_guard_update ON public.patients;

    CREATE TRIGGER trg_enforce_patient_duplicate_guard_insert
    BEFORE INSERT ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_patient_duplicate_guard();

    CREATE TRIGGER trg_enforce_patient_duplicate_guard_update
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    WHEN (
      NEW.nhis_number IS DISTINCT FROM OLD.nhis_number
      OR NEW.national_id IS DISTINCT FROM OLD.national_id
      OR NEW.service_number IS DISTINCT FROM OLD.service_number
      OR NEW.first_name IS DISTINCT FROM OLD.first_name
      OR NEW.surname IS DISTINCT FROM OLD.surname
      OR NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth
      OR NEW.gender IS DISTINCT FROM OLD.gender
      OR NEW.contact_phone IS DISTINCT FROM OLD.contact_phone
      OR NEW.email IS DISTINCT FROM OLD.email
    )
    EXECUTE FUNCTION public.enforce_patient_duplicate_guard();
  END IF;
END $$;
