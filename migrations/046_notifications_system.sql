-- =============================================================================
-- NDC Medical Centre EMR - Notifications System
-- Migration: 046_notifications_system.sql
-- =============================================================================
-- Creates a comprehensive notification system for clinical alerts and workflow
-- notifications. Supports real-time updates via Supabase subscriptions.
-- =============================================================================

-- Create notification type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'treatment_plan_created',
        'treatment_plan_updated',
        'order_placed',
        'order_accepted',
        'order_rejected',
        'result_ready',
        'result_critical',
        'admission_request',
        'admission_confirmed',
        'discharge_ready',
        'vitals_overdue',
        'medication_due',
        'shift_handover',
        'consultation_request',
        'encounter_assigned',
        'encounter_transferred',
        'system_alert',
        'billing_alert'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification priority enum
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM (
        'low',
        'normal',
        'high',
        'urgent',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

-- First, add any missing columns to existing table
DO $$ 
BEGIN
    -- Core columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_user_id') THEN
        ALTER TABLE notifications ADD COLUMN target_user_id UUID REFERENCES staff(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_role') THEN
        ALTER TABLE notifications ADD COLUMN target_role VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_department') THEN
        ALTER TABLE notifications ADD COLUMN target_department VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'encounter_id') THEN
        ALTER TABLE notifications ADD COLUMN encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'patient_id') THEN
        ALTER TABLE notifications ADD COLUMN patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'reference_type') THEN
        ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'reference_id') THEN
        ALTER TABLE notifications ADD COLUMN reference_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
        ALTER TABLE notifications ADD COLUMN action_url VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_label') THEN
        ALTER TABLE notifications ADD COLUMN action_label VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read_at') THEN
        ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_dismissed') THEN
        ALTER TABLE notifications ADD COLUMN is_dismissed BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'dismissed_at') THEN
        ALTER TABLE notifications ADD COLUMN dismissed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'created_by') THEN
        ALTER TABLE notifications ADD COLUMN created_by UUID REFERENCES staff(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
        ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notification content
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority notification_priority DEFAULT 'normal',
    
    -- Targeting
    target_user_id UUID REFERENCES staff(id) ON DELETE CASCADE,  -- Specific user
    target_role VARCHAR(50),  -- Or target by role (e.g., 'nurse')
    target_department VARCHAR(100),  -- Or target by department
    
    -- Context linking (what is this notification about?)
    encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE SET NULL,
    reference_type VARCHAR(50),  -- e.g., 'treatment_plan', 'lab_request', 'admission'
    reference_id UUID,  -- ID of the related record
    
    -- Action link
    action_url VARCHAR(500),  -- Deep link to the relevant page
    action_label VARCHAR(100),  -- e.g., "View Plan", "Review Result"
    
    -- Status tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- Optional expiration
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id) WHERE is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role) WHERE is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(target_user_id, is_read) WHERE is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_encounter ON notifications(encounter_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Comments
COMMENT ON TABLE notifications IS 'Clinical and workflow notifications for staff';
COMMENT ON COLUMN notifications.target_user_id IS 'Specific user to notify (if null, uses role/department targeting)';
COMMENT ON COLUMN notifications.target_role IS 'Target all users with this role';
COMMENT ON COLUMN notifications.reference_type IS 'Type of related entity (treatment_plan, lab_request, etc.)';
COMMENT ON COLUMN notifications.reference_id IS 'ID of the related entity';

-- =============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    -- Preferences per notification type
    notification_type notification_type NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    
    -- Delivery preferences
    show_popup BOOLEAN DEFAULT TRUE,
    play_sound BOOLEAN DEFAULT FALSE,
    
    -- Quiet hours (don't disturb)
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to create a notification (uses VARCHAR to avoid enum issues)
CREATE OR REPLACE FUNCTION create_notification(
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_target_user_id UUID DEFAULT NULL,
    p_target_role VARCHAR(50) DEFAULT NULL,
    p_target_department VARCHAR(100) DEFAULT NULL,
    p_encounter_id UUID DEFAULT NULL,
    p_patient_id VARCHAR(50) DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_action_url VARCHAR(500) DEFAULT NULL,
    p_action_label VARCHAR(100) DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        type, title, message, priority,
        target_user_id, target_role, target_department,
        encounter_id, patient_id,
        reference_type, reference_id,
        action_url, action_label,
        created_by, expires_at, metadata
    ) VALUES (
        p_type::notification_type, p_title, p_message, p_priority::notification_priority,
        p_target_user_id, p_target_role, p_target_department,
        p_encounter_id, p_patient_id,
        p_reference_type, p_reference_id,
        p_action_url, p_action_label,
        p_created_by, p_expires_at, p_metadata
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = p_notification_id
    AND (target_user_id = p_user_id OR target_user_id IS NULL);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to dismiss notification
CREATE OR REPLACE FUNCTION dismiss_notification(
    p_notification_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET is_dismissed = TRUE, dismissed_at = NOW()
    WHERE id = p_notification_id
    AND (target_user_id = p_user_id OR target_user_id IS NULL);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(
    p_user_id UUID,
    p_user_role VARCHAR(50) DEFAULT NULL,
    p_user_department VARCHAR(100) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE is_dismissed = FALSE
    AND is_read = FALSE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
        target_user_id = p_user_id
        OR (target_user_id IS NULL AND target_role = p_user_role)
        OR (target_user_id IS NULL AND target_role IS NULL AND target_department = p_user_department)
        OR (target_user_id IS NULL AND target_role IS NULL AND target_department IS NULL)
    );
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER: Auto-create notification when treatment plan is created
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_treatment_plan_created()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_name TEXT;
    v_creator_name TEXT;
BEGIN
    -- Get patient name
    SELECT CONCAT(first_name, ' ', surname) INTO v_patient_name
    FROM patients WHERE patient_id = NEW.patient_id;
    
    -- Get creator name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_creator_name
    FROM staff WHERE id = NEW.created_by;
    
    -- Create notification for nurses
    PERFORM create_notification(
        'treatment_plan_created'::notification_type,
        'New Treatment Plan',
        'Dr. ' || COALESCE(v_creator_name, 'Unknown') || ' created a treatment plan for ' || COALESCE(v_patient_name, 'Patient'),
        'high'::notification_priority,
        NULL,  -- No specific user
        'nurse',  -- Target all nurses
        NULL,
        NEW.encounter_id,
        NEW.patient_id,
        'treatment_plan',
        NEW.id,
        '/medical-records?patient=' || NEW.patient_id || '&tab=treatment-plan',
        'View Plan',
        NEW.created_by,
        NULL,
        jsonb_build_object('plan_title', NEW.title, 'plan_id', NEW.id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_notify_treatment_plan ON treatment_plans;
CREATE TRIGGER trigger_notify_treatment_plan
    AFTER INSERT ON treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION notify_treatment_plan_created();

-- =============================================================================
-- TRIGGER: Auto-create notification for critical lab results
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_critical_result()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_name TEXT;
    v_test_name TEXT;
BEGIN
    -- Only notify if result is marked as critical
    IF NEW.is_critical = TRUE AND (OLD IS NULL OR OLD.is_critical = FALSE) THEN
        -- Get patient name
        SELECT CONCAT(first_name, ' ', surname) INTO v_patient_name
        FROM patients WHERE patient_id = NEW.patient_id;
        
        -- Get test name
        SELECT name INTO v_test_name
        FROM lab_test_catalogue WHERE id = NEW.test_id;
        
        -- Create urgent notification for ordering doctor
        PERFORM create_notification(
            'result_critical'::notification_type,
            '🚨 CRITICAL Lab Result',
            'CRITICAL: ' || COALESCE(v_test_name, 'Lab test') || ' result for ' || COALESCE(v_patient_name, 'Patient') || ' requires immediate attention',
            'critical'::notification_priority,
            NULL,  -- Will need to resolve ordered_by to UUID
            'doctor',  -- Fallback to all doctors
            NULL,
            NEW.encounter_id,
            NEW.patient_id,
            'lab_request',
            NEW.request_id,
            '/lab?request=' || NEW.request_id,
            'View Result',
            NEW.result_entered_by,
            NULL,
            jsonb_build_object('test_name', v_test_name, 'is_critical', true)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_notify_critical_result ON lab_requests;
CREATE TRIGGER trigger_notify_critical_result
    AFTER UPDATE ON lab_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_critical_result();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can see notifications targeted to them, their role, or their department
CREATE POLICY notifications_select_policy ON notifications
    FOR SELECT
    USING (
        target_user_id = auth.uid()
        OR target_user_id IS NULL
    );

-- Users can update (mark read/dismiss) their own notifications
CREATE POLICY notifications_update_policy ON notifications
    FOR UPDATE
    USING (
        target_user_id = auth.uid()
        OR target_user_id IS NULL
    );

-- Only system/admin can insert notifications (or via functions)
CREATE POLICY notifications_insert_policy ON notifications
    FOR INSERT
    WITH CHECK (TRUE);  -- Allow all inserts (controlled via API)

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
