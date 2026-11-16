-- =============================================================================
-- Migration: 086_nhis_provisional_authorization.sql
-- Purpose: Add provisional authorization workflow support for NHIS
-- Date: February 1, 2026
-- 
-- This migration adds:
-- 1. Provisional approval fields to nhis_authorizations
-- 2. Service-specific authorization fields
-- 3. Authorization source tracking (internal/external)
-- 4. Database functions for provisional workflow
-- 5. Views for NHIS desk dashboard
-- =============================================================================

-- =============================================================================
-- PART 1: ADD PROVISIONAL AUTHORIZATION FIELDS
-- =============================================================================

-- Add provisional approval fields to nhis_authorizations table
ALTER TABLE nhis_authorizations 
    ADD COLUMN IF NOT EXISTS is_provisional BOOLEAN DEFAULT FALSE;

ALTER TABLE nhis_authorizations 
    ADD COLUMN IF NOT EXISTS provisional_reason TEXT;

ALTER TABLE nhis_authorizations 
    ADD COLUMN IF NOT EXISTS provisional_approved_by UUID REFERENCES staff(id);

ALTER TABLE nhis_authorizations 
    ADD COLUMN IF NOT EXISTS provisional_approved_at TIMESTAMPTZ;

-- Track when the actual authorization code was received (after provisional approval)
ALTER TABLE nhis_authorizations 
    ADD COLUMN IF NOT EXISTS actual_code_received_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN nhis_authorizations.is_provisional IS 'True if this authorization was provisionally approved pending official NHIS code';
COMMENT ON COLUMN nhis_authorizations.provisional_reason IS 'Reason for provisional approval (e.g., NHIS HQ delay, emergency care)';
COMMENT ON COLUMN nhis_authorizations.provisional_approved_by IS 'Staff member who granted provisional approval';
COMMENT ON COLUMN nhis_authorizations.provisional_approved_at IS 'Timestamp of provisional approval';
COMMENT ON COLUMN nhis_authorizations.actual_code_received_at IS 'Timestamp when official NHIS authorization code was received';

-- =============================================================================
-- PART 2: ADD SERVICE-SPECIFIC AUTHORIZATION FIELDS
-- =============================================================================

-- Add specific clinic/service code for service-bound authorizations
ALTER TABLE nhis_authorizations 
    ADD COLUMN IF NOT EXISTS specific_clinic_code VARCHAR(50);

ALTER TABLE nhis_authorizations 
    ADD COLUMN IF NOT EXISTS specific_service_type VARCHAR(50);

ALTER TABLE nhis_authorizations 
    ADD COLUMN IF NOT EXISTS authorization_source VARCHAR(20);

-- Add constraint for authorization_source
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_nhis_auth_source'
    ) THEN
        ALTER TABLE nhis_authorizations 
            ADD CONSTRAINT chk_nhis_auth_source 
            CHECK (authorization_source IN ('internal', 'external') OR authorization_source IS NULL);
    END IF;
END $$;

-- Add constraint for specific_service_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_nhis_auth_service_type'
    ) THEN
        ALTER TABLE nhis_authorizations 
            ADD CONSTRAINT chk_nhis_auth_service_type 
            CHECK (specific_service_type IN (
                'general_outpatient', 
                'dental', 
                'ophthalmology', 
                'physiotherapy', 
                'laboratory', 
                'radiology', 
                'pharmacy', 
                'surgery',
                'ent',
                'cardiology',
                'orthopedics',
                'obstetrics_gynecology',
                'pediatrics',
                'psychiatry',
                'other'
            ) OR specific_service_type IS NULL);
    END IF;
END $$;

COMMENT ON COLUMN nhis_authorizations.specific_clinic_code IS 'Specific clinic code this authorization is valid for (e.g., DENTAL001)';
COMMENT ON COLUMN nhis_authorizations.specific_service_type IS 'Type of service this authorization covers (e.g., dental, ophthalmology)';
COMMENT ON COLUMN nhis_authorizations.authorization_source IS 'Whether authorization is for internal patient or external referral';

-- =============================================================================
-- PART 3: CREATE SERVICE-AUTHORIZATION MAPPING TABLE
-- =============================================================================

