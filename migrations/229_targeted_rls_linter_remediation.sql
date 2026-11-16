-- =============================================================================
-- 229_targeted_rls_linter_remediation.sql
-- Targeted fixes for Supabase linter warnings:
-- - auth_rls_initplan (nursing_notes select policy)
-- - multiple_permissive_policies overlaps on beds/clinics/vitals
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) auth_rls_initplan: Rewrite auth/current_setting calls in
--    public.nursing_notes policy nursing_notes_select_authenticated
--    to use init-plan-friendly subselect form.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_pol RECORD;
  v_roles_sql TEXT;
  v_new_qual TEXT;
BEGIN
  SELECT
    p.schemaname,
    p.tablename,
    p.policyname,
    p.roles,
    p.qual
  INTO v_pol
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'nursing_notes'
    AND p.policyname = 'nursing_notes_select_authenticated'
    AND p.cmd = 'SELECT'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_new_qual := v_pol.qual;

  IF v_new_qual IS NULL OR btrim(v_new_qual) = '' THEN
    RETURN;
  END IF;

  v_new_qual := replace(v_new_qual, 'auth.uid()', '(select auth.uid())');
  v_new_qual := replace(v_new_qual, 'auth.role()', '(select auth.role())');
  v_new_qual := replace(v_new_qual, 'auth.email()', '(select auth.email())');
  v_new_qual := replace(v_new_qual, 'auth.jwt()', '(select auth.jwt())');

  IF v_new_qual ~* '\mcurrent_setting\s*\('
     AND v_new_qual !~* '\(\s*select\s+current_setting\s*\('
  THEN
    v_new_qual := regexp_replace(
      v_new_qual,
      '\mcurrent_setting\s*\(([^)]*)\)',
      '(select current_setting(\1))',
      'gi'
    );
  END IF;

  IF COALESCE(v_new_qual, '') = COALESCE(v_pol.qual, '') THEN
    RETURN;
  END IF;

  SELECT string_agg(
    CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END,
    ', '
    ORDER BY r
  )
  INTO v_roles_sql
  FROM unnest(v_pol.roles) AS r;

  IF v_roles_sql IS NULL OR v_roles_sql = '' THEN
    v_roles_sql := 'PUBLIC';
  END IF;

  EXECUTE format(
    'ALTER POLICY %I ON %I.%I TO %s USING (%s)',
    v_pol.policyname,
    v_pol.schemaname,
    v_pol.tablename,
    v_roles_sql,
    COALESCE(v_new_qual, 'true')
  );
END
$$;

-- -----------------------------------------------------------------------------
-- 2) multiple_permissive_policies: remove known redundant auto-merged policies
--    where authored policies already exist for the same role/action.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS zz_merged_select_b6d6cc26d61dc567 ON public.beds;
DROP POLICY IF EXISTS zz_merged_update_0fe98fbdcdfc9f31 ON public.vitals;

-- -----------------------------------------------------------------------------
-- 3) multiple_permissive_policies: clinics has overlap between broad
--    "Allow all access" and authenticated action policies.
--    Drop the broad policy when role-scoped clinics policies are present.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinics'
      AND policyname = 'Allow all access'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinics'
      AND policyname IN (
        'clinics_select_authenticated',
        'clinics_select_all',
        'clinics_update_super_admin'
      )
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.clinics';
  END IF;
END
$$;

COMMIT;
