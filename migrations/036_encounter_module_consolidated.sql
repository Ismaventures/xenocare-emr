-- Migration 036: Encounter Module Consolidated
-- This migration consolidates all encounter-related schema changes
-- Run this in Supabase SQL Editor
-- Date: December 23, 2025

-- ============================================================================
-- PART 1: FIX PATIENT ID DEFAULT (from 035)
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fix patient_id auto-generation
ALTER TABLE patients 
ALTER COLUMN patient_id SET DEFAULT gen_random_uuid();

-- EMR Number Sequence
DROP SEQUENCE IF EXISTS emr_number_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS emr_number_seq START WITH 1;

-- Function to generate EMR number with NDC prefix
CREATE OR REPLACE FUNCTION generate_emr_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.emr_number IS NULL OR NEW.emr_number = '' THEN
        NEW.emr_number := 'NDC-' || LPAD(nextval('emr_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_generate_emr_number ON patients;
CREATE TRIGGER trg_generate_emr_number
    BEFORE INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION generate_emr_number();

-- ============================================================================
-- PART 2: VISIT STATUS ENUM UPDATES
-- ============================================================================

-- Add missing visit status values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Created' 
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'visit_status')) THEN
        ALTER TYPE visit_status ADD VALUE 'Created';
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Closed' 
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'visit_status')) THEN
        ALTER TYPE visit_status ADD VALUE 'Closed';
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================================
-- PART 3: QUEUE STATUS ENUM UPDATES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Ready_For_Consultation' 
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'queue_status')) THEN
        ALTER TYPE queue_status ADD VALUE 'Ready_For_Consultation';
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Skipped' 
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'queue_status')) THEN
        ALTER TYPE queue_status ADD VALUE 'Skipped';
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================================
-- PART 4: REQUEST STATUS ENUM UPDATES (for Lab, Radiology, Pharmacy)
-- ============================================================================

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Accepted';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Rejected';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Awaiting_Payment';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Paid';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Waived';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Sample_Collected';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Processing';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Result_Ready';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Result_Viewed';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

-- ============================================================================
-- PART 5: DISPENSE STATUS ENUM UPDATES (for Pharmacy)
-- ============================================================================

DO $$
BEGIN
    ALTER TYPE dispense_status ADD VALUE IF NOT EXISTS 'Verified';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE dispense_status ADD VALUE IF NOT EXISTS 'Awaiting_Payment';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE dispense_status ADD VALUE IF NOT EXISTS 'Paid';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE dispense_status ADD VALUE IF NOT EXISTS 'Waived';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

-- ============================================================================
-- PART 6: ADD ENCOUNTER FIELDS TO VISITS TABLE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
        ALTER TABLE visits 
        ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'registered',
        ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::JSONB,
        ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS closed_by UUID,
        ADD COLUMN IF NOT EXISTS closed_reason TEXT;
    END IF;
END $$;

-- ============================================================================
-- PART 7: ADD ENCOUNTER_ID TO CLINICAL TABLES
-- ============================================================================

-- Lab requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_requests') THEN
        ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS encounter_id UUID;
        UPDATE lab_requests SET encounter_id = visit_id WHERE encounter_id IS NULL AND visit_id IS NOT NULL;
    END IF;
END $$;

-- Prescriptions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
        ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS encounter_id UUID;
        UPDATE prescriptions SET encounter_id = visit_id WHERE encounter_id IS NULL AND visit_id IS NOT NULL;
    END IF;
END $$;

-- Radiology requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'radiology_requests') THEN
        ALTER TABLE radiology_requests ADD COLUMN IF NOT EXISTS encounter_id UUID;
        UPDATE radiology_requests SET encounter_id = visit_id WHERE encounter_id IS NULL AND visit_id IS NOT NULL;
    END IF;
END $$;

-- Billing orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_orders') THEN
        ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS encounter_id UUID;
        UPDATE billing_orders SET encounter_id = visit_id WHERE encounter_id IS NULL AND visit_id IS NOT NULL;
    END IF;
