-- Migration: Fix NHIS Referral Queue Processing
-- The process_nhis_referral_queue function was passing auth user ID directly
-- to verified_by columns, but these reference the staff table.
-- This fix looks up the staff ID from the user ID.

-- Drop and recreate the function with staff ID lookup
CREATE OR REPLACE FUNCTION process_nhis_referral_queue(
    p_queue_id UUID,
    p_action VARCHAR(20),  -- 'approve' or 'reject'
    p_processed_by UUID,   -- This is the auth user ID, we'll look up staff ID
    p_notes TEXT DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL,
    p_auth_code VARCHAR(100) DEFAULT NULL,
    p_tariff_group nhis_tariff_group DEFAULT 'Civilian_HMO'
) RETURNS JSONB AS $$
DECLARE
    v_queue RECORD;
    v_auth_id UUID;
    v_profile_id UUID;
    v_staff_id UUID;
    v_expiry_date TIMESTAMP WITH TIME ZONE;
    v_days_since_referral INTEGER;
    v_is_expired BOOLEAN;
BEGIN
    -- Look up staff ID from user ID
    SELECT id INTO v_staff_id FROM staff WHERE user_id = p_processed_by;
    IF v_staff_id IS NULL THEN
        -- If no staff record, use the user ID directly (some tables may allow this)
        -- Or return an error if staff is required
        RETURN jsonb_build_object('success', FALSE, 'error', 'Staff record not found for this user. Please ensure you have a staff profile.');
    END IF;

    -- Get queue item
    SELECT * INTO v_queue FROM nhis_referral_queue WHERE id = p_queue_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item not found');
    END IF;
    
    -- Compute days_since_referral and is_expired from referral_date
    IF v_queue.referral_date IS NOT NULL THEN
        v_days_since_referral := CURRENT_DATE - v_queue.referral_date;
        v_is_expired := v_days_since_referral > 30;
    ELSE
        v_days_since_referral := NULL;
        v_is_expired := FALSE;
    END IF;
    
    -- Check if already processed
    IF v_queue.status NOT IN ('pending', 'in_review') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item already processed');
    END IF;
    
    -- Check 30-day expiry for approvals
    IF v_is_expired AND p_action = 'approve' THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Referral expired (' || v_days_since_referral || ' days). Cannot approve expired referrals.'
        );
    END IF;
    
    IF p_action = 'approve' THEN
        -- Get or create NHIS profile
        SELECT id INTO v_profile_id FROM nhis_profiles WHERE patient_id = v_queue.patient_id;
        
        IF v_profile_id IS NULL THEN
            INSERT INTO nhis_profiles (
                patient_id, scheme_type, patient_origin,
                referring_facility_name, referral_code, referral_date,
                referral_reason, tariff_group, verified_by, verified_at
            ) VALUES (
                v_queue.patient_id, 'Civilian_NHIS', 'referred',
                v_queue.referral_source, v_queue.referral_code, v_queue.referral_date,
                v_queue.clinical_basis, p_tariff_group, v_staff_id, NOW()
            ) RETURNING id INTO v_profile_id;
        ELSE
            -- Update existing profile with referral info
            UPDATE nhis_profiles SET
                patient_origin = 'referred',
                referring_facility_name = COALESCE(v_queue.referral_source, referring_facility_name),
                referral_code = COALESCE(v_queue.referral_code, referral_code),
                referral_date = COALESCE(v_queue.referral_date, referral_date),
                referral_reason = COALESCE(v_queue.clinical_basis, referral_reason),
                tariff_group = p_tariff_group,
                verified_by = v_staff_id,
                verified_at = NOW(),
                updated_at = NOW()
            WHERE id = v_profile_id;
        END IF;
        
        -- Calculate expiry (30 days from now)
        v_expiry_date := NOW() + INTERVAL '30 days';
        
        -- Create authorization
        INSERT INTO nhis_authorizations (
            patient_id, nhis_profile_id, auth_code, auth_type,
            start_date, expiry_date, status, source,
            referral_source, referral_clinical_basis, referring_clinician,
            referral_date, referral_code,
            verified_by, verified_at, verification_notes
        ) VALUES (
            v_queue.patient_id, v_profile_id, 
            COALESCE(p_auth_code, 'AUTH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),
            'referral', NOW(), v_expiry_date, 'active', 'external_referral',
            v_queue.referral_source, v_queue.clinical_basis, v_queue.referring_clinician,
            v_queue.referral_date, v_queue.referral_code,
            v_staff_id, NOW(), p_notes
        ) RETURNING id INTO v_auth_id;
        
        -- Update queue item
        UPDATE nhis_referral_queue SET
            status = 'approved',
            processed_by = v_staff_id,
            processed_at = NOW(),
            processing_notes = p_notes,
            authorization_id = v_auth_id,
            updated_at = NOW()
        WHERE id = p_queue_id;
        
        -- Log audit
        INSERT INTO nhis_audit_log (
            action_type, action_description, entity_type, entity_id,
            patient_id, new_state, performed_by
        ) VALUES (
            'REFERRAL_APPROVED', 'External referral approved and authorization created',
            'referral_queue', p_queue_id, v_queue.patient_id,
            jsonb_build_object(
                'auth_code', p_auth_code,
                'auth_id', v_auth_id,
                'profile_id', v_profile_id,
                'tariff_group', p_tariff_group
            ),
            v_staff_id
        );
        
        RETURN jsonb_build_object(
            'success', TRUE, 
            'message', 'Referral approved and authorization created',
            'authorization_id', v_auth_id,
            'profile_id', v_profile_id
        );
        
    ELSIF p_action = 'reject' THEN
        -- Rejection reason is required
        IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Rejection reason is required');
        END IF;
        
        -- Update queue item
        UPDATE nhis_referral_queue SET
            status = 'rejected',
            processed_by = v_staff_id,
            processed_at = NOW(),
            processing_notes = p_notes,
            rejection_reason = p_rejection_reason,
            updated_at = NOW()
        WHERE id = p_queue_id;
        
        -- Log audit
        INSERT INTO nhis_audit_log (
            action_type, action_description, entity_type, entity_id,
            patient_id, new_state, performed_by
        ) VALUES (
            'REFERRAL_REJECTED', 'External referral rejected',
            'referral_queue', p_queue_id, v_queue.patient_id,
            jsonb_build_object(
                'rejection_reason', p_rejection_reason,
                'notes', p_notes
            ),
            v_staff_id
        );
        
        RETURN jsonb_build_object(
            'success', TRUE, 
            'message', 'Referral rejected'
        );
    ELSE
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid action. Use "approve" or "reject".');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_nhis_referral_queue TO authenticated;
