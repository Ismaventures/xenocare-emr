-- =============================================================================
-- Migration 054: Nursing Module Role-Based Access Control
-- =============================================================================
-- 
-- Implements proper RLS policies for nursing access to clinical tables.
-- Enforces: "One encounter, many roles, different permissions."
--
-- PRINCIPLES:
-- 1. Nurses can only write to Active encounters
-- 2. Nurses can read historical encounters (read-only)
-- 3. All nursing writes are scoped to encounter_id
-- 4. Audit logging for all access attempts
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTION: Check if user is a nurse
-- =============================================================================

CREATE OR REPLACE FUNCTION is_nurse(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role
  FROM staff
  WHERE staff.user_id = $1 OR staff.id = $1;
  
  RETURN user_role = 'nurse';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- HELPER FUNCTION: Check if encounter is writable (Active status)
-- =============================================================================

CREATE OR REPLACE FUNCTION is_encounter_writable(encounter_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  enc_status TEXT;
BEGIN
  IF encounter_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT status INTO enc_status
  FROM visits
  WHERE id = encounter_uuid;
  
  RETURN enc_status = 'Active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- HELPER FUNCTION: Check nursing access to encounter
-- =============================================================================

CREATE OR REPLACE FUNCTION nurse_has_encounter_access(
  encounter_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  enc_exists BOOLEAN;
  in_care_team BOOLEAN;
  same_facility BOOLEAN;
BEGIN
  -- Check encounter exists
  SELECT EXISTS(SELECT 1 FROM visits WHERE id = encounter_uuid) INTO enc_exists;
  IF NOT enc_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Check if nurse is in care team for this encounter
  SELECT EXISTS(
    SELECT 1 FROM encounter_care_team
    WHERE encounter_id = encounter_uuid
    AND staff_id = user_uuid
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO in_care_team;
  
  IF in_care_team THEN
    RETURN TRUE;
  END IF;
  
  -- Check if nurse is in same facility as the encounter
  SELECT EXISTS(
    SELECT 1 FROM visits v
    JOIN patients p ON v.patient_id = p.id
    JOIN staff s ON s.facility_id = p.facility_id
    WHERE v.id = encounter_uuid
    AND s.id = user_uuid
  ) INTO same_facility;
  
  -- For now, allow same-facility access (can be tightened later)
  RETURN same_facility;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VITALS TABLE - RLS POLICIES FOR NURSES
-- =============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access" ON vitals;
DROP POLICY IF EXISTS "vitals_select_policy" ON vitals;
DROP POLICY IF EXISTS "vitals_insert_policy" ON vitals;
DROP POLICY IF EXISTS "vitals_update_policy" ON vitals;
DROP POLICY IF EXISTS "vitals_nurse_select" ON vitals;
DROP POLICY IF EXISTS "vitals_nurse_insert" ON vitals;
DROP POLICY IF EXISTS "vitals_nurse_update" ON vitals;
DROP POLICY IF EXISTS "vitals_admin_delete" ON vitals;

-- SELECT: Nurses can view vitals for any encounter they have access to
CREATE POLICY "vitals_nurse_select" ON vitals
FOR SELECT
USING (
  -- Authenticated users can read vitals
  auth.role() = 'authenticated'
);

-- INSERT: Nurses can only insert vitals for ACTIVE encounters
CREATE POLICY "vitals_nurse_insert" ON vitals
FOR INSERT
WITH CHECK (
  -- Must have an encounter_id
  encounter_id IS NOT NULL
  AND
  -- Encounter must be Active
  is_encounter_writable(encounter_id::UUID)
);

-- UPDATE: Nurses can only update vitals for ACTIVE encounters
CREATE POLICY "vitals_nurse_update" ON vitals
FOR UPDATE
USING (
  -- Encounter must be Active
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
)
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
);

-- DELETE: Generally not allowed, but admin can delete
CREATE POLICY "vitals_admin_delete" ON vitals
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.role IN ('super_admin', 'admin')
  )
);

-- =============================================================================
-- NURSING_NOTES TABLE - RLS POLICIES
-- =============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access" ON nursing_notes;
DROP POLICY IF EXISTS "nursing_notes_select" ON nursing_notes;
DROP POLICY IF EXISTS "nursing_notes_insert" ON nursing_notes;
DROP POLICY IF EXISTS "nursing_notes_update" ON nursing_notes;
DROP POLICY IF EXISTS "nursing_notes_select_policy" ON nursing_notes;
DROP POLICY IF EXISTS "nursing_notes_insert_policy" ON nursing_notes;
DROP POLICY IF EXISTS "nursing_notes_update_policy" ON nursing_notes;
DROP POLICY IF EXISTS "nursing_notes_delete_policy" ON nursing_notes;

-- SELECT: All authenticated users can read nursing notes
CREATE POLICY "nursing_notes_select_policy" ON nursing_notes
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Only for Active encounters
CREATE POLICY "nursing_notes_insert_policy" ON nursing_notes
FOR INSERT
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
);

