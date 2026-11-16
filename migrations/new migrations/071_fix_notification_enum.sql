-- Fix notify_critical_result function to use correct enum value
-- The enum has 'CriticalValue' but the function was using 'result_critical'

CREATE OR REPLACE FUNCTION public.notify_critical_result()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
            'CriticalValue'::notification_type,
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
$$;
