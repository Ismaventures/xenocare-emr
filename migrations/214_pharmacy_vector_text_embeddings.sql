-- ============================================================================
-- Migration: 214_pharmacy_vector_text_embeddings.sql
-- Purpose:
--   Add pharmacy vector + full-text search schema parity with patient records.
--   Supports global pharmacy queries and optional single-patient narrowing.
-- ============================================================================

BEGIN;

-- Ensure pgvector is available for embedding storage/search.
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- 1) Guardrail columns and full-text columns (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.prescriptions
  ADD COLUMN IF NOT EXISTS clinical_notes text,
  ADD COLUMN IF NOT EXISTS nhis_approval_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS billing_release_status text DEFAULT 'blocked',
  ADD COLUMN IF NOT EXISTS execution_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS search_document tsvector;

ALTER TABLE IF EXISTS public.dispense_records
  ADD COLUMN IF NOT EXISTS search_document tsvector;

ALTER TABLE IF EXISTS public.inventory_stock_movements
  ADD COLUMN IF NOT EXISTS search_document tsvector;

ALTER TABLE IF EXISTS public.drug_catalogue
  ADD COLUMN IF NOT EXISTS search_document tsvector;

ALTER TABLE IF EXISTS public.drug_batches
  ADD COLUMN IF NOT EXISTS search_document tsvector;

-- ---------------------------------------------------------------------------
-- 2) Backfill search_document fields
-- ---------------------------------------------------------------------------
UPDATE public.prescriptions
SET search_document = to_tsvector(
  'english',
  coalesce(drug_name, '') || ' ' ||
  coalesce(dosage, '') || ' ' ||
  coalesce(frequency, '') || ' ' ||
  coalesce(route, '') || ' ' ||
  coalesce(duration, '') || ' ' ||
  coalesce(instructions, '') || ' ' ||
  coalesce(notes, '') || ' ' ||
  coalesce(clinical_notes, '') || ' ' ||
  coalesce(status::text, '') || ' ' ||
  coalesce(nhis_approval_status::text, '') || ' ' ||
  coalesce(billing_release_status::text, '') || ' ' ||
  coalesce(execution_status::text, '')
);

UPDATE public.dispense_records
SET search_document = to_tsvector(
  'english',
  coalesce(status, '') || ' ' ||
  coalesce(substitution_reason, '') || ' ' ||
  coalesce(notes, '') || ' ' ||
  coalesce(batch_id::text, '') || ' ' ||
  coalesce(prescription_id::text, '')
);

UPDATE public.inventory_stock_movements
SET search_document = to_tsvector(
  'english',
  coalesce(movement_type, '') || ' ' ||
  coalesce(reference_number, '') || ' ' ||
  coalesce(reason, '') || ' ' ||
  coalesce(notes, '') || ' ' ||
  coalesce(drug_id::text, '') || ' ' ||
  coalesce(batch_id::text, '')
);

UPDATE public.drug_catalogue
SET search_document = to_tsvector(
  'english',
  coalesce(name, '') || ' ' ||
  coalesce(code, '') || ' ' ||
  coalesce(brand_name, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(dosage_form, '') || ' ' ||
  coalesce(strengths, '') || ' ' ||
  coalesce(presentation, '') || ' ' ||
  coalesce(category::text, '') || ' ' ||
  coalesce(drug_type, '') || ' ' ||
  coalesce(manufacturer, '')
);

UPDATE public.drug_batches
SET search_document = to_tsvector(
  'english',
  coalesce(batch_number, '') || ' ' ||
  coalesce(status, '') || ' ' ||
  coalesce(supplier_name, '') || ' ' ||
  coalesce(notes, '') || ' ' ||
  coalesce(drug_id::text, '')
);

-- ---------------------------------------------------------------------------
-- 3) GIN indexes for full-text search
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_prescriptions_fts
  ON public.prescriptions USING GIN(search_document);

CREATE INDEX IF NOT EXISTS idx_dispense_records_fts
  ON public.dispense_records USING GIN(search_document);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_fts
  ON public.inventory_stock_movements USING GIN(search_document);

CREATE INDEX IF NOT EXISTS idx_drug_catalogue_fts
  ON public.drug_catalogue USING GIN(search_document);

CREATE INDEX IF NOT EXISTS idx_drug_batches_fts
  ON public.drug_batches USING GIN(search_document);

