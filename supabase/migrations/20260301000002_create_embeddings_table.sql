-- Migration: Create patient_record_embeddings table for AI Clinical Assistant
-- Stores vector embeddings of clinical narrative text for semantic search

CREATE TABLE IF NOT EXISTS public.patient_record_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Link to patient
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Source record tracking
  source_table varchar(50) NOT NULL,       -- 'consultations', 'nursing_notes', etc.
  source_id uuid NOT NULL,                 -- PK of the source row
  encounter_id uuid,                       -- FK to visits.id (nullable for patient-level records)

  -- Text chunk (what was embedded)
  chunk_text text NOT NULL,
  chunk_type varchar(30) NOT NULL,         -- 'soap_note', 'radiology', 'nursing', 'referral', etc.

  -- The embedding vector (OpenAI text-embedding-3-small = 1536 dims)
  embedding vector(1536) NOT NULL,

  -- Metadata for filtering
  record_date timestamptz,                 -- When the clinical event occurred
  metadata jsonb DEFAULT '{}',             -- Extra tags: {diagnosis: [...], is_critical: true}

  -- Housekeeping
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- HNSW index for fast vector similarity search (recommended by Supabase)
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
  ON patient_record_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Indexes for patient-scoped and filtered queries
CREATE INDEX IF NOT EXISTS idx_embeddings_patient
  ON patient_record_embeddings(patient_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_source
  ON patient_record_embeddings(source_table, source_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_date
  ON patient_record_embeddings(record_date DESC);

CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_type
  ON patient_record_embeddings(chunk_type);

-- Unique constraint: one embedding per source record (prevents duplicates on re-embed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_unique_source
  ON patient_record_embeddings(source_table, source_id);
