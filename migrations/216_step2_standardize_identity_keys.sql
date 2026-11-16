-- ============================================================================
-- Migration: 216_step2_standardize_identity_keys.sql
-- Purpose:
--   Standardize identity references with UUID bridge columns while preserving
--   existing legacy TEXT/VARCHAR identifiers used by the application.
--
-- Notes:
--   - This is intentionally additive (no column drops/renames).
--   - Legacy columns remain available for backward compatibility.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Add UUID bridge columns where missing
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.radiology_requests
  ADD COLUMN IF NOT EXISTS patient_uuid uuid,
  ADD COLUMN IF NOT EXISTS visit_uuid uuid,
  ADD COLUMN IF NOT EXISTS ordered_by_uuid uuid,
  ADD COLUMN IF NOT EXISTS performed_by_uuid uuid;

-- ---------------------------------------------------------------------------
-- 2) Backfill UUID bridge columns from existing legacy IDs
-- ---------------------------------------------------------------------------
-- consultations
UPDATE public.consultations c
SET patient_uuid = p.id
FROM public.patients p
WHERE c.patient_uuid IS NULL
  AND c.patient_id IS NOT NULL
  AND p.patient_id = c.patient_id;

UPDATE public.consultations c
SET doctor_uuid = s.id
FROM public.staff s
WHERE c.doctor_uuid IS NULL
  AND c.doctor_id IS NOT NULL
  AND s.staff_id = c.doctor_id;

UPDATE public.consultations c
SET visit_uuid = v.id
FROM public.visits v
WHERE c.visit_uuid IS NULL
  AND c.visit_id IS NOT NULL
  AND v.visit_id = c.visit_id;

-- lab_requests
UPDATE public.lab_requests lr
SET patient_uuid = p.id
FROM public.patients p
WHERE lr.patient_uuid IS NULL
  AND lr.patient_id IS NOT NULL
  AND p.patient_id = lr.patient_id;

UPDATE public.lab_requests lr
SET ordered_by_uuid = s.id
FROM public.staff s
WHERE lr.ordered_by_uuid IS NULL
  AND lr.ordered_by IS NOT NULL
  AND s.staff_id = lr.ordered_by;

UPDATE public.lab_requests lr
SET visit_uuid = v.id
FROM public.visits v
WHERE lr.visit_uuid IS NULL
  AND lr.visit_id IS NOT NULL
  AND v.visit_id = lr.visit_id;

-- prescriptions
UPDATE public.prescriptions pr
SET patient_uuid = p.id
FROM public.patients p
WHERE pr.patient_uuid IS NULL
  AND pr.patient_id IS NOT NULL
  AND p.patient_id = pr.patient_id;

UPDATE public.prescriptions pr
SET doctor_uuid = s.id
FROM public.staff s
WHERE pr.doctor_uuid IS NULL
  AND pr.doctor_id IS NOT NULL
  AND s.staff_id = pr.doctor_id;

UPDATE public.prescriptions pr
SET visit_uuid = v.id
FROM public.visits v
WHERE pr.visit_uuid IS NULL
  AND pr.visit_id IS NOT NULL
  AND v.visit_id = pr.visit_id;

-- radiology_requests
UPDATE public.radiology_requests rr
SET ordered_by_uuid = s.id
FROM public.staff s
WHERE rr.ordered_by_uuid IS NULL
  AND rr.ordered_by IS NOT NULL
  AND s.staff_id = rr.ordered_by;

UPDATE public.radiology_requests rr
SET performed_by_uuid = s.id
FROM public.staff s
WHERE rr.performed_by_uuid IS NULL
  AND rr.performed_by IS NOT NULL
  AND s.staff_id = rr.performed_by;

UPDATE public.radiology_requests rr
SET patient_uuid = p.id
FROM public.patients p
WHERE rr.patient_uuid IS NULL
  AND rr.patient_id IS NOT NULL
  AND p.patient_id = rr.patient_id;

UPDATE public.radiology_requests rr
SET visit_uuid = v.id
FROM public.visits v
WHERE rr.visit_uuid IS NULL
  AND rr.visit_id IS NOT NULL
  AND v.visit_id = rr.visit_id;

-- ---------------------------------------------------------------------------
-- 3) Add FK constraints for new UUID bridges (NOT VALID first for safety)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'radiology_requests_ordered_by_uuid_fkey'
  ) THEN
    ALTER TABLE public.radiology_requests
      ADD CONSTRAINT radiology_requests_ordered_by_uuid_fkey
      FOREIGN KEY (ordered_by_uuid) REFERENCES public.staff(id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'radiology_requests_performed_by_uuid_fkey'
  ) THEN
    ALTER TABLE public.radiology_requests
      ADD CONSTRAINT radiology_requests_performed_by_uuid_fkey
      FOREIGN KEY (performed_by_uuid) REFERENCES public.staff(id) NOT VALID;
  END IF;
END
$$;

-- Validate after backfill.
ALTER TABLE public.radiology_requests VALIDATE CONSTRAINT radiology_requests_ordered_by_uuid_fkey;
ALTER TABLE public.radiology_requests VALIDATE CONSTRAINT radiology_requests_performed_by_uuid_fkey;

-- ---------------------------------------------------------------------------
-- 4) Performance indexes for UUID paths
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_consultations_patient_uuid ON public.consultations(patient_uuid);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_uuid ON public.consultations(doctor_uuid);
CREATE INDEX IF NOT EXISTS idx_consultations_visit_uuid ON public.consultations(visit_uuid);

CREATE INDEX IF NOT EXISTS idx_lab_requests_ordered_by_uuid ON public.lab_requests(ordered_by_uuid);
CREATE INDEX IF NOT EXISTS idx_lab_requests_visit_uuid ON public.lab_requests(visit_uuid);

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_uuid ON public.prescriptions(doctor_uuid);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit_uuid ON public.prescriptions(visit_uuid);

CREATE INDEX IF NOT EXISTS idx_radiology_requests_ordered_by_uuid ON public.radiology_requests(ordered_by_uuid);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_performed_by_uuid ON public.radiology_requests(performed_by_uuid);

COMMIT;

-- Rollback Guidance:
--   1) Drop indexes created above.
--   2) Drop constraints radiology_requests_ordered_by_uuid_fkey and
--      radiology_requests_performed_by_uuid_fkey.
--   3) Optionally drop bridge columns patient_uuid/visit_uuid/
--      ordered_by_uuid/performed_by_uuid.
--   No data-destructive operation is required for rollback.