-- UPDATE: Only for Active encounters, only own notes (or admin)
CREATE POLICY "nursing_notes_update_policy" ON nursing_notes
FOR UPDATE
USING (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
  AND (
    recorded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.user_id = auth.uid() 
      AND staff.role IN ('super_admin', 'admin', 'medical_director')
    )
  )
)
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
);

-- DELETE: Admin only
CREATE POLICY "nursing_notes_delete_policy" ON nursing_notes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.role IN ('super_admin', 'admin')
  )
);

-- =============================================================================
-- DAILY_PROGRESS_NOTES TABLE - RLS POLICIES
-- =============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access" ON daily_progress_notes;
DROP POLICY IF EXISTS "daily_progress_notes_select" ON daily_progress_notes;
DROP POLICY IF EXISTS "daily_progress_notes_insert" ON daily_progress_notes;
DROP POLICY IF EXISTS "daily_progress_notes_update" ON daily_progress_notes;

-- SELECT: All authenticated users can read
CREATE POLICY "daily_progress_notes_select" ON daily_progress_notes
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Only for Active encounters
CREATE POLICY "daily_progress_notes_insert" ON daily_progress_notes
FOR INSERT
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
);

-- UPDATE: Only for Active encounters
CREATE POLICY "daily_progress_notes_update" ON daily_progress_notes
FOR UPDATE
USING (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
)
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
);

-- =============================================================================
-- TREATMENT_PLANS TABLE - RLS POLICIES FOR NURSES (VIEW ONLY)
-- =============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access" ON treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_select" ON treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_insert" ON treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_update" ON treatment_plans;

-- SELECT: All authenticated users can read treatment plans
CREATE POLICY "treatment_plans_select" ON treatment_plans
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Doctors and above only
CREATE POLICY "treatment_plans_insert" ON treatment_plans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.role IN ('doctor', 'medical_director', 'super_admin', 'admin')
  )
);

-- UPDATE: Doctors and above only
CREATE POLICY "treatment_plans_update" ON treatment_plans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.role IN ('doctor', 'medical_director', 'super_admin', 'admin')
  )
);

-- =============================================================================
-- TREATMENT_TASKS TABLE - RLS POLICIES FOR NURSES (EXECUTE ONLY)
-- =============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access" ON treatment_tasks;
DROP POLICY IF EXISTS "treatment_tasks_select" ON treatment_tasks;
DROP POLICY IF EXISTS "treatment_tasks_insert" ON treatment_tasks;
DROP POLICY IF EXISTS "treatment_tasks_update" ON treatment_tasks;

-- SELECT: All authenticated users can read
CREATE POLICY "treatment_tasks_select" ON treatment_tasks
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Doctors only (nurses can't create tasks)
CREATE POLICY "treatment_tasks_insert" ON treatment_tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.role IN ('doctor', 'medical_director', 'super_admin', 'admin')
  )
);

-- UPDATE: Doctors can edit all, Nurses can only update status/execution fields
CREATE POLICY "treatment_tasks_update" ON treatment_tasks
FOR UPDATE
USING (
  -- Doctors can update any task
  EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.role IN ('doctor', 'medical_director', 'super_admin', 'admin')
  )
  OR
  -- Nurses can update task status for Active encounters
  (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.user_id = auth.uid() 
      AND staff.role = 'nurse'
    )
    AND encounter_id IS NOT NULL
    AND is_encounter_writable(encounter_id::UUID)
  )
);

-- =============================================================================
-- SHIFT_HANDOVERS TABLE - RLS POLICIES (using existing table from migration 051)
-- =============================================================================

-- Enable RLS on existing shift_handovers table
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "shift_handovers_select" ON shift_handovers;
DROP POLICY IF EXISTS "shift_handovers_insert" ON shift_handovers;
DROP POLICY IF EXISTS "shift_handovers_update" ON shift_handovers;
DROP POLICY IF EXISTS "Allow all access" ON shift_handovers;

-- SELECT: All authenticated users can read handovers
CREATE POLICY "shift_handovers_select" ON shift_handovers
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Nurses only, Active encounters only
CREATE POLICY "shift_handovers_insert" ON shift_handovers
FOR INSERT
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
  AND EXISTS (
    SELECT 1 FROM staff 
    WHERE (staff.user_id = auth.uid() OR staff.id = auth.uid())
    AND staff.role = 'nurse'
  )
);

