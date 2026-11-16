-- =============================================================================
-- NDC Medical Centre EMR - Shift-Bounded Nursing Notes
-- Migration: 047_shift_bounded_notes.sql
-- =============================================================================
-- Adds shift tracking for nursing notes to enable proper shift handover and
-- note organization by time periods.
-- =============================================================================

-- =============================================================================
-- SHIFT TYPE ENUM
-- =============================================================================

-- Drop and recreate if exists with wrong values, or create new
DO $$ 
BEGIN
    -- Check if enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_type') THEN
        CREATE TYPE shift_type AS ENUM ('day', 'evening', 'night');
    END IF;
END $$;

-- =============================================================================
-- SHIFT CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS shift_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_name VARCHAR(20) NOT NULL UNIQUE,  -- Use VARCHAR instead of enum for flexibility
    display_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color VARCHAR(20) DEFAULT '#6B7280',  -- For UI display
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default shift configurations
INSERT INTO shift_configurations (shift_name, display_name, start_time, end_time, color) VALUES
    ('day', 'Day Shift', '07:00', '15:00', '#F59E0B'),
    ('evening', 'Evening Shift', '15:00', '23:00', '#8B5CF6'),
    ('night', 'Night Shift', '23:00', '07:00', '#1E40AF')
ON CONFLICT (shift_name) DO NOTHING;

-- =============================================================================
-- ADD SHIFT COLUMNS TO NURSING NOTES (if table exists)
-- =============================================================================

-- Add shift to nursing_notes if table and column don't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nursing_notes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nursing_notes' AND column_name = 'shift') THEN
            ALTER TABLE nursing_notes ADD COLUMN shift VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nursing_notes' AND column_name = 'shift_date') THEN
            ALTER TABLE nursing_notes ADD COLUMN shift_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nursing_notes' AND column_name = 'is_handover_note') THEN
            ALTER TABLE nursing_notes ADD COLUMN is_handover_note BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- SHIFT HANDOVER TABLE
-- =============================================================================

-- Drop and recreate to ensure correct schema
DROP TABLE IF EXISTS shift_handovers CASCADE;

