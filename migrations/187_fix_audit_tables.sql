-- ============================================================================
-- Migration 187: Fix Missing Audit Tables and Ensure Audit Triggers
-- ============================================================================
-- This migration:
-- 1. Creates clinical_audit_log if missing
-- 2. Adds RLS policies to allow read access to audit tables
-- 3. Ensures comprehensive_audit_log triggers are installed
-- ============================================================================

-- ============================================================================
-- 1. CREATE CLINICAL_AUDIT_LOG IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clinical_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What was done
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, VIEW
    resource_type VARCHAR(100) NOT NULL, -- consultations, prescriptions, lab_requests, etc.
    resource_id UUID,
    
    -- Who did it
    staff_id UUID REFERENCES staff(id),
    staff_name VARCHAR(200),
    
    -- Patient context
    patient_id UUID REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id),
    
    -- Before/After state
    before_state JSONB,
    after_state JSONB,
    
    -- Details
    details TEXT,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamps
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_audit_action ON clinical_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_resource ON clinical_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_patient ON clinical_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_encounter ON clinical_audit_log(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_staff ON clinical_audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_performed_at ON clinical_audit_log(performed_at DESC);

COMMENT ON TABLE public.clinical_audit_log IS 'Audit log for clinical activities (consultations, prescriptions, lab orders, etc.)';

-- ============================================================================
-- 2. RLS POLICIES FOR AUDIT TABLES (Allow authenticated users to read)
-- ============================================================================

-- Enable RLS on all audit tables if not already enabled
ALTER TABLE IF EXISTS public.comprehensive_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.billing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinical_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nhis_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nhis_activity_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_session_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_price_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nursing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_stock_movements ENABLE ROW LEVEL SECURITY;

-- Create read policies for audit tables (authenticated users can view)
-- comprehensive_audit_log
DROP POLICY IF EXISTS "Authenticated users can view comprehensive audit log" ON public.comprehensive_audit_log;
CREATE POLICY "Authenticated users can view comprehensive audit log"
ON public.comprehensive_audit_log FOR SELECT
TO authenticated
USING (true);

-- billing_audit_log
DROP POLICY IF EXISTS "Authenticated users can view billing audit log" ON public.billing_audit_log;
CREATE POLICY "Authenticated users can view billing audit log"
ON public.billing_audit_log FOR SELECT
TO authenticated
USING (true);

-- clinical_audit_log
DROP POLICY IF EXISTS "Authenticated users can view clinical audit log" ON public.clinical_audit_log;
CREATE POLICY "Authenticated users can view clinical audit log"
ON public.clinical_audit_log FOR SELECT
TO authenticated
USING (true);

-- nhis_audit_log
DROP POLICY IF EXISTS "Authenticated users can view nhis audit log" ON public.nhis_audit_log;
CREATE POLICY "Authenticated users can view nhis audit log"
ON public.nhis_audit_log FOR SELECT
TO authenticated
USING (true);

-- nhis_activity_audit
DROP POLICY IF EXISTS "Authenticated users can view nhis activity audit" ON public.nhis_activity_audit;
CREATE POLICY "Authenticated users can view nhis activity audit"
ON public.nhis_activity_audit FOR SELECT
TO authenticated
USING (true);

-- user_session_audit
DROP POLICY IF EXISTS "Authenticated users can view session audit log" ON public.user_session_audit;
CREATE POLICY "Authenticated users can view session audit log"
ON public.user_session_audit FOR SELECT
TO authenticated
USING (true);

-- service_price_audit
DROP POLICY IF EXISTS "Authenticated users can view price audit log" ON public.service_price_audit;
CREATE POLICY "Authenticated users can view price audit log"
ON public.service_price_audit FOR SELECT
TO authenticated
USING (true);

-- nursing_audit_log
DROP POLICY IF EXISTS "Authenticated users can view nursing audit log" ON public.nursing_audit_log;
CREATE POLICY "Authenticated users can view nursing audit log"
ON public.nursing_audit_log FOR SELECT
TO authenticated
USING (true);

-- inventory_stock_movements (already has RLS, just ensure read access)
DROP POLICY IF EXISTS "Authenticated users can view inventory stock movements" ON public.inventory_stock_movements;
CREATE POLICY "Authenticated users can view inventory stock movements"
ON public.inventory_stock_movements FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- 3. COMPREHENSIVE_AUDIT_LOG TRIGGER FOR PATIENTS TABLE
-- ============================================================================

-- Create or replace the comprehensive audit trigger function
CREATE OR REPLACE FUNCTION log_comprehensive_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
    v_changed_fields TEXT[];
    v_description TEXT;
    v_action_type TEXT;
    v_patient_id UUID;
    v_patient_name TEXT;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'create';
        v_new_values := to_jsonb(NEW);
        v_old_values := NULL;
        v_changed_fields := ARRAY(SELECT jsonb_object_keys(v_new_values));
        v_description := 'Created ' || TG_TABLE_NAME || ' record';
        
        -- Extract patient info if available
        IF TG_TABLE_NAME = 'patients' THEN
            v_patient_id := NEW.id;
            v_patient_name := COALESCE(NEW.first_name || ' ' || NEW.surname, 'Unknown');
            v_description := 'Patient registered: ' || v_patient_name;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_action_type := 'update';
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        
        -- Calculate changed fields
        SELECT ARRAY_AGG(key) INTO v_changed_fields
        FROM (
            SELECT key
            FROM jsonb_each(v_new_values)
            WHERE (v_old_values -> key) IS DISTINCT FROM (v_new_values -> key)
            AND key NOT IN ('updated_at', 'version')
        ) changed;
        
        v_description := 'Updated ' || TG_TABLE_NAME || ' - Changed: ' || COALESCE(array_to_string(v_changed_fields, ', '), 'none');
        
        -- Extract patient info if available
        IF TG_TABLE_NAME = 'patients' THEN
            v_patient_id := NEW.id;
            v_patient_name := COALESCE(NEW.first_name || ' ' || NEW.surname, 'Unknown');
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action_type := 'delete';
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
        v_changed_fields := ARRAY[]::TEXT[];
        v_description := 'Deleted ' || TG_TABLE_NAME || ' record';
        
        IF TG_TABLE_NAME = 'patients' THEN
            v_patient_id := OLD.id;
            v_patient_name := COALESCE(OLD.first_name || ' ' || OLD.surname, 'Unknown');
        END IF;
    END IF;

    -- Insert audit log entry
    INSERT INTO comprehensive_audit_log (
        event_type,
        table_name,
        record_id,
        action_type,
        description,
        old_values,
        new_values,
        changed_fields,
        patient_id,
        patient_name,
        performed_at
    ) VALUES (
        TG_TABLE_NAME || '_' || v_action_type,
        TG_TABLE_NAME,
        COALESCE(
            CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END,
            'unknown'
        ),
        v_action_type,
        v_description,
        v_old_values,
        v_new_values,
        COALESCE(v_changed_fields, ARRAY[]::TEXT[]),
        v_patient_id,
        v_patient_name,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. INSTALL TRIGGERS ON KEY TABLES
-- ============================================================================

-- Patients table trigger
DROP TRIGGER IF EXISTS trg_comprehensive_audit_patients ON patients;
CREATE TRIGGER trg_comprehensive_audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION log_comprehensive_audit();

-- Visits table trigger (encounters)
DROP TRIGGER IF EXISTS trg_comprehensive_audit_visits ON visits;
CREATE TRIGGER trg_comprehensive_audit_visits
    AFTER INSERT OR UPDATE OR DELETE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION log_comprehensive_audit();

-- Staff table trigger
DROP TRIGGER IF EXISTS trg_comprehensive_audit_staff ON staff;
CREATE TRIGGER trg_comprehensive_audit_staff
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION log_comprehensive_audit();

-- NHIS Profiles trigger
DROP TRIGGER IF EXISTS trg_comprehensive_audit_nhis_profiles ON nhis_profiles;
CREATE TRIGGER trg_comprehensive_audit_nhis_profiles
    AFTER INSERT OR UPDATE OR DELETE ON nhis_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_comprehensive_audit();

-- ============================================================================
-- 5. CREATE INSERT POLICIES FOR SERVICE ROLE
-- ============================================================================

-- comprehensive_audit_log - Allow service role to insert
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.comprehensive_audit_log;
CREATE POLICY "Service role can insert audit logs"
ON public.comprehensive_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- billing_audit_log
DROP POLICY IF EXISTS "Service role can insert billing audits" ON public.billing_audit_log;
CREATE POLICY "Service role can insert billing audits"
ON public.billing_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- clinical_audit_log
DROP POLICY IF EXISTS "Service role can insert clinical audits" ON public.clinical_audit_log;
CREATE POLICY "Service role can insert clinical audits"
ON public.clinical_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- nhis_audit_log
DROP POLICY IF EXISTS "Service role can insert nhis audits" ON public.nhis_audit_log;
CREATE POLICY "Service role can insert nhis audits"
ON public.nhis_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- nhis_activity_audit
DROP POLICY IF EXISTS "Service role can insert nhis activity audits" ON public.nhis_activity_audit;
CREATE POLICY "Service role can insert nhis activity audits"
ON public.nhis_activity_audit FOR INSERT
TO authenticated
WITH CHECK (true);

-- user_session_audit
DROP POLICY IF EXISTS "Service role can insert session audits" ON public.user_session_audit;
CREATE POLICY "Service role can insert session audits"
ON public.user_session_audit FOR INSERT
TO authenticated
WITH CHECK (true);

-- service_price_audit
DROP POLICY IF EXISTS "Service role can insert price audits" ON public.service_price_audit;
CREATE POLICY "Service role can insert price audits"
ON public.service_price_audit FOR INSERT
TO authenticated
WITH CHECK (true);

-- nursing_audit_log
DROP POLICY IF EXISTS "Service role can insert nursing audits" ON public.nursing_audit_log;
CREATE POLICY "Service role can insert nursing audits"
ON public.nursing_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.comprehensive_audit_log TO authenticated;
GRANT SELECT ON public.billing_audit_log TO authenticated;
GRANT SELECT ON public.clinical_audit_log TO authenticated;
GRANT SELECT ON public.nhis_audit_log TO authenticated;
GRANT SELECT ON public.nhis_activity_audit TO authenticated;
GRANT SELECT ON public.user_session_audit TO authenticated;
GRANT SELECT ON public.service_price_audit TO authenticated;
GRANT SELECT ON public.nursing_audit_log TO authenticated;
GRANT SELECT ON public.inventory_stock_movements TO authenticated;

GRANT INSERT ON public.comprehensive_audit_log TO authenticated;
GRANT INSERT ON public.billing_audit_log TO authenticated;
GRANT INSERT ON public.clinical_audit_log TO authenticated;
GRANT INSERT ON public.nhis_audit_log TO authenticated;
GRANT INSERT ON public.nhis_activity_audit TO authenticated;
GRANT INSERT ON public.user_session_audit TO authenticated;
GRANT INSERT ON public.service_price_audit TO authenticated;
GRANT INSERT ON public.nursing_audit_log TO authenticated;

-- ============================================================================
-- COMPLETED: Audit tables are now properly set up
-- ============================================================================
-- After running this migration:
-- 1. clinical_audit_log table will be created
-- 2. RLS policies allow authenticated users to read/insert audit logs
-- 3. Triggers installed on patients, visits, staff, nhis_profiles
-- 4. New patient registrations will be tracked in comprehensive_audit_log
-- ============================================================================
