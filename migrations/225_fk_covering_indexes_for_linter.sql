-- =============================================================================
-- 225_fk_covering_indexes_for_linter.sql
-- Adds covering indexes for foreign keys in public schema where missing.
--
-- Why: Supabase linter `unindexed_foreign_keys` flags FKs without a covering
-- index. This migration creates only missing indexes and skips FKs already
-- covered by an index whose leading key columns match the FK column order.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_fk RECORD;
  v_idx_name TEXT;
  v_col_list TEXT;
BEGIN
  FOR v_fk IN
    WITH fk_raw AS (
      SELECT
        c.oid AS constraint_oid,
        c.conname AS constraint_name,
        ns.nspname AS schemaname,
        rel.relname AS tablename,
        c.conrelid,
        c.conkey,
        array_length(c.conkey, 1) AS key_len,
        string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord) AS column_list
      FROM pg_constraint c
      JOIN pg_class rel
        ON rel.oid = c.conrelid
      JOIN pg_namespace ns
        ON ns.oid = rel.relnamespace
      JOIN unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
        ON true
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum = u.attnum
      WHERE c.contype = 'f'
        AND ns.nspname = 'public'
      GROUP BY
        c.oid,
        c.conname,
        ns.nspname,
        rel.relname,
        c.conrelid,
        c.conkey
    ),
    fk AS (
      SELECT
        f.*,
        row_number() OVER (
          PARTITION BY f.conrelid, f.conkey
          ORDER BY f.constraint_name
        ) AS rn
      FROM fk_raw f
    )
    SELECT
      fk.*
    FROM fk
    WHERE fk.rn = 1
      AND NOT EXISTS (
      SELECT 1
      FROM pg_index i
      WHERE i.indrelid = fk.conrelid
        AND i.indisvalid
        AND i.indpred IS NULL
        AND i.indexprs IS NULL
        AND i.indnkeyatts >= fk.key_len
        AND (
          SELECT array_agg(k::int ORDER BY ord)
          FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS t(k, ord)
          WHERE ord <= fk.key_len
        ) = (
          SELECT array_agg(k::int ORDER BY ord)
          FROM unnest(fk.conkey) WITH ORDINALITY AS t(k, ord)
        )
    )
  LOOP
    v_col_list := v_fk.column_list;

    v_idx_name := substr(
      format(
        'idx_fk_%s_%s',
        regexp_replace(v_fk.tablename, '[^a-zA-Z0-9_]+', '_', 'g'),
        substr(md5(v_fk.tablename || ':' || v_col_list), 1, 12)
      ),
      1,
      63
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)',
      v_idx_name,
      v_fk.schemaname,
      v_fk.tablename,
      v_col_list
    );
  END LOOP;
END
$$;

COMMIT;
