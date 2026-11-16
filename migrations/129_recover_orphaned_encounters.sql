-- Migration: 129_recover_orphaned_encounters
-- Purpose: Add safeguards to prevent and recover orphaned encounters
-- that get stuck when queue transitions fail
-- Created: 2026-02-07

-- =============================================================================
-- 1. Recovery RPC Function
-- Finds and fixes orphaned encounters (Active visits with no active queue entry)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recover_orphaned_encounters(
  p_facility_id UUID DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  visit_id UUID,
  visit_number VARCHAR,
  patient_name TEXT,
  current_stage VARCHAR,
  last_queue_location VARCHAR,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_default_location VARCHAR;
  v_ticket_number VARCHAR;
BEGIN
  -- Find orphaned encounters:
  -- - Visit status is 'Active'
  -- - No queue entry with status in ('Waiting', 'Called', 'In Progress')
  -- - current_stage suggests they should be in a queue
  
  FOR v_record IN
    SELECT 
      v.id,
      v.visit_id AS visit_number,
      COALESCE(p.first_name || ' ' || p.surname, 'Unknown') AS patient_name,
      v.current_stage,
      v.patient_id,
      v.clinic_id,
      v.priority,
      (
        SELECT q.location 
        FROM queue q 
        WHERE q.visit_id = v.id 
        ORDER BY q.completed_at DESC NULLS LAST, q.created_at DESC 
        LIMIT 1
      ) AS last_queue_location
    FROM visits v
    LEFT JOIN patients p ON v.patient_id = p.id
    WHERE v.status = 'Active'
      AND (p_facility_id IS NULL OR v.facility_id = p_facility_id)
      AND NOT EXISTS (
        SELECT 1 FROM queue q 
        WHERE q.visit_id = v.id 
        AND q.status IN ('Waiting', 'Called', 'In Progress')
      )
      -- Only recover encounters in stages that expect a queue entry
      AND v.current_stage IN (
        'registered', 'payment', 'queue_waiting', 'nursing_vitals',
        'consultation', 'billing_final'
      )
      -- Exclude completed or discharged encounters
      AND v.current_stage != 'completed'
      AND v.current_stage != 'encounter_closed'
      -- Only encounters from today (configurable, currently within last 24 hours)
      AND v.created_at > NOW() - INTERVAL '24 hours'
  LOOP
    -- Determine target location based on current_stage and last queue location
    CASE v_record.current_stage
      WHEN 'registered' THEN v_default_location := 'Billing';
      WHEN 'payment' THEN v_default_location := 'Billing';
      WHEN 'queue_waiting' THEN v_default_location := COALESCE(v_record.last_queue_location, 'Nursing');
      WHEN 'nursing_vitals' THEN v_default_location := 'Nursing';
      WHEN 'consultation' THEN v_default_location := 'Consultation';
      WHEN 'billing_final' THEN v_default_location := 'Billing';
      ELSE v_default_location := 'Nursing';
    END CASE;
    
    -- If last queue was already Nursing, next should be Consultation
    IF v_record.last_queue_location = 'Nursing' AND v_record.current_stage = 'queue_waiting' THEN
      v_default_location := 'Consultation';
    END IF;
    
    -- If last queue was Billing, next should be Nursing (for initial payment flow)
    IF v_record.last_queue_location = 'Billing' AND v_record.current_stage IN ('registered', 'payment', 'queue_waiting') THEN
      v_default_location := 'Nursing';
    END IF;
    
    IF NOT p_dry_run THEN
      -- Generate ticket number
      SELECT COALESCE(MAX(CAST(ticket_number AS INTEGER)), 0) + 1 
      INTO v_ticket_number
      FROM queue 
      WHERE location = v_default_location
        AND created_at::date = CURRENT_DATE;
      
      v_ticket_number := COALESCE(v_ticket_number, '1');
      
      -- Create the missing queue entry
      INSERT INTO queue (
        patient_id,
        visit_id,
        encounter_id,
        clinic_id,
        ticket_number,
        location,
        priority,
        status,
        notes,
        created_at
      ) VALUES (
        v_record.patient_id,
        v_record.id,
        v_record.id,
        v_record.clinic_id,
        v_ticket_number,
        v_default_location,
        COALESCE(v_record.priority, 'Normal'),
        'Waiting',
        'Auto-recovered from orphaned state by system',
        NOW()
      );
      
      -- Update current_stage to match the queue location
      UPDATE visits 
      SET 
        current_stage = CASE v_default_location
          WHEN 'Billing' THEN 'payment'
          WHEN 'Nursing' THEN 'queue_waiting'
          WHEN 'Consultation' THEN 'consultation'
          ELSE 'queue_waiting'
        END,
        updated_at = NOW()
      WHERE id = v_record.id;
    END IF;
    
    -- Return results
    visit_id := v_record.id;
    visit_number := v_record.visit_number;
    patient_name := v_record.patient_name;
    current_stage := v_record.current_stage;
    last_queue_location := v_record.last_queue_location;
    action_taken := CASE 
      WHEN p_dry_run THEN 'Would create queue entry for: ' || v_default_location
      ELSE 'Created queue entry for: ' || v_default_location
    END;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.recover_orphaned_encounters(UUID, BOOLEAN) TO authenticated;

-- =============================================================================
-- 2. Trigger to auto-create queue entry when current_stage changes
-- This serves as a safeguard in case the queue insert fails in the application
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ensure_queue_entry_on_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_location VARCHAR;
  v_ticket_number VARCHAR;
  v_has_active_queue BOOLEAN;
BEGIN
  -- Only trigger when current_stage changes to a stage that requires a queue entry
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage 
     AND NEW.current_stage IN ('queue_waiting', 'nursing_vitals', 'consultation', 'payment', 'billing_final')
     AND NEW.status = 'Active' 
  THEN
    -- Check if there's already an active queue entry
    SELECT EXISTS(
      SELECT 1 FROM queue 
      WHERE visit_id = NEW.id 
      AND status IN ('Waiting', 'Called', 'In Progress')
    ) INTO v_has_active_queue;
    
    -- If no active queue entry exists, create one as a safeguard
    IF NOT v_has_active_queue THEN
      -- Determine target location based on new stage
      CASE NEW.current_stage
        WHEN 'payment' THEN v_target_location := 'Billing';
        WHEN 'queue_waiting' THEN v_target_location := 'Nursing';
        WHEN 'nursing_vitals' THEN v_target_location := 'Nursing';
        WHEN 'consultation' THEN v_target_location := 'Consultation';
        WHEN 'billing_final' THEN v_target_location := 'Billing';
        ELSE v_target_location := 'Nursing';
      END CASE;
      
      -- Generate ticket number
      SELECT COALESCE(MAX(CAST(ticket_number AS INTEGER)), 0) + 1 
      INTO v_ticket_number
      FROM queue 
      WHERE location = v_target_location
        AND created_at::date = CURRENT_DATE;
      
      v_ticket_number := COALESCE(v_ticket_number, '1');
      
      -- Insert queue entry as safeguard
      INSERT INTO queue (
        patient_id,
        visit_id,
        encounter_id,
        clinic_id,
        ticket_number,
        location,
        priority,
        status,
        notes,
        created_at
      ) VALUES (
        NEW.patient_id,
        NEW.id,
        NEW.id,
        NEW.clinic_id,
        v_ticket_number,
        v_target_location,
        COALESCE(NEW.priority, 'Normal'),
        'Waiting',
        'Auto-created by stage change trigger (safeguard)',
        NOW()
      )
      ON CONFLICT (visit_id, location, status) 
      WHERE status IN ('Waiting', 'Called', 'In Progress')
      DO NOTHING;  -- Skip if queue entry already exists
      
      RAISE NOTICE '[Safeguard] Auto-created queue entry for visit % at %', NEW.id, v_target_location;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_ensure_queue_entry_on_stage_change ON visits;

CREATE TRIGGER trg_ensure_queue_entry_on_stage_change
  AFTER UPDATE OF current_stage ON visits
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_queue_entry_on_stage_change();

-- =============================================================================
-- 3. Add index to speed up orphaned encounter queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_visits_active_stage 
  ON visits(status, current_stage, created_at) 
  WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_queue_visit_active_status 
  ON queue(visit_id, status) 
  WHERE status IN ('Waiting', 'Called', 'In Progress');

-- =============================================================================
-- 4. Documentation comment
-- =============================================================================

COMMENT ON FUNCTION public.recover_orphaned_encounters IS 
'Finds and optionally fixes orphaned encounters (Active visits with no active queue entry).
Use p_dry_run = TRUE (default) to preview what would be fixed without making changes.
Use p_dry_run = FALSE to actually create the missing queue entries.

Example usage:
  -- Preview orphaned encounters
  SELECT * FROM recover_orphaned_encounters(NULL, TRUE);
  
  -- Fix orphaned encounters for a specific facility
  SELECT * FROM recover_orphaned_encounters(''facility-uuid'', FALSE);
  
  -- Fix all orphaned encounters
  SELECT * FROM recover_orphaned_encounters(NULL, FALSE);
';

COMMENT ON FUNCTION public.ensure_queue_entry_on_stage_change IS
'Trigger function that auto-creates queue entries when visits.current_stage changes.
This is a safeguard to prevent orphaned encounters when queue creation fails in the app.';
