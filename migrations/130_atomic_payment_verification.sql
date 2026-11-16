-- Migration: 130_atomic_payment_verification
-- Purpose: Atomic, idempotent payment verification + queue routing in single transaction
-- Created: 2026-02-07

-- =============================================================================
-- 1. Add idempotency columns if not exists
-- =============================================================================

-- Add idempotency_key to receipts for payment verification deduplication
ALTER TABLE public.receipts 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Create unique index on idempotency_key to enforce single-verification
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_idempotency_key 
  ON receipts(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Add unique constraint on queue to prevent duplicate active entries per encounter+location
CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_encounter_location_active
  ON queue(encounter_id, location)
  WHERE status IN ('Waiting', 'Called', 'In Progress');

-- =============================================================================
-- 2. Atomic Payment Verification + Routing RPC
-- Single transaction: verify payment → update billing → update stage → create queue
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_payment_and_route(
  p_billing_id UUID,
  p_payment_method VARCHAR,
  p_idempotency_key VARCHAR DEFAULT NULL,
  p_verified_by_staff_id VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing RECORD;
  v_visit RECORD;
  v_clinic RECORD;
  v_receipt_number VARCHAR;
  v_ticket_number VARCHAR;
  v_queue_id UUID;
  v_target_location VARCHAR := 'Nursing';
  v_is_specialty_clinic BOOLEAN := FALSE;
  v_is_specialty_referral BOOLEAN := FALSE;
  v_payment_status VARCHAR;
  v_new_paid_amount NUMERIC;
  v_new_balance NUMERIC;
  v_is_insurance_payment BOOLEAN;
  v_existing_receipt RECORD;
  v_patient_display_id VARCHAR;
  v_visit_display_id VARCHAR;
BEGIN
  -- ==========================================================================
  -- STEP 1: Idempotency Check - Return existing result if already processed
  -- ==========================================================================
  IF p_idempotency_key IS NOT NULL THEN
    SELECT r.*, bo.status AS billing_status, v.current_stage
    INTO v_existing_receipt
    FROM receipts r
    JOIN billing_orders bo ON bo.id = r.billing_order_id
    LEFT JOIN visits v ON v.id = bo.encounter_id OR v.id::text = bo.visit_id
    WHERE r.idempotency_key = p_idempotency_key
    LIMIT 1;
    
    IF FOUND THEN
      -- Already processed - return idempotent response
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'message', 'Payment already verified (idempotent response)',
        'receipt_number', v_existing_receipt.receipt_number,
        'billing_status', v_existing_receipt.billing_status,
        'current_stage', v_existing_receipt.current_stage
      );
    END IF;
  END IF;

  -- ==========================================================================
  -- STEP 2: Lock and fetch billing order (FOR UPDATE prevents race conditions)
  -- ==========================================================================
  SELECT bo.*, 
         bo.balance_amount AS balance,
         p.patient_id AS patient_display_id,
         vis.visit_id AS visit_display_id
  INTO v_billing
  FROM billing_orders bo
  LEFT JOIN patients p ON p.id = bo.patient_id
  LEFT JOIN visits vis ON vis.id = COALESCE(bo.encounter_id, bo.visit_id::uuid)
  WHERE bo.id = p_billing_id
  FOR UPDATE OF bo;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Billing order not found'
    );
  END IF;
  
  -- Check if already paid
  IF v_billing.status IN ('Paid', 'Paid_NHIS', 'Paid_Retainership') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Billing order already paid',
      'current_status', v_billing.status
    );
  END IF;

  -- ==========================================================================
  -- STEP 3: Fetch visit/encounter details
  -- ==========================================================================
  SELECT * INTO v_visit
  FROM visits
  WHERE id = COALESCE(v_billing.encounter_id, v_billing.visit_id::uuid)
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Visit/encounter not found'
    );
  END IF;

  -- ==========================================================================
  -- STEP 4: Determine payment status and amounts
  -- ==========================================================================
  v_is_insurance_payment := p_payment_method IN ('NHIS', 'Retainership');
  
  CASE p_payment_method
    WHEN 'NHIS' THEN v_payment_status := 'Paid_NHIS';
    WHEN 'Retainership' THEN v_payment_status := 'Paid_Retainership';
    ELSE v_payment_status := 'Paid';
  END CASE;
  
  v_new_paid_amount := v_billing.paid_amount + GREATEST(COALESCE(v_billing.balance, v_billing.balance_amount, 0), 0);
  v_new_balance := CASE WHEN v_is_insurance_payment THEN 0 
                        ELSE GREATEST(v_billing.net_amount - v_new_paid_amount, 0) 
                   END;

  -- ==========================================================================
  -- STEP 5: Generate receipt number
  -- ==========================================================================
  SELECT COALESCE(
    (SELECT 'RCP-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((COALESCE(MAX(
      CAST(NULLIF(REGEXP_REPLACE(receipt_number, '[^0-9]', '', 'g'), '') AS INTEGER)
    ), 0) + 1)::TEXT, 4, '0')
    FROM receipts 
    WHERE receipt_number LIKE 'RCP-' || TO_CHAR(NOW(), 'YYMM') || '-%'),
    'RCP-' || TO_CHAR(NOW(), 'YYMM') || '-0001'
  ) INTO v_receipt_number;

  -- ==========================================================================
  -- STEP 6: Update billing order status (atomic)
  -- ==========================================================================
  UPDATE billing_orders
  SET status = v_payment_status,
      payment_method = p_payment_method,
      paid_amount = v_new_paid_amount,
      balance_amount = v_new_balance,
      updated_at = NOW()
  WHERE id = p_billing_id;
  
  -- Update all billing items
  UPDATE billing_items
  SET status = 'Paid'
  WHERE billing_order_id = p_billing_id;

  -- ==========================================================================
  -- STEP 7: Create receipt with idempotency key
  -- ==========================================================================
  v_patient_display_id := v_billing.patient_display_id;
  v_visit_display_id := v_billing.visit_display_id;
  
  INSERT INTO receipts (
    receipt_number,
    billing_order_id,
    patient_id,
    visit_id,
    encounter_id,
    amount_paid,
    payment_method,
    issued_by,
    idempotency_key
  ) VALUES (
    v_receipt_number,
    p_billing_id,
    v_patient_display_id,
    v_visit_display_id,
    v_visit.id,
    GREATEST(COALESCE(v_billing.balance, v_billing.balance_amount, 0), 0),
    p_payment_method,
    p_verified_by_staff_id,
    COALESCE(p_idempotency_key, 'auto-' || p_billing_id::text || '-' || EXTRACT(EPOCH FROM NOW())::text)
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING;

  -- ==========================================================================
  -- STEP 8: Determine routing target based on clinic type
  -- ==========================================================================
  IF v_visit.clinic_id IS NOT NULL THEN
    SELECT * INTO v_clinic
    FROM clinics
    WHERE id = v_visit.clinic_id;
    
    IF FOUND THEN
      IF LOWER(COALESCE(v_clinic.clinic_name, '')) LIKE '%dental%' OR 
         LOWER(COALESCE(v_clinic.clinic_code, '')) = 'dent' THEN
        v_target_location := 'Dental';
        v_is_specialty_clinic := TRUE;
      ELSIF LOWER(COALESCE(v_clinic.clinic_name, '')) LIKE '%eye%' OR 
            LOWER(COALESCE(v_clinic.clinic_name, '')) LIKE '%ophthal%' THEN
        v_target_location := 'Ophthalmology';
        v_is_specialty_clinic := TRUE;
      ELSIF LOWER(COALESCE(v_clinic.clinic_name, '')) LIKE '%physio%' OR 
            LOWER(COALESCE(v_clinic.clinic_name, '')) LIKE '%rehab%' THEN
        v_target_location := 'Physiotherapy';
        v_is_specialty_clinic := TRUE;
      END IF;
    END IF;
  END IF;
  
  v_is_specialty_referral := v_visit.is_referral_encounter AND v_visit.source_referral_id IS NOT NULL;

  -- ==========================================================================
  -- STEP 9: Complete existing billing queue entry
  -- ==========================================================================
  UPDATE queue
  SET status = 'Completed',
      completed_at = NOW()
  WHERE visit_id = v_visit.id
    AND location = 'Billing'
    AND status IN ('Waiting', 'Called', 'In Progress');

  -- ==========================================================================
  -- STEP 10: Handle routing based on workflow type
  -- ==========================================================================
  
  -- For specialty referrals: update clinical_request, skip queue table
  IF v_is_specialty_referral AND v_is_specialty_clinic THEN
    UPDATE clinical_requests
    SET status = 'Approved',
        updated_at = NOW()
    WHERE id = v_visit.source_referral_id;
    
    -- Update stage for referral patients (they show in Referrals Queue)
    UPDATE visits
    SET current_stage = 'queue_waiting',
        stage_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = v_visit.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', false,
      'receipt_number', v_receipt_number,
      'billing_status', v_payment_status,
      'current_stage', 'queue_waiting',
      'target_location', v_target_location,
      'is_referral', true,
      'message', 'Patient routed to ' || v_target_location || ' Referrals Queue'
    );
  END IF;
  
  -- For normal patients: create queue entry atomically
  -- Generate ticket number
  SELECT COALESCE(MAX(CAST(ticket_number AS INTEGER)), 0) + 1
  INTO v_ticket_number
  FROM queue
  WHERE location = v_target_location
    AND created_at::date = CURRENT_DATE;
  
  v_ticket_number := COALESCE(v_ticket_number, '1');
  
  -- Insert queue entry with conflict handling (idempotent)
  INSERT INTO queue (
    patient_id,
    visit_id,
    encounter_id,
    clinic_id,
    ticket_number,
    location,
    priority,
    status,
    notes
  ) VALUES (
    v_visit.patient_id,
    v_visit.id,
    v_visit.id,
    v_visit.clinic_id,
    v_ticket_number,
    v_target_location,
    COALESCE(v_visit.priority, 'Normal'),
    'Waiting',
    'Auto-routed after payment verification (Receipt: ' || v_receipt_number || ')'
  )
  ON CONFLICT (encounter_id, location) 
  WHERE status IN ('Waiting', 'Called', 'In Progress')
  DO UPDATE SET 
    notes = queue.notes || ' [Retry at ' || NOW()::text || ']'
  RETURNING id INTO v_queue_id;

  -- ==========================================================================
  -- STEP 11: Update visit stage (atomic with queue creation)
  -- ==========================================================================
  UPDATE visits
  SET current_stage = 'queue_waiting',
      stage_updated_at = NOW(),
      updated_at = NOW()
  WHERE id = v_visit.id;

  -- ==========================================================================
  -- STEP 12: Return success with all details
  -- ==========================================================================
  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'receipt_number', v_receipt_number,
    'billing_status', v_payment_status,
    'current_stage', 'queue_waiting',
    'target_location', v_target_location,
    'ticket_number', v_ticket_number,
    'queue_id', v_queue_id,
    'is_referral', false,
    'message', 'Patient routed to ' || v_target_location || ' queue with ticket #' || v_ticket_number
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition - likely idempotent retry
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Payment likely already processed (unique violation caught)',
      'billing_id', p_billing_id
    );
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.verify_payment_and_route(UUID, VARCHAR, VARCHAR, VARCHAR) TO authenticated;

