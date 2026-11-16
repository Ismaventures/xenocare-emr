-- Fix imaging_catalogue RLS policies.
-- imaging_catalogue was missing a permissive SELECT policy for the
-- 'authenticated' role, causing the dropdown to return 0 rows.
--
-- Write access is already handled by imaging_insert_super_admin and
-- imaging_update_super_admin policies that restrict to super_admin role.
-- The old blanket "Allow all access" policy bypassed those restrictions
-- and is removed here.

-- Drop the blanket allow-all policy that defeats role-scoped write controls
DROP POLICY IF EXISTS "Allow all access" ON public.imaging_catalogue;

-- Drop and recreate the SELECT-only policy for authenticated users
-- (imaging_catalogue is a non-sensitive reference catalogue, same as
-- drug_select_all and lab_select_all on their respective tables)
DROP POLICY IF EXISTS "imaging_select_all" ON public.imaging_catalogue;
CREATE POLICY "imaging_select_all" ON public.imaging_catalogue
  FOR SELECT TO authenticated
  USING (true);
