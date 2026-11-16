-- Migration 052: Fix vital_schedule type mismatch
-- =============================================================================
-- The trigger update_vital_schedule_on_record() compares:
--   patient_vital_schedules.patient_id (VARCHAR) = vitals.patient_id (UUID)
-- This causes "operator does not exist: character varying = uuid"
-- 
-- Fix: Cast the UUID to look up the VARCHAR patient_id first
-- =============================================================================

CREATE OR REPLACE FUNCTION update_vital_schedule_on_record()
RETURNS TRIGGER AS $$
DECLARE
    v_schedule_id UUID;
    v_was_overdue BOOLEAN;
    v_overdue_minutes INTEGER;
    v_patient_varchar VARCHAR(50);
BEGIN
    -- vitals.patient_id is UUID, but patient_vital_schedules.patient_id is VARCHAR
    -- Look up the VARCHAR patient_id from patients table using the UUID
    SELECT patient_id INTO v_patient_varchar
    FROM patients
    WHERE id = NEW.patient_id;
    
    -- If we couldn't find the patient, skip schedule update
    IF v_patient_varchar IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Find the active schedule for this patient/encounter using VARCHAR patient_id
    SELECT id, is_overdue, 
           CASE WHEN is_overdue AND overdue_since IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (NOW() - overdue_since)) / 60 
                ELSE 0 END
    INTO v_schedule_id, v_was_overdue, v_overdue_minutes
    FROM patient_vital_schedules
    WHERE patient_id = v_patient_varchar  -- Use VARCHAR patient_id
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
            last_vitals_at = NEW.date_recorded,  -- Use date_recorded (vitals column name)
            next_vitals_due = calculate_next_vitals_due(v_schedule_id, NEW.date_recorded),
            is_overdue = FALSE,
            overdue_since = NULL,
            alert_sent = FALSE,
            alert_sent_at = NULL,
            updated_at = NOW()
        WHERE id = v_schedule_id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the vitals insert if schedule update fails
        RAISE WARNING 'Vital schedule update failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_vital_schedule ON vitals;
CREATE TRIGGER trigger_update_vital_schedule
    BEFORE INSERT ON vitals
    FOR EACH ROW
    EXECUTE FUNCTION update_vital_schedule_on_record();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
