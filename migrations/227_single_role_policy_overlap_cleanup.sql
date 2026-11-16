-- =============================================================================
-- 227_single_role_policy_overlap_cleanup.sql
-- Resolves remaining role/action permissive policy overlaps reported by linter.
--
-- Strategy:
-- 1) For single-role permissive policies, drop broad ALL policies when the same
--    table+role already has action-specific permissive policies.
-- 2) For single-role action groups, drop auto-merged policies when authored
--    (non zz_merged_*) policies already exist for the same action.
-- 3) Consolidate remaining single-role action overlaps into one policy per
--    table+role+action by OR-merging expressions.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Remove broad ALL policy where action-specific policies already exist.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_pol RECORD;
BEGIN
  FOR v_pol IN
    SELECT p.schemaname, p.tablename, p.policyname
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.permissive = 'PERMISSIVE'
      AND p.cmd = 'ALL'
      AND cardinality(p.roles) = 1
      AND NOT ('service_role' = ANY(p.roles))
      AND EXISTS (
        SELECT 1
        FROM pg_policies q
        WHERE q.schemaname = p.schemaname
          AND q.tablename = p.tablename
          AND q.permissive = 'PERMISSIVE'
          AND q.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
          AND q.roles = p.roles
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      v_pol.policyname,
      v_pol.schemaname,
      v_pol.tablename
    );
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 2) Remove zz_merged action policy if authored action policy exists.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_pol RECORD;
BEGIN
  FOR v_pol IN
    SELECT p.schemaname, p.tablename, p.policyname
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.permissive = 'PERMISSIVE'
      AND p.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      AND p.policyname LIKE 'zz_merged_%'
      AND cardinality(p.roles) = 1
      AND NOT ('service_role' = ANY(p.roles))
      AND EXISTS (
        SELECT 1
        FROM pg_policies q
        WHERE q.schemaname = p.schemaname
          AND q.tablename = p.tablename
          AND q.permissive = 'PERMISSIVE'
          AND q.cmd = p.cmd
          AND q.roles = p.roles
          AND q.policyname NOT LIKE 'zz_merged_%'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      v_pol.policyname,
      v_pol.schemaname,
      v_pol.tablename
    );
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 3) Consolidate remaining single-role action overlaps.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_grp RECORD;
  v_old RECORD;
  v_role TEXT;
  v_role_sql TEXT;
  v_using_expr TEXT;
  v_check_expr TEXT;
  v_policy_name TEXT;
BEGIN
  FOR v_grp IN
    SELECT
      p.schemaname,
      p.tablename,
      p.roles[1] AS role_name,
      p.cmd,
      count(*) AS cnt
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.permissive = 'PERMISSIVE'
      AND p.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      AND cardinality(p.roles) = 1
      AND NOT ('service_role' = ANY(p.roles))
    GROUP BY p.schemaname, p.tablename, p.roles[1], p.cmd
    HAVING count(*) > 1
  LOOP
    v_role := v_grp.role_name;
    v_role_sql := CASE WHEN v_role = 'public' THEN 'PUBLIC' ELSE quote_ident(v_role) END;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_using_expr
    FROM (
      SELECT p.qual AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.cmd = v_grp.cmd
        AND p.roles = ARRAY[v_role]::name[]
        AND p.qual IS NOT NULL
    ) s;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_check_expr
    FROM (
      SELECT p.with_check AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.cmd = v_grp.cmd
        AND p.roles = ARRAY[v_role]::name[]
        AND p.with_check IS NOT NULL
    ) s;

    IF v_grp.cmd = 'UPDATE' AND (v_check_expr IS NULL OR btrim(v_check_expr) = '') THEN
      v_check_expr := COALESCE(v_using_expr, 'true');
    END IF;

    IF v_grp.cmd = 'INSERT' AND (v_check_expr IS NULL OR btrim(v_check_expr) = '') THEN
      v_check_expr := 'true';
    END IF;

    v_policy_name := substr(
      'zz_role_merged_' || lower(v_grp.cmd) || '_' || substr(md5(v_grp.tablename || '|' || v_role), 1, 16),
      1,
      63
    );

    FOR v_old IN
      SELECT p.policyname
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.cmd = v_grp.cmd
        AND p.roles = ARRAY[v_role]::name[]
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON %I.%I',
        v_old.policyname,
        v_grp.schemaname,
        v_grp.tablename
      );
    END LOOP;

    IF v_grp.cmd = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT TO %s USING (%s)',
        v_policy_name,
        v_grp.schemaname,
        v_grp.tablename,
        v_role_sql,
        COALESCE(v_using_expr, 'true')
      );
    ELSIF v_grp.cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT TO %s WITH CHECK (%s)',
        v_policy_name,
        v_grp.schemaname,
        v_grp.tablename,
        v_role_sql,
        COALESCE(v_check_expr, 'true')
      );
    ELSIF v_grp.cmd = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        v_policy_name,
        v_grp.schemaname,
        v_grp.tablename,
        v_role_sql,
        COALESCE(v_using_expr, 'true'),
        COALESCE(v_check_expr, 'true')
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR DELETE TO %s USING (%s)',
        v_policy_name,
        v_grp.schemaname,
        v_grp.tablename,
        v_role_sql,
        COALESCE(v_using_expr, 'true')
      );
    END IF;
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 4) Resolve action overlaps for a role even when policies are multi-role.
--    We detach the role from overlapping action policies, then create one
--    canonical role-specific action policy.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_grp RECORD;
  v_old RECORD;
  v_role_sql TEXT;
  v_roles_sql TEXT;
  v_using_expr TEXT;
  v_check_expr TEXT;
  v_policy_name TEXT;