-- Create table to track which services are covered by which authorization
CREATE TABLE IF NOT EXISTS nhis_authorization_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorization_id UUID NOT NULL REFERENCES nhis_authorizations(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,  -- 'lab', 'radiology', 'prescription', 'procedure', 'consultation'
    service_id UUID,                     -- Reference to specific service (lab_request_id, prescription_id, etc.)
    service_table VARCHAR(100),          -- Table name for reference
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES staff(id),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_auth_service UNIQUE (authorization_id, service_type, service_id)
);

-- Indexes for authorization services
CREATE INDEX IF NOT EXISTS idx_nhis_auth_services_auth ON nhis_authorization_services(authorization_id);
CREATE INDEX IF NOT EXISTS idx_nhis_auth_services_type ON nhis_authorization_services(service_type);
CREATE INDEX IF NOT EXISTS idx_nhis_auth_services_service ON nhis_authorization_services(service_id);

COMMENT ON TABLE nhis_authorization_services IS 'Maps which services are covered by each NHIS authorization';

-- =============================================================================
-- PART 4: CREATE INDEXES FOR PROVISIONAL TRACKING
-- =============================================================================

-- Index for provisional approvals (for NHIS desk dashboard)
CREATE INDEX IF NOT EXISTS idx_nhis_auth_provisional 
    ON nhis_authorizations(is_provisional, status) 
    WHERE is_provisional = TRUE;

-- Index for pending code entry (provisional approved but no actual code yet)
CREATE INDEX IF NOT EXISTS idx_nhis_auth_pending_code 
    ON nhis_authorizations(is_provisional, actual_code_received_at) 
    WHERE is_provisional = TRUE AND actual_code_received_at IS NULL;

-- Index for authorization source
CREATE INDEX IF NOT EXISTS idx_nhis_auth_source 
    ON nhis_authorizations(authorization_source);

-- Index for service-specific authorizations
CREATE INDEX IF NOT EXISTS idx_nhis_auth_service_type 
    ON nhis_authorizations(specific_service_type) 
    WHERE specific_service_type IS NOT NULL;

-- =============================================================================
-- PART 5: DATABASE FUNCTIONS FOR PROVISIONAL WORKFLOW
-- =============================================================================

