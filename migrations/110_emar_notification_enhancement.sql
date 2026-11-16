-- =============================================================================
-- NDC Medical Centre EMR - eMAR & Enhanced Notification System
-- Migration: 110_emar_notification_enhancement.sql
-- =============================================================================
-- Adds:
-- 1. eMAR medication schedule + reminder system
-- 2. New notification types for eMAR, NHIS, Care Team, Ward Round
-- 3. Persistent notification acknowledgement tracking
-- 4. Notification escalation for unacknowledged notifications
-- =============================================================================

-- =============================================================================
-- 0. ADD NEW NOTIFICATION TYPE ENUM VALUES
-- =============================================================================

-- Add the 5 new notification types to the enum
DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MedicationDue';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MedicationOverdue';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CareTeamAction';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NHISRequest';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ModuleRequest';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 1. MEDICATION SCHEDULE TABLE (eMAR Enhancement)
-- =============================================================================

CREATE TABLE IF NOT EXISTS medication_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    prescription_id UUID, -- link to prescriptions table if available
    
    -- Medication details
    medication_name VARCHAR(255) NOT NULL,
    dose VARCHAR(100) NOT NULL,
    route VARCHAR(50) DEFAULT 'Oral',
    frequency VARCHAR(100), -- e.g. 'TDS', 'BD', 'QID', 'STAT'
    
    -- Schedule
    scheduled_time TIMESTAMPTZ NOT NULL,
    window_minutes INTEGER DEFAULT 30, -- +/- minutes from scheduled time
    
    -- Administration tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'given', 'missed', 'refused', 'held', 'overdue')),
    administered_at TIMESTAMPTZ,
    administered_by UUID REFERENCES staff(id),
    
    -- Reason for non-administration
    refusal_reason TEXT,
    hold_reason TEXT,
    notes TEXT,
    
    -- Reminder tracking
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    escalation_count INTEGER DEFAULT 0,
    last_escalation_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES staff(id),
    
    -- Nurse assignment
    assigned_nurse_id UUID REFERENCES staff(id),
    
    -- Ordering doctor (for notifications back)
    prescribed_by UUID REFERENCES staff(id),
    
    -- Shift info
    shift VARCHAR(20), -- Morning, Afternoon, Night
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Active flag
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_med_schedule_encounter ON medication_schedule(encounter_id);
CREATE INDEX IF NOT EXISTS idx_med_schedule_patient ON medication_schedule(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_schedule_status ON medication_schedule(status) WHERE status IN ('pending', 'overdue');
CREATE INDEX IF NOT EXISTS idx_med_schedule_time ON medication_schedule(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_med_schedule_shift ON medication_schedule(shift, status);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_medication_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS medication_schedule_updated ON medication_schedule;
CREATE TRIGGER medication_schedule_updated
    BEFORE UPDATE ON medication_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_medication_schedule_timestamp();

COMMENT ON TABLE medication_schedule IS 'eMAR medication schedule with administration tracking and reminder escalation';

-- =============================================================================
-- 2. NOTIFICATION ACKNOWLEDGEMENT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES staff(id),
    
    -- Tracking
    acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
    action_taken VARCHAR(50), -- 'viewed', 'actioned', 'dismissed', 'snoozed'
    snooze_until TIMESTAMPTZ, -- If snoozed
    
    -- Escalation tracking
    escalation_level INTEGER DEFAULT 0, -- 0=initial, 1=first escalation, 2=supervisor, etc
    escalated_to UUID REFERENCES staff(id), -- Who was escalated to
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_ack_user ON notification_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_ack_notification ON notification_acknowledgements(notification_id);

COMMENT ON TABLE notification_acknowledgements IS 'Tracks notification acknowledgement to enable persistent popup until clicked';

-- =============================================================================
-- 3. ADD PERSISTENT AND REPEAT FIELDS TO NOTIFICATIONS
-- =============================================================================

DO $$ BEGIN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_persistent BOOLEAN DEFAULT FALSE;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN DEFAULT FALSE;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS repeat_interval_seconds INTEGER; -- How often to re-alert
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS max_repeats INTEGER DEFAULT 10;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS repeat_count INTEGER DEFAULT 0;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS last_repeated_at TIMESTAMPTZ;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_module VARCHAR(50); -- originating module
END $$;

-- =============================================================================
-- 4. ADD NEW NOTIFICATION TYPES TO GLOBAL SETTINGS
-- =============================================================================

INSERT INTO global_notification_settings (notification_type, display_name, description, category, default_sound, default_priority, target_roles, icon)
VALUES
    -- eMAR / Medication Administration
    ('emar_medication_due', 'Medication Due', 'Medication is due for administration', 'clinical', 'alert', 'high', 
     ARRAY['nurse'], 'pill'),
    ('emar_medication_overdue', 'Medication Overdue', 'Medication was not administered on time', 'clinical', 'urgent', 'critical', 
     ARRAY['nurse'], 'alert-triangle'),
    ('emar_medication_administered', 'Medication Administered', 'Nurse has administered medication', 'clinical', 'success', 'normal', 
     ARRAY['doctor'], 'check-circle'),
    ('emar_medication_refused', 'Medication Refused/Held', 'Patient refused or medication held', 'clinical', 'alert', 'high', 
     ARRAY['doctor', 'nurse'], 'x-circle'),
    
    -- Care Team Notifications
    ('care_team_note_added', 'Care Team Note Added', 'A note was added by a care team member', 'clinical', 'gentle', 'normal', 
     ARRAY['doctor', 'nurse'], 'file-text'),
    ('care_team_order_placed', 'Care Team Order Placed', 'An order was placed for a patient', 'clinical', 'default', 'normal', 
     ARRAY['doctor', 'nurse'], 'clipboard'),
    ('ward_round_completed', 'Ward Round Completed', 'Ward round notes have been documented', 'clinical', 'chime', 'normal', 
     ARRAY['nurse', 'doctor'], 'stethoscope'),
    ('care_team_action_performed', 'Care Team Action', 'A care team member performed an action on a patient', 'clinical', 'default', 'normal', 
     ARRAY['doctor', 'nurse'], 'activity'),
    
    -- NHIS Notifications
    ('nhis_request_received', 'NHIS Request Received', 'New NHIS verification or claim request', 'billing', 'alert', 'high', 
     ARRAY['billing_clerk', 'cashier', 'admin'], 'shield'),
    ('nhis_claim_status_update', 'NHIS Claim Status Update', 'NHIS claim status has changed', 'billing', 'chime', 'normal', 
     ARRAY['billing_clerk', 'cashier', 'admin'], 'refresh-cw'),
    ('nhis_authorization_needed', 'NHIS Authorization Needed', 'NHIS authorization required for procedure', 'billing', 'urgent', 'high', 
     ARRAY['doctor', 'billing_clerk'], 'alert-triangle'),
    ('nhis_authorization_approved', 'NHIS Authorization Approved', 'NHIS authorization has been approved', 'billing', 'success', 'normal', 
     ARRAY['doctor', 'billing_clerk'], 'check-circle'),
    
    -- Cross-module request notifications
    ('module_request_received', 'Module Request Received', 'A new request has been sent to your department', 'workflow', 'alert', 'high', 
     NULL, 'inbox'),
    ('module_request_completed', 'Module Request Completed', 'A request from your department has been completed', 'workflow', 'success', 'normal', 
     NULL, 'check-circle'),
    
    -- Admission / Discharge Events
    ('patient_critical_event', 'Patient Critical Event', 'Critical clinical event for a patient', 'clinical', 'urgent', 'critical', 
     ARRAY['doctor', 'nurse'], 'alert-triangle')
ON CONFLICT (notification_type) DO NOTHING;

-- =============================================================================
-- 5. ADD PERSISTENT NOTIFICATION SUPPORT TO GLOBAL SETTINGS
-- =============================================================================

DO $$ BEGIN
    ALTER TABLE global_notification_settings ADD COLUMN IF NOT EXISTS is_persistent BOOLEAN DEFAULT FALSE;
    ALTER TABLE global_notification_settings ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN DEFAULT FALSE;
    ALTER TABLE global_notification_settings ADD COLUMN IF NOT EXISTS repeat_interval_seconds INTEGER;
    ALTER TABLE global_notification_settings ADD COLUMN IF NOT EXISTS max_repeats INTEGER DEFAULT 10;
END $$;

-- Set persistent for eMAR types (these should keep popping up)
UPDATE global_notification_settings SET 
    is_persistent = TRUE, 
    requires_acknowledgement = TRUE,
    repeat_interval_seconds = 120, -- every 2 minutes
    max_repeats = 30
WHERE notification_type IN ('emar_medication_due', 'emar_medication_overdue');

-- Set persistent for critical types
UPDATE global_notification_settings SET 
    is_persistent = TRUE, 
    requires_acknowledgement = TRUE,
    repeat_interval_seconds = 300, -- every 5 minutes
    max_repeats = 12
WHERE notification_type IN ('nhis_request_received', 'nhis_authorization_needed', 'module_request_received', 'patient_critical_event');

-- =============================================================================
-- 6. FUNCTION: Check overdue medications and update status
-- =============================================================================

CREATE OR REPLACE FUNCTION check_overdue_medications()
RETURNS TABLE(
    schedule_id UUID,
    encounter_id UUID,
    patient_id UUID,
    medication_name VARCHAR,
    scheduled_time TIMESTAMPTZ,
    minutes_overdue NUMERIC
) AS $$
BEGIN
    -- Update status to overdue for pending meds past window
    UPDATE medication_schedule ms
    SET status = 'overdue',
        updated_at = NOW()
    WHERE ms.status = 'pending'
      AND ms.is_active = TRUE
      AND ms.scheduled_time + (ms.window_minutes || ' minutes')::INTERVAL < NOW();

    -- Return overdue medications
    RETURN QUERY
    SELECT 
        ms.id AS schedule_id,
        ms.encounter_id,
        ms.patient_id,
        ms.medication_name,
        ms.scheduled_time,
        EXTRACT(EPOCH FROM (NOW() - ms.scheduled_time)) / 60 AS minutes_overdue
    FROM medication_schedule ms
    WHERE ms.status = 'overdue'
      AND ms.is_active = TRUE
      AND ms.acknowledged_at IS NULL
    ORDER BY ms.scheduled_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. FUNCTION: Get unacknowledged persistent notifications for a user
-- =============================================================================

CREATE OR REPLACE FUNCTION get_unacknowledged_notifications(p_user_id UUID)
RETURNS SETOF notifications AS $$
BEGIN
    RETURN QUERY
    SELECT n.*
    FROM notifications n
    WHERE n.user_id = p_user_id
      AND n.requires_acknowledgement = TRUE
      AND n.acknowledged_at IS NULL
      AND n.is_dismissed IS NOT TRUE
      AND (n.snoozed_until IS NULL OR n.snoozed_until < NOW())
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY 
        CASE n.priority 
            WHEN 'Critical' THEN 0 
            WHEN 'High' THEN 1 
            WHEN 'Normal' THEN 2 
            ELSE 3 
        END,
        n.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- 8. PERMISSIONS
-- =============================================================================

GRANT ALL ON medication_schedule TO authenticated;
GRANT ALL ON notification_acknowledgements TO authenticated;
GRANT EXECUTE ON FUNCTION check_overdue_medications() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unacknowledged_notifications(UUID) TO authenticated;

-- Enable realtime for medication_schedule
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE medication_schedule;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_acknowledgements;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- =============================================================================
-- PATCH: Add assigned_nurse_id if table was created without it
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'medication_schedule' AND column_name = 'assigned_nurse_id'
    ) THEN
        ALTER TABLE medication_schedule ADD COLUMN assigned_nurse_id UUID REFERENCES staff(id);
        CREATE INDEX IF NOT EXISTS idx_med_schedule_nurse ON medication_schedule(assigned_nurse_id);
    END IF;
END $$;

-- =============================================================================
-- DONE
-- =============================================================================
COMMENT ON FUNCTION check_overdue_medications() IS 'Check and flag overdue medication schedules, return list for notification';
COMMENT ON FUNCTION get_unacknowledged_notifications(UUID) IS 'Get persistent notifications that have not been acknowledged by user';
