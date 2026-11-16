-- Migration: Update NHIS Processing Logic
-- Description: Adds verification_notes to profiles and updates processing RPC to accept metadata overrides

-- 1. Add verification_notes to nhis_profiles
ALTER TABLE nhis_profiles ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 2. Update the processing function to accept overrides
CREATE OR REPLACE FUNCTION process_nhis_referral_queue(
    p_queue_id UUID,
    p_action VARCHAR(20),  -- 'approve' or 'reject'
    p_processed_by UUID,   -- User ID
    p_notes TEXT DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL,
    p_auth_code VARCHAR(100) DEFAULT NULL,
    p_tariff_group nhis_tariff_group DEFAULT 'Civilian_HMO',
    -- New optional override parameters
    p_referral_source VARCHAR(255) DEFAULT NULL,
    p_referral_code VARCHAR(100) DEFAULT NULL,
    p_referral_date DATE DEFAULT NULL,
    p_referral_reason TEXT DEFAULT NULL,
    p_referring_clinician VARCHAR(255) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_queue RECORD;
    v_auth_id UUID;
    v_profile_id UUID;
    v_staff_id UUID;
    v_expiry_date TIMESTAMP WITH TIME ZONE;
    v_days_since_referral INTEGER;
    v_is_expired BOOLEAN;
    
    -- Effective values (overrides OR queue values)
    v_eff_source VARCHAR(255);
    v_eff_code VARCHAR(100);
    v_eff_date DATE;
    v_eff_reason TEXT;
    v_eff_clinician VARCHAR(255);
BEGIN
    -- Look up staff ID from user ID
    SELECT id INTO v_staff_id FROM staff WHERE user_id = p_processed_by;
    IF v_staff_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Staff record not found for this user.');
    END IF;

    -- Get queue item
    SELECT * INTO v_queue FROM nhis_referral_queue WHERE id = p_queue_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item not found');
    END IF;
    
    -- Set effective values
    v_eff_source := COALESCE(p_referral_source, v_queue.referral_source);
    v_eff_code := COALESCE(p_referral_code, v_queue.referral_code);
    v_eff_date := COALESCE(p_referral_date, v_queue.referral_date);
    v_eff_reason := COALESCE(p_referral_reason, v_queue.clinical_basis);
    v_eff_clinician := COALESCE(p_referring_clinician, v_queue.referring_clinician);
    
    -- Compute expiry from effective date
    IF v_eff_date IS NOT NULL THEN
        v_days_since_referral := CURRENT_DATE - v_eff_date;
        v_is_expired := v_days_since_referral > 30;
    ELSE
        v_days_since_referral := NULL;
        v_is_expired := FALSE;
    END IF;
    
    -- Check if already processed
    IF v_queue.status NOT IN ('pending', 'in_review') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item already processed');
    END IF;
    
    -- Check 30-day expiry for approvals (using effective date)
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
                referral_reason, tariff_group, verified_by, verified_at,
                verification_notes
            ) VALUES (
                v_queue.patient_id, 'Civilian_NHIS', 'referred',
                v_eff_source, v_eff_code, v_eff_date,
                v_eff_reason, p_tariff_group, v_staff_id, NOW(),
                p_notes
            ) RETURNING id INTO v_profile_id;
        ELSE
            -- Update existing profile with referral info
            UPDATE nhis_profiles SET
                patient_origin = 'referred',
                referring_facility_name = v_eff_source,
                referral_code = v_eff_code,
                referral_date = v_eff_date,
                referral_reason = v_eff_reason,
                tariff_group = p_tariff_group,
                verified_by = v_staff_id,
                verified_at = NOW(),
                verification_notes = p_notes,
                updated_at = NOW()
            WHERE id = v_profile_id;
        END IF;

        -- Update the queue record as well so it matches what was approved
        UPDATE nhis_referral_queue SET
            referral_source = v_eff_source,
            referral_code = v_eff_code,
            referral_date = v_eff_date,
            clinical_basis = v_eff_reason,
            referring_clinician = v_eff_clinician,
            status = 'approved',
            processed_by = v_staff_id,
            processed_at = NOW(),
            processing_notes = p_notes,
            updated_at = NOW()
        WHERE id = p_queue_id;
        
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
            v_eff_source, v_eff_reason, v_eff_clinician,
            v_eff_date, v_eff_code,
            v_staff_id, NOW(), p_notes
        ) RETURNING id INTO v_auth_id;
        
        -- Link auth back to queue
        UPDATE nhis_referral_queue SET authorization_id = v_auth_id WHERE id = p_queue_id;
        
        RETURN jsonb_build_object(
            'success', TRUE, 
            'message', 'Referral approved with verification notes',
            'authorization_id', v_auth_id,
            'profile_id', v_profile_id
        );
        
    ELSIF p_action = 'reject' THEN
        UPDATE nhis_referral_queue SET
            status = 'rejected',
            processed_by = v_staff_id,
            processed_at = NOW(),
            rejection_reason = p_rejection_reason,
            processing_notes = p_notes,
            updated_at = NOW()
        WHERE id = p_queue_id;
        
        RETURN jsonb_build_object('success', TRUE, 'message', 'Referral rejected');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