-- ---------------------------------------------------------------------------
-- 4) Trigger functions to keep search_document up to date
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_prescriptions_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector(
    'english',
    coalesce(NEW.drug_name, '') || ' ' ||
    coalesce(NEW.dosage, '') || ' ' ||
    coalesce(NEW.frequency, '') || ' ' ||
    coalesce(NEW.route, '') || ' ' ||
    coalesce(NEW.duration, '') || ' ' ||
    coalesce(NEW.instructions, '') || ' ' ||
    coalesce(NEW.notes, '') || ' ' ||
    coalesce(NEW.clinical_notes, '') || ' ' ||
    coalesce(NEW.status::text, '') || ' ' ||
    coalesce(NEW.nhis_approval_status::text, '') || ' ' ||
    coalesce(NEW.billing_release_status::text, '') || ' ' ||
    coalesce(NEW.execution_status::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_dispense_records_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector(
    'english',
    coalesce(NEW.status, '') || ' ' ||
    coalesce(NEW.substitution_reason, '') || ' ' ||
    coalesce(NEW.notes, '') || ' ' ||
    coalesce(NEW.batch_id::text, '') || ' ' ||
    coalesce(NEW.prescription_id::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_inventory_movements_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector(
    'english',
    coalesce(NEW.movement_type, '') || ' ' ||
    coalesce(NEW.reference_number, '') || ' ' ||
    coalesce(NEW.reason, '') || ' ' ||
    coalesce(NEW.notes, '') || ' ' ||
    coalesce(NEW.drug_id::text, '') || ' ' ||
    coalesce(NEW.batch_id::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_drug_catalogue_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector(
    'english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.code, '') || ' ' ||
    coalesce(NEW.brand_name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.dosage_form, '') || ' ' ||
    coalesce(NEW.strengths, '') || ' ' ||
    coalesce(NEW.presentation, '') || ' ' ||
    coalesce(NEW.category::text, '') || ' ' ||
    coalesce(NEW.drug_type, '') || ' ' ||
    coalesce(NEW.manufacturer, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_drug_batches_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector(
    'english',
    coalesce(NEW.batch_number, '') || ' ' ||
    coalesce(NEW.status, '') || ' ' ||
    coalesce(NEW.supplier_name, '') || ' ' ||
    coalesce(NEW.notes, '') || ' ' ||
    coalesce(NEW.drug_id::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prescriptions_fts ON public.prescriptions;
CREATE TRIGGER trg_prescriptions_fts
  BEFORE INSERT OR UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_prescriptions_search_doc();

DROP TRIGGER IF EXISTS trg_dispense_records_fts ON public.dispense_records;
CREATE TRIGGER trg_dispense_records_fts
  BEFORE INSERT OR UPDATE ON public.dispense_records
  FOR EACH ROW EXECUTE FUNCTION public.update_dispense_records_search_doc();

DROP TRIGGER IF EXISTS trg_inventory_movements_fts ON public.inventory_stock_movements;
CREATE TRIGGER trg_inventory_movements_fts
  BEFORE INSERT OR UPDATE ON public.inventory_stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_movements_search_doc();

DROP TRIGGER IF EXISTS trg_drug_catalogue_fts ON public.drug_catalogue;
CREATE TRIGGER trg_drug_catalogue_fts
  BEFORE INSERT OR UPDATE ON public.drug_catalogue
  FOR EACH ROW EXECUTE FUNCTION public.update_drug_catalogue_search_doc();

DROP TRIGGER IF EXISTS trg_drug_batches_fts ON public.drug_batches;
CREATE TRIGGER trg_drug_batches_fts
  BEFORE INSERT OR UPDATE ON public.drug_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_drug_batches_search_doc();

-- ---------------------------------------------------------------------------
-- 5) Pharmacy embeddings table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pharmacy_record_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Optional for global entries, populated for patient-linked records.
  patient_id varchar(50),

  source_table varchar(50) NOT NULL,
  source_id uuid NOT NULL,
  encounter_id uuid,

  chunk_text text NOT NULL,
  chunk_type varchar(40) NOT NULL,
  embedding vector(768) NOT NULL,

  record_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_embeddings_hnsw
  ON public.pharmacy_record_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_pharmacy_embeddings_patient
  ON public.pharmacy_record_embeddings(patient_id);

CREATE INDEX IF NOT EXISTS idx_pharmacy_embeddings_source
  ON public.pharmacy_record_embeddings(source_table, source_id);

CREATE INDEX IF NOT EXISTS idx_pharmacy_embeddings_date
  ON public.pharmacy_record_embeddings(record_date DESC);

CREATE INDEX IF NOT EXISTS idx_pharmacy_embeddings_chunk_type
  ON public.pharmacy_record_embeddings(chunk_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pharmacy_embeddings_unique_source
  ON public.pharmacy_record_embeddings(source_table, source_id);

-- ---------------------------------------------------------------------------
-- 6) Patient filter helper (supports uuid or string patient identifiers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pharmacy_patient_filter_match(
  p_row_patient_id text,
  p_filter_patient_id text
)
RETURNS boolean AS $$
BEGIN
  IF p_filter_patient_id IS NULL OR btrim(p_filter_patient_id) = '' THEN
    RETURN true;
  END IF;

  IF p_row_patient_id IS NULL OR btrim(p_row_patient_id) = '' THEN
    RETURN false;
  END IF;

  IF p_row_patient_id = p_filter_patient_id THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE (p.id::text = p_filter_patient_id OR p.patient_id = p_filter_patient_id)
      AND (p.id::text = p_row_patient_id OR p.patient_id = p_row_patient_id)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- 7) Pharmacy fulltext/vector/hybrid search RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_pharmacy_records_fulltext(
  p_query text,
  p_patient_id text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  patient_id text,
  encounter_id uuid,
  record_date timestamptz,
  snippet text,
  rank real
) AS $$
DECLARE
  v_tsq tsquery;
BEGIN
  IF coalesce(btrim(p_query), '') = '' THEN
    RETURN;
  END IF;

  v_tsq := websearch_to_tsquery('english', p_query);

  RETURN QUERY
  SELECT r.source_table,
         r.source_id,
         r.patient_id,
         r.encounter_id,
         r.record_date,
         r.snippet,
         r.rank
  FROM (
    SELECT
      'prescriptions'::text AS source_table,
      p.prescription_id AS source_id,
      p.patient_id::text AS patient_id,
      p.encounter_id,
      p.created_at AS record_date,
      ts_headline(
        'english',
        coalesce(p.drug_name, '') || ' ' ||
        coalesce(p.dosage, '') || ' ' ||
        coalesce(p.frequency, '') || ' ' ||
        coalesce(p.route, '') || ' ' ||
        coalesce(p.duration, '') || ' ' ||
        coalesce(p.instructions, '') || ' ' ||
        coalesce(p.notes, '') || ' ' ||
        coalesce(p.clinical_notes, '') || ' ' ||
        coalesce(p.status::text, '') || ' ' ||
        coalesce(p.nhis_approval_status::text, '') || ' ' ||
        coalesce(p.billing_release_status::text, '') || ' ' ||
        coalesce(p.execution_status::text, ''),
        v_tsq,
        'MaxWords=60, MinWords=20'
      ) AS snippet,
      ts_rank(p.search_document, v_tsq) AS rank
    FROM public.prescriptions p
    WHERE p.search_document @@ v_tsq
      AND public.pharmacy_patient_filter_match(p.patient_id::text, p_patient_id)

    UNION ALL

    SELECT
      'dispense_records'::text,
      d.dispense_id,
      d.patient_id::text,
      d.encounter_id,
      d.dispensed_at,
      ts_headline(
        'english',
        coalesce(d.status, '') || ' ' ||
        coalesce(d.substitution_reason, '') || ' ' ||
        coalesce(d.notes, '') || ' ' ||
        coalesce(d.batch_id::text, '') || ' ' ||
        coalesce(d.prescription_id::text, ''),
        v_tsq,
        'MaxWords=60, MinWords=20'
      ),
      ts_rank(d.search_document, v_tsq)
    FROM public.dispense_records d
    WHERE d.search_document @@ v_tsq
      AND public.pharmacy_patient_filter_match(d.patient_id::text, p_patient_id)

    UNION ALL

    SELECT
      'inventory_stock_movements'::text,
      m.movement_id,
      m.patient_id::text,
      m.encounter_id,
      m.created_at,
      ts_headline(
        'english',
        coalesce(m.movement_type, '') || ' ' ||
        coalesce(m.reference_number, '') || ' ' ||
        coalesce(m.reason, '') || ' ' ||
        coalesce(m.notes, '') || ' ' ||
        coalesce(m.drug_id::text, '') || ' ' ||
        coalesce(m.batch_id::text, ''),
        v_tsq,
        'MaxWords=60, MinWords=20'
      ),
      ts_rank(m.search_document, v_tsq)
    FROM public.inventory_stock_movements m
    WHERE m.search_document @@ v_tsq
      AND public.pharmacy_patient_filter_match(m.patient_id::text, p_patient_id)

    UNION ALL

    SELECT
      'drug_catalogue'::text,
      dc.id,
      NULL::text,
      NULL::uuid,
      dc.updated_at,
      ts_headline(
        'english',
        coalesce(dc.name, '') || ' ' ||
        coalesce(dc.code, '') || ' ' ||
        coalesce(dc.brand_name, '') || ' ' ||
        coalesce(dc.description, '') || ' ' ||
        coalesce(dc.dosage_form, '') || ' ' ||
        coalesce(dc.strengths, '') || ' ' ||
        coalesce(dc.presentation, '') || ' ' ||
        coalesce(dc.category::text, '') || ' ' ||
        coalesce(dc.drug_type, '') || ' ' ||
        coalesce(dc.manufacturer, ''),
        v_tsq,
        'MaxWords=60, MinWords=20'
      ),
      ts_rank(dc.search_document, v_tsq)
    FROM public.drug_catalogue dc
    WHERE p_patient_id IS NULL
      AND dc.search_document @@ v_tsq

    UNION ALL

    SELECT
      'drug_batches'::text,
      db.batch_id,
      NULL::text,
      NULL::uuid,
      db.updated_at,
      ts_headline(
        'english',
        coalesce(db.batch_number, '') || ' ' ||
        coalesce(db.status, '') || ' ' ||
        coalesce(db.supplier_name, '') || ' ' ||
        coalesce(db.notes, '') || ' ' ||
        coalesce(db.drug_id::text, ''),
        v_tsq,
        'MaxWords=60, MinWords=20'
      ),
      ts_rank(db.search_document, v_tsq)
    FROM public.drug_batches db
    WHERE p_patient_id IS NULL
      AND db.search_document @@ v_tsq
  ) r
  ORDER BY r.rank DESC, r.record_date DESC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 20), 1);
END;
$$ LANGUAGE plpgsql STABLE
   SET search_path = public;

CREATE OR REPLACE FUNCTION public.search_pharmacy_records_vector(
  p_query_embedding vector(768),
  p_patient_id text DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  patient_id text,
  encounter_id uuid,
  record_date timestamptz,
  chunk_text text,
  chunk_type text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pre.source_table::text,
    pre.source_id,
    pre.patient_id::text,
    pre.encounter_id,
    pre.record_date,
    pre.chunk_text,
    pre.chunk_type::text,
    (1 - (pre.embedding <=> p_query_embedding))::float AS similarity
  FROM public.pharmacy_record_embeddings pre
  WHERE (p_patient_id IS NULL OR public.pharmacy_patient_filter_match(pre.patient_id::text, p_patient_id))
    AND 1 - (pre.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY pre.embedding <=> p_query_embedding
  LIMIT GREATEST(COALESCE(p_limit, 20), 1);
END;
$$ LANGUAGE plpgsql STABLE
   SET search_path = public;

CREATE OR REPLACE FUNCTION public.search_pharmacy_records_hybrid(
  p_query text,
  p_query_embedding vector(768),
  p_patient_id text DEFAULT NULL,
  p_limit int DEFAULT 15,
  p_fulltext_weight float DEFAULT 0.4,
  p_vector_weight float DEFAULT 0.6
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  patient_id text,
  encounter_id uuid,
  record_date timestamptz,
  content_snippet text,
  combined_score float
) AS $$
BEGIN
  RETURN QUERY
  WITH fulltext_hits AS (
    SELECT
      ft.source_table,
      ft.source_id,
      ft.patient_id,
      ft.encounter_id,
      ft.record_date,
      ft.snippet,
      ft.rank::float AS ft_score
    FROM public.search_pharmacy_records_fulltext(p_query, p_patient_id, 60) ft
  ),
  vector_hits AS (
    SELECT
      vs.source_table,
      vs.source_id,
      vs.patient_id,
      vs.encounter_id,
      vs.record_date,
      vs.chunk_text,
      vs.similarity::float AS vec_score
    FROM public.search_pharmacy_records_vector(p_query_embedding, p_patient_id, 60, 0.4) vs
  ),
  combined AS (
    SELECT
      COALESCE(f.source_table, v.source_table) AS source_table,
      COALESCE(f.source_id, v.source_id) AS source_id,
      COALESCE(f.patient_id, v.patient_id) AS patient_id,
      COALESCE(f.encounter_id, v.encounter_id) AS encounter_id,
      COALESCE(f.record_date, v.record_date) AS record_date,
      COALESCE(f.snippet, v.chunk_text) AS content_snippet,
      (COALESCE(f.ft_score, 0) * p_fulltext_weight + COALESCE(v.vec_score, 0) * p_vector_weight) AS combined_score
    FROM fulltext_hits f
    FULL OUTER JOIN vector_hits v
      ON f.source_table = v.source_table AND f.source_id = v.source_id
  )
  SELECT
    c.source_table,
    c.source_id,
    c.patient_id,
    c.encounter_id,
    c.record_date,
    c.content_snippet,
    c.combined_score
  FROM combined c
  ORDER BY c.combined_score DESC, c.record_date DESC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 15), 1);
END;
$$ LANGUAGE plpgsql STABLE
   SET search_path = public;

COMMIT;
