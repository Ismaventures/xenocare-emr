-- =============================================================================
-- 221_security_linter_baseline_remediation.sql
-- Baseline remediation for Supabase security linter findings.
--
-- What this migration does:
-- 1) Enables RLS on public tables where it is currently disabled.
-- 2) If a table has no policies, creates temporary baseline policies for
--    authenticated + service_role to preserve current application behavior.
-- 3) Converts all public views to SECURITY INVOKER.
--
-- NOTE:
-- Baseline allow-all policies should be tightened to facility/role-scoped
-- policies in follow-up migrations for strict tenant isolation.
-- =============================================================================

DO $$
DECLARE
  v_table RECORD;
  v_auth_policy_name TEXT;
  v_service_policy_name TEXT;
BEGIN
  FOR v_table IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      v_table.schema_name,
      v_table.table_name
    );

    -- If policies already exist (e.g. visits, daily_progress_notes),
    -- only enabling RLS is needed.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = v_table.schema_name
        AND p.tablename = v_table.table_name
    ) THEN
      v_auth_policy_name := substr(v_table.table_name || '_authenticated_all', 1, 63);
      v_service_policy_name := substr(v_table.table_name || '_service_role_all', 1, 63);

      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        v_auth_policy_name,
        v_table.schema_name,
        v_table.table_name
      );

      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        v_service_policy_name,
        v_table.schema_name,
        v_table.table_name
      );
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  v_view RECORD;
BEGIN
  FOR v_view IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS view_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
  LOOP
    EXECUTE format(
      'ALTER VIEW %I.%I SET (security_invoker = true)',
      v_view.schema_name,
      v_view.view_name
    );
  END LOOP;
END
$$;