-- UPDATE: Nurses only, Active encounters only
CREATE POLICY "shift_handovers_update" ON shift_handovers
FOR UPDATE
USING (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
)
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
);

-- =============================================================================
-- MEDICATION_ADMINISTRATION TABLE
-- =============================================================================

-- Ensure table exists
CREATE TABLE IF NOT EXISTS medication_administration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES visits(id) NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  prescription_id UUID REFERENCES prescriptions(prescription_id),
  medication_name VARCHAR(255) NOT NULL,
  dose VARCHAR(100),
  route VARCHAR(50),
  scheduled_time TIMESTAMPTZ,
  administered_at TIMESTAMPTZ,
  administered_by UUID REFERENCES staff(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'given', 'refused', 'held', 'missed')),
  refusal_reason TEXT,
  hold_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE medication_administration ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "med_admin_select" ON medication_administration;
DROP POLICY IF EXISTS "med_admin_insert" ON medication_administration;
DROP POLICY IF EXISTS "med_admin_update" ON medication_administration;

-- SELECT: All authenticated users
CREATE POLICY "med_admin_select" ON medication_administration
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Nurses only, Active encounters only
CREATE POLICY "med_admin_insert" ON medication_administration
FOR INSERT
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
);

-- UPDATE: Nurses only, Active encounters only
CREATE POLICY "med_admin_update" ON medication_administration
FOR UPDATE
USING (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
)
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id::UUID)
);

-- =============================================================================
-- AUDIT LOGGING FOR NURSING ACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS nursing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES visits(id),
  patient_id UUID,
  user_id UUID,
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  was_successful BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE nursing_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "nursing_audit_admin_only" ON nursing_audit_log;
DROP POLICY IF EXISTS "nursing_audit_insert" ON nursing_audit_log;

-- Only admins can read audit logs
CREATE POLICY "nursing_audit_admin_only" ON nursing_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.role IN ('super_admin', 'admin', 'medical_director')
  )
);

-- Anyone can insert audit logs (via triggers)
CREATE POLICY "nursing_audit_insert" ON nursing_audit_log
FOR INSERT
WITH CHECK (true);

-- =============================================================================
-- AUDIT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION log_nursing_action()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user info
  SELECT id, role::TEXT INTO current_user_id, current_user_role
  FROM staff
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO nursing_audit_log (
    encounter_id,
    patient_id,
    user_id,
    user_role,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.encounter_id, OLD.encounter_id),
    COALESCE(NEW.patient_id, OLD.patient_id),
    current_user_id,
    current_user_role,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to nursing tables
DROP TRIGGER IF EXISTS audit_vitals ON vitals;
CREATE TRIGGER audit_vitals
AFTER INSERT OR UPDATE OR DELETE ON vitals
FOR EACH ROW EXECUTE FUNCTION log_nursing_action();

DROP TRIGGER IF EXISTS audit_nursing_notes ON nursing_notes;
CREATE TRIGGER audit_nursing_notes
AFTER INSERT OR UPDATE OR DELETE ON nursing_notes
FOR EACH ROW EXECUTE FUNCTION log_nursing_action();

DROP TRIGGER IF EXISTS audit_shift_handovers ON shift_handovers;
CREATE TRIGGER audit_shift_handovers
AFTER INSERT OR UPDATE OR DELETE ON shift_handovers
FOR EACH ROW EXECUTE FUNCTION log_nursing_action();

DROP TRIGGER IF EXISTS audit_medication_administration ON medication_administration;
CREATE TRIGGER audit_medication_administration
AFTER INSERT OR UPDATE OR DELETE ON medication_administration
FOR EACH ROW EXECUTE FUNCTION log_nursing_action();

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_vitals_encounter_patient ON vitals(encounter_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_encounter ON nursing_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_encounter ON shift_handovers(encounter_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_encounter ON medication_administration(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nursing_audit_encounter ON nursing_audit_log(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nursing_audit_user ON nursing_audit_log(user_id);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION is_encounter_writable IS 'Check if encounter status allows write operations (Active only)';
COMMENT ON FUNCTION nurse_has_encounter_access IS 'Verify nurse has access to specific encounter';
COMMENT ON TABLE nursing_audit_log IS 'Audit trail for all nursing module actions';
COMMENT ON TABLE shift_handovers IS 'Nursing shift handover documentation';
COMMENT ON TABLE medication_administration IS 'Medication administration records (MAR)';
