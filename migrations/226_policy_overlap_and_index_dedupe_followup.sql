-- =============================================================================
-- 226_policy_overlap_and_index_dedupe_followup.sql
-- Follow-up remediation for linter warnings after prior migrations.
--
-- What this migration does:
-- 1) Re-consolidates overlapping permissive RLS policies in public schema
--    into one policy per action and role-set to reduce execution overhead.
-- 2) Drops structurally duplicate non-constraint indexes in public schema.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Consolidate overlapping permissive policies by table+roles into one
--    equivalent policy per action (SELECT/INSERT/UPDATE/DELETE).
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
-- 2) Drop structurally duplicate non-constraint indexes in public schema.
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
