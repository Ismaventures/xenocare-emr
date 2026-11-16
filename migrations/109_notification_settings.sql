-- =============================================================================
-- NDC Medical Centre EMR - Enhanced Notification Settings System
-- Migration: 109_notification_settings.sql
-- =============================================================================
-- Adds comprehensive notification settings with:
-- - Per-module notification control
-- - Sound customization per notification type
-- - Admin-level global settings
-- - User-level personal preferences
-- =============================================================================

-- =============================================================================
-- NOTIFICATION SOUND ENUM
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE notification_sound AS ENUM (
        'default',
        'chime',
        'bell',
        'ding',
        'alert',
        'urgent',
        'gentle',
        'message',
        'success',
        'error',
        'none'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- MODULE NOTIFICATION TYPES
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE module_notification_type AS ENUM (
        -- Clinical Modules
        'lab_request',
        'lab_result',
        'lab_critical',
        'radiology_request',
        'radiology_result',
        'procedure_request',
        'prescription',
        'consultation_request',
        'referral',
        
        -- Clinical Workflow
        'treatment_plan',
        'vitals_alert',
        'nursing_note',
        'doctor_note',
        
        -- Patient Flow
        'patient_queue',
        'patient_admission',
        'patient_discharge',
        'encounter_assigned',
        'encounter_transferred',
        
        -- Billing
        'billing_invoice',
        'payment_received',
        'billing_alert',
        
        -- Messaging
        'new_message',
        'message_reply',
        'broadcast_message',
        
        -- System
        'system_alert',
        'reminder',
        'announcement'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- GLOBAL NOTIFICATION SETTINGS (Admin-managed)
-- =============================================================================

CREATE TABLE IF NOT EXISTS global_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Module/Type identification
    notification_type VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'clinical', 'messaging', 'billing', 'system'
    
    -- Default settings (can be overridden by users unless locked)
    is_enabled BOOLEAN DEFAULT TRUE,
    default_sound VARCHAR(20) DEFAULT 'default',
    default_priority VARCHAR(20) DEFAULT 'normal',
    
    -- Lock settings (admin can prevent users from changing)
    is_locked BOOLEAN DEFAULT FALSE,
    
    -- Sound file path (if custom)
    custom_sound_url TEXT,
    
    -- Target roles (who receives this type by default)
    target_roles TEXT[], -- e.g., ['doctor', 'nurse', 'lab_technician']
    
    -- Metadata
    icon VARCHAR(50),
    color VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES staff(id)
);

CREATE INDEX IF NOT EXISTS idx_global_notification_category ON global_notification_settings(category);

COMMENT ON TABLE global_notification_settings IS 'Admin-managed global notification settings per module/type';

-- =============================================================================
-- USER NOTIFICATION SETTINGS
-- =============================================================================

-- Drop and recreate to have better structure (idempotent)
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    -- What notification type
    notification_type VARCHAR(50) NOT NULL,
    
    -- User preferences (override global unless locked)
    is_enabled BOOLEAN DEFAULT TRUE,
    
    -- Sound settings
    sound VARCHAR(20) DEFAULT 'default',
    volume INTEGER DEFAULT 80 CHECK (volume >= 0 AND volume <= 100),
    
    -- Display settings
    show_popup BOOLEAN DEFAULT TRUE,
    show_in_center BOOLEAN DEFAULT TRUE,
    desktop_notification BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_user ON user_notification_settings(user_id);

COMMENT ON TABLE user_notification_settings IS 'Per-user notification preferences for each notification type';

-- =============================================================================
-- USER MASTER NOTIFICATION SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_notification_master_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE UNIQUE,
    
    -- Master toggle
    notifications_enabled BOOLEAN DEFAULT TRUE,
    
    -- Sound settings
    sound_enabled BOOLEAN DEFAULT TRUE,
    master_volume INTEGER DEFAULT 80 CHECK (master_volume >= 0 AND master_volume <= 100),
    
    -- Desktop notifications
    desktop_notifications_enabled BOOLEAN DEFAULT TRUE,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_allow_urgent BOOLEAN DEFAULT TRUE, -- Allow urgent even in quiet hours
    
    -- Grouping
    group_notifications BOOLEAN DEFAULT TRUE,
    group_interval_seconds INTEGER DEFAULT 60,
    
    -- Do Not Disturb
    dnd_enabled BOOLEAN DEFAULT FALSE,
    dnd_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_master_notification ON user_notification_master_settings(user_id);

COMMENT ON TABLE user_notification_master_settings IS 'Master notification preferences for each user';

-- =============================================================================
-- NOTIFICATION SOUNDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_sounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Sound file
    file_url TEXT, -- URL or base64 data URI
    duration_ms INTEGER, -- Duration in milliseconds
    
    -- Categorization
    category VARCHAR(50) DEFAULT 'default', -- 'default', 'custom', 'system'
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System sounds can't be deleted
    
    -- For programmatic sounds (oscillator based)
    is_programmatic BOOLEAN DEFAULT FALSE,
    sound_config JSONB, -- { frequencies: [440, 880], duration: 0.1, type: 'sine' }
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

COMMENT ON TABLE notification_sounds IS 'Available notification sounds (built-in and custom)';

-- =============================================================================
-- INSERT DEFAULT SOUNDS (Programmatic)
-- =============================================================================

INSERT INTO notification_sounds (name, display_name, description, category, is_system, is_programmatic, sound_config)
VALUES
    ('default', 'Default', 'Standard notification sound', 'default', TRUE, TRUE, 
     '{"frequencies": [523, 659], "duration": 0.1, "type": "sine", "volume": 0.1}'::jsonb),
    ('chime', 'Chime', 'Pleasant chime sound', 'default', TRUE, TRUE, 
     '{"frequencies": [659, 784, 880], "duration": 0.08, "type": "sine", "volume": 0.08}'::jsonb),
    ('bell', 'Bell', 'Bell-like notification', 'default', TRUE, TRUE, 
     '{"frequencies": [880, 1100], "duration": 0.15, "type": "triangle", "volume": 0.1}'::jsonb),
    ('ding', 'Ding', 'Quick ding sound', 'default', TRUE, TRUE, 
     '{"frequencies": [1000], "duration": 0.1, "type": "sine", "volume": 0.08}'::jsonb),
    ('alert', 'Alert', 'Alert sound for important notifications', 'default', TRUE, TRUE, 
     '{"frequencies": [880, 660, 880], "duration": 0.12, "type": "square", "volume": 0.08}'::jsonb),
    ('urgent', 'Urgent', 'Urgent/critical notification', 'default', TRUE, TRUE, 
     '{"frequencies": [880, 660, 880, 660], "duration": 0.15, "type": "sawtooth", "volume": 0.12}'::jsonb),
    ('gentle', 'Gentle', 'Soft, non-intrusive sound', 'default', TRUE, TRUE, 
     '{"frequencies": [440], "duration": 0.2, "type": "sine", "volume": 0.05}'::jsonb),
    ('message', 'Message', 'New message notification', 'default', TRUE, TRUE, 
     '{"frequencies": [587, 784], "duration": 0.1, "type": "sine", "volume": 0.08}'::jsonb),
    ('success', 'Success', 'Success/completion sound', 'default', TRUE, TRUE, 
     '{"frequencies": [523, 659, 784], "duration": 0.08, "type": "sine", "volume": 0.08}'::jsonb),
    ('error', 'Error', 'Error notification sound', 'default', TRUE, TRUE, 
     '{"frequencies": [200, 150], "duration": 0.2, "type": "square", "volume": 0.1}'::jsonb),
    ('none', 'No Sound', 'Disable sound for this notification', 'default', TRUE, FALSE, '{}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- INSERT DEFAULT GLOBAL NOTIFICATION SETTINGS
-- =============================================================================

INSERT INTO global_notification_settings (notification_type, display_name, description, category, default_sound, default_priority, target_roles, icon)
VALUES
    -- Clinical Modules
    ('lab_request', 'Lab Request', 'New laboratory test request', 'clinical', 'default', 'normal', ARRAY['lab_technician', 'lab_scientist'], 'flask'),
    ('lab_result', 'Lab Result Ready', 'Laboratory result is ready', 'clinical', 'chime', 'normal', ARRAY['doctor', 'nurse'], 'check-circle'),
    ('lab_critical', 'Critical Lab Value', 'Critical/panic laboratory value', 'clinical', 'urgent', 'critical', ARRAY['doctor', 'nurse'], 'alert-triangle'),
    
    ('radiology_request', 'Radiology Request', 'New radiology examination request', 'clinical', 'default', 'normal', ARRAY['radiologist', 'radiographer'], 'scan'),
    ('radiology_result', 'Radiology Result Ready', 'Radiology result is ready', 'clinical', 'chime', 'normal', ARRAY['doctor'], 'file-image'),
    
    ('procedure_request', 'Procedure Request', 'New procedure request', 'clinical', 'alert', 'normal', ARRAY['doctor', 'nurse'], 'activity'),
    ('prescription', 'New Prescription', 'New prescription to fill', 'clinical', 'default', 'normal', ARRAY['pharmacist'], 'pill'),
    
    ('consultation_request', 'Consultation Request', 'Doctor consultation requested', 'clinical', 'message', 'high', ARRAY['doctor'], 'stethoscope'),
    ('referral', 'Patient Referral', 'New patient referral', 'clinical', 'default', 'normal', ARRAY['doctor', 'receptionist'], 'arrow-right-circle'),
    
    ('treatment_plan', 'Treatment Plan Update', 'Treatment plan created or updated', 'clinical', 'gentle', 'normal', ARRAY['doctor', 'nurse'], 'clipboard'),
    ('vitals_alert', 'Vitals Alert', 'Patient vital signs alert', 'clinical', 'urgent', 'high', ARRAY['doctor', 'nurse'], 'heart'),
    ('nursing_note', 'Nursing Note', 'New nursing note added', 'clinical', 'gentle', 'low', ARRAY['nurse'], 'edit'),
    ('doctor_note', 'Doctor Note', 'New clinical note added', 'clinical', 'gentle', 'low', ARRAY['doctor'], 'file-text'),
    
    -- Patient Flow
    ('patient_queue', 'Patient Queue', 'New patient in queue', 'workflow', 'ding', 'normal', ARRAY['doctor', 'nurse', 'receptionist'], 'users'),
    ('patient_admission', 'Patient Admission', 'New patient admission', 'workflow', 'bell', 'normal', ARRAY['doctor', 'nurse'], 'bed'),
    ('patient_discharge', 'Patient Discharge', 'Patient ready for discharge', 'workflow', 'success', 'normal', ARRAY['doctor', 'nurse', 'billing'], 'log-out'),
    ('encounter_assigned', 'Encounter Assigned', 'New encounter assigned to you', 'workflow', 'alert', 'high', ARRAY['doctor', 'nurse'], 'user-plus'),
    ('encounter_transferred', 'Encounter Transferred', 'Encounter transferred to you', 'workflow', 'alert', 'normal', ARRAY['doctor', 'nurse'], 'repeat'),
    
    -- Billing
    ('billing_invoice', 'Invoice Generated', 'New invoice generated', 'billing', 'default', 'low', ARRAY['billing', 'cashier'], 'file-text'),
    ('payment_received', 'Payment Received', 'Payment received from patient', 'billing', 'success', 'normal', ARRAY['billing', 'cashier'], 'credit-card'),
    ('billing_alert', 'Billing Alert', 'Billing issue requires attention', 'billing', 'alert', 'high', ARRAY['billing'], 'alert-circle'),
    
    -- Messaging
    ('new_message', 'New Message', 'You have a new message', 'messaging', 'message', 'normal', NULL, 'mail'),
    ('message_reply', 'Message Reply', 'Someone replied to your message', 'messaging', 'message', 'normal', NULL, 'message-circle'),
    ('broadcast_message', 'Broadcast Message', 'New broadcast/announcement', 'messaging', 'bell', 'high', NULL, 'megaphone'),
    
    -- System
    ('system_alert', 'System Alert', 'Important system notification', 'system', 'alert', 'high', NULL, 'server'),
    ('reminder', 'Reminder', 'Scheduled reminder', 'system', 'chime', 'normal', NULL, 'clock'),
    ('announcement', 'Announcement', 'General announcement', 'system', 'bell', 'normal', NULL, 'info')
ON CONFLICT (notification_type) DO NOTHING;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at for global settings
CREATE OR REPLACE FUNCTION update_global_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS global_notification_settings_updated_at ON global_notification_settings;
CREATE TRIGGER global_notification_settings_updated_at
    BEFORE UPDATE ON global_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_global_notification_settings_timestamp();

-- Auto-update updated_at for user settings
CREATE OR REPLACE FUNCTION update_user_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_notification_settings_updated_at ON user_notification_settings;
CREATE TRIGGER user_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_notification_settings_timestamp();

DROP TRIGGER IF EXISTS user_master_notification_settings_updated_at ON user_notification_master_settings;
CREATE TRIGGER user_master_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_master_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_notification_settings_timestamp();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get effective notification settings for a user and type
CREATE OR REPLACE FUNCTION get_effective_notification_settings(
    p_user_id UUID,
    p_notification_type VARCHAR(50)
)
RETURNS TABLE (
    is_enabled BOOLEAN,
    sound VARCHAR(20),
    volume INTEGER,
    show_popup BOOLEAN,
    show_in_center BOOLEAN,
    desktop_notification BOOLEAN,
    is_locked BOOLEAN
) AS $$
DECLARE
    v_global global_notification_settings%ROWTYPE;
    v_user user_notification_settings%ROWTYPE;
    v_master user_notification_master_settings%ROWTYPE;
BEGIN
    -- Get global settings
    SELECT * INTO v_global FROM global_notification_settings WHERE notification_type = p_notification_type;
    
    -- Get user settings
    SELECT * INTO v_user FROM user_notification_settings 
    WHERE user_id = p_user_id AND notification_type = p_notification_type;
    
    -- Get master settings
    SELECT * INTO v_master FROM user_notification_master_settings WHERE user_id = p_user_id;
    
    -- Return effective settings
    RETURN QUERY SELECT
        COALESCE(
            CASE WHEN v_global.is_locked THEN v_global.is_enabled 
                 ELSE COALESCE(v_user.is_enabled, v_global.is_enabled, TRUE) 
            END,
            TRUE
        ) AND COALESCE(v_master.notifications_enabled, TRUE) AS is_enabled,
        COALESCE(
            CASE WHEN v_global.is_locked THEN v_global.default_sound 
                 ELSE COALESCE(v_user.sound, v_global.default_sound, 'default') 
            END,
            'default'
        )::VARCHAR(20) AS sound,
        COALESCE(v_user.volume, v_master.master_volume, 80)::INTEGER AS volume,
        COALESCE(v_user.show_popup, TRUE) AS show_popup,
        COALESCE(v_user.show_in_center, TRUE) AS show_in_center,
        COALESCE(v_user.desktop_notification, v_master.desktop_notifications_enabled, TRUE) AS desktop_notification,
        COALESCE(v_global.is_locked, FALSE) AS is_locked;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if notifications are in quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_master user_notification_master_settings%ROWTYPE;
    v_current_time TIME;
BEGIN
    SELECT * INTO v_master FROM user_notification_master_settings WHERE user_id = p_user_id;
    
    IF v_master IS NULL OR NOT v_master.quiet_hours_enabled THEN
        RETURN FALSE;
    END IF;
    
    v_current_time := CURRENT_TIME;
    
    -- Handle overnight quiet hours (e.g., 22:00 to 06:00)
    IF v_master.quiet_hours_start > v_master.quiet_hours_end THEN
        RETURN v_current_time >= v_master.quiet_hours_start OR v_current_time <= v_master.quiet_hours_end;
    ELSE
        RETURN v_current_time >= v_master.quiet_hours_start AND v_current_time <= v_master.quiet_hours_end;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get sound configuration for a sound name
CREATE OR REPLACE FUNCTION get_notification_sound_config(p_sound_name VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    v_sound notification_sounds%ROWTYPE;
BEGIN
    SELECT * INTO v_sound FROM notification_sounds WHERE name = p_sound_name AND is_active = TRUE;
    
    IF v_sound IS NULL THEN
        -- Return default sound config
        RETURN '{"frequencies": [523, 659], "duration": 0.1, "type": "sine", "volume": 0.1}'::jsonb;
    END IF;
    
    IF v_sound.is_programmatic THEN
        RETURN v_sound.sound_config;
    ELSE
        RETURN jsonb_build_object('file_url', v_sound.file_url, 'duration_ms', v_sound.duration_ms);
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant access to authenticated users
GRANT SELECT ON global_notification_settings TO authenticated;
GRANT ALL ON user_notification_settings TO authenticated;
GRANT ALL ON user_notification_master_settings TO authenticated;
GRANT SELECT ON notification_sounds TO authenticated;

-- Function permissions
GRANT EXECUTE ON FUNCTION get_effective_notification_settings(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_quiet_hours(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_sound_config(VARCHAR) TO authenticated;

-- =============================================================================
-- REALTIME
-- =============================================================================

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_notification_settings;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- =============================================================================
-- DONE
-- =============================================================================

COMMENT ON FUNCTION get_effective_notification_settings(UUID, VARCHAR) IS 'Get merged notification settings for a user and notification type';
COMMENT ON FUNCTION is_in_quiet_hours(UUID) IS 'Check if the current time is within user quiet hours';
COMMENT ON FUNCTION get_notification_sound_config(VARCHAR) IS 'Get sound configuration for playing a notification sound';
