-- ============================================================================
-- Migration 148: Comprehensive Audit Logging System
-- ============================================================================
-- Creates comprehensive audit logging for all user actions including:
--   - Patient registration/modifications
--   - User login/logout
--   - Record modifications with before/after states
--   - NHIS code entry and verification
--   - Price changes and billing modifications
--   - All clinical record changes
-- ============================================================================

-- ============================================================================
-- 1. ENHANCED AUDIT TABLES STRUCTURE
-- ============================================================================

-- Update existing audit logs table with enhanced fields
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS 
  entity_type VARCHAR(50);

ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS 
  entity_id TEXT;

ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS 
  ip_address INET;

ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS 
  user_agent TEXT;

ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS 
  session_id TEXT;

-- Create comprehensive activity audit log
CREATE TABLE IF NOT EXISTS public.comprehensive_audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        VARCHAR(100) NOT NULL,
  table_name        VARCHAR(100) NOT NULL,
  record_id         TEXT NOT NULL,
  user_id           UUID REFERENCES auth.users(id),
  user_email        TEXT,
  user_role         VARCHAR(50),
  staff_id          UUID REFERENCES staff(id),
  
  -- Action details
  action_type       VARCHAR(50) NOT NULL, -- create, update, delete, login, logout, view
  description       TEXT NOT NULL,
  
  -- Before/After state
  old_values        JSONB,
  new_values        JSONB,
  changed_fields    TEXT[],
  
  -- Patient context (if applicable)
  patient_id        UUID,
  patient_name      VARCHAR(200),
  encounter_id      UUID,
  
  -- Session context
  ip_address        INET,
  user_agent        TEXT,
  session_id        TEXT,
  
  -- Timestamps
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Critical fields for high-value events
  is_critical       BOOLEAN DEFAULT FALSE,
  reason            TEXT,
  
  -- Compliance
  retention_until   DATE,
  
  CONSTRAINT fk_comprehensive_audit_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_comprehensive_audit_encounter 
    FOREIGN KEY (encounter_id) REFERENCES visits(id),
  CONSTRAINT fk_comprehensive_audit_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_comprehensive_audit_staff
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Enhanced NHIS-specific audit for code verification and approvals
CREATE TABLE IF NOT EXISTS public.nhis_activity_audit (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        VARCHAR(100) NOT NULL,
  patient_id        UUID REFERENCES patients(id),
  profile_id        UUID REFERENCES nhis_profiles(id),
  encounter_id      UUID,
  
  -- NHIS-specific fields
  enrollee_id       VARCHAR(50),
  auth_code         VARCHAR(100),
  service_code      VARCHAR(50),
  diagnosis_code    VARCHAR(20),
  procedure_code    VARCHAR(20),
  drug_code         VARCHAR(50),
  
  -- User context
  user_id           UUID REFERENCES auth.users(id),
  staff_id          UUID REFERENCES staff(id),
  user_role         VARCHAR(50),
  
  -- Action details
  action_type       VARCHAR(50) NOT NULL, -- verify, approve, reject, modify, create
  before_state      JSONB,
  after_state       JSONB,
  
  -- Verification details
  coverage_percentage DECIMAL(5,2),
  nhis_amount       DECIMAL(12,2),
  patient_amount    DECIMAL(12,2),
  
  -- Session context
  ip_address        INET,
  session_id        TEXT,
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Compliance
  reason            TEXT,
  is_approved       BOOLEAN,
  approved_by       UUID REFERENCES staff(id),
  approved_at       TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_table_record 
  ON comprehensive_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_user_time 
  ON comprehensive_audit_log(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_patient_time 
  ON comprehensive_audit_log(patient_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_action_type 
  ON comprehensive_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_critical 
  ON comprehensive_audit_log(performed_at DESC) WHERE is_critical = TRUE;

CREATE INDEX IF NOT EXISTS idx_nhis_activity_patient_time 
  ON nhis_activity_audit(patient_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nhis_activity_profile_time 
  ON nhis_activity_audit(profile_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nhis_activity_user_time 
  ON nhis_activity_audit(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nhis_activity_auth_code 
  ON nhis_activity_audit(auth_code) WHERE auth_code IS NOT NULL;

-- ============================================================================
-- 2. COMPREHENSIVE AUDIT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_comprehensive_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role VARCHAR(50);
  v_staff_id UUID;
  v_patient_id UUID;
  v_patient_name VARCHAR(200);
  v_encounter_id UUID;
  v_old_values JSONB;
  v_new_values JSONB;
  v_changed_fields TEXT[];
  v_description TEXT;
  v_is_critical BOOLEAN := FALSE;
  v_action_type VARCHAR(50);
  v_ip_address INET;
  v_user_agent TEXT;
  v_session_id TEXT;
  field_name TEXT;
BEGIN
  -- Get current user context
  v_user_id := auth.uid();
  
  -- Get user details from staff table
  IF v_user_id IS NOT NULL THEN
    SELECT 
      s.id,
      s.role,
      s.first_name || ' ' || s.last_name,
      au.email
    INTO 
      v_staff_id,
      v_user_role,
      v_patient_name, -- Temporarily using for user name
      v_user_email
    FROM staff s 
    LEFT JOIN auth.users au ON au.id = s.user_id
    WHERE s.user_id = v_user_id
    LIMIT 1;
  END IF;

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    
    -- Calculate changed fields
    v_changed_fields := ARRAY[]::TEXT[];
    FOR field_name IN SELECT jsonb_object_keys(v_new_values)
    LOOP
      IF v_old_values->field_name IS DISTINCT FROM v_new_values->field_name THEN
        v_changed_fields := array_append(v_changed_fields, field_name);
      END IF;
    END LOOP;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_old_values := to_jsonb(OLD);
  END IF;

  -- Extract patient context based on table
  CASE TG_TABLE_NAME
    WHEN 'patients' THEN
      v_patient_id := COALESCE(NEW.id, OLD.id);
      v_patient_name := COALESCE(NEW.first_name || ' ' || NEW.last_name, OLD.first_name || ' ' || OLD.last_name);
      v_is_critical := (v_action_type = 'update' AND ('first_name' = ANY(v_changed_fields) OR 'date_of_birth' = ANY(v_changed_fields) OR 'phone_number' = ANY(v_changed_fields)));
      
    WHEN 'visits' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      v_encounter_id := COALESCE(NEW.id, OLD.id);
      
    WHEN 'consultations' THEN
      v_encounter_id := COALESCE(NEW.visit_id, OLD.visit_id);
      SELECT patient_id INTO v_patient_id FROM visits WHERE id = v_encounter_id;
      
    WHEN 'prescriptions' THEN
      v_encounter_id := COALESCE(NEW.visit_id, OLD.visit_id);
      SELECT patient_id INTO v_patient_id FROM visits WHERE id = v_encounter_id;
      
    WHEN 'lab_requests' THEN
      v_encounter_id := COALESCE(NEW.visit_id, OLD.visit_id);
      SELECT patient_id INTO v_patient_id FROM visits WHERE id = v_encounter_id;
      
    WHEN 'radiology_requests' THEN
      v_encounter_id := COALESCE(NEW.visit_id, OLD.visit_id);
      SELECT patient_id INTO v_patient_id FROM visits WHERE id = v_encounter_id;
      
    WHEN 'vitals' THEN
      v_encounter_id := COALESCE(NEW.visit_id, OLD.visit_id);
      SELECT patient_id INTO v_patient_id FROM visits WHERE id = v_encounter_id;
      
    WHEN 'billing_orders' THEN
      v_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);
      SELECT patient_id INTO v_patient_id FROM visits WHERE id = v_encounter_id;
      v_is_critical := (v_action_type = 'update' AND 'total_amount' = ANY(v_changed_fields));
      
    WHEN 'procedure_catalogue' THEN
      v_is_critical := (v_action_type = 'update' AND ('unit_price' = ANY(v_changed_fields) OR 'nhis_tariff' = ANY(v_changed_fields)));
      
    WHEN 'drug_catalogue' THEN
      v_is_critical := (v_action_type = 'update' AND ('unit_price' = ANY(v_changed_fields) OR 'nhis_price' = ANY(v_changed_fields)));
      
    ELSE
      NULL;
  END CASE;

  -- Get patient name if not already set
  IF v_patient_id IS NOT NULL AND v_patient_name IS NULL THEN
    SELECT first_name || ' ' || last_name INTO v_patient_name 
    FROM patients WHERE id = v_patient_id;
  END IF;

  -- Build description
  v_description := format('%s record %s in %s', 
    INITCAP(v_action_type), 
    COALESCE(NEW.id::TEXT, OLD.id::TEXT, 'unknown'),
    TG_TABLE_NAME
  );

  -- Get session context from current_setting if available
  BEGIN
    v_ip_address := current_setting('app.client_ip')::INET;
  EXCEPTION WHEN OTHERS THEN
    v_ip_address := NULL;
  END;

  BEGIN
    v_user_agent := current_setting('app.user_agent');
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  BEGIN
    v_session_id := current_setting('app.session_id');
  EXCEPTION WHEN OTHERS THEN
    v_session_id := NULL;
  END;

  -- Insert audit record
  INSERT INTO comprehensive_audit_log (
    event_type,
    table_name,
    record_id,
    user_id,
    user_email,
    user_role,
    staff_id,
    action_type,
    description,
    old_values,
    new_values,
    changed_fields,
    patient_id,
    patient_name,
    encounter_id,
    ip_address,
    user_agent,
    session_id,
    is_critical,
    performed_at
  ) VALUES (
    TG_TABLE_NAME || '_' || v_action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    v_user_id,
    v_user_email,
    v_user_role,
    v_staff_id,
    v_action_type,
    v_description,
    v_old_values,
    v_new_values,
    v_changed_fields,
    v_patient_id,
    v_patient_name,
    v_encounter_id,
    v_ip_address,
    v_user_agent,
    v_session_id,
    v_is_critical,
    NOW()
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Audit trigger failed: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. NHIS-SPECIFIC AUDIT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_nhis_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_staff_id UUID;
  v_user_role VARCHAR(50);
  v_patient_id UUID;
  v_event_type VARCHAR(100);
  v_action_type VARCHAR(50);
  v_ip_address INET;
  v_session_id TEXT;
BEGIN
  -- Get current user context
  v_user_id := auth.uid();
  
  -- Get user details from staff table
  IF v_user_id IS NOT NULL THEN
    SELECT s.id, s.role
    INTO v_staff_id, v_user_role
    FROM staff s 
    WHERE s.user_id = v_user_id
    LIMIT 1;
  END IF;

  -- Determine action and event type
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_event_type := TG_TABLE_NAME || '_created';
    v_patient_id := NEW.patient_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    v_event_type := TG_TABLE_NAME || '_modified';
    v_patient_id := NEW.patient_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_event_type := TG_TABLE_NAME || '_deleted';
    v_patient_id := OLD.patient_id;
  END IF;

  -- Get session context
  BEGIN
    v_ip_address := current_setting('app.client_ip')::INET;
  EXCEPTION WHEN OTHERS THEN
    v_ip_address := NULL;
  END;

  BEGIN
    v_session_id := current_setting('app.session_id');
  EXCEPTION WHEN OTHERS THEN
    v_session_id := NULL;
  END;

  -- Insert NHIS-specific audit record
  INSERT INTO nhis_activity_audit (
    event_type,
    patient_id,
    profile_id,
    encounter_id,
    enrollee_id,
    auth_code,
    user_id,
    staff_id,
    user_role,
    action_type,
    before_state,
    after_state,
    ip_address,
    session_id,
    performed_at
  ) VALUES (
    v_event_type,
    v_patient_id,
    CASE 
      WHEN TG_TABLE_NAME = 'nhis_profiles' THEN COALESCE(NEW.id, OLD.id)
      ELSE COALESCE(NEW.profile_id, OLD.profile_id)
    END,
    COALESCE(NEW.encounter_id, OLD.encounter_id),
    COALESCE(NEW.enrollee_id, OLD.enrollee_id),
    COALESCE(NEW.auth_code, OLD.auth_code, NEW.authorization_code, OLD.authorization_code),
    v_user_id,
    v_staff_id,
    v_user_role,
    v_action_type,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    v_ip_address,
    v_session_id,
    NOW()
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'NHIS audit trigger failed: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. USER SESSION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_session_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id),
  staff_id        UUID REFERENCES staff(id),
  event_type      VARCHAR(50) NOT NULL, -- login, logout, timeout, forced_logout
  ip_address      INET,
  user_agent      TEXT,
  session_id      TEXT,
  login_time      TIMESTAMPTZ,
  logout_time     TIMESTAMPTZ,
  session_duration INTERVAL,
  is_successful   BOOLEAN DEFAULT TRUE,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_session_user_time 
  ON user_session_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_session_event_type 
  ON user_session_audit(event_type);

-- Function to log user sessions
CREATE OR REPLACE FUNCTION public.log_user_session(
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_is_successful BOOLEAN DEFAULT TRUE,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_staff_id UUID;
  v_session_log_id UUID;
BEGIN
  -- Get staff ID
  SELECT id INTO v_staff_id FROM staff WHERE user_id = p_user_id LIMIT 1;

  -- Insert session log
  INSERT INTO user_session_audit (
    user_id,
    staff_id,
    event_type,
    ip_address,
    user_agent,
    session_id,
    login_time,
    logout_time,
    is_successful,
    failure_reason
  ) VALUES (
    p_user_id,
    v_staff_id,
    p_event_type,
    p_ip_address,
    p_user_agent,
    p_session_id,
    CASE WHEN p_event_type = 'login' THEN NOW() ELSE NULL END,
    CASE WHEN p_event_type IN ('logout', 'timeout', 'forced_logout') THEN NOW() ELSE NULL END,
    p_is_successful,
    p_failure_reason
  ) RETURNING id INTO v_session_log_id;

  -- Update session duration for logout events
  IF p_event_type IN ('logout', 'timeout', 'forced_logout') AND p_session_id IS NOT NULL THEN
    UPDATE user_session_audit 
    SET 
      logout_time = NOW(),
      session_duration = NOW() - login_time
    WHERE session_id = p_session_id 
      AND event_type = 'login' 
      AND logout_time IS NULL;
  END IF;

  RETURN v_session_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. APPLY AUDIT TRIGGERS TO CRITICAL TABLES
-- ============================================================================

-- Patient data triggers (conditional creation)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_patients ON patients;
        CREATE TRIGGER trg_comprehensive_audit_patients
          AFTER INSERT OR UPDATE OR DELETE ON patients
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for patients';
    END IF;
END $$;

-- Visit/Encounter triggers (conditional creation)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_visits ON visits;
        CREATE TRIGGER trg_comprehensive_audit_visits
          AFTER INSERT OR UPDATE OR DELETE ON visits
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for visits';
    END IF;
END $$;

-- Clinical record triggers (conditional creation)
DO $$ 
BEGIN
    -- Consultations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultations') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_consultations ON consultations;
        CREATE TRIGGER trg_comprehensive_audit_consultations
          AFTER INSERT OR UPDATE OR DELETE ON consultations
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for consultations';
    END IF;

    -- Prescriptions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_prescriptions ON prescriptions;
        CREATE TRIGGER trg_comprehensive_audit_prescriptions
          AFTER INSERT OR UPDATE OR DELETE ON prescriptions
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for prescriptions';
    END IF;

    -- Lab requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_requests') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_lab_requests ON lab_requests;
        CREATE TRIGGER trg_comprehensive_audit_lab_requests
          AFTER INSERT OR UPDATE OR DELETE ON lab_requests
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for lab_requests';
    END IF;

    -- Lab results
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_results') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_lab_results ON lab_results;
        CREATE TRIGGER trg_comprehensive_audit_lab_results
          AFTER INSERT OR UPDATE OR DELETE ON lab_results
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for lab_results';
    END IF;

    -- Radiology requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'radiology_requests') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_radiology_requests ON radiology_requests;
        CREATE TRIGGER trg_comprehensive_audit_radiology_requests
          AFTER INSERT OR UPDATE OR DELETE ON radiology_requests
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for radiology_requests';
    END IF;

    -- Vitals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vitals') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_vitals ON vitals;
        CREATE TRIGGER trg_comprehensive_audit_vitals
          AFTER INSERT OR UPDATE OR DELETE ON vitals
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for vitals';
    END IF;
END $$;

-- Billing and pricing triggers (conditional creation)
DO $$ 
BEGIN
    -- Billing orders trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_orders') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_billing_orders ON billing_orders;
        CREATE TRIGGER trg_comprehensive_audit_billing_orders
          AFTER INSERT OR UPDATE OR DELETE ON billing_orders
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for billing_orders';
    END IF;

    -- Procedure catalogue trigger (was service_catalogue)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procedure_catalogue') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_procedure_catalogue ON procedure_catalogue;
        CREATE TRIGGER trg_comprehensive_audit_procedure_catalogue
          AFTER INSERT OR UPDATE OR DELETE ON procedure_catalogue
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for procedure_catalogue';
    END IF;

    -- Drug catalogue trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drug_catalogue') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_drug_catalogue ON drug_catalogue;
        CREATE TRIGGER trg_comprehensive_audit_drug_catalogue
          AFTER INSERT OR UPDATE OR DELETE ON drug_catalogue
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
        RAISE NOTICE 'Created audit trigger for drug_catalogue';
    END IF;
END $$;

-- NHIS-specific triggers (conditional creation)
DO $$ 
BEGIN
    -- NHIS profiles trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nhis_profiles') THEN
        DROP TRIGGER IF EXISTS trg_nhis_audit_profiles ON nhis_profiles;
        CREATE TRIGGER trg_nhis_audit_profiles
          AFTER INSERT OR UPDATE OR DELETE ON nhis_profiles
          FOR EACH ROW EXECUTE FUNCTION log_nhis_activity();
        RAISE NOTICE 'Created NHIS audit trigger for nhis_profiles';
    END IF;

    -- NHIS claims trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nhis_claims') THEN
        DROP TRIGGER IF EXISTS trg_nhis_audit_claims ON nhis_claims;
        CREATE TRIGGER trg_nhis_audit_claims
          AFTER INSERT OR UPDATE OR DELETE ON nhis_claims
          FOR EACH ROW EXECUTE FUNCTION log_nhis_activity();
        RAISE NOTICE 'Created NHIS audit trigger for nhis_claims';
    END IF;

    -- NHIS authorizations trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nhis_authorizations') THEN
        DROP TRIGGER IF EXISTS trg_nhis_audit_authorizations ON nhis_authorizations;
        CREATE TRIGGER trg_nhis_audit_authorizations
          AFTER INSERT OR UPDATE OR DELETE ON nhis_authorizations
          FOR EACH ROW EXECUTE FUNCTION log_nhis_activity();
        RAISE NOTICE 'Created NHIS audit trigger for nhis_authorizations';
    END IF;
END $$;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

ALTER TABLE comprehensive_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_activity_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_session_audit ENABLE ROW LEVEL SECURITY;

-- Comprehensive audit log policies
DROP POLICY IF EXISTS "comprehensive_audit_admin_read" ON comprehensive_audit_log;
CREATE POLICY "comprehensive_audit_admin_read" ON comprehensive_audit_log
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin', 'medical_director')
  );

DROP POLICY IF EXISTS "comprehensive_audit_own_records" ON comprehensive_audit_log;
CREATE POLICY "comprehensive_audit_own_records" ON comprehensive_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "comprehensive_audit_insert" ON comprehensive_audit_log;
CREATE POLICY "comprehensive_audit_insert" ON comprehensive_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- NHIS audit policies
DROP POLICY IF EXISTS "nhis_audit_admin_read" ON nhis_activity_audit;
CREATE POLICY "nhis_audit_admin_read" ON nhis_activity_audit
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin', 'medical_director')
  );

DROP POLICY IF EXISTS "nhis_audit_insert" ON nhis_activity_audit;
CREATE POLICY "nhis_audit_insert" ON nhis_activity_audit
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- User session audit policies
DROP POLICY IF EXISTS "user_session_audit_admin_read" ON user_session_audit;
CREATE POLICY "user_session_audit_admin_read" ON user_session_audit
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "user_session_audit_own_read" ON user_session_audit;
CREATE POLICY "user_session_audit_own_read" ON user_session_audit
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON comprehensive_audit_log TO authenticated;
GRANT INSERT ON comprehensive_audit_log TO authenticated;
GRANT SELECT ON nhis_activity_audit TO authenticated;
GRANT INSERT ON nhis_activity_audit TO authenticated;
GRANT SELECT ON user_session_audit TO authenticated;
GRANT INSERT ON user_session_audit TO authenticated;

GRANT EXECUTE ON FUNCTION log_comprehensive_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION log_nhis_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_session(UUID, VARCHAR, INET, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;

-- ============================================================================
-- 8. AUDIT QUERY FUNCTIONS
-- ============================================================================

-- Function to get patient audit trail
CREATE OR REPLACE FUNCTION public.get_patient_audit_trail(
  p_patient_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  performed_at TIMESTAMPTZ,
  action_type VARCHAR(50),
  table_name VARCHAR(100),
  description TEXT,
  user_name TEXT,
  user_role VARCHAR(50),
  changed_fields TEXT[],
  is_critical BOOLEAN,
  old_values JSONB,
  new_values JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cal.performed_at,
    cal.action_type,
    cal.table_name,
    cal.description,
    COALESCE(s.first_name || ' ' || s.last_name, cal.user_email, 'System') as user_name,
    cal.user_role,
    cal.changed_fields,
    cal.is_critical,
    cal.old_values,
    cal.new_values
  FROM comprehensive_audit_log cal
  LEFT JOIN staff s ON s.id = cal.staff_id
  WHERE cal.patient_id = p_patient_id
  ORDER BY cal.performed_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION public.get_user_activity_summary(
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  user_name TEXT,
  total_actions INTEGER,
  critical_actions INTEGER,
  tables_accessed TEXT[],
  last_activity TIMESTAMPTZ,
  login_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH activity_stats AS (
    SELECT 
      cal.user_id,
      cal.staff_id,
      COUNT(*) as total_actions,
      COUNT(*) FILTER (WHERE cal.is_critical = true) as critical_actions,
      array_agg(DISTINCT cal.table_name) as tables_accessed,
      MAX(cal.performed_at) as last_activity
    FROM comprehensive_audit_log cal
    WHERE (p_user_id IS NULL OR cal.user_id = p_user_id)
      AND (p_start_date IS NULL OR cal.performed_at >= p_start_date)
      AND (p_end_date IS NULL OR cal.performed_at <= p_end_date)
    GROUP BY cal.user_id, cal.staff_id
  ),
  login_stats AS (
    SELECT 
      usa.user_id,
      COUNT(*) FILTER (WHERE usa.event_type = 'login' AND usa.is_successful = true) as login_count
    FROM user_session_audit usa
    WHERE (p_user_id IS NULL OR usa.user_id = p_user_id)
      AND (p_start_date IS NULL OR usa.created_at >= p_start_date)
      AND (p_end_date IS NULL OR usa.created_at <= p_end_date)
    GROUP BY usa.user_id
  )
  SELECT 
    COALESCE(s.first_name || ' ' || s.last_name, au.email, 'Unknown User') as user_name,
    ast.total_actions::INTEGER,
    ast.critical_actions::INTEGER,
    ast.tables_accessed,
    ast.last_activity,
    COALESCE(ls.login_count, 0)::INTEGER
  FROM activity_stats ast
  LEFT JOIN staff s ON s.id = ast.staff_id
  LEFT JOIN auth.users au ON au.id = ast.user_id
  LEFT JOIN login_stats ls ON ls.user_id = ast.user_id
  ORDER BY ast.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get NHIS activity for a profile
CREATE OR REPLACE FUNCTION public.get_nhis_profile_activity(
  p_profile_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  performed_at TIMESTAMPTZ,
  action_type VARCHAR(50),
  event_type VARCHAR(100),
  user_name TEXT,
  auth_code VARCHAR(100),
  before_state JSONB,
  after_state JSONB,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    naa.performed_at,
    naa.action_type,
    naa.event_type,
    COALESCE(s.first_name || ' ' || s.last_name, 'System') as user_name,
    naa.auth_code,
    naa.before_state,
    naa.after_state,
    naa.reason
  FROM nhis_activity_audit naa
  LEFT JOIN staff s ON s.id = naa.staff_id
  WHERE naa.profile_id = p_profile_id
  ORDER BY naa.performed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_patient_audit_trail(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nhis_profile_activity(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- RECORD THIS MIGRATION
-- ============================================================================

INSERT INTO public.emr_schema_migrations (filename, description)
VALUES (
  '148_comprehensive_audit_logging.sql',
  'Comprehensive audit logging: patient changes, user sessions, NHIS activity, price modifications with full before/after state tracking'
)
ON CONFLICT (filename) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✅ Enhanced audit tables with comprehensive tracking
-- ✅ Patient registration and modification logging
-- ✅ User login/logout session tracking
-- ✅ NHIS code entry and verification logging
-- ✅ Price change tracking for services and drugs
-- ✅ All clinical record changes with before/after states
-- ✅ Critical action flagging for high-risk operations
-- ✅ IP address, user agent, and session tracking
-- ✅ Efficient query functions for audit trails
-- ✅ Proper RLS policies for security
-- ============================================================================