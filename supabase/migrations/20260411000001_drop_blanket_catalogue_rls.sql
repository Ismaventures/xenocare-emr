-- Remove blanket "Allow all access" policies from catalogue tables.
--
-- All three catalogue tables already have proper role-scoped policies:
--   drug_select_all / drug_insert_super_admin / drug_update_super_admin
--   lab_select_all  / lab_insert_super_admin  / lab_update_super_admin
--   imaging_select_all / imaging_insert_super_admin / imaging_update_super_admin
--
-- The blanket policies bypass those controls by granting unrestricted
-- INSERT/UPDATE/DELETE to every authenticated user.  Dropping them restores
-- the intended super-admin-only write restriction.

DROP POLICY IF EXISTS "Allow all access" ON public.drug_catalogue;
DROP POLICY IF EXISTS "Allow all access" ON public.lab_test_catalogue;
DROP POLICY IF EXISTS "lab_test_catalogue_all_access" ON public.lab_test_catalogue;
DROP POLICY IF EXISTS "Allow all access" ON public.imaging_catalogue;
