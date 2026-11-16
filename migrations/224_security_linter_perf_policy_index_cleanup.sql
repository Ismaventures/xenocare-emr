-- =============================================================================
-- 224_security_linter_perf_policy_index_cleanup.sql
-- Phase 3 performance-oriented linter remediation.
--
-- What this migration does:
-- 1) Rewrites RLS policy expressions to avoid per-row auth/current_setting calls
--    where possible (Supabase auth_rls_initplan guidance).
-- 2) Drops exact duplicate permissive RLS policies (same role/cmd/expressions).
-- 3) Drops structurally duplicate non-constraint indexes, keeping one canonical
--    index per equivalent definition.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Rewrite policy expressions to use init-plan-friendly auth/current_setting
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_pol RECORD;
  v_roles_sql TEXT;
  v_new_qual TEXT;
  v_new_with_check TEXT;
BEGIN
  FOR v_pol IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.roles,
      p.cmd,
      p.qual,
      p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
  LOOP
    v_new_qual := v_pol.qual;
    v_new_with_check := v_pol.with_check;

    IF v_new_qual IS NOT NULL THEN
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
    END IF;

    IF v_new_with_check IS NOT NULL THEN
      v_new_with_check := replace(v_new_with_check, 'auth.uid()', '(select auth.uid())');
      v_new_with_check := replace(v_new_with_check, 'auth.role()', '(select auth.role())');
      v_new_with_check := replace(v_new_with_check, 'auth.email()', '(select auth.email())');
      v_new_with_check := replace(v_new_with_check, 'auth.jwt()', '(select auth.jwt())');

      IF v_new_with_check ~* '\mcurrent_setting\s*\('
         AND v_new_with_check !~* '\(\s*select\s+current_setting\s*\('
      THEN
        v_new_with_check := regexp_replace(
          v_new_with_check,
          '\mcurrent_setting\s*\(([^)]*)\)',
          '(select current_setting(\1))',
          'gi'
        );
      END IF;
    END IF;

    -- Tighten unsafe write checks: if WITH CHECK is effectively true,
    -- reuse USING predicate when it is non-trivial.
    IF v_pol.cmd IN ('ALL', 'INSERT', 'UPDATE')
       AND v_new_with_check IS NOT NULL
       AND v_new_with_check ~* '^\s*\(?\s*true\s*\)?\s*$'
       AND v_new_qual IS NOT NULL
       AND btrim(v_new_qual) <> ''
       AND v_new_qual !~* '^\s*\(?\s*true\s*\)?\s*$'
    THEN
      v_new_with_check := v_new_qual;
    END IF;

    IF COALESCE(v_new_qual, '') = COALESCE(v_pol.qual, '')
       AND COALESCE(v_new_with_check, '') = COALESCE(v_pol.with_check, '')
    THEN
      CONTINUE;
    END IF;

    SELECT string_agg(
      CASE
        WHEN r = 'public' THEN 'PUBLIC'
        ELSE quote_ident(r)
      END,
      ', '
      ORDER BY r
    )
    INTO v_roles_sql
    FROM unnest(v_pol.roles) AS r;

    IF v_roles_sql IS NULL OR v_roles_sql = '' THEN
      v_roles_sql := 'PUBLIC';
    END IF;

    IF v_pol.cmd = 'SELECT' THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I TO %s USING (%s)',
        v_pol.policyname,
        v_pol.schemaname,
        v_pol.tablename,
        v_roles_sql,
        COALESCE(v_new_qual, 'true')
      );
    ELSIF v_pol.cmd = 'INSERT' THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I TO %s WITH CHECK (%s)',
        v_pol.policyname,
        v_pol.schemaname,
        v_pol.tablename,
        v_roles_sql,
        COALESCE(v_new_with_check, 'true')
      );
    ELSIF v_pol.cmd = 'DELETE' THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I TO %s USING (%s)',
        v_pol.policyname,
        v_pol.schemaname,
        v_pol.tablename,
        v_roles_sql,
        COALESCE(v_new_qual, 'true')
      );
    ELSE
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I TO %s USING (%s) WITH CHECK (%s)',
        v_pol.policyname,
        v_pol.schemaname,
        v_pol.tablename,
        v_roles_sql,
        COALESCE(v_new_qual, 'true'),
        COALESCE(v_new_with_check, 'true')
      );
    END IF;
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 2) Drop exact duplicate permissive policies (safe de-duplication)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_dup RECORD;
BEGIN
  FOR v_dup IN
    SELECT
      x.schemaname,
      x.tablename,
      x.policyname
    FROM (
      SELECT
        p.schemaname,
        p.tablename,
        p.policyname,
        row_number() OVER (
          PARTITION BY
            p.schemaname,
            p.tablename,
            p.permissive,
            p.cmd,
            p.roles,
            COALESCE(p.qual, ''),
            COALESCE(p.with_check, '')
          ORDER BY p.policyname
        ) AS rn
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.permissive = 'PERMISSIVE'
    ) AS x
    WHERE x.rn > 1
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      v_dup.policyname,
      v_dup.schemaname,
      v_dup.tablename
    );
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 2b) Consolidate overlapping permissive policies by table+roles into
--     one equivalent policy per action (SELECT/INSERT/UPDATE/DELETE).
--     This preserves OR semantics while removing linter duplicates.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_grp RECORD;
  v_old RECORD;
  v_roles_sql TEXT;
  v_role_key TEXT;
  v_any_select BOOLEAN;
  v_any_insert BOOLEAN;
  v_any_update BOOLEAN;
  v_any_delete BOOLEAN;
  v_select_using TEXT;
  v_insert_check TEXT;
  v_update_using TEXT;
  v_update_check TEXT;
  v_delete_using TEXT;
  v_policy_select TEXT;
  v_policy_insert TEXT;
  v_policy_update TEXT;
  v_policy_delete TEXT;
