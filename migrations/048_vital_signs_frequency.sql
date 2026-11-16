-- =============================================================================
-- NDC Medical Centre EMR - Vital Signs Frequency Enforcement
-- Migration: 048_vital_signs_frequency.sql
-- =============================================================================
-- Implements mandatory vital sign schedules for admitted patients based on
-- acuity level. Creates alerts for overdue vitals.
-- =============================================================================

-- =============================================================================
-- ACUITY LEVEL ENUM
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE patient_acuity AS ENUM (
        'critical',    -- ICU/HDU - Every 1 hour
        'high',        -- Step-down - Every 2 hours
        'medium',      -- General ward - Every 4 hours
        'low',         -- Stable/Observation - Every 6 hours
        'routine'      -- Pre-discharge - Every 8 hours
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure notification_priority enum exists (may have been created by 046)
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
-- VITAL SIGNS SCHEDULE CONFIGURATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS vital_schedule_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acuity_level patient_acuity NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    frequency_minutes INTEGER NOT NULL,  -- How often vitals should be taken
    grace_period_minutes INTEGER DEFAULT 15,  -- Buffer before marking as overdue
    alert_priority VARCHAR(20) DEFAULT 'normal',  -- Use VARCHAR to avoid enum dependency issues
    color VARCHAR(20) DEFAULT '#6B7280',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO vital_schedule_configs (acuity_level, display_name, description, frequency_minutes, grace_period_minutes, alert_priority, color, icon) VALUES
    ('critical', 'Critical Care', 'ICU/HDU patients requiring intensive monitoring', 60, 10, 'critical', '#DC2626', 'alert-triangle'),
    ('high', 'High Acuity', 'Step-down unit or unstable patients', 120, 15, 'urgent', '#EA580C', 'alert-circle'),
    ('medium', 'Medium Acuity', 'General ward patients requiring regular monitoring', 240, 30, 'high', '#F59E0B', 'activity'),
    ('low', 'Low Acuity', 'Stable patients under observation', 360, 45, 'normal', '#10B981', 'heart'),
    ('routine', 'Routine', 'Pre-discharge or minimal monitoring needed', 480, 60, 'low', '#6B7280', 'check-circle')
ON CONFLICT (acuity_level) DO NOTHING;

-- =============================================================================
-- PATIENT VITAL SCHEDULES
-- =============================================================================

CREATE TABLE IF NOT EXISTS patient_vital_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    
    -- Schedule configuration
    acuity_level patient_acuity NOT NULL DEFAULT 'medium',
    custom_frequency_minutes INTEGER,  -- Override default frequency if needed
    
    -- Tracking
    last_vitals_at TIMESTAMPTZ,  -- When vitals were last recorded
    next_vitals_due TIMESTAMPTZ,  -- When next vitals are due
    is_overdue BOOLEAN DEFAULT FALSE,
    overdue_since TIMESTAMPTZ,
    
    -- Alert tracking
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMPTZ,
    
    -- Assignment
    assigned_nurse_id UUID REFERENCES staff(id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,  -- Active while patient is admitted
    paused BOOLEAN DEFAULT FALSE,  -- Temporarily pause (e.g., patient in surgery)
    pause_reason TEXT,
    paused_at TIMESTAMPTZ,
    paused_by UUID REFERENCES staff(id),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    
    UNIQUE(patient_id, encounter_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_vital_schedules_patient ON patient_vital_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_schedules_encounter ON patient_vital_schedules(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vital_schedules_overdue ON patient_vital_schedules(is_overdue, is_active) WHERE is_overdue = TRUE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_vital_schedules_next_due ON patient_vital_schedules(next_vitals_due) WHERE is_active = TRUE AND paused = FALSE;
CREATE INDEX IF NOT EXISTS idx_vital_schedules_nurse ON patient_vital_schedules(assigned_nurse_id) WHERE is_active = TRUE;

-- =============================================================================
-- VITAL SIGNS LOG (Enhanced tracking)
-- =============================================================================

-- Add columns to existing vitals table if they don't exist
DO $$ BEGIN
    ALTER TABLE vitals ADD COLUMN schedule_id UUID REFERENCES patient_vital_schedules(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE vitals ADD COLUMN was_overdue BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE vitals ADD COLUMN minutes_overdue INTEGER;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- =============================================================================
-- FUNCTION: Calculate next vitals due time
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_next_vitals_due(
    p_schedule_id UUID,
    p_from_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_frequency INTEGER;
    v_custom_frequency INTEGER;
    v_acuity patient_acuity;
BEGIN
    -- Get the schedule's frequency
    SELECT 
        pvs.acuity_level,
        pvs.custom_frequency_minutes,
        vsc.frequency_minutes
    INTO v_acuity, v_custom_frequency, v_frequency
    FROM patient_vital_schedules pvs
    JOIN vital_schedule_configs vsc ON vsc.acuity_level = pvs.acuity_level
    WHERE pvs.id = p_schedule_id;
    
    -- Use custom frequency if set, otherwise default
    IF v_custom_frequency IS NOT NULL THEN
        v_frequency := v_custom_frequency;
    END IF;
    
    RETURN p_from_time + (v_frequency || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Update schedule after vitals recorded
-- =============================================================================

CREATE OR REPLACE FUNCTION update_vital_schedule_on_record()
RETURNS TRIGGER AS $$
DECLARE
    v_schedule_id UUID;
    v_was_overdue BOOLEAN;
    v_overdue_minutes INTEGER;
BEGIN
    -- Find the active schedule for this patient/encounter
    SELECT id, is_overdue, 
           CASE WHEN is_overdue AND overdue_since IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (NOW() - overdue_since)) / 60 
                ELSE 0 END
    INTO v_schedule_id, v_was_overdue, v_overdue_minutes
    FROM patient_vital_schedules
    WHERE patient_id = NEW.patient_id
    AND encounter_id = NEW.encounter_id
    AND is_active = TRUE
    LIMIT 1;
    
    IF v_schedule_id IS NOT NULL THEN
        -- Update the vitals record with schedule info
        NEW.schedule_id := v_schedule_id;
        NEW.was_overdue := v_was_overdue;
        NEW.minutes_overdue := v_overdue_minutes::INTEGER;
        
        -- Update the schedule
        UPDATE patient_vital_schedules
        SET 
            last_vitals_at = NEW.recorded_at,
            next_vitals_due = calculate_next_vitals_due(v_schedule_id, NEW.recorded_at),
            is_overdue = FALSE,
            overdue_since = NULL,
            alert_sent = FALSE,
            alert_sent_at = NULL,
            updated_at = NOW()
        WHERE id = v_schedule_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on vitals table
DROP TRIGGER IF EXISTS trigger_update_vital_schedule ON vitals;
CREATE TRIGGER trigger_update_vital_schedule
    BEFORE INSERT ON vitals
    FOR EACH ROW
    EXECUTE FUNCTION update_vital_schedule_on_record();

-- =============================================================================
-- FUNCTION: Check and mark overdue schedules
-- =============================================================================

CREATE OR REPLACE FUNCTION check_overdue_vital_schedules()
RETURNS TABLE (
    schedule_id UUID,
    patient_id VARCHAR(50),
    patient_name TEXT,
    encounter_id UUID,
    acuity_level patient_acuity,
    minutes_overdue INTEGER,
    assigned_nurse_id UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH overdue_schedules AS (
        UPDATE patient_vital_schedules pvs
        SET 
            is_overdue = TRUE,
            overdue_since = COALESCE(overdue_since, next_vitals_due),
            updated_at = NOW()
        FROM vital_schedule_configs vsc
        WHERE pvs.acuity_level = vsc.acuity_level
        AND pvs.is_active = TRUE
        AND pvs.paused = FALSE
        AND pvs.next_vitals_due IS NOT NULL
        AND NOW() > (pvs.next_vitals_due + (vsc.grace_period_minutes || ' minutes')::INTERVAL)
        AND pvs.is_overdue = FALSE
        RETURNING pvs.*
    )
    SELECT 
        os.id,
        os.patient_id,
        CONCAT(p.first_name, ' ', p.surname)::TEXT,
        os.encounter_id,
        os.acuity_level,
        EXTRACT(EPOCH FROM (NOW() - os.next_vitals_due))::INTEGER / 60,
        os.assigned_nurse_id
    FROM overdue_schedules os
    JOIN patients p ON p.patient_id = os.patient_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Get all overdue vitals with details
-- =============================================================================

CREATE OR REPLACE FUNCTION get_overdue_vitals()
RETURNS TABLE (
    schedule_id UUID,
    patient_id VARCHAR(50),
    patient_name TEXT,
    encounter_id UUID,
    ward_name VARCHAR(100),
    bed_number VARCHAR(50),
    acuity_level patient_acuity,
    acuity_display_name VARCHAR(100),
    acuity_color VARCHAR(20),
    last_vitals_at TIMESTAMPTZ,
    next_vitals_due TIMESTAMPTZ,
    minutes_overdue INTEGER,
    assigned_nurse_id UUID,
    assigned_nurse_name TEXT,
    alert_priority VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pvs.id,
        pvs.patient_id,
        CONCAT(p.first_name, ' ', p.surname)::TEXT,
        pvs.encounter_id,
        w.name,
        b.bed_number,
        pvs.acuity_level,
        vsc.display_name,
        vsc.color,
        pvs.last_vitals_at,
        pvs.next_vitals_due,
        EXTRACT(EPOCH FROM (NOW() - pvs.next_vitals_due))::INTEGER / 60,
        pvs.assigned_nurse_id,
        CONCAT(s.first_name, ' ', s.last_name)::TEXT,
        vsc.alert_priority
    FROM patient_vital_schedules pvs
    JOIN patients p ON p.patient_id = pvs.patient_id
    JOIN visits v ON v.id = pvs.encounter_id
    JOIN vital_schedule_configs vsc ON vsc.acuity_level = pvs.acuity_level
    LEFT JOIN admissions a ON a.encounter_id = v.id
    LEFT JOIN beds b ON b.id = a.current_bed_id
    LEFT JOIN wards w ON w.id = b.ward_id
    LEFT JOIN staff s ON s.id = pvs.assigned_nurse_id
    WHERE pvs.is_active = TRUE
    AND pvs.paused = FALSE
    AND pvs.is_overdue = TRUE
    ORDER BY 
        CASE pvs.acuity_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
            WHEN 'routine' THEN 5 
        END,
        pvs.next_vitals_due ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Create vital schedule for admitted patient
-- =============================================================================

CREATE OR REPLACE FUNCTION create_vital_schedule_on_admission()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create schedule for inpatient/emergency encounters
    -- visit_type values: 'New Visit', 'Follow-Up', 'Emergency', 'Inpatient', etc.
    IF NEW.visit_type IN ('Inpatient', 'Emergency', 'Admission') AND NEW.status = 'Active' THEN
        INSERT INTO patient_vital_schedules (
            patient_id,
            encounter_id,
            acuity_level,
            next_vitals_due,
            created_by
        ) VALUES (
            NEW.patient_id,
            NEW.id,
            CASE 
                WHEN NEW.visit_type = 'Emergency' THEN 'high'::patient_acuity
                ELSE 'medium'::patient_acuity
            END,
            NOW() + INTERVAL '30 minutes',  -- First vitals due in 30 min
            NEW.attending_doctor_id
        )
        ON CONFLICT (patient_id, encounter_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new admissions
DROP TRIGGER IF EXISTS trigger_create_vital_schedule ON visits;
CREATE TRIGGER trigger_create_vital_schedule
    AFTER INSERT OR UPDATE OF visit_type, status ON visits
    FOR EACH ROW
    EXECUTE FUNCTION create_vital_schedule_on_admission();

-- =============================================================================
-- FUNCTION: Send overdue vitals notification
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_overdue_vitals(
    p_schedule_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_schedule patient_vital_schedules%ROWTYPE;
    v_config vital_schedule_configs%ROWTYPE;
    v_patient_name TEXT;
    v_minutes_overdue INTEGER;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule
    FROM patient_vital_schedules
    WHERE id = p_schedule_id AND is_active = TRUE AND is_overdue = TRUE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if alert already sent
    IF v_schedule.alert_sent = TRUE THEN
        RETURN FALSE;
    END IF;
    
    -- Get config
    SELECT * INTO v_config
    FROM vital_schedule_configs
    WHERE acuity_level = v_schedule.acuity_level;
    
    -- Get patient name
    SELECT CONCAT(first_name, ' ', surname) INTO v_patient_name
    FROM patients WHERE patient_id = v_schedule.patient_id;
    
    -- Calculate minutes overdue
    v_minutes_overdue := EXTRACT(EPOCH FROM (NOW() - v_schedule.next_vitals_due))::INTEGER / 60;
    
    -- Create notification
    PERFORM create_notification(
        'vitals_overdue'::notification_type,
        '⚠️ Vitals Overdue - ' || v_config.display_name,
        'Vital signs for ' || COALESCE(v_patient_name, 'Patient') || ' are ' || v_minutes_overdue || ' minutes overdue (' || v_config.display_name || ' patient)',
        v_config.alert_priority,
        v_schedule.assigned_nurse_id,  -- Target assigned nurse
        'nurse',  -- Also target all nurses
        NULL,
        v_schedule.encounter_id,
        v_schedule.patient_id,
        'vital_schedule',
        v_schedule.id,
        '/nursing?patient=' || v_schedule.patient_id || '&tab=vitals',
        'Record Vitals',
        NULL,
        NOW() + INTERVAL '1 hour',  -- Expires after 1 hour
        jsonb_build_object(
            'acuity_level', v_schedule.acuity_level,
            'minutes_overdue', v_minutes_overdue,
            'patient_name', v_patient_name
        )
    );
    
    -- Mark alert as sent
    UPDATE patient_vital_schedules
    SET alert_sent = TRUE, alert_sent_at = NOW()
    WHERE id = p_schedule_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEW: Current vital schedules summary
-- =============================================================================

CREATE OR REPLACE VIEW vital_schedules_summary AS
SELECT 
    pvs.id,
    pvs.patient_id,
    CONCAT(p.first_name, ' ', p.surname) as patient_name,
    pvs.encounter_id,
    w.name as ward_name,
    b.bed_number,
    pvs.acuity_level,
    vsc.display_name as acuity_display_name,
    vsc.frequency_minutes,
    vsc.color as acuity_color,
    pvs.last_vitals_at,
    pvs.next_vitals_due,
    pvs.is_overdue,
    CASE 
        WHEN pvs.is_overdue THEN EXTRACT(EPOCH FROM (NOW() - pvs.next_vitals_due))::INTEGER / 60
        ELSE NULL
    END as minutes_overdue,
    CASE 
        WHEN NOT pvs.is_overdue AND pvs.next_vitals_due > NOW() 
        THEN EXTRACT(EPOCH FROM (pvs.next_vitals_due - NOW()))::INTEGER / 60
        ELSE NULL
    END as minutes_until_due,
    pvs.assigned_nurse_id,
    CONCAT(s.first_name, ' ', s.last_name) as assigned_nurse_name,
    pvs.paused,
    pvs.pause_reason,
    pvs.is_active
FROM patient_vital_schedules pvs
JOIN patients p ON p.patient_id = pvs.patient_id
JOIN visits v ON v.id = pvs.encounter_id
JOIN vital_schedule_configs vsc ON vsc.acuity_level = pvs.acuity_level
LEFT JOIN admissions a ON a.encounter_id = v.id
LEFT JOIN beds b ON b.id = a.current_bed_id
LEFT JOIN wards w ON w.id = b.ward_id
LEFT JOIN staff s ON s.id = pvs.assigned_nurse_id
WHERE pvs.is_active = TRUE;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE vital_schedule_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vital_schedules ENABLE ROW LEVEL SECURITY;

-- Everyone can read configs
CREATE POLICY vital_configs_select_policy ON vital_schedule_configs
    FOR SELECT USING (TRUE);

-- Nurses and doctors can view schedules
CREATE POLICY vital_schedules_select_policy ON patient_vital_schedules
    FOR SELECT USING (TRUE);

-- Nurses can update schedules (record vitals, pause, etc.)
CREATE POLICY vital_schedules_update_policy ON patient_vital_schedules
    FOR UPDATE USING (TRUE);

-- System can insert schedules
CREATE POLICY vital_schedules_insert_policy ON patient_vital_schedules
    FOR INSERT WITH CHECK (TRUE);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT ON vital_schedule_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON patient_vital_schedules TO authenticated;
GRANT SELECT ON vital_schedules_summary TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_vitals_due TO authenticated;
GRANT EXECUTE ON FUNCTION check_overdue_vital_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_vitals TO authenticated;
GRANT EXECUTE ON FUNCTION notify_overdue_vitals TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE vital_schedule_configs IS 'Configuration for vital sign frequency by patient acuity level';
COMMENT ON TABLE patient_vital_schedules IS 'Active vital sign schedules for admitted patients';
COMMENT ON COLUMN patient_vital_schedules.acuity_level IS 'Patient acuity determines monitoring frequency';
COMMENT ON COLUMN patient_vital_schedules.custom_frequency_minutes IS 'Override default frequency if needed';
COMMENT ON COLUMN patient_vital_schedules.paused IS 'Temporarily pause monitoring (e.g., during surgery)';
COMMENT ON VIEW vital_schedules_summary IS 'Summary view of all active vital schedules with patient details';
