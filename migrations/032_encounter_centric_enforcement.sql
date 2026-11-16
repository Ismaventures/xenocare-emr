-- Migration 032: Encounter-Centric Architecture Enforcement
-- This migration ensures all clinical tables properly reference encounters
-- and adds encounter status enforcement

-- ============================================================================
-- PART 1: Update visit_status_enum to include all encounter states
-- ============================================================================

-- First, check if we need to add 'Created' and 'Closed' status values
DO $$
BEGIN
    -- Add 'Created' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Created' 
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'visit_status_enum')) THEN
        ALTER TYPE visit_status_enum ADD VALUE 'Created';
    END IF;
    
    -- Add 'Closed' if not exists (alias for Completed)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Closed' 
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'visit_status_enum')) THEN
        ALTER TYPE visit_status_enum ADD VALUE 'Closed';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Add encounter_id to tables that only have visit_id
-- ============================================================================

-- Fix lab_requests - add encounter_id referencing visits(visit_id)
ALTER TABLE lab_requests 
ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES visits(visit_id);

-- Backfill encounter_id from visit_id for existing records
UPDATE lab_requests 
SET encounter_id = visit_id 
WHERE encounter_id IS NULL AND visit_id IS NOT NULL;

-- Fix prescriptions - add encounter_id FK properly
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES visits(visit_id);

-- Backfill encounter_id from visit_id for existing prescriptions
UPDATE prescriptions 
SET encounter_id = visit_id 
WHERE encounter_id IS NULL AND visit_id IS NOT NULL;

-- Fix billing_orders - add encounter_id 
ALTER TABLE billing_orders 
ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES visits(visit_id);

-- Backfill encounter_id from visit_id for existing billing orders
UPDATE billing_orders 
SET encounter_id = visit_id 
WHERE encounter_id IS NULL AND visit_id IS NOT NULL;

-- Fix invoices - add encounter_id
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES visits(visit_id);

-- Backfill from visit_id
UPDATE invoices 
SET encounter_id = visit_id 
WHERE encounter_id IS NULL AND visit_id IS NOT NULL;

-- ============================================================================
-- PART 3: Add created_by to clinical tables that don't have it
-- ============================================================================

-- lab_requests already has ordered_by, but add created_by for consistency
ALTER TABLE lab_requests 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(staff_id);

-- Backfill from ordered_by
UPDATE lab_requests 
SET created_by = ordered_by 
WHERE created_by IS NULL AND ordered_by IS NOT NULL;

-- radiology_requests 
ALTER TABLE radiology_requests 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(staff_id);

-- Backfill from ordered_by
UPDATE radiology_requests 
SET created_by = ordered_by 
WHERE created_by IS NULL AND ordered_by IS NOT NULL;

-- prescriptions
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(staff_id);

-- Backfill from prescribed_by
UPDATE prescriptions 
SET created_by = prescribed_by 
WHERE created_by IS NULL AND prescribed_by IS NOT NULL;

-- billing_orders
ALTER TABLE billing_orders 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(staff_id);

-- Backfill from ordered_by
UPDATE billing_orders 
SET created_by = ordered_by 
WHERE created_by IS NULL AND ordered_by IS NOT NULL;

-- ============================================================================
-- PART 4: Add end_time and discharge fields to visits if not present
-- ============================================================================

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES staff(staff_id);

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS closed_reason TEXT;