BEGIN
  FOR v_grp IN
    SELECT
      p.schemaname,
      p.tablename,
      p.roles,
      count(*) FILTER (WHERE p.cmd IN ('SELECT', 'ALL')) AS select_count,
      count(*) FILTER (WHERE p.cmd IN ('INSERT', 'ALL')) AS insert_count,
      count(*) FILTER (WHERE p.cmd IN ('UPDATE', 'ALL')) AS update_count,
      count(*) FILTER (WHERE p.cmd IN ('DELETE', 'ALL')) AS delete_count
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.permissive = 'PERMISSIVE'
      AND NOT ('service_role' = ANY(p.roles))
    GROUP BY p.schemaname, p.tablename, p.roles
    HAVING count(*) FILTER (WHERE p.cmd IN ('SELECT', 'ALL')) > 1
        OR count(*) FILTER (WHERE p.cmd IN ('INSERT', 'ALL')) > 1
        OR count(*) FILTER (WHERE p.cmd IN ('UPDATE', 'ALL')) > 1
        OR count(*) FILTER (WHERE p.cmd IN ('DELETE', 'ALL')) > 1
  LOOP
    SELECT string_agg(
      CASE
        WHEN r = 'public' THEN 'PUBLIC'
        ELSE quote_ident(r)
      END,
      ', '
      ORDER BY r
    )
    INTO v_roles_sql
    FROM unnest(v_grp.roles) AS r;

    IF v_roles_sql IS NULL OR v_roles_sql = '' THEN
      v_roles_sql := 'PUBLIC';
    END IF;

    v_role_key := array_to_string(v_grp.roles::text[], ',');
    v_policy_select := substr('zz_merged_select_' || substr(md5(v_grp.tablename || '|' || v_role_key), 1, 16), 1, 63);
    v_policy_insert := substr('zz_merged_insert_' || substr(md5(v_grp.tablename || '|' || v_role_key), 1, 16), 1, 63);
    v_policy_update := substr('zz_merged_update_' || substr(md5(v_grp.tablename || '|' || v_role_key), 1, 16), 1, 63);
    v_policy_delete := substr('zz_merged_delete_' || substr(md5(v_grp.tablename || '|' || v_role_key), 1, 16), 1, 63);

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('SELECT', 'ALL')
    ) INTO v_any_select;

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('INSERT', 'ALL')
    ) INTO v_any_insert;

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('UPDATE', 'ALL')
    ) INTO v_any_update;

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('DELETE', 'ALL')
    ) INTO v_any_delete;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_select_using
    FROM (
      SELECT p.qual AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('SELECT', 'ALL')
        AND p.qual IS NOT NULL
    ) s;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_insert_check
    FROM (
      SELECT p.with_check AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('INSERT', 'ALL')
        AND p.with_check IS NOT NULL
    ) s;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_update_using
    FROM (
      SELECT p.qual AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('UPDATE', 'ALL')
        AND p.qual IS NOT NULL
    ) s;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_update_check
    FROM (
      SELECT p.with_check AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('UPDATE', 'ALL')
        AND p.with_check IS NOT NULL
    ) s;

    SELECT string_agg('(' || q || ')', ' OR ')
    INTO v_delete_using
    FROM (
      SELECT p.qual AS q
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
        AND p.cmd IN ('DELETE', 'ALL')
        AND p.qual IS NOT NULL
    ) s;

    IF v_update_check IS NULL OR btrim(v_update_check) = '' THEN
      v_update_check := COALESCE(v_update_using, 'true');
    END IF;

    IF v_insert_check IS NULL OR btrim(v_insert_check) = '' THEN
      v_insert_check := 'true';
    END IF;

    -- Drop old permissive policies for this table+roles, then recreate canonical set.
    FOR v_old IN
      SELECT p.policyname
      FROM pg_policies p
      WHERE p.schemaname = v_grp.schemaname
        AND p.tablename = v_grp.tablename
        AND p.permissive = 'PERMISSIVE'
        AND p.roles = v_grp.roles
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON %I.%I',
        v_old.policyname,
        v_grp.schemaname,
        v_grp.tablename
      );
    END LOOP;

    IF v_any_select THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT TO %s USING (%s)',
        v_policy_select,
        v_grp.schemaname,
        v_grp.tablename,
        v_roles_sql,
        COALESCE(v_select_using, 'true')
      );
    END IF;

    IF v_any_insert THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT TO %s WITH CHECK (%s)',
        v_policy_insert,
        v_grp.schemaname,
        v_grp.tablename,
        v_roles_sql,
        COALESCE(v_insert_check, 'true')
      );
    END IF;

    IF v_any_update THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        v_policy_update,
        v_grp.schemaname,
        v_grp.tablename,
        v_roles_sql,
        COALESCE(v_update_using, 'true'),
        COALESCE(v_update_check, 'true')
      );
    END IF;

    IF v_any_delete THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR DELETE TO %s USING (%s)',
        v_policy_delete,
        v_grp.schemaname,
        v_grp.tablename,
        v_roles_sql,
        COALESCE(v_delete_using, 'true')
      );
    END IF;
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 3) Drop structurally duplicate non-constraint indexes in public schema
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_idx RECORD;
BEGIN
  FOR v_idx IN
    WITH indexed AS (
      SELECT
        ns.nspname AS schemaname,
        tbl.relname AS tablename,
        idx.relname AS indexname,
        idx.oid AS index_oid,
        i.indisunique,
        i.indisprimary,
        i.indkey,
        i.indclass,
        i.indcollation,
        i.indoption,
        COALESCE(pg_get_expr(i.indexprs, i.indrelid), '') AS indexprs,
        COALESCE(pg_get_expr(i.indpred, i.indrelid), '') AS indpred,
        row_number() OVER (
          PARTITION BY
            i.indrelid,
            i.indisunique,
            i.indisprimary,
            i.indkey,
            i.indclass,
            i.indcollation,
            i.indoption,
            COALESCE(pg_get_expr(i.indexprs, i.indrelid), ''),
            COALESCE(pg_get_expr(i.indpred, i.indrelid), '')
          ORDER BY idx.relname
        ) AS rn
      FROM pg_index i
      JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_class tbl ON tbl.oid = i.indrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      WHERE ns.nspname = 'public'
        AND NOT i.indisprimary
    )
    SELECT
      ix.schemaname,
      ix.indexname,
      ix.index_oid
    FROM indexed ix
    WHERE ix.rn > 1
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conindid = ix.index_oid
      )
  LOOP
    EXECUTE format(
      'DROP INDEX IF EXISTS %I.%I',
      v_idx.schemaname,
      v_idx.indexname
    );
  END LOOP;
END
$$;

COMMIT;
