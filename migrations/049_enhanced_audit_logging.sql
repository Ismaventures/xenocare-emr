-- =============================================================================
-- NDC Medical Centre EMR - Enhanced Audit Logging
-- Migration: 049_enhanced_audit_logging.sql
-- =============================================================================
-- Implements comprehensive audit logging for all clinical actions with full
-- context preservation for compliance and forensics.
-- =============================================================================

-- =============================================================================
-- AUDIT ACTION CATEGORIES
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE audit_category AS ENUM (
        'patient',           -- Patient record operations
        'encounter',         -- Encounter/visit operations
        'clinical_note',     -- Clinical documentation
        'order',             -- Lab, radiology, procedure orders
        'result',            -- Test results entry
        'prescription',      -- Medication prescriptions
        'vitals',            -- Vital signs recording
        'billing',           -- Billing operations
        'administration',    -- Administrative actions
        'authentication',    -- Login/logout
        'access_control',    -- Permission changes
        'configuration',     -- System configuration
        'data_export',       -- Data exports/reports
        'emergency'          -- Emergency overrides
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'create',
        'read',
        'update',
        'delete',
        'approve',
        'reject',
        'cancel',
        'complete',
        'sign',
        'cosign',
        'transfer',
        'discharge',
        'admit',
        'print',
        'export',
        'login',
        'logout',
        'failed_login',
        'permission_granted',
        'permission_revoked',
        'override',
        'acknowledge'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_severity AS ENUM (
        'info',       -- Routine operations
        'notice',     -- Notable but normal
        'warning',    -- Potential issues
        'alert',      -- Important security/compliance events
        'critical'    -- Requires immediate attention
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- AUDIT LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event classification
    category audit_category NOT NULL,
    action audit_action NOT NULL,
    severity audit_severity DEFAULT 'info',
    
    -- Who performed the action
    user_id UUID REFERENCES staff(id),
    user_role VARCHAR(50),
    user_name VARCHAR(200),
    user_ip VARCHAR(45),
    user_agent TEXT,
    
    -- Session context
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    
    -- What was affected
    resource_type VARCHAR(100) NOT NULL,  -- e.g., 'patient', 'lab_request', 'prescription'
    resource_id VARCHAR(255),  -- ID of the affected resource
    resource_name VARCHAR(500),  -- Human-readable identifier
    
    -- Patient context (for clinical actions)
    patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE SET NULL,
    patient_name VARCHAR(200),
    encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    
    -- Action details
    description TEXT NOT NULL,
    
    -- Before/After state for updates
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],  -- List of field names that changed
    
    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Compliance fields
    reason TEXT,  -- Reason for action (especially for overrides)
    authorization_ref VARCHAR(255),  -- Authorization reference if required
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- For data retention policies
    retention_until DATE,  -- NULL means indefinite
    is_archived BOOLEAN DEFAULT FALSE
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_patient_id ON audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_encounter_id ON audit_logs(encounter_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Category/action filtering
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity) WHERE severity IN ('warning', 'alert', 'critical');

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_patient_date ON audit_logs(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_date ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category_date ON audit_logs(category, created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_audit_metadata ON audit_logs USING GIN (metadata);

-- =============================================================================
-- AUDIT LOG FUNCTION
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
BEGIN
    -- Get user details
    IF p_user_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name), role 
        INTO v_user_name, v_user_role
        FROM staff WHERE id = p_user_id;
    END IF;
    
    -- Get patient name
    IF p_patient_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', surname)
        INTO v_patient_name
        FROM patients WHERE patient_id = p_patient_id;
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
        p_patient_id, v_patient_name, p_encounter_id,
        p_description,
        p_old_values, p_new_values, p_changed_fields,
        p_reason, p_metadata
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- AUTOMATIC AUDIT TRIGGERS
-- =============================================================================

-- Lab Request Audit Trigger
CREATE OR REPLACE FUNCTION audit_lab_request_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action audit_action;
    v_description TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_description := 'Lab test ordered: ' || COALESCE(
            (SELECT name FROM lab_test_catalogue WHERE id = NEW.test_id),
            'Unknown test'
        );
        v_new_values := to_jsonb(NEW);
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Detect specific status changes
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'accepted' THEN v_action := 'approve'; v_description := 'Lab request accepted';
                WHEN 'rejected' THEN v_action := 'reject'; v_description := 'Lab request rejected: ' || COALESCE(NEW.rejection_reason, 'No reason');
                WHEN 'sample_collected' THEN v_action := 'update'; v_description := 'Sample collected for lab request';
                WHEN 'processing' THEN v_action := 'update'; v_description := 'Lab test processing started';
                WHEN 'completed' THEN v_action := 'complete'; v_description := 'Lab results entered';
                ELSE v_action := 'update'; v_description := 'Lab request status changed to ' || NEW.status;
            END CASE;
        ELSE
            v_action := 'update';
            v_description := 'Lab request updated';
        END IF;
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_description := 'Lab request deleted';
        v_old_values := to_jsonb(OLD);
    END IF;
    
    PERFORM log_audit_event(
        'order'::audit_category,
        v_action,
        'lab_request',
        COALESCE(NEW.request_id, OLD.request_id)::TEXT,
        v_description,
        CASE WHEN NEW.is_critical THEN 'alert'::audit_severity ELSE 'info'::audit_severity END,
        COALESCE(NEW.result_entered_by, NEW.ordered_by_id, OLD.ordered_by_id),
        COALESCE(NEW.patient_id, OLD.patient_id),
        COALESCE(NEW.encounter_id, OLD.encounter_id),
        NULL,
        v_old_values,
        v_new_values
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_lab_requests ON lab_requests;
CREATE TRIGGER trigger_audit_lab_requests
    AFTER INSERT OR UPDATE OR DELETE ON lab_requests
    FOR EACH ROW
    EXECUTE FUNCTION audit_lab_request_changes();

-- Prescription Audit Trigger
CREATE OR REPLACE FUNCTION audit_prescription_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action audit_action;
    v_description TEXT;
    v_drug_name TEXT;
BEGIN
    -- Get drug name
    SELECT drug_name INTO v_drug_name
    FROM drug_catalogue WHERE id = COALESCE(NEW.drug_id, OLD.drug_id);
    
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_description := 'Prescription created: ' || COALESCE(v_drug_name, NEW.drug_name, 'Unknown drug');
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'dispensed' THEN v_action := 'complete'; v_description := 'Medication dispensed: ' || COALESCE(v_drug_name, NEW.drug_name);
                WHEN 'cancelled' THEN v_action := 'cancel'; v_description := 'Prescription cancelled: ' || COALESCE(v_drug_name, NEW.drug_name);
                ELSE v_action := 'update'; v_description := 'Prescription status: ' || NEW.status;
            END CASE;
        ELSE
            v_action := 'update';
            v_description := 'Prescription updated: ' || COALESCE(v_drug_name, NEW.drug_name);
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_description := 'Prescription deleted: ' || COALESCE(v_drug_name, OLD.drug_name);
    END IF;
    
    PERFORM log_audit_event(
        'prescription'::audit_category,
        v_action,
        'prescription',
        COALESCE(NEW.id, OLD.id)::TEXT,
        v_description,
        'info'::audit_severity,
        COALESCE(NEW.prescribed_by, OLD.prescribed_by),
        COALESCE(NEW.patient_id, OLD.patient_id),
        COALESCE(NEW.encounter_id, OLD.encounter_id)
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_prescriptions ON prescriptions;
CREATE TRIGGER trigger_audit_prescriptions
    AFTER INSERT OR UPDATE OR DELETE ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION audit_prescription_changes();

-- Vitals Audit Trigger
CREATE OR REPLACE FUNCTION audit_vitals_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action audit_action;
    v_description TEXT;
    v_alerts TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        
        -- Check for abnormal values
        IF NEW.systolic_bp > 180 OR NEW.systolic_bp < 90 THEN
            v_alerts := array_append(v_alerts, 'Abnormal BP');
        END IF;
        IF NEW.heart_rate > 120 OR NEW.heart_rate < 50 THEN
            v_alerts := array_append(v_alerts, 'Abnormal HR');
        END IF;
        IF NEW.temperature > 39 OR NEW.temperature < 35 THEN
            v_alerts := array_append(v_alerts, 'Abnormal Temp');
        END IF;
        IF NEW.spo2 < 92 THEN
            v_alerts := array_append(v_alerts, 'Low SpO2');
        END IF;
        
        v_description := 'Vital signs recorded' || 
            CASE WHEN array_length(v_alerts, 1) > 0 
                 THEN ' [ALERTS: ' || array_to_string(v_alerts, ', ') || ']'
                 ELSE '' END;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
        v_description := 'Vital signs updated';
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_description := 'Vital signs deleted';
    END IF;
    
    PERFORM log_audit_event(
        'vitals'::audit_category,
        v_action,
        'vitals',
        COALESCE(NEW.id, OLD.id)::TEXT,
        v_description,
        CASE WHEN array_length(v_alerts, 1) > 0 THEN 'alert'::audit_severity ELSE 'info'::audit_severity END,
        COALESCE(NEW.recorded_by, OLD.recorded_by),
        COALESCE(NEW.patient_id, OLD.patient_id),
        COALESCE(NEW.encounter_id, OLD.encounter_id),
        NULL,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        NULL,
        NULL,
        CASE WHEN array_length(v_alerts, 1) > 0 
             THEN jsonb_build_object('alerts', v_alerts) 
             ELSE '{}'::jsonb END
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_vitals ON vitals;
CREATE TRIGGER trigger_audit_vitals
    AFTER INSERT OR UPDATE OR DELETE ON vitals
    FOR EACH ROW
    EXECUTE FUNCTION audit_vitals_changes();

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Recent audit events view
CREATE OR REPLACE VIEW recent_audit_events AS
SELECT 
    al.id,
    al.created_at,
    al.category,
    al.action,
    al.severity,
    al.user_name,
    al.user_role,
    al.resource_type,
    al.resource_name,
    al.patient_name,
    al.description,
    al.reason,
    al.metadata
FROM audit_logs al
WHERE al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;

-- Security events view (login failures, permission changes, etc.)
CREATE OR REPLACE VIEW security_audit_events AS
SELECT *
FROM audit_logs
WHERE category IN ('authentication', 'access_control', 'emergency')
   OR severity IN ('warning', 'alert', 'critical')
ORDER BY created_at DESC;

-- Patient access log (who accessed patient records)
CREATE OR REPLACE VIEW patient_access_log AS
SELECT 
    al.id,
    al.created_at,
    al.patient_id,
    al.patient_name,
    al.user_name,
    al.user_role,
    al.action,
    al.resource_type,
    al.description
FROM audit_logs al
WHERE al.patient_id IS NOT NULL
ORDER BY al.created_at DESC;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can see all audit logs
CREATE POLICY audit_select_admin ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

-- Users can see their own audit trail
CREATE POLICY audit_select_own ON audit_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- Only system can insert audit logs
CREATE POLICY audit_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (TRUE);

-- No updates or deletes allowed (immutable)
-- (No UPDATE or DELETE policies)

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON recent_audit_events TO authenticated;
GRANT SELECT ON security_audit_events TO authenticated;
GRANT SELECT ON patient_access_log TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all clinical and administrative actions';
COMMENT ON COLUMN audit_logs.old_values IS 'State before the change (for updates/deletes)';
COMMENT ON COLUMN audit_logs.new_values IS 'State after the change (for inserts/updates)';
COMMENT ON COLUMN audit_logs.changed_fields IS 'List of fields that were modified';
COMMENT ON COLUMN audit_logs.reason IS 'Justification for action (required for overrides)';
COMMENT ON VIEW recent_audit_events IS 'Last 24 hours of audit events';
COMMENT ON VIEW security_audit_events IS 'Security-related audit events for monitoring';
COMMENT ON VIEW patient_access_log IS 'Record of who accessed patient information';
