-- ============================================================================
-- Migration 141: Fix create_queue_ticket to handle duplicate active entries
-- ============================================================================
-- PROBLEM: The unique index idx_queue_encounter_location_active prevents
-- duplicate active queue entries for the same encounter+location.
-- When moveToQueue() completes the old entry and calls create_queue_ticket
-- in quick succession, or when the same encounter already has an active entry, 
-- the RPC fails with a duplicate key violation (23505).
--
-- FIX: Update create_queue_ticket to COMPLETE any existing active queue entries
-- for the same encounter+location BEFORE inserting the new one.
-- This makes the RPC idempotent and self-healing.
-- ============================================================================

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
    v_enc_id uuid;
    v_completed_count integer;
BEGIN
    -- Get today's date in Africa/Lagos timezone
    v_today_lagos := (now() AT TIME ZONE 'Africa/Lagos')::date;
    
    -- Resolve the encounter ID (prefer p_encounter_id, fall back to p_visit_id)
    v_enc_id := COALESCE(p_encounter_id, p_visit_id);
    
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
    
    -- ======================================================================
    -- DEDUPLICATION: Complete any existing active queue entries for this
    -- encounter at the SAME location. This prevents the unique index
    -- idx_queue_encounter_location_active from blocking the insert.
    -- ======================================================================
    IF v_enc_id IS NOT NULL THEN
        UPDATE queue
        SET status = 'Completed',
            completed_at = now()
        WHERE encounter_id = v_enc_id
          AND location = v_location
          AND status IN ('Waiting', 'Called', 'In Progress');
        
        GET DIAGNOSTICS v_completed_count = ROW_COUNT;
        IF v_completed_count > 0 THEN
            RAISE NOTICE 'create_queue_ticket: completed % existing active entries for encounter % at %',
                v_completed_count, v_enc_id, p_dept;
        END IF;
    END IF;
    
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.create_queue_ticket(text, uuid, uuid, uuid, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_queue_ticket(text, uuid, uuid, uuid, uuid, text, text, uuid) TO service_role;

-- ============================================================================
-- SUMMARY:
-- The create_queue_ticket RPC now automatically completes any existing active
-- queue entries for the same encounter+location before creating a new one.
-- This prevents 23505 duplicate key violations on idx_queue_encounter_location_active.
-- ============================================================================
