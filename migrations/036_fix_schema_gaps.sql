-- =============================================================================
-- NDC Medical Centre EMR - SCHEMA GAP FIX
-- Migration: 036_fix_schema_gaps.sql
-- Description: Add missing columns that the frontend expects but are not in the database
-- Issues fixed:
--   1. patients.arm_of_service - Frontend sends this, but DB has military_branch
--   2. notifications.expires_at - Column missing from notifications table
--   3. payer_schemes table - Ensure it exists
-- =============================================================================

-- =====================================================
-- 1. FIX PATIENTS TABLE - Add arm_of_service alias
-- =====================================================

-- Add arm_of_service column as an alias for military_branch
-- This allows the frontend to send arm_of_service directly
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS arm_of_service TEXT;

-- Add other potentially missing patient columns
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS military_coverage_type TEXT,
ADD COLUMN IF NOT EXISTS civilian_coverage_type TEXT,
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS nhis_patient_source TEXT DEFAULT 'Internal',
ADD COLUMN IF NOT EXISTS referral_code TEXT,
ADD COLUMN IF NOT EXISTS referring_facility_name TEXT,
ADD COLUMN IF NOT EXISTS referring_facility_nhis_id TEXT,
ADD COLUMN IF NOT EXISTS referral_date DATE,
ADD COLUMN IF NOT EXISTS referral_reason TEXT,
ADD COLUMN IF NOT EXISTS referral_status TEXT DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS referral_expiry_date DATE,
ADD COLUMN IF NOT EXISTS clinical_summary TEXT;

-- Create index on national_id for NHIS lookups
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON patients(national_id) WHERE national_id IS NOT NULL;

-- Create index on referral_code
CREATE INDEX IF NOT EXISTS idx_patients_referral_code ON patients(referral_code) WHERE referral_code IS NOT NULL;

-- =====================================================
-- 2. FIX NOTIFICATIONS TABLE - Add expires_at column
-- =====================================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create index for efficient expiry checking
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 3. ENSURE PAYER_SCHEMES TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS payer_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payer_schemes ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payer_schemes' 
        AND policyname = 'Allow read access for authenticated users'
    ) THEN
        CREATE POLICY "Allow read access for authenticated users" ON payer_schemes
            FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payer_schemes' 
        AND policyname = 'Allow write access for admins'
    ) THEN
        CREATE POLICY "Allow write access for admins" ON payer_schemes
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Insert default payer schemes if table is empty
INSERT INTO payer_schemes (name, description, is_active)
SELECT * FROM (VALUES
    ('DHML', 'Defence Health Maintenance Limited - Military health insurance', true),
    ('NHIS', 'National Health Insurance Scheme', true),
    ('Private', 'Private/Out-of-pocket payment', true),
    ('HMO', 'Health Maintenance Organization', true)
) AS defaults(name, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM payer_schemes LIMIT 1);

-- =====================================================
-- 4. SYNC arm_of_service WITH military_branch
-- =====================================================

-- For existing records, sync arm_of_service from military_branch
UPDATE patients
SET arm_of_service = military_branch::TEXT
WHERE military_branch IS NOT NULL AND arm_of_service IS NULL;

-- Create a trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_arm_of_service()
RETURNS TRIGGER AS $$
BEGIN
    -- If arm_of_service is set but military_branch is not, sync it
    IF NEW.arm_of_service IS NOT NULL AND NEW.military_branch IS NULL THEN
        NEW.military_branch := NEW.arm_of_service::military_branch_enum;
    END IF;
    
    -- If military_branch is set but arm_of_service is not, sync it
    IF NEW.military_branch IS NOT NULL AND NEW.arm_of_service IS NULL THEN
        NEW.arm_of_service := NEW.military_branch::TEXT;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN invalid_text_representation THEN
        -- If the value can't be cast to the enum, just keep the text value
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_arm_of_service ON patients;
CREATE TRIGGER trg_sync_arm_of_service
    BEFORE INSERT OR UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION sync_arm_of_service();

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN patients.arm_of_service IS 'Military arm of service (Army, Navy, Air Force) - synced with military_branch for compatibility';
COMMENT ON COLUMN patients.nhis_patient_source IS 'Whether patient is Internal or Referral for NHIS purposes';
COMMENT ON COLUMN patients.referral_code IS 'NHIS referral code for referred patients';
COMMENT ON COLUMN notifications.expires_at IS 'Optional expiration timestamp for auto-dismissing notifications';