-- Function to provisionally approve an authorization
CREATE OR REPLACE FUNCTION nhis_provisional_approve(
    p_patient_id UUID,
    p_service_type VARCHAR(50),
    p_reason TEXT,
    p_approved_by UUID,
    p_encounter_id UUID DEFAULT NULL,
    p_expiry_days INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auth_id UUID;
    v_profile_id UUID;
    v_expiry_date TIMESTAMPTZ;
BEGIN
    -- Get patient's NHIS profile
    SELECT id INTO v_profile_id
    FROM nhis_profiles
    WHERE patient_id = p_patient_id AND status = 'active'
    LIMIT 1;
    
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'No active NHIS profile found for patient %', p_patient_id;
    END IF;
    
    -- Calculate expiry date
    v_expiry_date := NOW() + (p_expiry_days || ' days')::INTERVAL;
    
    -- Create provisional authorization
    INSERT INTO nhis_authorizations (
        patient_id,
        nhis_profile_id,
        auth_code,
        auth_type,
        start_date,
        expiry_date,
        status,
        specific_service_type,
        is_provisional,
        provisional_reason,
        provisional_approved_by,
        provisional_approved_at,
        created_by
    ) VALUES (
        p_patient_id,
        v_profile_id,
        'PROV-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),  -- Temporary provisional code
        'provisional',
        NOW(),
        v_expiry_date,
        'active',
        p_service_type,
        TRUE,
        p_reason,
        p_approved_by,
        NOW(),
        p_approved_by
    )
    RETURNING id INTO v_auth_id;
    
    -- Log to audit
    INSERT INTO nhis_audit_log (
        action_type,
        entity_type,
        entity_id,
        patient_id,
        performed_by,
        details
    ) VALUES (
        'provisional_approval',
        'authorization',
        v_auth_id,
        p_patient_id,
        p_approved_by,
        jsonb_build_object(
            'service_type', p_service_type,
            'reason', p_reason,
            'encounter_id', p_encounter_id,
            'expiry_date', v_expiry_date
        )
    );
    
    RETURN v_auth_id;
END;
$$;

-- Function to enter official authorization code for a provisional approval
CREATE OR REPLACE FUNCTION nhis_enter_official_code(
    p_authorization_id UUID,
    p_official_code VARCHAR(100),
    p_entered_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_patient_id UUID;
    v_old_code VARCHAR(100);
BEGIN
    -- Get current authorization details
    SELECT patient_id, auth_code INTO v_patient_id, v_old_code
    FROM nhis_authorizations
    WHERE id = p_authorization_id AND is_provisional = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Provisional authorization not found: %', p_authorization_id;
    END IF;
    
    -- Update with official code
    UPDATE nhis_authorizations
    SET 
        auth_code = p_official_code,
        actual_code_received_at = NOW(),
        updated_at = NOW()
    WHERE id = p_authorization_id;
    
    -- Log to audit
    INSERT INTO nhis_audit_log (
        action_type,
        entity_type,
        entity_id,
        patient_id,
        performed_by,
        details
    ) VALUES (
        'official_code_entry',
        'authorization',
        p_authorization_id,
        v_patient_id,
        p_entered_by,
        jsonb_build_object(
            'old_provisional_code', v_old_code,
            'official_code', p_official_code
        )
    );
    
    RETURN TRUE;
END;
$$;

-- Function to check if service is authorized for a patient
CREATE OR REPLACE FUNCTION nhis_check_service_authorization(
    p_patient_id UUID,
    p_service_type VARCHAR(50),
    p_encounter_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_authorized BOOLEAN,
    authorization_id UUID,
    authorization_status VARCHAR(50),
    is_provisional BOOLEAN,
    expires_at TIMESTAMPTZ,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check for valid authorization for this service type
    RETURN QUERY
    SELECT 
        TRUE AS is_authorized,
        a.id AS authorization_id,
        a.status::VARCHAR(50) AS authorization_status,
        a.is_provisional,
        a.expiry_date AS expires_at,
        CASE 
            WHEN a.is_provisional THEN 'Provisionally approved: ' || COALESCE(a.provisional_reason, 'Pending official code')
            ELSE 'NHIS authorized'
        END AS reason
    FROM nhis_authorizations a
    WHERE a.patient_id = p_patient_id
        AND a.status = 'active'
        AND a.expiry_date > NOW()
        AND (
            a.specific_service_type IS NULL  -- General authorization covers all
            OR a.specific_service_type = p_service_type
        )
    ORDER BY a.is_provisional ASC, a.created_at DESC  -- Prefer non-provisional
    LIMIT 1;
    
    -- If no result, return not authorized
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            FALSE AS is_authorized,
            NULL::UUID AS authorization_id,
            'none'::VARCHAR(50) AS authorization_status,
            FALSE AS is_provisional,
            NULL::TIMESTAMPTZ AS expires_at,
            'No valid NHIS authorization for ' || p_service_type AS reason;
    END IF;
END;
$$;

-- =============================================================================
-- PART 6: VIEWS FOR NHIS DESK DASHBOARD
-- =============================================================================

-- View: Provisional approvals awaiting official codes
CREATE OR REPLACE VIEW nhis_provisional_awaiting_code AS
SELECT 
    a.id AS authorization_id,
    a.patient_id,
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number,
    a.specific_service_type,
    a.provisional_reason,
    a.provisional_approved_at,
    s.first_name || ' ' || s.last_name AS approved_by_name,
    a.expiry_date,
    EXTRACT(EPOCH FROM (NOW() - a.provisional_approved_at)) / 3600 AS hours_since_approval,
    CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - a.provisional_approved_at)) / 3600 > 48 THEN 'overdue'
        WHEN EXTRACT(EPOCH FROM (NOW() - a.provisional_approved_at)) / 3600 > 24 THEN 'urgent'
        ELSE 'normal'
    END AS urgency_status
FROM nhis_authorizations a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN staff s ON a.provisional_approved_by = s.id
WHERE a.is_provisional = TRUE
    AND a.actual_code_received_at IS NULL
    AND a.status = 'active'
ORDER BY a.provisional_approved_at ASC;

COMMENT ON VIEW nhis_provisional_awaiting_code IS 'Provisional approvals that are still waiting for official NHIS authorization codes';

-- View: Authorizations expiring soon (next 7 days)
CREATE OR REPLACE VIEW nhis_authorizations_expiring_soon AS
SELECT 
    a.id AS authorization_id,
    a.patient_id,
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number,
    a.auth_code,
    a.specific_service_type,
    a.is_provisional,
    a.expiry_date,
    DATE_PART('day', a.expiry_date - NOW()) AS days_until_expiry,
    CASE 
        WHEN a.expiry_date < NOW() THEN 'expired'
        WHEN DATE_PART('day', a.expiry_date - NOW()) <= 3 THEN 'critical'
        ELSE 'warning'
    END AS expiry_status
FROM nhis_authorizations a
JOIN patients p ON a.patient_id = p.id
WHERE a.status = 'active'
    AND a.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY a.expiry_date ASC;

COMMENT ON VIEW nhis_authorizations_expiring_soon IS 'Active authorizations that will expire within the next 7 days';

-- View: NHIS Authorization summary by service type
CREATE OR REPLACE VIEW nhis_authorization_service_summary AS
SELECT 
    specific_service_type,
    COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW()) AS active_count,
    COUNT(*) FILTER (WHERE is_provisional = TRUE AND actual_code_received_at IS NULL) AS provisional_pending_count,
    COUNT(*) FILTER (WHERE status = 'expired' OR expiry_date < NOW()) AS expired_count,
    COUNT(*) AS total_count
