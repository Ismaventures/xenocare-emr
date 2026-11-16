-- Fix RLS for physio_plan_extensions.
--
-- Migration 200 introduced physio_plan_extensions but did not add the
-- companion row-level security policies that the rest of the physiotherapy
-- tables already use. As a result, authenticated clinicians hit:
--   new row violates row-level security policy for table "physio_plan_extensions"
--
-- This migration aligns the table with the existing physiotherapy access model.
-- The hosted DB does not currently expose has_physiotherapy_access(), so the
-- role check is inlined against public.staff.

ALTER TABLE public.physio_plan_extensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS physio_plan_extensions_select_policy
  ON public.physio_plan_extensions;
CREATE POLICY physio_plan_extensions_select_policy
  ON public.physio_plan_extensions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff staff_member
      WHERE staff_member.user_id = auth.uid()
        AND staff_member.role::text IN (
          'physiotherapist',
          'doctor',
          'medical_director',
          'super_admin',
          'admin',
          'nurse'
        )
    )
  );

DROP POLICY IF EXISTS physio_plan_extensions_insert_policy
  ON public.physio_plan_extensions;
CREATE POLICY physio_plan_extensions_insert_policy
  ON public.physio_plan_extensions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff staff_member
      WHERE staff_member.user_id = auth.uid()
        AND staff_member.role::text IN (
          'physiotherapist',
          'doctor',
          'medical_director',
          'super_admin',
          'admin',
          'nurse'
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.physio_plans plan
      WHERE plan.plan_id = physio_plan_extensions.plan_id
    )
  );