BEGIN
  FOR v_grp IN
    WITH expanded AS (
      SELECT
        p.schemaname,
        p.tablename,
        p.policyname,
        p.cmd,
        p.roles,
        r::text AS role_name
      FROM pg_policies p
      CROSS JOIN LATERAL unnest(p.roles) AS r
      WHERE p.schemaname = 'public'
        AND p.permissive = 'PERMISSIVE'
        AND p.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        AND r::text <> 'service_role'
    )
    SELECT
      e.schemaname,
      e.tablename,
      e.role_name,
      e.cmd,
      count(*) AS cnt
    FROM expanded e
    GROUP BY e.schemaname, e.tablename, e.role_name, e.cmd
    HAVING count(*) > 1
  LOOP
    v_role_sql := CASE
      WHEN v_grp.role_name = 'public' THEN 'PUBLIC'
      ELSE quote_ident(v_grp.role_name)
    END;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_using_expr
    FROM (
      SELECT p.qual AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.cmd = v_grp.cmd
        AND v_grp.role_name::name = ANY(p.roles)
        AND p.qual IS NOT NULL
    ) s;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_check_expr
    FROM (
      SELECT p.with_check AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.cmd = v_grp.cmd
        AND v_grp.role_name::name = ANY(p.roles)
        AND p.with_check IS NOT NULL
    ) s;

    IF v_grp.cmd = 'UPDATE' AND (v_check_expr IS NULL OR btrim(v_check_expr) = '') THEN
      v_check_expr := COALESCE(v_using_expr, 'true');
    END IF;

    IF v_grp.cmd = 'INSERT' AND (v_check_expr IS NULL OR btrim(v_check_expr) = '') THEN
      v_check_expr := 'true';
    END IF;

    v_policy_name := substr(
      'zz_rolefix_' || lower(v_grp.cmd) || '_' || substr(md5(v_grp.tablename || '|' || v_grp.role_name), 1, 16),
      1,
      63
    );

    FOR v_old IN
      SELECT p.policyname, p.roles
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.cmd = v_grp.cmd
        AND v_grp.role_name::name = ANY(p.roles)
    LOOP
      SELECT string_agg(
        CASE
          WHEN r::text = 'public' THEN 'PUBLIC'
          ELSE quote_ident(r::text)
        END,
        ', '
        ORDER BY r::text
      )
      INTO v_roles_sql
      FROM unnest(v_old.roles) AS r
      WHERE r::text <> v_grp.role_name;

      IF v_roles_sql IS NULL OR v_roles_sql = '' THEN
        EXECUTE format(
          'DROP POLICY IF EXISTS %I ON %I.%I',
          v_old.policyname,
          v_grp.schemaname,
          v_grp.tablename
        );
      ELSE
        EXECUTE format(
          'ALTER POLICY %I ON %I.%I TO %s',
          v_old.policyname,
          v_grp.schemaname,
          v_grp.tablename,
          v_roles_sql
        );
      END IF;
    END LOOP;

    IF v_grp.cmd = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT TO %s USING (%s)',
        v_policy_name,
        v_grp.schemaname,
        v_grp.tablename,
        v_role_sql,
        COALESCE(v_using_expr, 'true')
      );
    ELSIF v_grp.cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT TO %s WITH CHECK (%s)',
        v_policy_name,
        v_grp.schemaname,
        v_grp.tablename,
        v_role_sql,
        COALESCE(v_check_expr, 'true')
      );
    ELSIF v_grp.cmd = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        v_policy_name,
        v_grp.schemaname,
        v_grp.tablename,
        v_role_sql,
        COALESCE(v_using_expr, 'true'),
        COALESCE(v_check_expr, 'true')
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR DELETE TO %s USING (%s)',
        v_policy_name,
        v_grp.schemaname,
        v_grp.tablename,
        v_role_sql,
        COALESCE(v_using_expr, 'true')
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;
