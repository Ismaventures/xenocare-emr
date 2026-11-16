-- Migration: 072_icd10_codes_table.sql
-- Description: Create local ICD-10 codes table for offline/local ICD code lookup
-- This provides a fallback when WHO ICD-11 API is unavailable
-- 
-- Table contains ONLY code and description for simplicity per requirements.
-- Full dataset can be seeded from @lowlysre/icd-10-cm npm package
--
-- Run after: 071_specialty_departments_clinics.sql

-- =============================================================================
-- ICD-10 Codes Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.icd10_codes (
    -- Primary key: ICD-10 code (e.g., 'A01.0', 'J18.9')
    code TEXT PRIMARY KEY,
    
    -- Description/title of the diagnosis
    description TEXT NOT NULL,
    
    -- Audit timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Btree index on code for exact lookups (already covered by PK but explicit)
CREATE INDEX IF NOT EXISTS idx_icd10_codes_code_btree ON public.icd10_codes USING btree (code);

-- GIN full-text index on description for search queries
-- This enables fast ILIKE and full-text search
CREATE INDEX IF NOT EXISTS idx_icd10_codes_description_gin ON public.icd10_codes USING gin (to_tsvector('english', description));

-- Trigram index for partial/fuzzy matching (requires pg_trgm extension)
-- This enables fast ILIKE '%search%' queries
DO $$
BEGIN
    -- Check if pg_trgm extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_icd10_codes_description_trgm ON public.icd10_codes USING gin (description gin_trgm_ops)';
    END IF;
END $$;

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on the table
ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read ICD codes
CREATE POLICY "icd10_codes_read_all" ON public.icd10_codes
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only service role can insert/update/delete
-- This ensures data integrity - codes are seeded via scripts
CREATE POLICY "icd10_codes_service_write" ON public.icd10_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- Helper Functions for ICD-10 Search
-- =============================================================================

-- Function: Search ICD-10 codes by keyword
-- Supports both code prefix matching and description full-text search
CREATE OR REPLACE FUNCTION public.search_icd10_codes(
    p_keyword TEXT,
    p_max_results INT DEFAULT 25
)
RETURNS TABLE (
    code TEXT,
    description TEXT,
    match_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_search_term TEXT;
    v_tsquery tsquery;
BEGIN
    -- Normalize search term
    v_search_term := TRIM(UPPER(p_keyword));
    
    IF v_search_term IS NULL OR LENGTH(v_search_term) < 2 THEN
        RETURN;
    END IF;
    
    -- Create tsquery for full-text search
    v_tsquery := plainto_tsquery('english', p_keyword);
    
    RETURN QUERY
    SELECT 
        i.code,
        i.description,
        CASE 
            -- Exact code match gets highest score
            WHEN UPPER(i.code) = v_search_term THEN 100.0
            -- Code prefix match gets high score
            WHEN UPPER(i.code) LIKE v_search_term || '%' THEN 80.0
            -- Code contains search term
            WHEN UPPER(i.code) LIKE '%' || v_search_term || '%' THEN 60.0
            -- Full-text match score
            WHEN v_tsquery @@ to_tsvector('english', i.description) THEN 
                ts_rank(to_tsvector('english', i.description), v_tsquery) * 50.0
            -- ILIKE match gets base score
            ELSE 10.0
        END AS match_score
    FROM public.icd10_codes i
    WHERE 
        -- Match by code (case-insensitive)
        UPPER(i.code) LIKE '%' || v_search_term || '%'
        OR
        -- Match by description (full-text or ILIKE)
        v_tsquery @@ to_tsvector('english', i.description)
        OR
        UPPER(i.description) LIKE '%' || v_search_term || '%'
    ORDER BY match_score DESC, i.code ASC
    LIMIT p_max_results;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_icd10_codes(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_icd10_codes(TEXT, INT) TO service_role;

-- Function: Get single ICD-10 code by exact code
CREATE OR REPLACE FUNCTION public.get_icd10_code(
    p_code TEXT
)
RETURNS TABLE (
    code TEXT,
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT i.code, i.description
    FROM public.icd10_codes i
    WHERE UPPER(i.code) = UPPER(TRIM(p_code))
    LIMIT 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_icd10_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_icd10_code(TEXT) TO service_role;

-- =============================================================================
-- Statistics function for monitoring
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_icd10_stats()
RETURNS TABLE (
    total_codes BIGINT,
    chapters_count BIGINT,
    last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_codes,
        COUNT(DISTINCT SUBSTRING(i.code FROM 1 FOR 1))::BIGINT AS chapters_count,
        MAX(i.created_at) AS last_updated
    FROM public.icd10_codes i;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_icd10_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_icd10_stats() TO service_role;

-- =============================================================================
-- Comments for Documentation
-- =============================================================================

COMMENT ON TABLE public.icd10_codes IS 'Local ICD-10 codes table for offline/local diagnosis code lookup. Seeded from @lowlysre/icd-10-cm npm package.';
COMMENT ON COLUMN public.icd10_codes.code IS 'ICD-10 code (e.g., A01.0, J18.9). Primary key.';
COMMENT ON COLUMN public.icd10_codes.description IS 'Human-readable description of the diagnosis.';
COMMENT ON COLUMN public.icd10_codes.created_at IS 'Timestamp when the code was inserted into the database.';
COMMENT ON FUNCTION public.search_icd10_codes IS 'Search ICD-10 codes by keyword. Supports code prefix and description full-text search.';
COMMENT ON FUNCTION public.get_icd10_code IS 'Get single ICD-10 code details by exact code.';
COMMENT ON FUNCTION public.get_icd10_stats IS 'Get statistics about the ICD-10 codes table.';
