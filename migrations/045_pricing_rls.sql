-- =============================================================================
-- Migration: Row Level Security (RLS) for Pricing Control
-- Restrict INSERT/UPDATE on pricing tables to Super Admin only
-- =============================================================================

-- Enable RLS on target tables
ALTER TABLE lab_test_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_price_audit ENABLE ROW LEVEL SECURITY;

-- Helper policy condition: current user is Super Admin
-- We assume staff.user_id links to auth.uid()
-- Use EXISTS subquery to validate role

-- Lab Test Catalogue Policies
DROP POLICY IF EXISTS lab_update_super_admin ON lab_test_catalogue;
CREATE POLICY lab_update_super_admin ON lab_test_catalogue
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS lab_insert_super_admin ON lab_test_catalogue;
CREATE POLICY lab_insert_super_admin ON lab_test_catalogue
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS lab_select_all ON lab_test_catalogue;
CREATE POLICY lab_select_all ON lab_test_catalogue
  FOR SELECT TO authenticated
  USING (true);

-- Imaging Catalogue Policies
DROP POLICY IF EXISTS imaging_update_super_admin ON imaging_catalogue;
CREATE POLICY imaging_update_super_admin ON imaging_catalogue
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS imaging_insert_super_admin ON imaging_catalogue;
CREATE POLICY imaging_insert_super_admin ON imaging_catalogue
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS imaging_select_all ON imaging_catalogue;
CREATE POLICY imaging_select_all ON imaging_catalogue
  FOR SELECT TO authenticated
  USING (true);

-- Drug Catalogue Policies
DROP POLICY IF EXISTS drug_update_super_admin ON drug_catalogue;
CREATE POLICY drug_update_super_admin ON drug_catalogue
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS drug_insert_super_admin ON drug_catalogue;
CREATE POLICY drug_insert_super_admin ON drug_catalogue
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS drug_select_all ON drug_catalogue;
CREATE POLICY drug_select_all ON drug_catalogue
  FOR SELECT TO authenticated
  USING (true);

-- Clinics Policies (consultation fees)
DROP POLICY IF EXISTS clinics_update_super_admin ON clinics;
CREATE POLICY clinics_update_super_admin ON clinics
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS clinics_select_all ON clinics;
CREATE POLICY clinics_select_all ON clinics
  FOR SELECT TO authenticated
  USING (true);

-- Service Price Audit Policies
DROP POLICY IF EXISTS audit_insert_super_admin ON service_price_audit;
CREATE POLICY audit_insert_super_admin ON service_price_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS audit_select_all ON service_price_audit;
CREATE POLICY audit_select_all ON service_price_audit
  FOR SELECT TO authenticated
  USING (true);

-- Note: Depending on your Supabase setup, you may need to run:
-- ALTER TABLE <table> FORCE ROW LEVEL SECURITY; to enforce RLS even for owner.
-- Uncomment below if needed.
-- ALTER TABLE lab_test_catalogue FORCE ROW LEVEL SECURITY;
-- ALTER TABLE imaging_catalogue FORCE ROW LEVEL SECURITY;
-- ALTER TABLE drug_catalogue FORCE ROW LEVEL SECURITY;
-- ALTER TABLE clinics FORCE ROW LEVEL SECURITY;
-- ALTER TABLE service_price_audit FORCE ROW LEVEL SECURITY;