-- ============================================================================
-- PART 5: Create encounter audit log table for clinical actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES visits(visit_id),
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'CLOSE', 'TRANSITION', 'REOPEN')),
    entity_type TEXT NOT NULL, -- 'consultation', 'lab_request', 'prescription', etc.
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by UUID NOT NULL REFERENCES staff(staff_id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_clinical_audit_encounter ON clinical_audit_log(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_patient ON clinical_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_performer ON clinical_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_time ON clinical_audit_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_entity ON clinical_audit_log(entity_type, entity_id);

-- ============================================================================
-- PART 6: Create function to validate encounter is active before modifications
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_encounter_active(p_encounter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status::TEXT INTO v_status
    FROM visits
    WHERE visit_id = p_encounter_id;
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Encounter not found: %', p_encounter_id;
    END IF;
    
    IF v_status IN ('Completed', 'Closed', 'Cancelled') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: Create function to close encounter with validation
-- ============================================================================

CREATE OR REPLACE FUNCTION close_encounter(
    p_encounter_id UUID,
    p_closed_by UUID,
    p_final_diagnosis TEXT DEFAULT NULL,
    p_discharge_notes TEXT DEFAULT NULL,
    p_closed_reason TEXT DEFAULT 'Normal discharge'
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_current_status TEXT;
    v_user_role TEXT;
BEGIN
    -- Get current status
    SELECT status::TEXT INTO v_current_status
    FROM visits
    WHERE visit_id = p_encounter_id;
    
    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Encounter not found');
    END IF;
    
    IF v_current_status IN ('Completed', 'Closed', 'Cancelled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Encounter is already closed');
    END IF;
    
    -- Get user role
    SELECT role::TEXT INTO v_user_role
    FROM staff
    WHERE staff_id = p_closed_by;
    
    -- Only doctors, nurse managers, and admins can close encounters
    IF v_user_role NOT IN ('doctor', 'nurse', 'admin', 'super_admin', 'medical_director') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to close encounter');
    END IF;
    
    -- Close the encounter
    UPDATE visits
    SET 
        status = 'Closed',
        current_stage = 'encounter_closed',
        end_time = NOW(),
        discharge_date = NOW(),
        discharge_notes = COALESCE(p_discharge_notes, discharge_notes),
        closed_by = p_closed_by,
        closed_reason = p_closed_reason,
        stage_updated_at = NOW(),
        stage_history = COALESCE(stage_history, '[]'::JSONB) || jsonb_build_object(
            'stage', 'encounter_closed',
            'timestamp', NOW(),
            'performed_by', p_closed_by,
            'notes', 'Encounter closed: ' || p_closed_reason
        )
    WHERE visit_id = p_encounter_id;
    
    -- Log the closure
    INSERT INTO clinical_audit_log (
        encounter_id, patient_id, action, entity_type, entity_id,
        new_value, performed_by, notes
    )
    SELECT 
        visit_id, patient_id, 'CLOSE', 'encounter', visit_id,
        jsonb_build_object(
            'final_diagnosis', p_final_diagnosis,
            'discharge_notes', p_discharge_notes,
            'closed_reason', p_closed_reason
        ),
        p_closed_by,
        'Encounter closed'
    FROM visits
    WHERE visit_id = p_encounter_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'encounter_id', p_encounter_id,
        'status', 'Closed',
        'closed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: Create function to reopen encounter (admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION reopen_encounter(
    p_encounter_id UUID,
    p_reopened_by UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Get user role
    SELECT role::TEXT INTO v_user_role
    FROM staff
    WHERE staff_id = p_reopened_by;
    
    -- Only admins can reopen
    IF v_user_role NOT IN ('admin', 'super_admin', 'medical_director') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only administrators can reopen encounters');
    END IF;
    
    IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reopen reason must be at least 10 characters');
    END IF;
    
    -- Reopen the encounter
    UPDATE visits
    SET 
        status = 'Active',
        current_stage = 'in_consultation',
        end_time = NULL,
        closed_by = NULL,
        closed_reason = NULL,
        stage_updated_at = NOW(),
        stage_history = COALESCE(stage_history, '[]'::JSONB) || jsonb_build_object(
            'stage', 'reopened',
            'timestamp', NOW(),
            'performed_by', p_reopened_by,
            'notes', 'Encounter reopened: ' || p_reason
        )
    WHERE visit_id = p_encounter_id;
    
    -- Log the reopen
    INSERT INTO clinical_audit_log (
        encounter_id, patient_id, action, entity_type, entity_id,
        performed_by, notes
    )
    SELECT 
        visit_id, patient_id, 'REOPEN', 'encounter', visit_id,
        p_reopened_by,
        p_reason
    FROM visits
    WHERE visit_id = p_encounter_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'encounter_id', p_encounter_id,
        'status', 'Active',
        'reopened_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 9: Create trigger to prevent modifications on closed encounters
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_closed_encounter_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_encounter_status TEXT;
    v_encounter_id UUID;
BEGIN
    -- Get encounter_id from the record (try both column names)
    v_encounter_id := COALESCE(NEW.encounter_id, NEW.visit_id);
    
    IF v_encounter_id IS NULL THEN
        RAISE EXCEPTION 'encounter_id/visit_id is required for clinical data';
    END IF;
    
    -- Check encounter status
    SELECT status::TEXT INTO v_encounter_status
    FROM visits
    WHERE visit_id = v_encounter_id;
    
    IF v_encounter_status IN ('Completed', 'Closed', 'Cancelled') THEN
        RAISE EXCEPTION 'Cannot modify data on closed encounter (status: %)', v_encounter_status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to clinical tables
DROP TRIGGER IF EXISTS check_encounter_status_consultations ON consultations;
CREATE TRIGGER check_encounter_status_consultations
    BEFORE INSERT OR UPDATE ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_encounter_modification();

DROP TRIGGER IF EXISTS check_encounter_status_nursing_care ON nursing_care;
CREATE TRIGGER check_encounter_status_nursing_care
    BEFORE INSERT OR UPDATE ON nursing_care
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_encounter_modification();

DROP TRIGGER IF EXISTS check_encounter_status_lab_requests ON lab_requests;
CREATE TRIGGER check_encounter_status_lab_requests
    BEFORE INSERT OR UPDATE ON lab_requests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_encounter_modification();

DROP TRIGGER IF EXISTS check_encounter_status_radiology_requests ON radiology_requests;
CREATE TRIGGER check_encounter_status_radiology_requests
    BEFORE INSERT OR UPDATE ON radiology_requests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_encounter_modification();

DROP TRIGGER IF EXISTS check_encounter_status_prescriptions ON prescriptions;
CREATE TRIGGER check_encounter_status_prescriptions
    BEFORE INSERT OR UPDATE ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_encounter_modification();

-- ============================================================================
-- PART 10: Create view for encounter summary with all related data
-- ============================================================================

CREATE OR REPLACE VIEW encounter_summary AS
SELECT 
    v.visit_id AS encounter_id,
    v.patient_id,
    p.file_number,
    p.first_name || ' ' || p.surname AS patient_name,
    v.encounter_number,
    v.visit_type AS encounter_type,
    v.payment_category,
    v.priority,
    v.status AS encounter_status,
    v.current_stage,
    v.chief_complaint,
    v.start_time,
    v.end_time,
    v.discharge_date,
    v.discharge_notes,
    v.attending_doctor_id,
    doc.first_name || ' ' || doc.surname AS attending_doctor_name,
    v.registered_by,
    v.closed_by,
    v.closed_reason,
    -- Counts
    (SELECT COUNT(*) FROM consultations c WHERE c.visit_id = v.visit_id OR c.encounter_id = v.visit_id) AS consultation_count,
    (SELECT COUNT(*) FROM nursing_care nc WHERE nc.visit_id = v.visit_id OR nc.encounter_id = v.visit_id) AS vitals_count,
    (SELECT COUNT(*) FROM lab_requests lr WHERE lr.visit_id = v.visit_id OR lr.encounter_id = v.visit_id) AS lab_order_count,
    (SELECT COUNT(*) FROM radiology_requests rr WHERE rr.visit_id = v.visit_id OR rr.encounter_id = v.visit_id) AS radiology_order_count,
    (SELECT COUNT(*) FROM prescriptions pr WHERE pr.visit_id = v.visit_id OR pr.encounter_id = v.visit_id) AS prescription_count,
    (SELECT COUNT(*) FROM billing_orders bo WHERE bo.visit_id = v.visit_id OR bo.encounter_id = v.visit_id) AS billing_order_count,
    -- Is Active flag for UI
    CASE WHEN v.status IN ('Active', 'Created') THEN true ELSE false END AS is_active,
    -- Duration
    CASE 
        WHEN v.end_time IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (v.end_time - v.start_time)) / 60
        ELSE 
            EXTRACT(EPOCH FROM (NOW() - v.start_time)) / 60
    END AS duration_minutes
FROM visits v
JOIN patients p ON p.patient_id = v.patient_id
LEFT JOIN staff doc ON doc.staff_id = v.attending_doctor_id;

-- ============================================================================
-- PART 11: Create addendum table for notes after encounter closure
-- ============================================================================

CREATE TABLE IF NOT EXISTS encounter_addendums (
    addendum_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES visits(visit_id),
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    addendum_type TEXT NOT NULL CHECK (addendum_type IN ('clinical_note', 'correction', 'late_result', 'administrative')),
    content TEXT NOT NULL,
    reference_entity_type TEXT, -- 'consultation', 'lab_result', etc.
    reference_entity_id UUID,
    created_by UUID NOT NULL REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES staff(staff_id),
    approved_at TIMESTAMPTZ,
    is_approved BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_addendum_encounter ON encounter_addendums(encounter_id);
CREATE INDEX IF NOT EXISTS idx_addendum_patient ON encounter_addendums(patient_id);

-- ============================================================================
-- PART 12: Enable RLS on new tables
-- ============================================================================

ALTER TABLE clinical_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_addendums ENABLE ROW LEVEL SECURITY;

-- RLS policies for clinical_audit_log
CREATE POLICY clinical_audit_read ON clinical_audit_log
    FOR SELECT USING (true); -- All authenticated can read

CREATE POLICY clinical_audit_insert ON clinical_audit_log
    FOR INSERT WITH CHECK (true); -- System inserts

-- RLS policies for encounter_addendums
CREATE POLICY addendum_read ON encounter_addendums
    FOR SELECT USING (true);

CREATE POLICY addendum_insert ON encounter_addendums
    FOR INSERT WITH CHECK (
        get_user_role() IN ('doctor', 'nurse', 'lab_technician', 'radiologist', 'admin', 'super_admin', 'medical_director')
    );

CREATE POLICY addendum_approve ON encounter_addendums
    FOR UPDATE USING (
        get_user_role() IN ('admin', 'super_admin', 'medical_director')
    );

-- ============================================================================
-- PART 13: Create indexes for better performance
-- ============================================================================

-- Indexes on encounter_id columns
CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter ON lab_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_encounter ON billing_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_invoices_encounter ON invoices(encounter_id);

-- Index on visits status and stage
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_current_stage ON visits(current_stage);
CREATE INDEX IF NOT EXISTS idx_visits_status_stage ON visits(status, current_stage);

-- ============================================================================
-- PART 14: Grant permissions
-- ============================================================================

GRANT SELECT ON encounter_summary TO authenticated;
GRANT SELECT ON clinical_audit_log TO authenticated;
GRANT INSERT ON clinical_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON encounter_addendums TO authenticated;

-- ============================================================================
-- COMPLETE: Encounter-centric architecture enforcement applied
-- ============================================================================
