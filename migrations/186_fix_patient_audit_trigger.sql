-- ============================================================================
-- Migration 186: Fix Patient Audit Trigger
-- Ensures patient registrations and updates are tracked in comprehensive_audit_log
-- ============================================================================

-- 1. Ensure the audit log table exists with proper structure
CREATE TABLE IF NOT EXISTS public.comprehensive_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_role TEXT,
  staff_id UUID,
  action_type TEXT NOT NULL,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  patient_id UUID,
  patient_name TEXT,
  encounter_id UUID,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  reason TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_table_record 
  ON comprehensive_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_user_time 
  ON comprehensive_audit_log(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_patient_time 
  ON comprehensive_audit_log(patient_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_action 
  ON comprehensive_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_critical 
  ON comprehensive_audit_log(performed_at DESC) WHERE is_critical = TRUE;

-- 3. Create or replace the audit logging function
CREATE OR REPLACE FUNCTION log_comprehensive_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_changed_fields TEXT[];
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_staff_id UUID;
  v_action_type TEXT;
  v_patient_id UUID;
  v_patient_name TEXT;
  v_encounter_id UUID;
  v_description TEXT;
  v_is_critical BOOLEAN := FALSE;
  v_ip_address INET;
  v_user_agent TEXT;
  v_session_id TEXT;
  v_key TEXT;
BEGIN
  -- Determine action type
  v_action_type := LOWER(TG_OP);

  -- Get current user info from session
  BEGIN
    v_user_id := auth.uid();
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
    v_user_email := 'system';
  END;

  -- Try to get user role from staff table
  BEGIN
    SELECT id, role INTO v_staff_id, v_user_role 
    FROM staff 
    WHERE auth_user_id = v_user_id
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_user_role := 'system';
  END;

  -- Extract old and new values
  IF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSE -- UPDATE
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    
    -- Calculate changed fields
    v_changed_fields := ARRAY[]::TEXT[];
    FOR v_key IN SELECT jsonb_object_keys(v_new_values)
    LOOP
      IF v_old_values->v_key IS DISTINCT FROM v_new_values->v_key THEN
        v_changed_fields := array_append(v_changed_fields, v_key);
      END IF;
    END LOOP;
    
    -- Skip if no actual changes
    IF array_length(v_changed_fields, 1) IS NULL OR array_length(v_changed_fields, 1) = 0 THEN
      IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;
  END IF;

  -- Extract patient_id based on table
  CASE TG_TABLE_NAME
    WHEN 'patients' THEN
      v_patient_id := COALESCE(NEW.id, OLD.id);
      IF NEW IS NOT NULL AND NEW.first_name IS NOT NULL THEN
        v_patient_name := NEW.first_name || ' ' || COALESCE(NEW.surname, NEW.last_name, '');
      ELSIF OLD IS NOT NULL AND OLD.first_name IS NOT NULL THEN
        v_patient_name := OLD.first_name || ' ' || COALESCE(OLD.surname, OLD.last_name, '');
      END IF;
      -- Mark critical for certain changes
      IF v_action_type = 'update' AND 
         ('insurance_type' = ANY(v_changed_fields) 
          OR 'nhis_patient_type' = ANY(v_changed_fields)
          OR 'insurance_id' = ANY(v_changed_fields)) THEN
        v_is_critical := TRUE;
      END IF;
      
    WHEN 'visits' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      v_encounter_id := COALESCE(NEW.id, OLD.id);

    WHEN 'consultations' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      v_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);

    WHEN 'prescriptions' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      v_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);

    WHEN 'lab_requests' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      v_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);

    WHEN 'radiology_requests' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      v_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);

    WHEN 'billings' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      v_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);

    WHEN 'nhis_profiles' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      -- NHIS changes are always critical
      v_is_critical := TRUE;

    WHEN 'clinical_requests' THEN
      v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      v_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);

    ELSE
      -- Try to extract patient_id if column exists
      BEGIN
        v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
      BEGIN
        v_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
  END CASE;

  -- Get patient name if not already set
  IF v_patient_id IS NOT NULL AND v_patient_name IS NULL THEN
    BEGIN
      SELECT first_name || ' ' || COALESCE(surname, last_name, '') INTO v_patient_name 
      FROM patients WHERE id = v_patient_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Build description
  v_description := format('%s record %s in %s', 
    INITCAP(v_action_type), 
    COALESCE(NEW.id::TEXT, OLD.id::TEXT, 'unknown'),
    TG_TABLE_NAME
  );

  -- Get session context from current_setting if available
  BEGIN
    v_ip_address := current_setting('app.client_ip', true)::INET;
  EXCEPTION WHEN OTHERS THEN
    v_ip_address := NULL;
  END;

  BEGIN
    v_user_agent := current_setting('app.user_agent', true);
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  BEGIN
    v_session_id := current_setting('app.session_id', true);
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

-- 4. Drop and recreate the patients audit trigger
DROP TRIGGER IF EXISTS trg_comprehensive_audit_patients ON patients;

CREATE TRIGGER trg_comprehensive_audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW 
  EXECUTE FUNCTION log_comprehensive_audit();

-- 5. Also create triggers for other critical tables if they don't exist
DO $$ 
BEGIN
    -- Visits
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visits') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_visits ON visits;
        CREATE TRIGGER trg_comprehensive_audit_visits
          AFTER INSERT OR UPDATE OR DELETE ON visits
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
    END IF;

    -- NHIS Profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nhis_profiles') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_nhis_profiles ON nhis_profiles;
        CREATE TRIGGER trg_comprehensive_audit_nhis_profiles
          AFTER INSERT OR UPDATE OR DELETE ON nhis_profiles
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
    END IF;

    -- Consultations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consultations') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_consultations ON consultations;
        CREATE TRIGGER trg_comprehensive_audit_consultations
          AFTER INSERT OR UPDATE OR DELETE ON consultations
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
    END IF;

    -- Billings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billings') THEN
        DROP TRIGGER IF EXISTS trg_comprehensive_audit_billings ON billings;
        CREATE TRIGGER trg_comprehensive_audit_billings
          AFTER INSERT OR UPDATE OR DELETE ON billings
          FOR EACH ROW EXECUTE FUNCTION log_comprehensive_audit();
    END IF;
END $$;

-- 6. Grant permissions
GRANT SELECT, INSERT ON comprehensive_audit_log TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. Enable RLS with permissive policies for authenticated users
ALTER TABLE comprehensive_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "audit_log_select" ON comprehensive_audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON comprehensive_audit_log;
DROP POLICY IF EXISTS "comprehensive_audit_admin_read" ON comprehensive_audit_log;
DROP POLICY IF EXISTS "comprehensive_audit_own_records" ON comprehensive_audit_log;
DROP POLICY IF EXISTS "comprehensive_audit_insert" ON comprehensive_audit_log;

-- Create permissive read policy for all authenticated users
CREATE POLICY "audit_log_select" ON comprehensive_audit_log
  FOR SELECT TO authenticated
  USING (true);

-- Create insert policy for the trigger function (runs as security definer)
CREATE POLICY "audit_log_insert" ON comprehensive_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE comprehensive_audit_log IS 'Comprehensive audit trail for all critical EMR operations including patient registrations, clinical records, and billing';

-- Verification query (for testing)
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_comprehensive_audit_patients'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE 'SUCCESS: Patient audit trigger is now active';
  ELSE
    RAISE WARNING 'FAILED: Patient audit trigger was not created';
  END IF;
END $$;
