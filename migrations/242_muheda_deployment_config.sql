-- =============================================================================
-- Deployment configuration: MUHEDA CLINIC
--
-- This migration is deployment-specific. It keeps the application schema and
-- code paths generic while configuring this installation as MUHEDA CLINIC:
--   * Rebrands the existing/default facility row in place (preserves FKs).
--   * Introduces a configurable EMR/hospital-number prefix (MHC-000001).
--   * Adds structured patient allergy recording with facility-scoped RLS.
--
-- Existing patient numbers and records are never rewritten.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. MUHEDA CLINIC facility identity
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_facility_id uuid;
  v_muhc_id uuid;
BEGIN
  SELECT id INTO v_muhc_id
  FROM public.facilities
  WHERE code = 'MHC'
  LIMIT 1;

  IF v_muhc_id IS NOT NULL THEN
    v_facility_id := v_muhc_id;
  ELSE
    -- Rebrand the existing single/default facility in place to preserve all
    -- staff, patient and operational foreign keys.
    SELECT id INTO v_facility_id
    FROM public.facilities
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;
  END IF;

  IF v_facility_id IS NULL THEN
    INSERT INTO public.facilities (
      code, name, facility_type, address, city, state, country, is_active
    ) VALUES (
      'MHC', 'MUHEDA CLINIC', 'clinic',
      'Jos, Plateau State', NULL, NULL, 'Nigeria', true
    )
    RETURNING id INTO v_facility_id;
  ELSE
    UPDATE public.facilities
    SET
      code = 'MHC',
      name = 'MUHEDA CLINIC',
      facility_type = 'clinic',
      address = 'Jos, Plateau State',
      city = NULL,
      state = NULL,
      country = 'Nigeria',
      phone = NULL,
      email = NULL,
      website = NULL,
      nhis_provider_id = NULL,
      license_number = NULL,
      tax_id = NULL,
      is_active = true,
      updated_at = now()
    WHERE id = v_facility_id;
  END IF;

  UPDATE public.staff
  SET facility_id = v_facility_id
  WHERE facility_id IS NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Configurable hospital/EMR number prefix
--    Defaults remain NDC-#### for deployments that do not set the config.
-- ---------------------------------------------------------------------------
INSERT INTO public.config_categories (name, description, is_active)
VALUES (
  'Facility Settings',
  'Deployment-specific facility identity and numbering settings',
  true
)
ON CONFLICT DO NOTHING;

