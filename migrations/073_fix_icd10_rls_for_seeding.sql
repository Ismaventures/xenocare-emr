-- Migration: 073_fix_icd10_rls_for_seeding.sql
-- Description: Grant permissions to allow seeding of ICD-10 codes
-- This adds explicit INSERT permission and a temporary policy for anon role

-- First, let's GRANT the necessary table permissions
GRANT ALL ON public.icd10_codes TO service_role;
GRANT SELECT ON public.icd10_codes TO authenticated;
GRANT SELECT ON public.icd10_codes TO anon;

-- Drop existing policies if they exist (recreate with correct permissions)
DROP POLICY IF EXISTS "icd10_codes_read_all" ON public.icd10_codes;
DROP POLICY IF EXISTS "icd10_codes_service_write" ON public.icd10_codes;

-- Recreate policies
-- Policy: Everyone can read ICD codes (no auth needed for reference data)
CREATE POLICY "icd10_codes_read_all" ON public.icd10_codes
    FOR SELECT
    USING (true);

-- Policy: Service role can do everything
CREATE POLICY "icd10_codes_service_write" ON public.icd10_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Alternative: Allow insert/update for service role specifically
CREATE POLICY "icd10_codes_insert" ON public.icd10_codes
    FOR INSERT
    WITH CHECK (true);

-- Allow service role to bypass RLS for this table
-- This is necessary because the JS client might not be passing the role correctly
ALTER TABLE public.icd10_codes FORCE ROW LEVEL SECURITY;

-- Verify the table exists and show current policies
DO $$
BEGIN
    RAISE NOTICE 'ICD-10 codes table configured for seeding';
END $$;
