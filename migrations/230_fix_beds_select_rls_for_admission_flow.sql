-- =============================================================================
-- 230_fix_beds_select_rls_for_admission_flow.sql
-- Fix bed visibility in admission/clinical request flows.
--
-- Problem:
-- Existing beds SELECT policy can return empty rows for valid users when
-- facility linkage is missing/incomplete in staff or wards records.
--
-- Solution:
-- Recreate beds SELECT policy for authenticated users with:
-- - explicit clinical/admission role allow-list
-- - facility match when both sides are present
-- - safe fallback when facility_id is NULL on either side
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Users can view beds in their facility" ON public.beds;

CREATE POLICY "Users can view beds in their facility"
ON public.beds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff s
    LEFT JOIN public.wards w ON w.id = beds.ward_id
    WHERE s.user_id = auth.uid()
      AND s.role IN (
        'super_admin'::public.user_role,
        'admin'::public.user_role,
        'medical_director'::public.user_role,
        'doctor'::public.user_role,
        'nurse'::public.user_role
      )
      AND (
        s.facility_id IS NULL
        OR w.facility_id IS NULL
        OR w.facility_id = s.facility_id
      )
  )
);

COMMIT;
