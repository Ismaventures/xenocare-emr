-- Migration: Facilities Table
-- Version: 000
-- Date: 2026-01-02
-- Description: Creates the facilities table required by other modules

-- ============================================================================
-- FACILITIES TABLE - Hospital/Clinic facility records
-- ============================================================================

CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    facility_type VARCHAR(50) NOT NULL DEFAULT 'hospital' CHECK (facility_type IN (
        'hospital', 'clinic', 'laboratory', 'pharmacy', 'diagnostic_center', 'other'
    )),

    -- Contact Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),

    -- Registration
    license_number VARCHAR(100),
    nhis_provider_id VARCHAR(100),
    tax_id VARCHAR(100),

    -- Operational Details
    bed_capacity INTEGER DEFAULT 0,
    operating_hours VARCHAR(200),
    emergency_available BOOLEAN DEFAULT FALSE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_facilities_code ON facilities(code);
CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active) WHERE is_active = TRUE;

-- Add facility_id to staff table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'staff' AND column_name = 'facility_id'
    ) THEN
        ALTER TABLE staff ADD COLUMN facility_id UUID REFERENCES facilities(id);
    END IF;
END $$;

-- Insert a default facility (your hospital)
INSERT INTO facilities (code, name, facility_type, is_active)
VALUES ('NDC', 'NDC Medical Centre', 'hospital', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Update existing staff to use the default facility
UPDATE staff
SET facility_id = (SELECT id FROM facilities WHERE code = 'NDC' LIMIT 1)
WHERE facility_id IS NULL;

-- RLS Policy
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view facilities" ON facilities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage facilities" ON facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

COMMENT ON TABLE facilities IS 'Hospital and clinic facilities for multi-facility support';
