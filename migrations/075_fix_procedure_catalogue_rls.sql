-- Migration: 075_fix_procedure_catalogue_rls.sql
-- Description: Fix RLS policies to allow viewing of procedure catalogue

-- Add policy for all authenticated users to view active procedures
DROP POLICY IF EXISTS "Authenticated users can view procedures" ON procedure_catalogue;
CREATE POLICY "Authenticated users can view procedures" ON procedure_catalogue
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Also add anon access for public catalogue viewing
DROP POLICY IF EXISTS "Public can view active procedures" ON procedure_catalogue;
CREATE POLICY "Public can view active procedures" ON procedure_catalogue
    FOR SELECT
    TO anon
    USING (is_active = true);

-- Verify policies
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'procedure_catalogue';
