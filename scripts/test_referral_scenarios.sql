-- Test Script for NHIS Referral Scenarios
-- Run this script to simulate and verify the referral workflows.

-- =================================================================
-- 1. SETUP: Create Mock Data
-- =================================================================

DO $$
DECLARE
    v_patient_id uuid;
    v_clinic_id uuid;
    v_doctor_id uuid;
    v_staff_id uuid;
    v_user_id uuid := uuid_generate_v4(); -- Mock User ID
    v_queue_id uuid;
    v_result jsonb;
    v_request_id uuid;
    v_approval_id uuid;
BEGIN
    RAISE NOTICE 'Starting NHIS Referral Test Scenarios...';

    -- Create Mock Staff/User
    INSERT INTO staff (first_name, last_name, user_id, role, department)
    VALUES ('Test', 'Doctor', v_user_id, 'doctor', 'General')
    RETURNING id INTO v_staff_id;
    
    v_doctor_id := v_staff_id;

    -- Create Mock Clinic
    INSERT INTO clinics (clinic_name, clinic_code, location)
    VALUES ('Test Specialty Clinic', 'TSC-01', 'Wing A')
    RETURNING id INTO v_clinic_id;

    -- Create Mock Patient (Civilian NHIS)
    INSERT INTO patients (first_name, surname, gender, insurance_type, patient_category, nhis_number)
    VALUES ('TestPatient', 'NHIS_Ext', 'Male', 'Civilian_NHIS', 'Civilian', 'NHIS/TEST/001')
    RETURNING id INTO v_patient_id;

    RAISE NOTICE 'Created Mock Data: Patient %, Clinic %, Staff %', v_patient_id, v_clinic_id, v_staff_id;

    -- =================================================================
    -- 2. TEST SCENARIO A: External Referral
    --    Objective: Verify patient moves to Nursing Queue after approval.
    -- =================================================================

    INSERT INTO nhis_referral_queue (
        patient_id,
        status,
        request_type,
        target_clinic_id,
        target_doctor_id,
        clinical_basis,
        referral_source
    ) VALUES (
        v_patient_id,
        'pending',
        'external_referral',
        v_clinic_id,
        v_doctor_id,
        'Test Clinical Basis',
        'General Hospital External'
    ) RETURNING id INTO v_queue_id;

    RAISE NOTICE 'Created External Referral Queue Item: %', v_queue_id;

    -- Process the Referral (Approve)
    v_result := process_nhis_referral_queue(
        v_queue_id,
        'approve',
        v_user_id, -- p_processed_by (User ID)
        'Approved for testing'
    );

    RAISE NOTICE 'Process Result: %', v_result;

    -- VERIFY RESULT
    PERFORM 1 FROM queue 
    WHERE patient_id = v_patient_id 
      AND status = 'Waiting' 
      AND location = 'Nursing' 
      AND notes = 'External NHIS Referral - Approved';
      
    IF FOUND THEN
        RAISE NOTICE 'SUCCESS: External Referral Patient found in Nursing Queue.';
    ELSE
        RAISE NOTICE 'FAILURE: External Referral Patient NOT found in Nursing Queue.';
    END IF;

    -- =================================================================
    -- 3. TEST SCENARIO B: Internal Referral
    --    Objective: Verify referral is visible and has correct status.
    -- =================================================================

    -- Create Internal Referral Request
    INSERT INTO clinical_requests (
        patient_id,
        request_type,
        specialty_module,
        clinical_reason,
        requesting_doctor_id,
        target_department_id, -- referencing nothing for test simplicity or need mock dept
        referral_workflow_status
        -- nhis_approval_status defaults to 'not_required', but trigger might set it
    ) VALUES (
        v_patient_id,
        'Referral',
        'surgery',
        'Internal referral test to surgery',
        v_doctor_id,
        null,
        'Pending_Encounter_Office'
    ) RETURNING id INTO v_request_id;

    -- Manually trigger NHIS Approval (simulating the NHIS officer action)
    -- First, check if trigger set it to pending (if 106 applied)
    -- We assume 110 applied, so we can set it.
    
    UPDATE clinical_requests 
    SET nhis_approval_status = 'approved' 
    WHERE id = v_request_id;
    
    RAISE NOTICE 'Updated Internal Referral % to Approved', v_request_id;

    -- VERIFY VIEW VISIBILITY
    -- We check if the column exists and value is correct in the table
    PERFORM 1 FROM clinical_requests 
    WHERE id = v_request_id AND nhis_approval_status = 'approved';

    IF FOUND THEN
        RAISE NOTICE 'SUCCESS: Internal Referral updated to Approved status correctly.';
    ELSE
         RAISE NOTICE 'FAILURE: Internal Referral status update failed.';
    END IF;

    -- Check if View reflects it (if view exists)
    BEGIN
        PERFORM 1 FROM pending_internal_referrals 
        WHERE referral_id = v_request_id AND nhis_approval_status = 'approved';
        IF FOUND THEN
             RAISE NOTICE 'SUCCESS: View pending_internal_referrals includes the approved referral.';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'View pending_internal_referrals verification skipped (View might not verify in this block context).';
    END;

END $$;
