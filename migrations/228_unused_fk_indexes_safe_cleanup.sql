-- =============================================================================
-- 228_unused_fk_indexes_safe_cleanup.sql
--
-- Purpose:
-- Reduce Supabase unused_index INFO noise safely by removing only auto-generated
-- FK helper indexes (`idx_fk_%`) that are both:
--   1) currently unused (idx_scan = 0), and
--   2) already covered by another valid btree index on the same table.
--
-- Safety rules:
-- - never drop PK/unique/constraint-backed indexes
-- - never drop partial/expression indexes unless the covering index has the same
--   predicate/expression definition
-- - only drop when another index has the same leading key columns (or a longer
--   key list with the same prefix)
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_idx RECORD;
BEGIN
  FOR v_idx IN
    WITH idx_meta AS (
      SELECT
        ns.nspname AS schemaname,
        tbl.relname AS tablename,
        idx.relname AS indexname,
        i.indexrelid,
        i.indrelid,
        i.indisunique,
        i.indisprimary,
        i.indisvalid,
        i.indisready,
        am.amname,
        pg_get_expr(i.indpred, i.indrelid) AS pred_expr,
        pg_get_expr(i.indexprs, i.indrelid) AS expr_expr,
        (
          SELECT string_agg((k.attnum)::text, ',' ORDER BY k.ord)
          FROM (
            SELECT (u.attnum)::int AS attnum, u.ord
            FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS u(attnum, ord)
            WHERE u.ord <= i.indnkeyatts
          ) AS k
        ) AS key_attnums,
        COALESCE(st.idx_scan, 0) AS idx_scan
      FROM pg_index i
      JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_class tbl ON tbl.oid = i.indrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      JOIN pg_am am ON am.oid = idx.relam
      LEFT JOIN pg_stat_user_indexes st ON st.indexrelid = i.indexrelid
      WHERE ns.nspname = 'public'
        AND idx.relname LIKE 'idx_fk_%'
    ),
    drop_candidates AS (
      SELECT c.*
      FROM idx_meta c
      WHERE c.indisvalid
        AND c.indisready
        AND NOT c.indisprimary
        AND NOT c.indisunique
        AND c.idx_scan = 0
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint con
          WHERE con.conindid = c.indexrelid
        )
        AND EXISTS (
          SELECT 1
          FROM idx_meta o
          WHERE o.indrelid = c.indrelid
            AND o.indexrelid <> c.indexrelid
            AND o.indisvalid
            AND o.indisready
            AND o.amname = 'btree'
            AND c.key_attnums IS NOT NULL
            AND (
              o.key_attnums = c.key_attnums
              OR o.key_attnums LIKE c.key_attnums || ',%'
            )
            AND o.pred_expr IS NOT DISTINCT FROM c.pred_expr
            AND o.expr_expr IS NOT DISTINCT FROM c.expr_expr
        )
    )
    SELECT schemaname, indexname
    FROM drop_candidates
    ORDER BY schemaname, tablename, indexname
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I.%I', v_idx.schemaname, v_idx.indexname);
    RAISE NOTICE 'Dropped redundant unused FK index: %.%', v_idx.schemaname, v_idx.indexname;
  END LOOP;
END
$$;

COMMIT;