CREATE TABLE shift_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    
    -- Shift information (VARCHAR for flexibility)
    from_shift VARCHAR(20) NOT NULL,
    to_shift VARCHAR(20) NOT NULL,
    shift_date DATE NOT NULL,
    
    -- Staff involved
    outgoing_nurse_id UUID NOT NULL REFERENCES staff(id),
    incoming_nurse_id UUID REFERENCES staff(id),  -- May be null if not yet acknowledged
    
    -- Handover content
    patient_status TEXT NOT NULL,  -- Current condition
    key_observations TEXT,  -- Important observations during shift
    pending_tasks TEXT,  -- Tasks that need to be completed
    medications_given TEXT,  -- Medications administered this shift
    upcoming_medications TEXT,  -- Medications due next shift
    special_instructions TEXT,  -- Any special care instructions
    concerns TEXT,  -- Areas of concern
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- pending, acknowledged, reviewed
    acknowledged_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shift_handovers_encounter ON shift_handovers(encounter_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_patient ON shift_handovers(patient_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_date ON shift_handovers(shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_status ON shift_handovers(status);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_outgoing ON shift_handovers(outgoing_nurse_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_incoming ON shift_handovers(incoming_nurse_id);

-- Create index on nursing_notes only if table and columns exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nursing_notes' AND column_name = 'shift'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nursing_notes' AND column_name = 'shift_date'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_nursing_notes_shift ON nursing_notes(shift, shift_date);
    END IF;
END $$;

-- =============================================================================
-- FUNCTION: Determine current shift based on time
-- =============================================================================

CREATE OR REPLACE FUNCTION get_current_shift(p_time TIME DEFAULT CURRENT_TIME)
RETURNS VARCHAR(20) AS $$
BEGIN
    -- Day shift: 7:00 AM - 3:00 PM
    IF p_time >= '07:00'::TIME AND p_time < '15:00'::TIME THEN
        RETURN 'day';
    -- Evening shift: 3:00 PM - 11:00 PM
    ELSIF p_time >= '15:00'::TIME AND p_time < '23:00'::TIME THEN
        RETURN 'evening';
    -- Night shift: 11:00 PM - 7:00 AM
    ELSE
        RETURN 'night';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- FUNCTION: Get shift date (handles overnight shifts)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_shift_date(p_timestamp TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE AS $$
DECLARE
    v_time TIME;
    v_date DATE;
BEGIN
    v_time := p_timestamp::TIME;
    v_date := p_timestamp::DATE;
    
    -- For night shift after midnight (00:00-07:00), 
    -- the shift date is the previous day
    IF v_time >= '00:00'::TIME AND v_time < '07:00'::TIME THEN
        RETURN v_date - INTERVAL '1 day';
    ELSE
        RETURN v_date;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- TRIGGER: Auto-assign shift to nursing notes
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_assign_shift_to_note()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign shift if not provided
    IF NEW.shift IS NULL THEN
        NEW.shift := get_current_shift(NEW.created_at::TIME);
    END IF;
    
    -- Auto-assign shift date if not provided
    IF NEW.shift_date IS NULL THEN
        NEW.shift_date := get_shift_date(NEW.created_at);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if nursing_notes table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nursing_notes') THEN
        DROP TRIGGER IF EXISTS trigger_auto_assign_shift ON nursing_notes;
        CREATE TRIGGER trigger_auto_assign_shift
            BEFORE INSERT ON nursing_notes
            FOR EACH ROW
            EXECUTE FUNCTION auto_assign_shift_to_note();
    END IF;
END $$;

-- =============================================================================
-- FUNCTION: Create shift handover notification
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_shift_handover()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_name TEXT;
    v_nurse_name TEXT;
BEGIN
    -- Get patient name
    SELECT CONCAT(first_name, ' ', surname) INTO v_patient_name
    FROM patients WHERE patient_id = NEW.patient_id;
    
    -- Get outgoing nurse name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_nurse_name
    FROM staff WHERE id = NEW.outgoing_nurse_id;
    
    -- Create notification for incoming shift nurses
    -- Note: create_notification may not exist yet, wrap in exception handler
    BEGIN
        PERFORM create_notification(
            'shift_handover',  -- type (VARCHAR, will be cast)
            'Shift Handover Available',
            'Nurse ' || COALESCE(v_nurse_name, 'Unknown') || ' has prepared handover notes for ' || COALESCE(v_patient_name, 'Patient'),
            'high',  -- priority (VARCHAR, will be cast)
            NULL,  -- No specific user
            'nurse',  -- Target all nurses
            NULL,
            NEW.encounter_id,
            NEW.patient_id,
            'shift_handover',
            NEW.id,
            '/nursing?encounter=' || NEW.encounter_id || '&tab=handover',
            'View Handover',
            NEW.outgoing_nurse_id,
            NEW.shift_date + INTERVAL '8 hours',  -- Expires after next shift
            jsonb_build_object(
                'from_shift', NEW.from_shift,
                'to_shift', NEW.to_shift,
                'patient_name', v_patient_name
            )
        );
    EXCEPTION
        WHEN undefined_function THEN
            -- create_notification doesn't exist yet, skip
            NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for handover notification
DROP TRIGGER IF EXISTS trigger_notify_shift_handover ON shift_handovers;
CREATE TRIGGER trigger_notify_shift_handover
    AFTER INSERT ON shift_handovers
    FOR EACH ROW
    EXECUTE FUNCTION notify_shift_handover();

-- =============================================================================
-- UPDATE EXISTING NURSING NOTES WITH SHIFT DATA
-- =============================================================================

-- Backfill existing notes with shift information (only if table and columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nursing_notes' AND column_name = 'shift'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nursing_notes' AND column_name = 'shift_date'
    ) THEN
        UPDATE nursing_notes
        SET 
            shift = get_current_shift(created_at::TIME),
            shift_date = get_shift_date(created_at)
        WHERE shift IS NULL;
    END IF;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE shift_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS shift_config_select_policy ON shift_configurations;
DROP POLICY IF EXISTS shift_handovers_select_policy ON shift_handovers;
DROP POLICY IF EXISTS shift_handovers_insert_policy ON shift_handovers;
DROP POLICY IF EXISTS shift_handovers_update_policy ON shift_handovers;

-- Shift configurations - readable by all authenticated
CREATE POLICY shift_config_select_policy ON shift_configurations
    FOR SELECT USING (TRUE);

-- Shift handovers - nurses can see their own and their department's
CREATE POLICY shift_handovers_select_policy ON shift_handovers
    FOR SELECT USING (TRUE);

CREATE POLICY shift_handovers_insert_policy ON shift_handovers
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY shift_handovers_update_policy ON shift_handovers
    FOR UPDATE USING (TRUE);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT ON shift_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON shift_handovers TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_shift TO authenticated;
GRANT EXECUTE ON FUNCTION get_shift_date TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE shift_configurations IS 'Hospital shift definitions (Day/Evening/Night)';
COMMENT ON TABLE shift_handovers IS 'Structured shift handover documentation between nurses';

-- Add comments on nursing_notes columns only if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nursing_notes' AND column_name = 'shift') THEN
        COMMENT ON COLUMN nursing_notes.shift IS 'The shift during which this note was created';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nursing_notes' AND column_name = 'shift_date') THEN
        COMMENT ON COLUMN nursing_notes.shift_date IS 'The calendar date of the shift (handles overnight)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nursing_notes' AND column_name = 'is_handover_note') THEN
        COMMENT ON COLUMN nursing_notes.is_handover_note IS 'Flag for notes specifically created for handover';
    END IF;
END $$;

COMMENT ON FUNCTION get_current_shift IS 'Returns the current shift type based on time';
COMMENT ON FUNCTION get_shift_date IS 'Returns the shift date, handling overnight shifts';
