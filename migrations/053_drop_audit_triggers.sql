-- Migration 051: Drop all problematic audit triggers from migration 049
-- =============================================================================
-- RUN THIS SQL DIRECTLY IN SUPABASE SQL EDITOR
-- These triggers cause "operator does not exist: character varying = uuid"
-- =============================================================================

-- First, list all triggers on vitals to debug (run this SELECT first to see what exists)
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'vitals';

-- Step 1: Drop ALL triggers on vitals (nuclear option)
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'vitals'
        AND trigger_name LIKE '%audit%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trigger_rec.trigger_name) || ' ON vitals CASCADE';
        RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
    END LOOP;
END $$;

-- Step 2: Explicit drops for known audit triggers
DROP TRIGGER IF EXISTS trigger_audit_vitals ON vitals;
DROP TRIGGER IF EXISTS audit_vitals_trigger ON vitals;
DROP TRIGGER IF EXISTS trigger_audit_lab_requests ON lab_requests;
DROP TRIGGER IF EXISTS audit_lab_request_trigger ON lab_requests;
DROP TRIGGER IF EXISTS trigger_audit_prescriptions ON prescriptions;
DROP TRIGGER IF EXISTS audit_prescription_trigger ON prescriptions;
DROP TRIGGER IF EXISTS trigger_audit_radiology_requests ON radiology_requests;
DROP TRIGGER IF EXISTS audit_radiology_request_trigger ON radiology_requests;

-- Step 3: Drop all audit functions (CASCADE will also drop dependent triggers)
DROP FUNCTION IF EXISTS audit_vitals_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_lab_request_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_prescription_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_radiology_request_changes() CASCADE;

-- Step 4: Drop the log_audit_event function (main culprit)
DROP FUNCTION IF EXISTS log_audit_event(audit_category, audit_action, varchar, varchar, text, audit_severity, uuid, varchar, uuid, varchar, jsonb, jsonb, text[], text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS log_audit_event CASCADE;

-- Step 5: Drop the audit_logs table (has bad FK to patients.patient_id)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Step 6: Drop custom enum types from migration 049
DROP TYPE IF EXISTS audit_category CASCADE;
DROP TYPE IF EXISTS audit_severity CASCADE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify: Run this to confirm no audit triggers remain
-- SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE '%audit%';
