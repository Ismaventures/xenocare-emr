-- Migration: Add RLS policies for nhis_referral_queue table
-- This fixes the 403 Forbidden errors when accessing the referral queue

-- Enable RLS on nhis_referral_queue if not already enabled
ALTER TABLE nhis_referral_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "nhis_referral_queue_select" ON nhis_referral_queue;
DROP POLICY IF EXISTS "nhis_referral_queue_insert" ON nhis_referral_queue;
DROP POLICY IF EXISTS "nhis_referral_queue_update" ON nhis_referral_queue;
DROP POLICY IF EXISTS "nhis_referral_queue_delete" ON nhis_referral_queue;

-- Create permissive policies for authenticated users
-- SELECT: All authenticated users can view the queue
CREATE POLICY "nhis_referral_queue_select" ON nhis_referral_queue
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: All authenticated users can add to the queue
CREATE POLICY "nhis_referral_queue_insert" ON nhis_referral_queue
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: All authenticated users can update queue items
CREATE POLICY "nhis_referral_queue_update" ON nhis_referral_queue
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: All authenticated users can delete queue items (if needed)
CREATE POLICY "nhis_referral_queue_delete" ON nhis_referral_queue
    FOR DELETE
    TO authenticated
    USING (true);

-- Also ensure the related tables have proper RLS policies for the joins
-- nhis_profiles
ALTER TABLE nhis_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nhis_profiles_select" ON nhis_profiles;
DROP POLICY IF EXISTS "nhis_profiles_insert" ON nhis_profiles;
DROP POLICY IF EXISTS "nhis_profiles_update" ON nhis_profiles;

CREATE POLICY "nhis_profiles_select" ON nhis_profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "nhis_profiles_insert" ON nhis_profiles
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nhis_profiles_update" ON nhis_profiles
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- nhis_authorizations
ALTER TABLE nhis_authorizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nhis_authorizations_select" ON nhis_authorizations;
DROP POLICY IF EXISTS "nhis_authorizations_insert" ON nhis_authorizations;
DROP POLICY IF EXISTS "nhis_authorizations_update" ON nhis_authorizations;

CREATE POLICY "nhis_authorizations_select" ON nhis_authorizations
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "nhis_authorizations_insert" ON nhis_authorizations
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nhis_authorizations_update" ON nhis_authorizations
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- nhis_audit_log
ALTER TABLE nhis_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nhis_audit_log_select" ON nhis_audit_log;
DROP POLICY IF EXISTS "nhis_audit_log_insert" ON nhis_audit_log;

CREATE POLICY "nhis_audit_log_select" ON nhis_audit_log
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "nhis_audit_log_insert" ON nhis_audit_log
    FOR INSERT TO authenticated WITH CHECK (true);

-- nhis_approvals
ALTER TABLE nhis_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nhis_approvals_select" ON nhis_approvals;
DROP POLICY IF EXISTS "nhis_approvals_insert" ON nhis_approvals;
DROP POLICY IF EXISTS "nhis_approvals_update" ON nhis_approvals;

CREATE POLICY "nhis_approvals_select" ON nhis_approvals
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "nhis_approvals_insert" ON nhis_approvals
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nhis_approvals_update" ON nhis_approvals
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- nhis_claims
ALTER TABLE nhis_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nhis_claims_select" ON nhis_claims;
DROP POLICY IF EXISTS "nhis_claims_insert" ON nhis_claims;
DROP POLICY IF EXISTS "nhis_claims_update" ON nhis_claims;

CREATE POLICY "nhis_claims_select" ON nhis_claims
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "nhis_claims_insert" ON nhis_claims
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nhis_claims_update" ON nhis_claims
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- nhis_policy_config
ALTER TABLE nhis_policy_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nhis_policy_config_select" ON nhis_policy_config;
DROP POLICY IF EXISTS "nhis_policy_config_insert" ON nhis_policy_config;
DROP POLICY IF EXISTS "nhis_policy_config_update" ON nhis_policy_config;

CREATE POLICY "nhis_policy_config_select" ON nhis_policy_config
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "nhis_policy_config_insert" ON nhis_policy_config
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nhis_policy_config_update" ON nhis_policy_config
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Grant usage on schema if needed
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON nhis_referral_queue TO authenticated;
GRANT ALL ON nhis_profiles TO authenticated;
GRANT ALL ON nhis_authorizations TO authenticated;
GRANT ALL ON nhis_audit_log TO authenticated;
GRANT ALL ON nhis_approvals TO authenticated;
GRANT ALL ON nhis_claims TO authenticated;
GRANT ALL ON nhis_policy_config TO authenticated;
