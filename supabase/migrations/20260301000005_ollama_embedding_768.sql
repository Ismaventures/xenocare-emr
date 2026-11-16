-- Migration: Switch embeddings from 1536d (Gemini) to 768d (Ollama nomic-embed-text)
-- This must run BEFORE the updated RPC functions that reference vector(768).

-- 1. Drop existing embeddings (they were generated with 1536d, incompatible with 768d)
TRUNCATE patient_record_embeddings;

-- 2. Alter the embedding column from vector(1536) to vector(768)
ALTER TABLE patient_record_embeddings
  ALTER COLUMN embedding TYPE vector(768);

-- 3. Recreate the HNSW index for the new dimension
DROP INDEX IF EXISTS idx_pre_embedding_hnsw;
CREATE INDEX idx_pre_embedding_hnsw
  ON patient_record_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Verify
DO $$
BEGIN
  RAISE NOTICE 'Embedding column changed to vector(768) for Ollama nomic-embed-text';
END $$;