INSERT INTO public.system_configurations (
  key, value, description, category_id, is_system, data_type, is_active
)
VALUES (
  'facility.emr_prefix',
  'MHC',
  'Prefix used for newly generated hospital/EMR numbers (for example MHC-000001)',
  (SELECT id FROM public.config_categories WHERE name = 'Facility Settings' LIMIT 1),
  true,
  'string',
  true
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

INSERT INTO public.system_configurations (
  key, value, description, category_id, is_system, data_type, is_active
)
VALUES (
  'facility.emr_padding',
  '6',
  'Number of digits used for newly generated hospital/EMR numbers',
  (SELECT id FROM public.config_categories WHERE name = 'Facility Settings' LIMIT 1),
  true,
  'number',
  true
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

CREATE SEQUENCE IF NOT EXISTS public.facility_emr_number_seq START WITH 1;

-- Start after the highest number already issued for the configured prefix.
DO $$
DECLARE
  v_prefix text;
  v_max bigint;
BEGIN
  SELECT COALESCE(NULLIF(trim(value), ''), 'NDC')
  INTO v_prefix
  FROM public.system_configurations
  WHERE key = 'facility.emr_prefix' AND is_active = true
  LIMIT 1;

  v_prefix := upper(regexp_replace(COALESCE(v_prefix, 'NDC'), '[^A-Za-z0-9]', '', 'g'));

  SELECT COALESCE(MAX((regexp_match(emr_number, '^' || v_prefix || '-([0-9]+)$'))[1]::bigint), 0)
  INTO v_max
  FROM public.patients
  WHERE emr_number ~ ('^' || v_prefix || '-[0-9]+$');

  IF v_max = 0 THEN
    PERFORM setval('public.facility_emr_number_seq', 1, false);
  ELSE
    PERFORM setval('public.facility_emr_number_seq', v_max, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_emr_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_padding integer;
  v_candidate text;
  v_next bigint;
BEGIN
  IF NEW.emr_number IS NOT NULL AND trim(NEW.emr_number) <> '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(value), ''), 'NDC')
  INTO v_prefix
  FROM public.system_configurations
  WHERE key = 'facility.emr_prefix' AND is_active = true
  LIMIT 1;

  SELECT COALESCE(NULLIF(trim(value), '')::integer, 4)
  INTO v_padding
  FROM public.system_configurations
  WHERE key = 'facility.emr_padding' AND is_active = true
  LIMIT 1;

  v_prefix := upper(regexp_replace(COALESCE(v_prefix, 'NDC'), '[^A-Za-z0-9]', '', 'g'));
  IF v_prefix = '' THEN
    v_prefix := 'NDC';
  END IF;
  v_padding := GREATEST(COALESCE(v_padding, 4), 4);

  LOOP
    v_next := nextval('public.facility_emr_number_seq');
    v_candidate := v_prefix || '-' || lpad(v_next::text, v_padding, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.patients WHERE emr_number = v_candidate
    );
  END LOOP;

  NEW.emr_number := v_candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_emr_number ON public.patients;
CREATE TRIGGER trg_generate_emr_number
BEFORE INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.generate_emr_number();

-- ---------------------------------------------------------------------------
-- 2b. Preserve duplicate-patient enforcement without blocking unrelated
--     updates (for example, allergy-summary synchronization).
--     Duplicate checks still run on INSERT and when a duplicate-relevant
--     field changes.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. Structured patient allergies
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS no_known_allergies boolean NOT NULL DEFAULT false;
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS allergies_reviewed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.patient_allergies (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  allergen text NOT NULL,
  reaction text,
  severity text NOT NULL DEFAULT 'Moderate'
    CHECK (severity IN ('Mild', 'Moderate', 'Severe', 'Life-threatening')),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  recorded_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_allergies_unique_active
  ON public.patient_allergies (patient_id, lower(allergen))
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient
  ON public.patient_allergies (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_facility
  ON public.patient_allergies (facility_id);

CREATE OR REPLACE FUNCTION public.set_patient_allergy_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facility_id uuid;
BEGIN
  IF NEW.facility_id IS NULL THEN
    SELECT registered_facility_id INTO v_facility_id
    FROM public.patients
    WHERE id = NEW.patient_id;

    IF v_facility_id IS NULL THEN
      v_facility_id := public.get_user_facility_id();
    END IF;

    IF v_facility_id IS NULL THEN
      SELECT id INTO v_facility_id
      FROM public.facilities
      WHERE is_active = true
      ORDER BY created_at NULLS LAST, id
      LIMIT 1;
    END IF;

    NEW.facility_id := v_facility_id;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_allergy_metadata ON public.patient_allergies;
CREATE TRIGGER trg_patient_allergy_metadata
BEFORE INSERT OR UPDATE ON public.patient_allergies
FOR EACH ROW
EXECUTE FUNCTION public.set_patient_allergy_metadata();

-- Keep the legacy patients.known_allergies array in sync for existing
-- clinical-safety surfaces while structured details live in the new table.
CREATE OR REPLACE FUNCTION public.sync_patient_allergy_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
BEGIN
  v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);

  UPDATE public.patients
  SET
    known_allergies = COALESCE((
      SELECT array_agg(allergen ORDER BY allergen)
      FROM public.patient_allergies
      WHERE patient_id = v_patient_id AND is_active = true
    ), ARRAY[]::text[]),
    allergies_reviewed_at = now(),
    updated_at = now()
  WHERE id = v_patient_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_patient_allergy_summary ON public.patient_allergies;
CREATE TRIGGER trg_sync_patient_allergy_summary
AFTER INSERT OR UPDATE OR DELETE ON public.patient_allergies
FOR EACH ROW
EXECUTE FUNCTION public.sync_patient_allergy_summary();

-- Backfill legacy free-text allergies once, without duplicating rows.
INSERT INTO public.patient_allergies (
  patient_id, allergen, severity, notes
)
SELECT DISTINCT ON (p.id, lower(trim(existing_allergy.allergen_name)))
  p.id,
  trim(existing_allergy.allergen_name),
  'Moderate',
  'Imported from existing known_allergies record'
FROM public.patients p
CROSS JOIN LATERAL unnest(COALESCE(p.known_allergies, ARRAY[]::text[])) AS existing_allergy(allergen_name)
WHERE trim(existing_allergy.allergen_name) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.patient_allergies pa
    WHERE pa.patient_id = p.id
      AND lower(pa.allergen) = lower(trim(existing_allergy.allergen_name))
  )
ORDER BY p.id, lower(trim(existing_allergy.allergen_name));

-- ---------------------------------------------------------------------------
-- 4. RLS: clinical staff read/write within their facility; admins manage.
-- ---------------------------------------------------------------------------
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_allergies'
      AND policyname = 'patient_allergies_select_clinical'
  ) THEN
    CREATE POLICY patient_allergies_select_clinical
      ON public.patient_allergies
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.staff s
          WHERE s.user_id = auth.uid()
            AND s.role::text IN (
              'super_admin', 'admin', 'medical_director', 'doctor',
              'nurse', 'pharmacist', 'receptionist', 'customer_service'
            )
        )
        AND (
          facility_id IS NULL
          OR public.get_user_facility_id() IS NULL
          OR facility_id = public.get_user_facility_id()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_allergies'
      AND policyname = 'patient_allergies_insert_clinical'
  ) THEN
    CREATE POLICY patient_allergies_insert_clinical
      ON public.patient_allergies
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.staff s
          WHERE s.user_id = auth.uid()
            AND s.role::text IN (
              'super_admin', 'admin', 'medical_director', 'doctor',
              'nurse', 'receptionist'
            )
        )
        AND (
          facility_id IS NULL
          OR public.get_user_facility_id() IS NULL
          OR facility_id = public.get_user_facility_id()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_allergies'
      AND policyname = 'patient_allergies_update_clinical'
  ) THEN
    CREATE POLICY patient_allergies_update_clinical
      ON public.patient_allergies
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.staff s
          WHERE s.user_id = auth.uid()
            AND s.role::text IN (
              'super_admin', 'admin', 'medical_director', 'doctor',
              'nurse', 'receptionist'
            )
        )
        AND (
          facility_id IS NULL
          OR public.get_user_facility_id() IS NULL
          OR facility_id = public.get_user_facility_id()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.staff s
          WHERE s.user_id = auth.uid()
            AND s.role::text IN (
              'super_admin', 'admin', 'medical_director', 'doctor',
              'nurse', 'receptionist'
            )
        )
        AND (
          facility_id IS NULL
          OR public.get_user_facility_id() IS NULL
          OR facility_id = public.get_user_facility_id()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_allergies'
      AND policyname = 'patient_allergies_delete_admin'
  ) THEN
    CREATE POLICY patient_allergies_delete_admin
      ON public.patient_allergies
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.staff s
          WHERE s.user_id = auth.uid()
            AND s.role::text IN (
              'super_admin', 'admin', 'medical_director', 'doctor', 'nurse'
            )
        )
        AND (
          facility_id IS NULL
          OR public.get_user_facility_id() IS NULL
          OR facility_id = public.get_user_facility_id()
        )
      );
  END IF;
END $$;
