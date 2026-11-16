-- Migration: make fulltext search cover all embedded modules via unified embedding table
-- Rationale:
-- - Previous fulltext RPC queried only a subset of source tables directly.
-- - This migration moves fulltext retrieval to patient_record_embeddings.chunk_text,
--   which includes all modules that are embedded by the sync pipeline.

BEGIN;

-- Fulltext index over embedding chunks for fast lexical retrieval.
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_text_fts
	ON public.patient_record_embeddings
	USING GIN (to_tsvector('english', coalesce(chunk_text, '')));

-- Replace fulltext function with unified-table version.
CREATE OR REPLACE FUNCTION public.search_patient_records_fulltext(
	p_patient_id uuid,
	p_query text,
	p_limit int DEFAULT 20
)
RETURNS TABLE (
	source_table text,
	source_id uuid,
	encounter_id uuid,
	record_date timestamptz,
	snippet text,
	rank real
) AS $$
DECLARE
	v_tsq tsquery;
BEGIN
	PERFORM verify_patient_access(p_patient_id);

	v_tsq := websearch_to_tsquery('english', p_query);

	RETURN QUERY
	WITH ranked_chunks AS (
		SELECT
			pre.source_table::text AS source_table,
			pre.source_id,
			pre.encounter_id,
			pre.record_date,
			ts_headline(
				'english',
				coalesce(pre.chunk_text, ''),
				v_tsq,
				'MaxWords=60, MinWords=20'
			) AS snippet,
			ts_rank_cd(
				to_tsvector('english', coalesce(pre.chunk_text, '')),
				v_tsq
			)::real AS rank
		FROM public.patient_record_embeddings pre
		WHERE pre.patient_id = p_patient_id
			AND to_tsvector('english', coalesce(pre.chunk_text, '')) @@ v_tsq
	),
	grouped AS (
		SELECT
			r.source_table,
			r.source_id,
			(array_agg(r.encounter_id ORDER BY r.rank DESC NULLS LAST, r.record_date DESC NULLS LAST))[1] AS encounter_id,
			max(r.record_date) AS record_date,
			max(r.rank) AS rank,
			string_agg(r.snippet, ' ... ' ORDER BY r.rank DESC) AS snippet
		FROM ranked_chunks r
		GROUP BY r.source_table, r.source_id
	)
	SELECT
		g.source_table,
		g.source_id,
		g.encounter_id,
		g.record_date,
		g.snippet,
		g.rank
	FROM grouped g
	ORDER BY g.rank DESC, g.record_date DESC NULLS LAST
	LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
