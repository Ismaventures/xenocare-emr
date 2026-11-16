-- =============================================================================
-- Migration 060: Fix notify_treatment_plan_created trigger VARCHAR/UUID mismatch
-- =============================================================================
-- 
-- PROBLEM: The notify_treatment_plan_created() trigger compares:
--   patients.patient_id (VARCHAR) = NEW.patient_id (UUID)
-- This causes "operator does not exist: character varying = uuid" error
--
-- Also: notification_type and notification_priority enums may be missing values
--
-- FIX: Use patients.id (UUID) instead of patients.patient_id (VARCHAR)
--      Add missing enum values if needed
-- =============================================================================

-- First, ensure the notification_type enum has required values
DO $$
BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'treatment_plan_created';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'notification_type add value error: %', SQLERRM;
END;
$$;

-- Ensure notification_priority enum has all required values
DO $$
BEGIN
  ALTER TYPE notification_priority ADD VALUE IF NOT EXISTS 'low';
EXCEPTION WHEN others THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TYPE notification_priority ADD VALUE IF NOT EXISTS 'normal';
EXCEPTION WHEN others THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TYPE notification_priority ADD VALUE IF NOT EXISTS 'high';
EXCEPTION WHEN others THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TYPE notification_priority ADD VALUE IF NOT EXISTS 'urgent';
EXCEPTION WHEN others THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TYPE notification_priority ADD VALUE IF NOT EXISTS 'critical';
EXCEPTION WHEN others THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION notify_treatment_plan_created()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_name TEXT;
    v_patient_external_id VARCHAR(50);
    v_creator_name TEXT;
BEGIN
    -- Get patient name and external patient_id (VARCHAR) - notifications table references patients(patient_id)
    SELECT CONCAT(first_name, ' ', surname), patient_id 
    INTO v_patient_name, v_patient_external_id
    FROM patients WHERE id = NEW.patient_id;
    
    -- Get creator name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_creator_name
    FROM staff WHERE id = NEW.created_by;
    
    -- Create notification for nurses
    -- Note: p_patient_id expects VARCHAR(50) patient_id (like "PT-00001"), not UUID
    PERFORM create_notification(
        'treatment_plan_created',           -- p_type VARCHAR
        'New Treatment Plan',               -- p_title VARCHAR
        'Dr. ' || COALESCE(v_creator_name, 'Unknown') || ' created a treatment plan for ' || COALESCE(v_patient_name, 'Patient'),  -- p_message TEXT
        'high',                             -- p_priority VARCHAR
        NULL,                               -- p_target_user_id UUID
        'nurse',                            -- p_target_role VARCHAR
        NULL,                               -- p_target_department VARCHAR
        NEW.encounter_id,                   -- p_encounter_id UUID
        v_patient_external_id,              -- p_patient_id VARCHAR(50) - use external patient_id
        'treatment_plan',                   -- p_reference_type VARCHAR
        NEW.id,                             -- p_reference_id UUID
        '/medical-records?patient=' || COALESCE(v_patient_external_id, NEW.patient_id::TEXT) || '&tab=treatment-plan',  -- p_action_url VARCHAR
        'View Plan',                        -- p_action_label VARCHAR
        NEW.created_by,                     -- p_created_by UUID
        NULL,                               -- p_expires_at TIMESTAMPTZ
        jsonb_build_object('plan_title', NEW.title, 'plan_id', NEW.id)  -- p_metadata JSONB
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_treatment_plan ON treatment_plans;
CREATE TRIGGER trigger_notify_treatment_plan
    AFTER INSERT ON treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION notify_treatment_plan_created();

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION notify_treatment_plan_created() IS 'Fixed: uses patients.id (UUID) instead of patients.patient_id (VARCHAR)';
