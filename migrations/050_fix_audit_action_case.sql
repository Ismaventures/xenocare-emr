-- Migration 050: Fix audit_action enum case mismatch
-- =============================================================================
-- The audit_action enum from 001_fresh_schema.sql has UPPERCASE values:
--   'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'
-- 
-- Migration 049 tried to create a new audit_action enum with lowercase values,
-- but since the enum already exists, the old uppercase values remain.
-- 
-- This migration fixes the triggers to use clinical_audit_log (from 001_fresh_schema)
-- which uses TEXT for action column, and uses uppercase for consistency.
-- =============================================================================

-- =============================================================================
-- LAB REQUEST AUDIT TRIGGER - Fixed to use clinical_audit_log
-- =============================================================================
CREATE OR REPLACE FUNCTION audit_lab_request_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_description TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_description := 'Lab test ordered: ' || COALESCE(
            (SELECT name FROM lab_test_catalogue WHERE id = NEW.test_id),
            'Unknown test'
        );
        v_new_values := to_jsonb(NEW);
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Detect specific status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            CASE NEW.status
                WHEN 'Accepted' THEN v_action := 'UPDATE'; v_description := 'Lab request accepted';
                WHEN 'Rejected' THEN v_action := 'UPDATE'; v_description := 'Lab request rejected: ' || COALESCE(NEW.rejection_reason, 'No reason');
                WHEN 'Sample Collected' THEN v_action := 'UPDATE'; v_description := 'Sample collected for lab request';
                WHEN 'In Progress' THEN v_action := 'UPDATE'; v_description := 'Lab test processing started';
                WHEN 'Completed' THEN v_action := 'UPDATE'; v_description := 'Lab results entered';
                ELSE v_action := 'UPDATE'; v_description := 'Lab request status changed to ' || NEW.status;
            END CASE;
        ELSE
            v_action := 'UPDATE';
            v_description := 'Lab request updated';
        END IF;
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_description := 'Lab request deleted';
        v_old_values := to_jsonb(OLD);
    END IF;

    -- Insert into clinical_audit_log (from 001_fresh_schema.sql - uses TEXT for action)
    IF v_action IS NOT NULL THEN
        INSERT INTO clinical_audit_log (
            encounter_id,
            patient_id,
            action,
            entity_type,
            entity_id,
            performed_by,
            old_value,
            new_value,
            notes
        ) VALUES (
            COALESCE(NEW.encounter_id, OLD.encounter_id, NEW.visit_id, OLD.visit_id),
            COALESCE(NEW.patient_id, OLD.patient_id),
            v_action,
            'lab_request',
            COALESCE(NEW.request_id, OLD.request_id),
            COALESCE(NEW.ordered_by, OLD.ordered_by),
            v_old_values,
            v_new_values,
            v_description
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the main operation if audit fails
        RAISE WARNING 'Audit log failed for lab_request: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PRESCRIPTION AUDIT TRIGGER - Fixed to use clinical_audit_log
-- =============================================================================
CREATE OR REPLACE FUNCTION audit_prescription_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_description TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_description := 'Medication prescribed: ' || COALESCE(NEW.drug_name, 'Unknown drug');
        v_new_values := to_jsonb(NEW);
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            CASE NEW.status
                WHEN 'Accepted' THEN v_action := 'UPDATE'; v_description := 'Prescription verified';
                WHEN 'Rejected' THEN v_action := 'UPDATE'; v_description := 'Prescription rejected: ' || COALESCE(NEW.rejection_reason, 'No reason');
                WHEN 'Dispensed' THEN v_action := 'UPDATE'; v_description := 'Medication dispensed';
                WHEN 'Partially Dispensed' THEN v_action := 'UPDATE'; v_description := 'Medication partially dispensed';
                ELSE v_action := 'UPDATE'; v_description := 'Prescription status changed to ' || NEW.status;
            END CASE;
        ELSE
            v_action := 'UPDATE';
            v_description := 'Prescription updated';
        END IF;
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_description := 'Prescription deleted';
        v_old_values := to_jsonb(OLD);
    END IF;

    IF v_action IS NOT NULL THEN
        INSERT INTO clinical_audit_log (
            encounter_id,
            patient_id,
            action,
            entity_type,
            entity_id,
            performed_by,
            old_value,
            new_value,
            notes
        ) VALUES (
            COALESCE(NEW.encounter_id, OLD.encounter_id, NEW.visit_id, OLD.visit_id),
            COALESCE(NEW.patient_id, OLD.patient_id),
            v_action,
            'prescription',
            COALESCE(NEW.prescription_id, OLD.prescription_id),
            COALESCE(NEW.doctor_id, OLD.doctor_id),
            v_old_values,
            v_new_values,
            v_description
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Audit log failed for prescription: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RADIOLOGY REQUEST AUDIT TRIGGER - Fixed to use clinical_audit_log
-- =============================================================================
CREATE OR REPLACE FUNCTION audit_radiology_request_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_description TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_description := 'Imaging ordered';
        v_new_values := to_jsonb(NEW);
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            CASE NEW.status
                WHEN 'Accepted' THEN v_action := 'UPDATE'; v_description := 'Imaging request accepted';
                WHEN 'Rejected' THEN v_action := 'UPDATE'; v_description := 'Imaging request rejected';
                WHEN 'In Progress' THEN v_action := 'UPDATE'; v_description := 'Imaging in progress';
                WHEN 'Completed' THEN v_action := 'UPDATE'; v_description := 'Imaging completed';
                WHEN 'Reported' THEN v_action := 'UPDATE'; v_description := 'Imaging report completed';
                ELSE v_action := 'UPDATE'; v_description := 'Imaging request status changed to ' || NEW.status;
            END CASE;
        ELSE
            v_action := 'UPDATE';
            v_description := 'Imaging request updated';
        END IF;
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_description := 'Imaging request deleted';
        v_old_values := to_jsonb(OLD);
    END IF;

    IF v_action IS NOT NULL THEN
        INSERT INTO clinical_audit_log (
            encounter_id,
            patient_id,
            action,
            entity_type,
            entity_id,
            performed_by,
            old_value,
            new_value,
            notes
        ) VALUES (
            COALESCE(NEW.encounter_id, OLD.encounter_id, NEW.visit_id, OLD.visit_id),
            COALESCE(NEW.patient_id, OLD.patient_id),
            v_action,
            'radiology_request',
            COALESCE(NEW.request_id, OLD.request_id),
            COALESCE(NEW.ordered_by, OLD.ordered_by),
            v_old_values,
            v_new_values,
            v_description
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Audit log failed for radiology_request: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION audit_lab_request_changes() IS 'Audit trigger for lab requests - uses clinical_audit_log with TEXT action';
COMMENT ON FUNCTION audit_prescription_changes() IS 'Audit trigger for prescriptions - uses clinical_audit_log with TEXT action';
COMMENT ON FUNCTION audit_radiology_request_changes() IS 'Audit trigger for radiology requests - uses clinical_audit_log with TEXT action';

-- =============================================================================
-- FIX log_audit_event function to handle UUID patient_id
-- The function was receiving UUID from vitals.patient_id but comparing against
-- patients.patient_id which is VARCHAR, causing "operator does not exist: character varying = uuid"
-- 
-- Also: audit_logs.patient_id has FK to patients.patient_id (VARCHAR), so we must
-- look up the actual patient_id string when given a UUID
-- =============================================================================

CREATE OR REPLACE FUNCTION log_audit_event(
    p_category audit_category,
    p_action audit_action,
    p_resource_type VARCHAR(100),
    p_resource_id VARCHAR(255),
    p_description TEXT,
    p_severity audit_severity DEFAULT 'info',
    p_user_id UUID DEFAULT NULL,
    p_patient_id VARCHAR(50) DEFAULT NULL,
    p_encounter_id UUID DEFAULT NULL,
    p_resource_name VARCHAR(500) DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_changed_fields TEXT[] DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_user_name VARCHAR(200);
    v_user_role VARCHAR(50);
    v_patient_name VARCHAR(200);
    v_patient_id_varchar VARCHAR(50);  -- The actual patient_id for FK
    v_patient_id_uuid UUID;
BEGIN
    -- Get user details
    IF p_user_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name), role 
        INTO v_user_name, v_user_role
        FROM staff WHERE id = p_user_id;
    END IF;
    
    -- Get patient name AND the correct patient_id (VARCHAR) for FK
    -- p_patient_id could be either a UUID (from vitals) or a VARCHAR patient_id
    IF p_patient_id IS NOT NULL THEN
        -- Try to cast to UUID first (for tables like vitals that use UUID patient_id)
        BEGIN
            v_patient_id_uuid := p_patient_id::UUID;
            -- Look up by UUID (id column), get back the VARCHAR patient_id for FK
            SELECT patient_id, CONCAT(first_name, ' ', surname)
            INTO v_patient_id_varchar, v_patient_name
            FROM patients WHERE id = v_patient_id_uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            -- Not a valid UUID, assume it's already a VARCHAR patient_id
            v_patient_id_varchar := p_patient_id;
            SELECT CONCAT(first_name, ' ', surname)
            INTO v_patient_name
            FROM patients WHERE patient_id = p_patient_id;
        END;
    END IF;
    
    INSERT INTO audit_logs (
        category, action, severity,
        user_id, user_role, user_name,
        resource_type, resource_id, resource_name,
        patient_id, patient_name, encounter_id,
        description,
        old_values, new_values, changed_fields,
        reason, metadata
    ) VALUES (
        p_category, p_action, p_severity,
        p_user_id, v_user_role, v_user_name,
        p_resource_type, p_resource_id, p_resource_name,
        v_patient_id_varchar, v_patient_name, p_encounter_id,  -- Use the VARCHAR patient_id
        p_description,
        p_old_values, p_new_values, p_changed_fields,
        p_reason, p_metadata
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the main operation if audit fails
        RAISE WARNING 'Audit log_audit_event failed: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FIX Vitals Audit Trigger - DISABLE IT
-- The vitals.patient_id is UUID but audit_logs.patient_id FK references 
-- patients.patient_id (VARCHAR). This causes type mismatch errors.
-- Since schema.sql doesn't have this trigger, we'll drop it.
-- =============================================================================

-- Drop the problematic trigger entirely
DROP TRIGGER IF EXISTS trigger_audit_vitals ON vitals;

-- Also drop any other audit trigger variants that might exist
DROP TRIGGER IF EXISTS audit_vitals_trigger ON vitals;

-- Drop the function if it exists (optional, keeps db clean)
DROP FUNCTION IF EXISTS audit_vitals_changes() CASCADE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
