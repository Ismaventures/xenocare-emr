-- =============================================================================
-- SPECIALTY STAFF ROLES MIGRATION
-- Migration: 050_specialty_staff_roles.sql
-- Description: Adds specialty staff roles for Dental, Ophthalmology, Physiotherapy
-- =============================================================================

-- =============================================================================
-- ADD SPECIALTY ROLES TO USER ROLE ENUM
-- =============================================================================

-- Add dentist role
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'dentist';

-- Add ophthalmologist role  
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'ophthalmologist';

-- Add physiotherapist role
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'physiotherapist';

-- =============================================================================
-- ROLE-BASED ACCESS POLICIES FOR SPECIALTY MODULES
-- =============================================================================

-- Helper function to check specialty role access
CREATE OR REPLACE FUNCTION is_specialty_clinician()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role
    FROM staff
    WHERE user_id = auth.uid();
    
    RETURN user_role IN ('dentist', 'ophthalmologist', 'physiotherapist', 'doctor', 'medical_director', 'super_admin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dental module access
CREATE OR REPLACE FUNCTION has_dental_access()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role
    FROM staff
    WHERE user_id = auth.uid();
    
    RETURN user_role IN ('dentist', 'doctor', 'medical_director', 'super_admin', 'admin', 'nurse');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ophthalmology module access
CREATE OR REPLACE FUNCTION has_ophthalmology_access()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role
    FROM staff
    WHERE user_id = auth.uid();
    
    RETURN user_role IN ('ophthalmologist', 'doctor', 'medical_director', 'super_admin', 'admin', 'nurse');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Physiotherapy module access
CREATE OR REPLACE FUNCTION has_physiotherapy_access()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role
    FROM staff
    WHERE user_id = auth.uid();
    
    RETURN user_role IN ('physiotherapist', 'doctor', 'medical_director', 'super_admin', 'admin', 'nurse');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE RLS POLICIES FOR SPECIALTY TABLES
-- =============================================================================

-- Dental exams - more specific policies
DROP POLICY IF EXISTS dental_exams_select_policy ON dental_exams;
CREATE POLICY dental_exams_select_policy ON dental_exams
    FOR SELECT USING (has_dental_access());

DROP POLICY IF EXISTS dental_exams_insert_policy ON dental_exams;
CREATE POLICY dental_exams_insert_policy ON dental_exams
    FOR INSERT WITH CHECK (has_dental_access());

DROP POLICY IF EXISTS dental_exams_update_policy ON dental_exams;
CREATE POLICY dental_exams_update_policy ON dental_exams
    FOR UPDATE USING (has_dental_access() AND finalized_at IS NULL);

DROP POLICY IF EXISTS dental_procedures_select_policy ON dental_procedures;
CREATE POLICY dental_procedures_select_policy ON dental_procedures
    FOR SELECT USING (has_dental_access());

DROP POLICY IF EXISTS dental_procedures_all_policy ON dental_procedures;
CREATE POLICY dental_procedures_insert_policy ON dental_procedures
    FOR INSERT WITH CHECK (has_dental_access());

DROP POLICY IF EXISTS dental_procedures_update_policy ON dental_procedures;
CREATE POLICY dental_procedures_update_policy ON dental_procedures
    FOR UPDATE USING (has_dental_access());

-- Eye exams - more specific policies
DROP POLICY IF EXISTS eye_exams_select_policy ON eye_exams;
CREATE POLICY eye_exams_select_policy ON eye_exams
    FOR SELECT USING (has_ophthalmology_access());

DROP POLICY IF EXISTS eye_exams_insert_policy ON eye_exams;
CREATE POLICY eye_exams_insert_policy ON eye_exams
    FOR INSERT WITH CHECK (has_ophthalmology_access());

DROP POLICY IF EXISTS eye_exams_update_policy ON eye_exams;
CREATE POLICY eye_exams_update_policy ON eye_exams
    FOR UPDATE USING (has_ophthalmology_access() AND finalized_at IS NULL);

DROP POLICY IF EXISTS eye_procedures_select_policy ON eye_procedures;
CREATE POLICY eye_procedures_select_policy ON eye_procedures
    FOR SELECT USING (has_ophthalmology_access());

DROP POLICY IF EXISTS eye_procedures_all_policy ON eye_procedures;
CREATE POLICY eye_procedures_insert_policy ON eye_procedures
    FOR INSERT WITH CHECK (has_ophthalmology_access());

DROP POLICY IF EXISTS eye_procedures_update_policy ON eye_procedures;
CREATE POLICY eye_procedures_update_policy ON eye_procedures
    FOR UPDATE USING (has_ophthalmology_access());

-- Physio assessments - more specific policies
DROP POLICY IF EXISTS physio_assessments_select_policy ON physio_assessments;
CREATE POLICY physio_assessments_select_policy ON physio_assessments
    FOR SELECT USING (has_physiotherapy_access());

DROP POLICY IF EXISTS physio_assessments_insert_policy ON physio_assessments;
CREATE POLICY physio_assessments_insert_policy ON physio_assessments
    FOR INSERT WITH CHECK (has_physiotherapy_access());

DROP POLICY IF EXISTS physio_assessments_update_policy ON physio_assessments;
CREATE POLICY physio_assessments_update_policy ON physio_assessments
    FOR UPDATE USING (has_physiotherapy_access() AND finalized_at IS NULL);

DROP POLICY IF EXISTS physio_sessions_select_policy ON physio_sessions;
CREATE POLICY physio_sessions_select_policy ON physio_sessions
    FOR SELECT USING (has_physiotherapy_access());

DROP POLICY IF EXISTS physio_sessions_all_policy ON physio_sessions;
CREATE POLICY physio_sessions_insert_policy ON physio_sessions
    FOR INSERT WITH CHECK (has_physiotherapy_access());

DROP POLICY IF EXISTS physio_sessions_update_policy ON physio_sessions;
CREATE POLICY physio_sessions_update_policy ON physio_sessions
    FOR UPDATE USING (has_physiotherapy_access());

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION has_dental_access() IS 'Checks if current user has access to dental module';
COMMENT ON FUNCTION has_ophthalmology_access() IS 'Checks if current user has access to ophthalmology module';
COMMENT ON FUNCTION has_physiotherapy_access() IS 'Checks if current user has access to physiotherapy module';