END $$;

-- Invoices (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS encounter_id UUID;
    END IF;
END $$;

-- ============================================================================
-- PART 8: CREATE PRIORITY ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_priority_enum') THEN
        CREATE TYPE queue_priority_enum AS ENUM ('Emergency', 'Urgent', 'Normal');
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================================
-- PART 9: QUEUE TABLE ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue') THEN
        ALTER TABLE queue 
        ADD COLUMN IF NOT EXISTS wait_start_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS ready_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS consultation_start_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS consultation_end_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS skip_reason TEXT;
    END IF;
END $$;

-- ============================================================================
-- PART 10: LAB REQUESTS ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_requests') THEN
        ALTER TABLE lab_requests
        ADD COLUMN IF NOT EXISTS accepted_by UUID,
        ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
        ADD COLUMN IF NOT EXISTS rejected_by UUID,
        ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS sample_collected_by UUID,
        ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS result_entered_by UUID,
        ADD COLUMN IF NOT EXISTS result_entered_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS result_viewed_by UUID,
        ADD COLUMN IF NOT EXISTS result_viewed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS critical_notified_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- PART 11: RADIOLOGY REQUESTS ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'radiology_requests') THEN
        ALTER TABLE radiology_requests
        ADD COLUMN IF NOT EXISTS accepted_by UUID,
        ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
        ADD COLUMN IF NOT EXISTS rejected_by UUID,
        ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS scheduled_by UUID,
        ADD COLUMN IF NOT EXISTS scan_completed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS scan_completed_by UUID,
        ADD COLUMN IF NOT EXISTS report_uploaded_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS report_uploaded_by UUID,
        ADD COLUMN IF NOT EXISTS report_viewed_by UUID,
        ADD COLUMN IF NOT EXISTS report_viewed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS contrast_used BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS contrast_type TEXT;
    END IF;
END $$;

-- ============================================================================
-- PART 12: PRESCRIPTIONS ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
        ALTER TABLE prescriptions
        ADD COLUMN IF NOT EXISTS verified_by UUID,
        ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS verification_notes TEXT,
        ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS dispensed_by UUID,
        ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS partial_dispense_reason TEXT,
        ADD COLUMN IF NOT EXISTS backorder_items JSONB DEFAULT '[]'::JSONB,
        ADD COLUMN IF NOT EXISTS drug_interaction_checked BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS allergy_checked BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ============================================================================
-- PART 13: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_current_stage ON visits(current_stage);
CREATE INDEX IF NOT EXISTS idx_visits_status_stage ON visits(status, current_stage);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_requests') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lab_requests' AND column_name = 'encounter_id') THEN
        CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter ON lab_requests(encounter_id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'encounter_id') THEN
        CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter ON prescriptions(encounter_id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_orders')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_orders' AND column_name = 'encounter_id') THEN
        CREATE INDEX IF NOT EXISTS idx_billing_orders_encounter ON billing_orders(encounter_id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'radiology_requests')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'radiology_requests' AND column_name = 'encounter_id') THEN
        CREATE INDEX IF NOT EXISTS idx_radiology_requests_encounter ON radiology_requests(encounter_id);
    END IF;
END $$;

-- ============================================================================
-- PART 14: ENCOUNTER HELPER FUNCTIONS
-- ============================================================================