-- =============================================================================
-- 3. Improve the safeguard trigger with proper guards
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
  v_queue_producing_stages VARCHAR[] := ARRAY['queue_waiting', 'nursing_vitals', 'consultation'];
BEGIN
  -- Guard 1: Only trigger for queue-producing stages
  IF NOT (NEW.current_stage = ANY(v_queue_producing_stages)) THEN
    RETURN NEW;
  END IF;
  
  -- Guard 2: Only trigger when stage actually changed
  IF OLD.current_stage IS NOT DISTINCT FROM NEW.current_stage THEN
    RETURN NEW;
  END IF;
  
  -- Guard 3: Only for Active visits
  IF NEW.status != 'Active' THEN
    RETURN NEW;
  END IF;
  
  -- Guard 4: Check if an active queue entry already exists
  SELECT EXISTS(
    SELECT 1 FROM queue 
    WHERE encounter_id = NEW.id 
    AND status IN ('Waiting', 'Called', 'In Progress')
  ) INTO v_has_active_queue;
  
  -- Guard 5: If queue exists, skip (prevents duplicates)
  IF v_has_active_queue THEN
    RETURN NEW;
  END IF;
  
  -- Determine target location based on stage
  CASE NEW.current_stage
    WHEN 'queue_waiting' THEN v_target_location := 'Nursing';
    WHEN 'nursing_vitals' THEN v_target_location := 'Nursing';
    WHEN 'consultation' THEN v_target_location := 'Consultation';
    ELSE v_target_location := 'Nursing';
  END CASE;
  
  -- Generate ticket number
  SELECT COALESCE(MAX(CAST(ticket_number AS INTEGER)), 0) + 1 
  INTO v_ticket_number
  FROM queue 
  WHERE location = v_target_location
    AND created_at::date = CURRENT_DATE;
  
  v_ticket_number := COALESCE(v_ticket_number, '1');
  
  -- Insert with ON CONFLICT DO NOTHING to prevent duplicates
  INSERT INTO queue (
    patient_id,
    visit_id,
    encounter_id,
    clinic_id,
    ticket_number,
    location,
    priority,
    status,
    notes
  ) VALUES (
    NEW.patient_id,
    NEW.id,
    NEW.id,
    NEW.clinic_id,
    v_ticket_number,
    v_target_location,
    COALESCE(NEW.priority, 'Normal'),
    'Waiting',
    'Auto-created by safeguard trigger'
  )
  ON CONFLICT (encounter_id, location) 
  WHERE status IN ('Waiting', 'Called', 'In Progress')
  DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 4. Add comments for documentation
-- =============================================================================

COMMENT ON FUNCTION public.verify_payment_and_route IS 
'Atomic, idempotent payment verification + queue routing.

Single DB transaction ensures:
1. Payment is verified
2. Billing order is updated
3. Receipt is created
4. Queue ticket is created
5. Visit stage is updated

All atomically - if any step fails, entire transaction rolls back.

Idempotency:
- Uses p_idempotency_key to detect retries
- Returns cached result for duplicate calls
- Unique constraint on receipts.idempotency_key prevents double-verification

Usage:
  SELECT verify_payment_and_route(
    p_billing_id := ''uuid-here'',
    p_payment_method := ''Cash'',  -- or NHIS, Retainership
    p_idempotency_key := ''unique-key-per-payment'',
    p_verified_by_staff_id := ''STAFF-001''
  );

Returns JSONB with:
  - success: boolean
  - idempotent: boolean (true if this was a retry)
  - receipt_number: generated receipt
  - billing_status: new status
  - current_stage: updated stage
  - target_location: where patient was routed
  - ticket_number: queue ticket
  - message: human-readable status
';
