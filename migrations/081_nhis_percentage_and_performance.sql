-- =============================================================================
-- Migration: 081_nhis_percentage_and_performance.sql
-- Description: Add NHIS percentage pricing and consultation free flag
--              Plus performance indexes for 100k+ records with 30+ users
-- =============================================================================

-- ============================================================================
-- PART 1: NHIS PERCENTAGE AND FREE CONSULTATION
-- ============================================================================

-- Add NHIS percentage and free consultation fields to clinics
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 70 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100),
ADD COLUMN IF NOT EXISTS nhis_consultation_free BOOLEAN DEFAULT TRUE;

-- Update all clinics: All NHIS services are FREE by default (100% covered)
UPDATE clinics SET 
    nhis_consultation_free = TRUE,
    nhis_percentage = 70,  -- 70% coverage for drugs/procedures
    nhis_consultation_fee = 0,  -- Free consultation for NHIS
    nhis_follow_up_fee = 0,     -- Free follow-up for NHIS
    nhis_emergency_fee = 0,     -- Free emergency for NHIS
    updated_at = NOW()
WHERE nhis_consultation_free IS NULL OR nhis_consultation_free = FALSE;

-- Update the view to include new fields
DROP VIEW IF EXISTS clinic_price_summary;
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
    nhis_percentage,
    nhis_consultation_free,
    is_active,
    updated_at,
    updated_by
FROM clinics
ORDER BY clinic_id;

GRANT SELECT ON clinic_price_summary TO authenticated;

-- ============================================================================
-- PART 2: PERFORMANCE OPTIMIZATION FOR 100K+ RECORDS WITH 30+ USERS
-- ============================================================================

-- Critical indexes for encounters/visits (most queried table)
CREATE INDEX IF NOT EXISTS idx_visits_patient_date ON visits(patient_id, encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status_date ON visits(status, encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_clinic_date ON visits(clinic_id, encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_doctor_date ON visits(attending_doctor_id, encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_payment_category ON visits(payment_category);

-- Composite index for common encounter queries (active visits)
CREATE INDEX IF NOT EXISTS idx_visits_active_today ON visits(status, encounter_date) 
    WHERE status IN ('Created', 'Active', 'Registered');

-- Patient table indexes
CREATE INDEX IF NOT EXISTS idx_patients_emr_number ON patients(emr_number);
CREATE INDEX IF NOT EXISTS idx_patients_name_search ON patients(surname, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_contact_phone ON patients(contact_phone);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

-- Billing orders performance (high volume)
CREATE INDEX IF NOT EXISTS idx_billing_orders_encounter ON billing_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_patient_date ON billing_orders(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_orders_status ON billing_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_orders_pending ON billing_orders(payment_status, created_at DESC) 
    WHERE payment_status = 'Pending';

-- Lab requests performance
CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter ON lab_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_lab_requests_date ON lab_requests(created_at DESC);

-- Prescriptions performance
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

-- Queue performance (critical for real-time updates)
CREATE INDEX IF NOT EXISTS idx_queue_location ON queue(current_location);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_active ON queue(status, current_location) 
    WHERE status IN ('Waiting', 'In Progress', 'Ready_For_Consultation');

-- Consultations performance
CREATE INDEX IF NOT EXISTS idx_consultations_encounter ON consultations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(created_at DESC);

-- Vitals performance
CREATE INDEX IF NOT EXISTS idx_vitals_encounter ON vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_date ON vitals(patient_id, recorded_at DESC);

-- ============================================================================
-- PART 3: QUERY OPTIMIZATION SETTINGS
-- ============================================================================

-- Analyze tables for query planner
ANALYZE visits;
ANALYZE patients;
ANALYZE billing_orders;
ANALYZE lab_requests;
ANALYZE prescriptions;
ANALYZE queue;
ANALYZE consultations;
ANALYZE vitals;

-- ============================================================================
-- PART 4: CONNECTION POOLING RECOMMENDATIONS (Comment for reference)
-- ============================================================================
-- For 30 concurrent users with 100k records:
-- 
-- Supabase connection limits:
-- - Free tier: 60 connections
-- - Pro tier: 100 connections
-- 
-- Recommended pg_bouncer settings:
-- - pool_mode: transaction
-- - default_pool_size: 15
-- - max_client_conn: 100
-- 
-- Application-level recommendations:
-- - Use connection pooling in the app
-- - Implement request queuing for heavy operations
-- - Use pagination (limit 50-100 per page)
-- - Implement caching for static data (clinics, catalogues)

-- ============================================================================
-- PART 5: PERFORMANCE MONITORING VIEW
-- ============================================================================

CREATE OR REPLACE VIEW system_performance_stats AS
SELECT 
    'visits' as table_name,
    (SELECT COUNT(*) FROM visits) as row_count,
    (SELECT COUNT(*) FROM visits WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
UNION ALL
SELECT 
    'patients',
    (SELECT COUNT(*) FROM patients),
    (SELECT COUNT(*) FROM patients WHERE created_at > NOW() - INTERVAL '24 hours')
UNION ALL
SELECT 
    'billing_orders',
    (SELECT COUNT(*) FROM billing_orders),
    (SELECT COUNT(*) FROM billing_orders WHERE created_at > NOW() - INTERVAL '24 hours')
UNION ALL
SELECT 
    'lab_requests',
    (SELECT COUNT(*) FROM lab_requests),
    (SELECT COUNT(*) FROM lab_requests WHERE created_at > NOW() - INTERVAL '24 hours');

GRANT SELECT ON system_performance_stats TO authenticated;

SELECT 'Migration 081 completed: NHIS percentage added, consultation free by default, performance indexes created' as result;
