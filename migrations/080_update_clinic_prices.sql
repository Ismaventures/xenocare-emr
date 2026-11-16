-- =============================================================================
-- Migration: 080_update_clinic_prices.sql
-- Description: Update clinic consultation prices with comprehensive fee structure
-- Note: These prices are editable by Super Admin through the EMR interface
-- =============================================================================

-- Update all clinics with comprehensive pricing including NHIS fees
-- Using ON CONFLICT to update existing records or insert new ones

-- First, ensure the clinics table has all necessary columns
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS nhis_consultation_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nhis_follow_up_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nhis_emergency_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id);

-- Update existing clinics with proper pricing (these are default values that admin can edit)
UPDATE clinics SET
    consultation_fee = 500.00,
    follow_up_fee = 300.00,
    emergency_fee = 1000.00,
    nhis_consultation_fee = 350.00,
    nhis_follow_up_fee = 200.00,
    nhis_emergency_fee = 700.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-001';

UPDATE clinics SET
    consultation_fee = 1000.00,
    follow_up_fee = 500.00,
    emergency_fee = 2000.00,
    nhis_consultation_fee = 700.00,
    nhis_follow_up_fee = 350.00,
    nhis_emergency_fee = 1400.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-002';

UPDATE clinics SET
    consultation_fee = 1500.00,
    follow_up_fee = 750.00,
    emergency_fee = 3000.00,
    nhis_consultation_fee = 1050.00,
    nhis_follow_up_fee = 525.00,
    nhis_emergency_fee = 2100.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-003';

UPDATE clinics SET
    consultation_fee = 800.00,
    follow_up_fee = 400.00,
    emergency_fee = 1500.00,
    nhis_consultation_fee = 560.00,
    nhis_follow_up_fee = 280.00,
    nhis_emergency_fee = 1050.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-004';

UPDATE clinics SET
    consultation_fee = 1200.00,
    follow_up_fee = 600.00,
    emergency_fee = 2500.00,
    nhis_consultation_fee = 840.00,
    nhis_follow_up_fee = 420.00,
    nhis_emergency_fee = 1750.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-005';

UPDATE clinics SET
    consultation_fee = 1000.00,
    follow_up_fee = 500.00,
    emergency_fee = 2000.00,
    nhis_consultation_fee = 700.00,
    nhis_follow_up_fee = 350.00,
    nhis_emergency_fee = 1400.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-006';

UPDATE clinics SET
    consultation_fee = 1000.00,
    follow_up_fee = 500.00,
    emergency_fee = 2000.00,
    nhis_consultation_fee = 700.00,
    nhis_follow_up_fee = 350.00,
    nhis_emergency_fee = 1400.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-007';

UPDATE clinics SET
    consultation_fee = 1000.00,
    follow_up_fee = 500.00,
    emergency_fee = 2000.00,
    nhis_consultation_fee = 700.00,
    nhis_follow_up_fee = 350.00,
    nhis_emergency_fee = 1400.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-008';

UPDATE clinics SET
    consultation_fee = 1500.00,
    follow_up_fee = 750.00,
    emergency_fee = 3000.00,
    nhis_consultation_fee = 1050.00,
    nhis_follow_up_fee = 525.00,
    nhis_emergency_fee = 2100.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-009';

UPDATE clinics SET
    consultation_fee = 1000.00,
    follow_up_fee = 500.00,
    emergency_fee = 1500.00,
    nhis_consultation_fee = 700.00,
    nhis_follow_up_fee = 350.00,
    nhis_emergency_fee = 1050.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-010';

UPDATE clinics SET
    consultation_fee = 800.00,
    follow_up_fee = 400.00,
    emergency_fee = 1500.00,
    nhis_consultation_fee = 560.00,
    nhis_follow_up_fee = 280.00,
    nhis_emergency_fee = 1050.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-011';

UPDATE clinics SET
    consultation_fee = 300.00,
    follow_up_fee = 200.00,
    emergency_fee = 500.00,
    nhis_consultation_fee = 210.00,
    nhis_follow_up_fee = 140.00,
    nhis_emergency_fee = 350.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-012';

UPDATE clinics SET
    consultation_fee = 500.00,
    follow_up_fee = 300.00,
    emergency_fee = 800.00,
    nhis_consultation_fee = 350.00,
    nhis_follow_up_fee = 210.00,
    nhis_emergency_fee = 560.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-013';

UPDATE clinics SET
    consultation_fee = 1500.00,
    follow_up_fee = 800.00,
    emergency_fee = 2000.00,
    nhis_consultation_fee = 1050.00,
    nhis_follow_up_fee = 560.00,
    nhis_emergency_fee = 1400.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-014';

UPDATE clinics SET
    consultation_fee = 1000.00,
    follow_up_fee = 500.00,
    emergency_fee = 1500.00,
    nhis_consultation_fee = 700.00,
    nhis_follow_up_fee = 350.00,
    nhis_emergency_fee = 1050.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-015';

-- Insert any missing specialty clinics with default prices
INSERT INTO clinics (clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES 
    ('CLN-016', 'Cardiology Clinic', 'CAR', 'Heart and cardiovascular services', 2000.00, 1000.00, 4000.00, 1400.00, 700.00, 2800.00, true),
    ('CLN-017', 'Neurology Clinic', 'NEU', 'Brain and nervous system services', 2000.00, 1000.00, 4000.00, 1400.00, 700.00, 2800.00, true),
    ('CLN-018', 'Oncology Clinic', 'ONC', 'Cancer treatment services', 2500.00, 1200.00, 5000.00, 1750.00, 840.00, 3500.00, true),
    ('CLN-019', 'Nephrology Clinic', 'NEP', 'Kidney and renal services', 1800.00, 900.00, 3500.00, 1260.00, 630.00, 2450.00, true),
    ('CLN-020', 'Urology Clinic', 'URO', 'Urinary tract and male reproductive services', 1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true),
    ('CLN-021', 'Gastroenterology Clinic', 'GAS', 'Digestive system services', 1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true),
    ('CLN-022', 'Endocrinology Clinic', 'END', 'Hormone and metabolic services', 1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true),
    ('CLN-023', 'Rheumatology Clinic', 'RHE', 'Joint and autoimmune services', 1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true),
    ('CLN-024', 'Pulmonology Clinic', 'PUL', 'Lung and respiratory services', 1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true),
    ('CLN-025', 'Infectious Disease Clinic', 'INF', 'Infectious disease management', 1200.00, 600.00, 2500.00, 840.00, 420.00, 1750.00, true)
ON CONFLICT (clinic_id) DO NOTHING;

-- Create a view for clinic price summary (useful for admin dashboard)
CREATE OR REPLACE VIEW clinic_price_summary AS
SELECT 
    clinic_id,
    clinic_name,
    clinic_code,
    consultation_fee AS private_consultation,
    follow_up_fee AS private_follow_up,
    emergency_fee AS private_emergency,
    nhis_consultation_fee AS nhis_consultation,
    nhis_follow_up_fee AS nhis_follow_up,
    nhis_emergency_fee AS nhis_emergency,
    is_active,
    updated_at,
    updated_by
FROM clinics
ORDER BY clinic_id;

-- Grant access to the view
GRANT SELECT ON clinic_price_summary TO authenticated;

-- Add comment explaining the pricing structure
COMMENT ON TABLE clinics IS 'Clinic configuration with consultation fees. Private fees apply to cash-paying patients. NHIS fees apply to insured patients. Super Admin can edit these prices through the EMR interface.';

SELECT 'Migration 080 completed: Clinic prices updated with comprehensive fee structure' as result;
