-- =============================================================================
-- Migration: Atomic Queue Ticket System
-- Description: Creates atomic counter-based queue ticket generation with 
--              integrated queue insertion in a single transaction
-- Timezone: Africa/Lagos for daily reset
-- =============================================================================

-- 1. Create the daily counter table for atomic ticket number generation
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.queue_daily_counters (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    department text NOT NULL,
    counter_date date NOT NULL,
    last_ticket_number integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT queue_daily_counters_unique UNIQUE (department, counter_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_queue_daily_counters_dept_date 
ON public.queue_daily_counters(department, counter_date);

-- RLS policies (drop if exists first to allow re-running)
ALTER TABLE public.queue_daily_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage queue counters" ON public.queue_daily_counters;
CREATE POLICY "Service role can manage queue counters" ON public.queue_daily_counters
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read queue counters" ON public.queue_daily_counters;
CREATE POLICY "Authenticated users can read queue counters" ON public.queue_daily_counters
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert queue counters" ON public.queue_daily_counters;
CREATE POLICY "Authenticated users can insert queue counters" ON public.queue_daily_counters
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update queue counters" ON public.queue_daily_counters;
CREATE POLICY "Authenticated users can update queue counters" ON public.queue_daily_counters
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.queue_daily_counters IS 
'Atomic daily counters for queue ticket number generation per department. Resets daily at midnight Africa/Lagos time.';

-- =============================================================================
-- 2. Atomic function to get next ticket number (internal use)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_next_queue_number(dept text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num integer;
    today_lagos date;
BEGIN
    -- Get today's date in Africa/Lagos timezone
    today_lagos := (now() AT TIME ZONE 'Africa/Lagos')::date;
    
    -- Atomic upsert: insert new counter or increment existing
    -- Uses advisory lock to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('queue_counter_' || dept || '_' || today_lagos::text));
    
    INSERT INTO public.queue_daily_counters (department, counter_date, last_ticket_number)
    VALUES (dept, today_lagos, 1)
    ON CONFLICT (department, counter_date)
    DO UPDATE SET 
        last_ticket_number = queue_daily_counters.last_ticket_number + 1,
        updated_at = now()
    RETURNING last_ticket_number INTO next_num;
    
    RETURN next_num;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_queue_number(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_queue_number(text) TO service_role;

COMMENT ON FUNCTION public.get_next_queue_number(text) IS 
'Returns the next available queue ticket number for a department. Uses atomic counter table. Resets daily at midnight Africa/Lagos.';

-- =============================================================================
-- 3. Main atomic function: Create queue ticket + insert queue entry in one transaction
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_queue_ticket(
    p_dept text,
    p_patient_id uuid,
    p_visit_id uuid DEFAULT NULL,
    p_encounter_id uuid DEFAULT NULL,
    p_clinic_id uuid DEFAULT NULL,
    p_priority text DEFAULT 'Normal',
    p_notes text DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket_number integer;
    v_queue_id uuid;
    v_today_lagos date;
    v_result jsonb;
    v_location queue_location;
    v_priority priority;
BEGIN
    -- Get today's date in Africa/Lagos timezone
    v_today_lagos := (now() AT TIME ZONE 'Africa/Lagos')::date;
    
    -- Cast text department to queue_location enum
    BEGIN
        v_location := p_dept::queue_location;
    EXCEPTION WHEN invalid_text_representation THEN
        v_location := 'Nursing'::queue_location;
    END;
    
    -- Cast text priority to priority enum
    BEGIN
        v_priority := COALESCE(p_priority, 'Normal')::priority;
    EXCEPTION WHEN invalid_text_representation THEN
        v_priority := 'Normal'::priority;
    END;
    
    -- Acquire advisory lock for this department+date combination to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('queue_counter_' || p_dept || '_' || v_today_lagos::text));
    
    -- Atomic upsert to get next ticket number
    INSERT INTO public.queue_daily_counters (department, counter_date, last_ticket_number)
    VALUES (p_dept, v_today_lagos, 1)
    ON CONFLICT (department, counter_date)
    DO UPDATE SET 
        last_ticket_number = queue_daily_counters.last_ticket_number + 1,
        updated_at = now()
    RETURNING last_ticket_number INTO v_ticket_number;
    
    -- Generate queue ID
    v_queue_id := extensions.uuid_generate_v4();
    
    -- Insert queue entry with the ticket number
    INSERT INTO public.queue (
        id,
        patient_id,
        visit_id,
        encounter_id,
        clinic_id,
        location,
        ticket_number,
        priority,
        status,
        notes,
        created_at
    ) VALUES (
        v_queue_id,
        p_patient_id,
        COALESCE(p_visit_id, p_encounter_id),
        p_encounter_id,
        p_clinic_id,
        v_location,
        v_ticket_number::text,
        v_priority,
        'Waiting',
        p_notes,
        now()
    );
    
    -- Build result JSON
    v_result := jsonb_build_object(
        'success', true,
        'queue_id', v_queue_id,
        'ticket_number', v_ticket_number,
        'department', p_dept,
        'patient_id', p_patient_id,
        'encounter_id', p_encounter_id,
        'status', 'Waiting',
        'created_at', now()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error info
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_detail', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_queue_ticket(text, uuid, uuid, uuid, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_queue_ticket(text, uuid, uuid, uuid, uuid, text, text, uuid) TO service_role;

COMMENT ON FUNCTION public.create_queue_ticket IS 
'Atomically creates a queue entry with auto-generated ticket number. 
Ticket numbers reset daily at midnight Africa/Lagos time.
Returns JSON with queue_id, ticket_number, and status.
Parameters:
  - p_dept: Department/location (e.g., ''Nursing'', ''Billing'', ''Consultation'')
  - p_patient_id: Patient UUID (required)
  - p_visit_id: Visit UUID (optional, defaults to encounter_id)
  - p_encounter_id: Encounter UUID (optional but recommended)
  - p_clinic_id: Clinic UUID (optional)
  - p_priority: Priority level (default ''Normal'')
  - p_notes: Queue notes (optional)
  - p_created_by: Staff UUID who created (optional)';

-- =============================================================================
-- 4. Helper function to complete a queue entry and create the next one atomically
-- =============================================================================
CREATE OR REPLACE FUNCTION public.transfer_queue_ticket(
    p_current_queue_id uuid,
    p_new_dept text,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_queue RECORD;
    v_new_ticket integer;
    v_new_queue_id uuid;
    v_today_lagos date;
    v_result jsonb;
    v_location queue_location;
BEGIN
    -- Get today's date in Africa/Lagos timezone
    v_today_lagos := (now() AT TIME ZONE 'Africa/Lagos')::date;
    
    -- Cast text department to queue_location enum
    BEGIN
        v_location := p_new_dept::queue_location;
    EXCEPTION WHEN invalid_text_representation THEN
        -- Default to 'Nursing' if invalid location provided
        v_location := 'Nursing'::queue_location;
    END;
    
    -- Get current queue entry
    SELECT * INTO v_current_queue 
    FROM public.queue 
    WHERE id = p_current_queue_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Queue entry not found'
        );
    END IF;
    
    -- Acquire lock for new department
    PERFORM pg_advisory_xact_lock(hashtext('queue_counter_' || p_new_dept || '_' || v_today_lagos::text));
    
    -- Complete current queue entry
    UPDATE public.queue
    SET status = 'Completed',
        completed_at = now()
    WHERE id = p_current_queue_id;
    
    -- Get next ticket number for new department
    INSERT INTO public.queue_daily_counters (department, counter_date, last_ticket_number)
    VALUES (p_new_dept, v_today_lagos, 1)
    ON CONFLICT (department, counter_date)
    DO UPDATE SET 
        last_ticket_number = queue_daily_counters.last_ticket_number + 1,
        updated_at = now()
    RETURNING last_ticket_number INTO v_new_ticket;
    
    -- Generate new queue ID
    v_new_queue_id := extensions.uuid_generate_v4();
    
    -- Create new queue entry
    INSERT INTO public.queue (
        id,
        patient_id,
        visit_id,
        encounter_id,
        clinic_id,
        location,
        ticket_number,
        priority,
        status,
        notes,
        created_at
    ) VALUES (
        v_new_queue_id,
        v_current_queue.patient_id,
        v_current_queue.visit_id,
        v_current_queue.encounter_id,
        v_current_queue.clinic_id,
        v_location,  -- Use the casted enum value
        v_new_ticket::text,
        v_current_queue.priority,
        'Waiting',
        COALESCE(p_notes, 'Transferred from ' || v_current_queue.location),
        now()
    );
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'previous_queue_id', p_current_queue_id,
        'previous_department', v_current_queue.location,
        'new_queue_id', v_new_queue_id,
        'new_ticket_number', v_new_ticket,
        'new_department', p_new_dept,
        'patient_id', v_current_queue.patient_id,
        'encounter_id', v_current_queue.encounter_id
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_detail', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_queue_ticket(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_queue_ticket(uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.transfer_queue_ticket IS 
'Atomically completes a queue entry and creates a new one in a different department.
Used for transferring patients between departments.
Parameters:
  - p_current_queue_id: Current queue entry UUID to complete
  - p_new_dept: New department/location to transfer to
  - p_notes: Optional notes for the new queue entry';

-- =============================================================================
-- 5. Cleanup function for old counter records (can be called periodically)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_counters(days_to_keep integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted integer;
BEGIN
    DELETE FROM public.queue_daily_counters
    WHERE counter_date < (now() AT TIME ZONE 'Africa/Lagos')::date - days_to_keep;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_queue_counters(integer) TO service_role;

COMMENT ON FUNCTION public.cleanup_old_queue_counters IS 
'Removes old daily counter records. Default keeps 7 days of history.';

