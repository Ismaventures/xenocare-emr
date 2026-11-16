-- =============================================================================
-- Migration 204: Fix is_encounter_nhis() COALESCE type mismatch
--
-- Bug: COALESCE(insurance_type, payment_category) fails because
--      insurance_type is VARCHAR and payment_category is payment_method enum.
--      PostgreSQL error 42804: "COALESCE types character varying and
--      payment_method cannot be matched"
--
-- Fix: Cast payment_category to TEXT so COALESCE can resolve both args.
--
-- This was breaking ALL inserts into eye_exams (and any table with the
-- trg_*_nhis_status BEFORE INSERT trigger that calls
-- set_specialty_nhis_approval_status → is_encounter_nhis).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_encounter_nhis(p_encounter_id uuid)
RETURNS boolean AS $$
DECLARE
  v_insurance_type text;
BEGIN
  SELECT COALESCE(insurance_type, payment_category::text) INTO v_insurance_type
  FROM public.visits
  WHERE id = p_encounter_id;

  RETURN v_insurance_type IS NOT NULL AND UPPER(v_insurance_type) LIKE '%NHIS%';
END;
$$ LANGUAGE plpgsql STABLE;