FROM nhis_authorizations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY specific_service_type
ORDER BY active_count DESC;

COMMENT ON VIEW nhis_authorization_service_summary IS 'Summary statistics of NHIS authorizations by service type';

-- =============================================================================
-- PART 7: ADD ENCOUNTER-LEVEL AUTHORIZATION TRACKING
-- =============================================================================

-- Add field to track service-specific authorization on encounters
ALTER TABLE visits 
    ADD COLUMN IF NOT EXISTS nhis_service_auth_id UUID REFERENCES nhis_authorizations(id);

ALTER TABLE visits 
    ADD COLUMN IF NOT EXISTS nhis_service_type VARCHAR(50);

COMMENT ON COLUMN visits.nhis_service_auth_id IS 'Specific NHIS authorization for this encounter (service-bound)';
COMMENT ON COLUMN visits.nhis_service_type IS 'Service type this encounter is authorized for';

-- =============================================================================
-- PART 8: ADD SPECIALTY REFERRAL NHIS TRACKING
-- =============================================================================

-- Add NHIS authorization tracking to specialty referrals table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'specialty_referrals') THEN
        ALTER TABLE specialty_referrals 
            ADD COLUMN IF NOT EXISTS nhis_authorization_id UUID REFERENCES nhis_authorizations(id);
        
        ALTER TABLE specialty_referrals 
            ADD COLUMN IF NOT EXISTS nhis_approval_status VARCHAR(50) DEFAULT 'not_required';
        
        ALTER TABLE specialty_referrals 
            ADD COLUMN IF NOT EXISTS nhis_approved_by UUID REFERENCES staff(id);
        
        ALTER TABLE specialty_referrals 
            ADD COLUMN IF NOT EXISTS nhis_approved_at TIMESTAMPTZ;
        
        COMMENT ON COLUMN specialty_referrals.nhis_authorization_id IS 'NHIS authorization for this specialty referral';
        COMMENT ON COLUMN specialty_referrals.nhis_approval_status IS 'NHIS approval status: not_required, pending, approved, rejected';
    END IF;
END $$;

-- =============================================================================
-- PART 9: GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions on new table
GRANT SELECT, INSERT, UPDATE ON nhis_authorization_services TO authenticated;

-- Grant permissions on views
GRANT SELECT ON nhis_provisional_awaiting_code TO authenticated;
GRANT SELECT ON nhis_authorizations_expiring_soon TO authenticated;
GRANT SELECT ON nhis_authorization_service_summary TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION nhis_provisional_approve TO authenticated;
GRANT EXECUTE ON FUNCTION nhis_enter_official_code TO authenticated;
GRANT EXECUTE ON FUNCTION nhis_check_service_authorization TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 086_nhis_provisional_authorization.sql completed successfully';
    RAISE NOTICE 'Added: is_provisional, provisional_reason, provisional_approved_by/at fields';
    RAISE NOTICE 'Added: specific_clinic_code, specific_service_type, authorization_source fields';
    RAISE NOTICE 'Added: nhis_authorization_services table for service mapping';
    RAISE NOTICE 'Added: Database functions for provisional approval workflow';
    RAISE NOTICE 'Added: Dashboard views for NHIS desk monitoring';
END $$;
