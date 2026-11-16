-- Migration: support semantic multi-chunk embeddings per source record
-- Keeps one unified embedding table while allowing source record chunking.

BEGIN;

ALTER TABLE IF EXISTS public.patient_record_embeddings
  ADD COLUMN IF NOT EXISTS chunk_index integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.patient_record_embeddings
  ADD COLUMN IF NOT EXISTS encounter_id uuid;

ALTER TABLE IF EXISTS public.patient_record_embeddings
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill safety for historic rows.
UPDATE public.patient_record_embeddings
SET chunk_index = 0
WHERE chunk_index IS NULL;

-- Replace one-row-per-source uniqueness with one-row-per-source-chunk.
DROP INDEX IF EXISTS idx_embeddings_unique_source;
CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_unique_source_chunk
  ON public.patient_record_embeddings(source_table, source_id, chunk_index);

-- Query performance for cross-module retrieval and date filtering.
CREATE INDEX IF NOT EXISTS idx_embeddings_patient_source_date
  ON public.patient_record_embeddings(patient_id, source_table, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_embeddings_record_date_desc
  ON public.patient_record_embeddings(record_date DESC);

COMMIT;