-- Function to validate encounter is active before modifications
CREATE OR REPLACE FUNCTION validate_encounter_active(p_encounter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status::TEXT INTO v_status
    FROM visits
    WHERE id = p_encounter_id;
    
    IF v_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF v_status IN ('Completed', 'Closed', 'Cancelled') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 15: VISIT_ID AND ENCOUNTER NUMBER GENERATION
-- ============================================================================

-- Sequence for visit_id
DROP SEQUENCE IF EXISTS visit_id_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS visit_id_seq START WITH 1001;

-- Function to generate visit_id
CREATE OR REPLACE FUNCTION generate_visit_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visit_id IS NULL OR NEW.visit_id = '' THEN
        NEW.visit_id := 'VIS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('visit_id_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger for visit_id
DROP TRIGGER IF EXISTS trg_generate_visit_id ON visits;
CREATE TRIGGER trg_generate_visit_id
    BEFORE INSERT ON visits
    FOR EACH ROW
    EXECUTE FUNCTION generate_visit_id();

-- Sequence for encounter_number
DROP SEQUENCE IF EXISTS encounter_number_seq CASCADE;
CREATE SEQUENCE IF NOT EXISTS encounter_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION generate_encounter_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.encounter_number IS NULL OR NEW.encounter_number = '' THEN
        NEW.encounter_number := 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('encounter_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_encounter_number ON visits;
CREATE TRIGGER trg_generate_encounter_number
    BEFORE INSERT ON visits
    FOR EACH ROW
    EXECUTE FUNCTION generate_encounter_number();

-- ============================================================================
-- PART 16: GET USER ROLE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.user_role', true),
        (SELECT role::TEXT FROM staff WHERE user_id = auth.uid() LIMIT 1),
        'anonymous'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 17: ADD ADDITIONAL PAYMENT METHOD VALUES
-- ============================================================================

-- Add DHML (Defence Health Maintenance Limited) and other military payment schemes
DO $$
BEGIN
    ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'DHML';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Military_Free';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Staff_Account';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Bank_Transfer';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

-- ============================================================================
-- PART 18: SEED DEFAULT CLINICS (if not exists)
-- ============================================================================

-- Insert default clinics for NDC Medical Centre
INSERT INTO clinics (clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, is_active)
VALUES 
    ('CLN-001', 'General Out-Patient', 'GOP', 'General outpatient clinic for all patients', 500.00, 300.00, 1000.00, true),
    ('CLN-002', 'Medical Out-Patient', 'MOP', 'Medical outpatient clinic', 1000.00, 500.00, 2000.00, true),
    ('CLN-003', 'Surgical Out-Patient', 'SOP', 'Surgical outpatient clinic', 1500.00, 750.00, 3000.00, true),
    ('CLN-004', 'Paediatrics', 'PED', 'Paediatric outpatient clinic', 800.00, 400.00, 1500.00, true),
    ('CLN-005', 'Obstetrics & Gynaecology', 'OBG', 'O&G outpatient clinic', 1200.00, 600.00, 2500.00, true),
    ('CLN-006', 'Dental Clinic', 'DEN', 'Dental outpatient services', 1000.00, 500.00, 2000.00, true),
    ('CLN-007', 'Eye Clinic', 'EYE', 'Ophthalmology outpatient services', 1000.00, 500.00, 2000.00, true),
    ('CLN-008', 'ENT Clinic', 'ENT', 'Ear, Nose & Throat outpatient services', 1000.00, 500.00, 2000.00, true),
    ('CLN-009', 'Orthopaedic Clinic', 'ORT', 'Orthopaedic outpatient services', 1500.00, 750.00, 3000.00, true),
    ('CLN-010', 'Psychiatry', 'PSY', 'Mental health outpatient services', 1000.00, 500.00, 1500.00, true),
    ('CLN-011', 'Antenatal Clinic', 'ANC', 'Antenatal care services', 800.00, 400.00, 1500.00, true),
    ('CLN-012', 'Immunization Clinic', 'IMM', 'Vaccination and immunization services', 300.00, 200.00, 500.00, true),
    ('CLN-013', 'Family Planning', 'FPL', 'Family planning services', 500.00, 300.00, 800.00, true),
    ('CLN-014', 'Physiotherapy', 'PHY', 'Physiotherapy services', 1500.00, 800.00, 2000.00, true),
    ('CLN-015', 'Skin Clinic', 'SKN', 'Dermatology outpatient services', 1000.00, 500.00, 1500.00, true)
ON CONFLICT (clinic_id) DO NOTHING;

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 'Migration 036 completed successfully. Encounter module schema is ready.' as result;
