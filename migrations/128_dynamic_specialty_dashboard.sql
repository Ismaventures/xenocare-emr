-- =============================================================================
-- NDC EMR - DYNAMIC SPECIALTY DASHBOARD SYSTEM (MASTER SCHEMA)
-- Migration: 128_dynamic_specialty_dashboard.sql
-- Description: MASTER SCHEMA for all specialty clinics including:
--              - Specialty departments (routing, access control)
--              - Links to specialty-specific exam tables (dental, eye, physio)
--              - Links to specialty consultation templates
--              - RLS policies and audit-safe functions
--              - Unified views for reporting
-- Created: February 7, 2026
-- Updated: February 7, 2026 - Made master schema
-- =============================================================================
--
-- SPECIALTY TABLE INVENTORY (existing tables this schema references):
-- =====================================================================
-- 
-- DENTAL CLINIC:
--   - dental_chart (tooth-by-tooth charting with surfaces, mobility, conditions)
--   - dental_exams (comprehensive dental examination form)
--   - dental_procedures (dental procedures with anesthesia, materials)
--   - dental_prescriptions (dental-specific medications)
--
-- OPHTHALMOLOGY CLINIC:
--   - eye_exams (comprehensive eye exam: VA, refraction, anterior/posterior)
--
-- PHYSIOTHERAPY CLINIC:
--   - physio_assessments (initial physio assessment, functional status)
--   - physio_plans (treatment plans, modalities, exercises)
--   - physio_sessions (individual session records)
--   - physio_progress (progress evaluations and outcomes)
--   - physio_discharge (discharge summaries)
--
-- TEMPLATE SYSTEM (for dynamic form generation):
--   - specialty_templates (specialty template definitions - migration 126)
--   - specialty_template_sections (template sections)
--   - specialty_template_fields (field definitions within sections)
--
-- SPECIALTY-SPECIFIC ENUMS (defined in 001_types.sql):
--   - affected_eye (Both, Left, Right, Neither)
--   - dental_urgency (Emergency, Urgent, Soon, Routine)
--   - gingival_status (Healthy, Mild_Gingivitis, Moderate_Gingivitis, etc.)
--   - mobility_status (Independent, Assisted, Wheelchair, Bedbound)
--   - physio_plan_status (Active, On_Hold, Completed, Discontinued)
--   - tooth_condition (Healthy, Caries, Filled, Crown, etc.)
--   - tooth_status (Present, Missing, Impacted, Unerupted, etc.)
--   - onset_type (Sudden, Gradual, Traumatic)
--   - evaluation_type (Initial, Progress, Discharge)
--   - attendance_status (Attended, Missed, Cancelled, Rescheduled)
--   - iop_method (Applanation, Non_Contact, Rebound, Estimated)
-- =============================================================================

-- =============================================================================
-- PHASE 1: SPECIALTY DEPARTMENTS TABLE (SINGLE SOURCE OF TRUTH)
-- =============================================================================

-- Create specialty_departments table if not exists
CREATE TABLE IF NOT EXISTS specialty_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_code varchar(50) NOT NULL,
  specialty_name varchar(100) NOT NULL,
  queue_department varchar(50) NOT NULL,
  referral_key varchar(50) NOT NULL,
  icon_name varchar(50),
  color_class varchar(50),
  requires_dedicated_queue boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 100,
  -- Versioning & Audit
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz DEFAULT now(),
  deprecated_at timestamptz,
  created_by uuid REFERENCES staff(id),
  change_notes text,
  -- Feature Flags
  feature_flags jsonb DEFAULT '{}'::jsonb,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- CONSTRAINTS: Unique constraints and checks
-- =============================================================================

-- Drop existing constraints if they exist (for idempotency)
-- Use CASCADE because foreign keys on staff, queue, clinical_requests depend on this constraint
-- These FKs are recreated later in this migration
ALTER TABLE specialty_departments 
DROP CONSTRAINT IF EXISTS specialty_departments_specialty_code_unique CASCADE;

ALTER TABLE specialty_departments 
DROP CONSTRAINT IF EXISTS specialty_departments_code_version_unique CASCADE;

ALTER TABLE specialty_departments 
DROP CONSTRAINT IF EXISTS specialty_departments_version_positive CASCADE;

ALTER TABLE specialty_departments 
DROP CONSTRAINT IF EXISTS specialty_departments_active_deprecation_check CASCADE;

-- Add UNIQUE constraint on specialty_code (required for FK references from staff, queue, etc.)
ALTER TABLE specialty_departments
ADD CONSTRAINT specialty_departments_specialty_code_unique 
UNIQUE (specialty_code);

ALTER TABLE specialty_departments
ADD CONSTRAINT specialty_departments_version_positive 
CHECK (version > 0);

ALTER TABLE specialty_departments
ADD CONSTRAINT specialty_departments_active_deprecation_check 
CHECK (NOT (is_active = true AND deprecated_at IS NOT NULL));

-- Unique index: Only ONE active record per specialty_code
DROP INDEX IF EXISTS idx_specialty_departments_active_unique;
CREATE UNIQUE INDEX idx_specialty_departments_active_unique 
ON specialty_departments (specialty_code) 
WHERE is_active = true;

-- Performance indexes
DROP INDEX IF EXISTS idx_specialty_departments_lookup;
CREATE INDEX idx_specialty_departments_lookup 
ON specialty_departments (specialty_code, is_active);

DROP INDEX IF EXISTS idx_specialty_departments_queue;
CREATE INDEX idx_specialty_departments_queue 
ON specialty_departments (queue_department) 
WHERE is_active = true;

DROP INDEX IF EXISTS idx_specialty_departments_display;
CREATE INDEX idx_specialty_departments_display 
ON specialty_departments (display_order) 
WHERE is_active = true;

-- =============================================================================
-- SEED DATA: All 18+ specialties
-- =============================================================================

INSERT INTO specialty_departments (
  specialty_code, specialty_name, queue_department, referral_key, 
  icon_name, color_class, requires_dedicated_queue, display_order, feature_flags
) VALUES
-- Existing specialties with dedicated queues (backward compatible)
('DENTAL', 'Dental', 'Dental', 'dental', 'Smile', 'text-amber-600', true, 1, 
 '{"has_tooth_chart": true, "has_procedures": true}'::jsonb),
('OPHTHALMOLOGY', 'Ophthalmology', 'Ophthalmology', 'ophthalmology', 'Eye', 'text-blue-600', true, 2, 
 '{"has_vision_test": true, "has_visual_acuity": true}'::jsonb),
('PHYSIOTHERAPY', 'Physiotherapy', 'Physiotherapy', 'physiotherapy', 'Dumbbell', 'text-green-600', true, 3, 
 '{"has_exercises": true, "has_progress_tracking": true}'::jsonb),
-- New specialties using Consultation queue (routed by specialty_code)
('CARDIOLOGY', 'Cardiology', 'Consultation', 'cardiology', 'Heart', 'text-red-600', false, 10, 
 '{"has_ecg": true}'::jsonb),
('ORTHOPAEDICS', 'Orthopaedics', 'Consultation', 'orthopaedics', 'Bone', 'text-gray-600', false, 11, 
 '{}'::jsonb),
('DERMATOLOGY', 'Dermatology', 'Consultation', 'dermatology', 'Hand', 'text-pink-600', false, 12, 
 '{"has_skin_diagram": true}'::jsonb),
('UROLOGY', 'Urology', 'Consultation', 'urology', 'Activity', 'text-purple-600', false, 13, 
 '{}'::jsonb),
('GASTROENTEROLOGY', 'Gastroenterology', 'Consultation', 'gastroenterology', 'Activity', 'text-orange-600', false, 14, 
 '{}'::jsonb),
('NEPHROLOGY', 'Nephrology', 'Consultation', 'nephrology', 'Droplet', 'text-teal-600', false, 15, 
 '{}'::jsonb),
('PAEDIATRICS', 'Paediatrics', 'Consultation', 'paediatrics', 'Baby', 'text-sky-600', false, 16, 
 '{"has_growth_chart": true}'::jsonb),
('NEUROSURGERY', 'Neurosurgery', 'Consultation', 'neurosurgery', 'Brain', 'text-indigo-600', false, 17, 
 '{}'::jsonb),
('NEUROLOGY', 'Neurology', 'Consultation', 'neurology', 'Brain', 'text-violet-600', false, 18, 
 '{}'::jsonb),
('NEUROPSYCHIATRY', 'Neuropsychiatry', 'Consultation', 'neuropsychiatry', 'Brain', 'text-fuchsia-600', false, 19, 
 '{}'::jsonb),
('GENERAL_SURGERY', 'General Surgery', 'Consultation', 'general_surgery', 'Scissors', 'text-slate-600', false, 20, 
 '{}'::jsonb),
('GYNAECOLOGY', 'Gynaecology', 'Consultation', 'gynaecology', 'Heart', 'text-rose-600', false, 21, 
 '{}'::jsonb),
('ORAL_MAXILLOFACIAL', 'Oral & Maxillofacial', 'Consultation', 'oral_maxillofacial', 'Smile', 'text-amber-700', false, 22, 
 '{}'::jsonb),
('PULMONOLOGY', 'Pulmonology', 'Consultation', 'pulmonology', 'Wind', 'text-cyan-600', false, 23, 
 '{}'::jsonb),
('ENDOCRINOLOGY', 'Endocrinology', 'Consultation', 'endocrinology', 'Activity', 'text-emerald-600', false, 24, 
 '{}'::jsonb),
('PLASTIC_SURGERY', 'Plastic Surgery', 'Consultation', 'plastic_surgery', 'Sparkles', 'text-pink-500', false, 25, 
 '{}'::jsonb),
('ENT', 'ENT (Ear, Nose, Throat)', 'Consultation', 'ent', 'Ear', 'text-yellow-600', false, 26, 
 '{"has_audiogram": true}'::jsonb)
ON CONFLICT (specialty_code) DO UPDATE SET
  specialty_name = EXCLUDED.specialty_name,
  queue_department = EXCLUDED.queue_department,
  referral_key = EXCLUDED.referral_key,
  icon_name = EXCLUDED.icon_name,
  color_class = EXCLUDED.color_class,
  requires_dedicated_queue = EXCLUDED.requires_dedicated_queue,
  display_order = EXCLUDED.display_order,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = now();

-- =============================================================================
-- PHASE 2: STAFF SPECIALTY ASSIGNMENT
-- =============================================================================

-- Add specialty_code column to staff
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS specialty_code varchar(50);

-- Add FK constraint (with check for existing constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'staff_specialty_code_fkey' 
    AND table_name = 'staff'
  ) THEN
    ALTER TABLE staff 
    ADD CONSTRAINT staff_specialty_code_fkey 
    FOREIGN KEY (specialty_code) 
    REFERENCES specialty_departments(specialty_code);
  END IF;
END $$;

-- Index for quick lookups
DROP INDEX IF EXISTS idx_staff_specialty;
CREATE INDEX idx_staff_specialty 
ON staff(specialty_code) 
WHERE specialty_code IS NOT NULL;

-- =============================================================================
-- TRIGGER: Enforce specialty_code for clinical roles
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_clinical_staff_specialty()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clinical roles MUST have specialty_code when active
  -- Note: All specialists use role='doctor' with specialty_code differentiating them
  IF NEW.role = 'doctor'
     AND NEW.is_active = true
     AND NEW.specialty_code IS NULL
  THEN
    -- Allow insert but log warning - can be made strict later
    RAISE WARNING 'Doctor staff member should have a specialty_code assignment for user %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_clinical_specialty ON staff;
CREATE TRIGGER trg_enforce_clinical_specialty
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION enforce_clinical_staff_specialty();

-- Note: Specialty backfill should be done manually by admin based on actual staff assignments
-- Example: UPDATE staff SET specialty_code = 'DENTAL' WHERE id = '<dentist-staff-id>';

-- =============================================================================
-- PHASE 3: QUEUE SPECIALTY ROUTING
-- =============================================================================

-- Add specialty_code to queue table
ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS specialty_code varchar(50);

-- Add FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'queue_specialty_code_fkey' 
    AND table_name = 'queue'
  ) THEN
    ALTER TABLE queue 
    ADD CONSTRAINT queue_specialty_code_fkey 
    FOREIGN KEY (specialty_code) 
    REFERENCES specialty_departments(specialty_code);
  END IF;
END $$;

-- Index for specialty-aware queue queries
DROP INDEX IF EXISTS idx_queue_specialty_code;
CREATE INDEX idx_queue_specialty_code 
ON queue(specialty_code, location, status) 
WHERE specialty_code IS NOT NULL;

-- =============================================================================
-- TRIGGER: Auto-populate queue.specialty_code
-- =============================================================================

CREATE OR REPLACE FUNCTION set_queue_specialty_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If specialty_code not provided, derive from assigned_to staff
  IF NEW.specialty_code IS NULL AND NEW.assigned_to IS NOT NULL THEN
    SELECT specialty_code INTO NEW.specialty_code
    FROM staff 
    WHERE id = NEW.assigned_to AND specialty_code IS NOT NULL;
  END IF;
  
  -- Fallback: derive from encounter's attending_doctor_id
  IF NEW.specialty_code IS NULL AND NEW.encounter_id IS NOT NULL THEN
    SELECT s.specialty_code INTO NEW.specialty_code
    FROM visits v
    JOIN staff s ON s.id = v.attending_doctor_id
    WHERE v.id = NEW.encounter_id 
      AND s.specialty_code IS NOT NULL;
  END IF;
  
  -- Fallback: derive from location if it's a dedicated specialty queue
  IF NEW.specialty_code IS NULL AND NEW.location IS NOT NULL THEN
    SELECT sd.specialty_code INTO NEW.specialty_code
    FROM specialty_departments sd
    WHERE sd.queue_department = NEW.location::TEXT
      AND sd.requires_dedicated_queue = true
      AND sd.is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_queue_specialty ON queue;
CREATE TRIGGER trg_set_queue_specialty
  BEFORE INSERT OR UPDATE ON queue
  FOR EACH ROW
  EXECUTE FUNCTION set_queue_specialty_code();

-- Backfill existing queue entries for dedicated specialty queues
UPDATE queue SET specialty_code = 'DENTAL' 
WHERE location::TEXT = 'Dental' AND specialty_code IS NULL;

UPDATE queue SET specialty_code = 'OPHTHALMOLOGY' 
WHERE location::TEXT = 'Ophthalmology' AND specialty_code IS NULL;

UPDATE queue SET specialty_code = 'PHYSIOTHERAPY' 
WHERE location::TEXT = 'Physiotherapy' AND specialty_code IS NULL;

-- =============================================================================
-- PHASE 4: REFERRAL ROUTING (DYNAMIC, NOT ENUM-BASED)
-- =============================================================================

-- Add target_specialty_code to clinical_requests
ALTER TABLE clinical_requests 
ADD COLUMN IF NOT EXISTS target_specialty_code varchar(50);

-- Add FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clinical_requests_target_specialty_fkey' 
    AND table_name = 'clinical_requests'
  ) THEN
    ALTER TABLE clinical_requests 
    ADD CONSTRAINT clinical_requests_target_specialty_fkey 
    FOREIGN KEY (target_specialty_code) 
    REFERENCES specialty_departments(specialty_code);
  END IF;
END $$;

-- Index for referral queries
DROP INDEX IF EXISTS idx_clinical_requests_target_specialty;
CREATE INDEX idx_clinical_requests_target_specialty 
ON clinical_requests(target_specialty_code, status) 
WHERE request_type = 'Referral';

-- Add referral audit columns
ALTER TABLE clinical_requests
ADD COLUMN IF NOT EXISTS referral_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS referral_accepted_by uuid REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS referral_rejected_at timestamptz,
ADD COLUMN IF NOT EXISTS referral_rejected_by uuid REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS referral_rejection_reason text;

-- Add encounter_id to clinical_requests (for encounter-centric views)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinical_requests' AND column_name = 'encounter_id'
  ) THEN
    ALTER TABLE clinical_requests ADD COLUMN encounter_id uuid REFERENCES visits(id);
  END IF;
END $$;

-- Migrate existing referrals to use target_specialty_code
UPDATE clinical_requests 
SET target_specialty_code = 'DENTAL' 
WHERE specialty_module = 'dental' AND target_specialty_code IS NULL;

UPDATE clinical_requests 
SET target_specialty_code = 'OPHTHALMOLOGY' 
WHERE specialty_module = 'ophthalmology' AND target_specialty_code IS NULL;

UPDATE clinical_requests 
SET target_specialty_code = 'PHYSIOTHERAPY' 
WHERE specialty_module = 'physiotherapy' AND target_specialty_code IS NULL;

-- =============================================================================
-- PHASE 5: SECURITY FUNCTIONS (SECURITY DEFINER + SET search_path)
-- =============================================================================

-- Access control function
CREATE OR REPLACE FUNCTION can_access_specialty(p_specialty_code varchar)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_role TEXT;
  v_user_specialty TEXT;
BEGIN
  SELECT role::TEXT, specialty_code INTO v_user_role, v_user_specialty
  FROM staff
  WHERE user_id = auth.uid();
  
  -- Admin roles can access ALL specialties
  IF v_user_role IN ('super_admin', 'admin', 'medical_director') THEN
    RETURN TRUE;
  END IF;
  
  -- Clinical staff can only access their assigned specialty
  RETURN v_user_specialty IS NOT NULL AND v_user_specialty = p_specialty_code;
END;
$$;

-- Aggregated dashboard RPC
CREATE OR REPLACE FUNCTION get_specialty_dashboard(p_specialty_code varchar)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_config RECORD;
  v_stats jsonb;
  v_queue jsonb;
  v_referrals jsonb;
  v_procedures jsonb;
  v_exams jsonb;
  v_history jsonb;
BEGIN
  -- Access control check
  IF NOT can_access_specialty(p_specialty_code) THEN
    RAISE EXCEPTION 'Access denied to specialty: %', p_specialty_code;
  END IF;

  -- Get specialty configuration
  SELECT * INTO v_config 
  FROM specialty_departments 
  WHERE specialty_code = p_specialty_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Specialty not found: %', p_specialty_code;
  END IF;

  -- Aggregate stats (including procedures and exams counts)
  SELECT jsonb_build_object(
    'waiting', COUNT(*) FILTER (WHERE q.status = 'Waiting'),
    'in_progress', COUNT(*) FILTER (WHERE q.status = 'In Progress'),
    'completed_today', COUNT(*) FILTER (WHERE q.status = 'Completed' AND q.completed_at::date = CURRENT_DATE),
    'pending_referrals', (
      SELECT COUNT(*) FROM clinical_requests 
      WHERE target_specialty_code = p_specialty_code 
        AND request_type = 'Referral' 
        AND status IN ('Pending', 'Approved')
    ),
    'pending_procedures', (
      SELECT COUNT(*) FROM clinical_requests 
      WHERE target_specialty_code = p_specialty_code 
        AND request_type = 'Procedure' 
        AND status IN ('Pending', 'Approved')
    ),
    'total_exams', (
      SELECT COUNT(*) FROM consultations 
      WHERE specialty_code = p_specialty_code 
        AND consultation_date::date >= CURRENT_DATE - INTERVAL '30 days'
    )
  ) INTO v_stats
  FROM queue q
  WHERE q.specialty_code = p_specialty_code 
    OR (q.location::TEXT = v_config.queue_department AND v_config.requires_dedicated_queue = true);

  -- Get queue (limited to 50 for performance)
  SELECT COALESCE(jsonb_agg(row_to_json(sq.*) ORDER BY sq.created_at), '[]'::jsonb) INTO v_queue
  FROM (
    SELECT q.id, q.ticket_number, q.status, q.priority, q.created_at, q.called_at,
           p.first_name, p.surname AS last_name, p.emr_number, p.patient_id,
           s_assigned.first_name AS assigned_doctor_first, s_assigned.last_name AS assigned_doctor_last
    FROM queue q
    JOIN patients p ON p.id = q.patient_id
    LEFT JOIN staff s_assigned ON s_assigned.id = q.assigned_to
    WHERE (q.specialty_code = p_specialty_code 
           OR (q.location::TEXT = v_config.queue_department AND v_config.requires_dedicated_queue = true))
      AND q.status IN ('Waiting', 'Called', 'In Progress')
    ORDER BY q.created_at
    LIMIT 50
  ) sq;

  -- Get pending referrals (limited to 20)
  SELECT COALESCE(jsonb_agg(row_to_json(sr.*) ORDER BY sr.created_at DESC), '[]'::jsonb) INTO v_referrals
  FROM (
    SELECT cr.id, cr.request_number, cr.status, cr.urgency, cr.clinical_reason, cr.created_at,
           p.first_name, p.surname, p.emr_number,
           s.first_name AS requesting_doctor_first, s.last_name AS requesting_doctor_last
    FROM clinical_requests cr
    JOIN patients p ON p.id = cr.patient_id
    LEFT JOIN staff s ON s.id = cr.requesting_doctor_id
    WHERE cr.target_specialty_code = p_specialty_code 
      AND cr.request_type = 'Referral'
      AND cr.status IN ('Pending', 'Approved', 'In_Progress')
    ORDER BY cr.created_at DESC
    LIMIT 20
  ) sr;

  -- Get pending procedures (limited to 20)
  SELECT COALESCE(jsonb_agg(row_to_json(sp.*) ORDER BY sp.created_at DESC), '[]'::jsonb) INTO v_procedures
  FROM (
    SELECT cr.id, cr.request_number, 
           COALESCE(cr.procedure_name, 'Procedure') AS procedure_name,
           cr.request_type AS procedure_type,
           cr.status, cr.urgency, cr.clinical_reason, cr.created_at,
           p.first_name, p.surname, p.emr_number,
           s.first_name AS requesting_doctor_first, s.last_name AS requesting_doctor_last
    FROM clinical_requests cr
    JOIN patients p ON p.id = cr.patient_id
    LEFT JOIN staff s ON s.id = cr.requesting_doctor_id
    WHERE cr.target_specialty_code = p_specialty_code 
      AND cr.request_type = 'Procedure'
      AND cr.status IN ('Pending', 'Approved', 'In_Progress', 'Scheduled')
    ORDER BY cr.created_at DESC
    LIMIT 20
  ) sp;

  -- Get recent exams/consultations (limited to 20)
  SELECT COALESCE(jsonb_agg(row_to_json(se.*) ORDER BY se.created_at DESC), '[]'::jsonb) INTO v_exams
  FROM (
    SELECT c.consultation_id AS id, 
           'Consultation' AS exam_type,
           c.status,
           c.examination_findings AS findings,
           c.consultation_date AS created_at,
           c.consultation_date AS completed_at,
           p.first_name, p.surname, p.emr_number,
           s.first_name AS examiner_first, s.last_name AS examiner_last
    FROM consultations c
    JOIN patients p ON p.patient_id = c.patient_id
    LEFT JOIN staff s ON s.staff_id = c.doctor_id
    WHERE c.specialty_code = p_specialty_code
    ORDER BY c.consultation_date DESC
    LIMIT 20
  ) se;

  -- Get consultation history for this specialty (completed consultations with more detail)
  SELECT COALESCE(jsonb_agg(row_to_json(sh.*) ORDER BY sh.consultation_date DESC), '[]'::jsonb) INTO v_history
  FROM (
    SELECT c.consultation_id AS id,
           c.consultation_date,
           c.chief_complaint,
           c.diagnosis,
           c.status,
           p.first_name, p.surname AS last_name, p.emr_number, p.patient_id,
           s.first_name AS doctor_first, s.last_name AS doctor_last,
           c.visit_id, c.encounter_id
    FROM consultations c
    JOIN patients p ON p.patient_id = c.patient_id
    LEFT JOIN staff s ON s.staff_id = c.doctor_id
    WHERE c.specialty_code = p_specialty_code
    ORDER BY c.consultation_date DESC
    LIMIT 50
  ) sh;

  -- Build final result
  v_result := jsonb_build_object(
    'config', jsonb_build_object(
      'specialty_code', v_config.specialty_code,
      'specialty_name', v_config.specialty_name,
      'icon_name', v_config.icon_name,
      'color_class', v_config.color_class,
      'feature_flags', v_config.feature_flags
    ),
    'stats', v_stats,
    'queue', v_queue,
    'referrals', v_referrals,
    'procedures', v_procedures,
    'exams', v_exams,
    'history', COALESCE(v_history, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- PHASE 6: REFERRAL ACTIONS (Accept/Reject with Audit)
-- =============================================================================

-- Accept a specialty referral
CREATE OR REPLACE FUNCTION accept_specialty_referral(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
  v_specialty_code varchar(50);
BEGIN
  -- Get current staff
  SELECT id, specialty_code INTO v_staff_id, v_specialty_code
  FROM staff WHERE user_id = auth.uid();
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found for current user';
  END IF;
  
  -- Update referral with audit fields
  UPDATE clinical_requests SET
    status = 'In_Progress',
    referral_accepted_at = now(),
    referral_accepted_by = v_staff_id,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_request_id
    AND request_type = 'Referral'
    AND target_specialty_code = v_specialty_code
    AND status IN ('Pending', 'Approved')
  RETURNING jsonb_build_object(
    'id', id, 
    'status', status, 
    'accepted_at', referral_accepted_at,
    'accepted_by', v_staff_id
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Referral not found or access denied';
  END IF;
  
  RETURN v_result;
END;
$$;

-- Reject a specialty referral
CREATE OR REPLACE FUNCTION reject_specialty_referral(
  p_request_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
  v_specialty_code varchar(50);
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;
  
  SELECT id, specialty_code INTO v_staff_id, v_specialty_code
  FROM staff WHERE user_id = auth.uid();
  
  UPDATE clinical_requests SET
    status = 'Rejected',
    referral_rejected_at = now(),
    referral_rejected_by = v_staff_id,
    referral_rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_request_id
    AND request_type = 'Referral'
    AND target_specialty_code = v_specialty_code
    AND status IN ('Pending', 'Approved')
  RETURNING jsonb_build_object(
    'id', id, 
    'status', status, 
    'rejected_at', referral_rejected_at,
    'rejected_by', v_staff_id,
    'reason', referral_rejection_reason
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Referral not found or access denied';
  END IF;
  
  RETURN v_result;
END;
$$;

-- =============================================================================
-- PHASE 7: SESSION ACTIONS (Start/Complete with Audit)
-- =============================================================================

-- Start a specialty session (queue → in-progress)
-- Allows: Admins (any queue), Doctors (their specialty or unassigned)
CREATE OR REPLACE FUNCTION start_specialty_session(p_queue_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
  v_staff_role text;
  v_specialty_code varchar(50);
  v_is_admin boolean;
BEGIN
  SELECT id, role::text, specialty_code INTO v_staff_id, v_staff_role, v_specialty_code
  FROM staff WHERE user_id = auth.uid();
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found for current user';
  END IF;
  
  -- Admins can start any session
  v_is_admin := v_staff_role IN ('super_admin', 'admin', 'medical_director');
  
  UPDATE queue SET
    status = 'In Progress',
    called_at = now(),
    assigned_to = v_staff_id,
    updated_at = now()
  WHERE id = p_queue_id
    AND (
      v_is_admin  -- Admins can start any session
      OR specialty_code = v_specialty_code  -- Doctors can start their specialty
      OR specialty_code IS NULL  -- Anyone can start unassigned queue entries
    )
    AND status IN ('Waiting', 'Called')
  RETURNING jsonb_build_object(
    'queue_id', id,
    'status', status,
    'patient_id', patient_id,
    'started_at', called_at,
    'assigned_to', assigned_to
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Queue entry not found or access denied';
  END IF;
  
  RETURN v_result;
END;
$$;

-- Complete a specialty session
CREATE OR REPLACE FUNCTION complete_specialty_session(
  p_queue_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
BEGIN
  SELECT id INTO v_staff_id FROM staff WHERE user_id = auth.uid();
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found for current user';
  END IF;
  
  UPDATE queue SET
    status = 'Completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_queue_id
    AND assigned_to = v_staff_id
    AND status = 'In Progress'
  RETURNING jsonb_build_object(
    'queue_id', id,
    'status', status,
    'completed_at', completed_at
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Queue entry not found, not assigned to you, or not in progress';
  END IF;
  
  RETURN v_result;
END;
$$;

-- =============================================================================
-- PHASE 8: ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on specialty_departments
ALTER TABLE specialty_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialty_departments FORCE ROW LEVEL SECURITY;

-- Drop existing policies for clean state
DROP POLICY IF EXISTS specialty_departments_read ON specialty_departments;
DROP POLICY IF EXISTS specialty_departments_admin_write ON specialty_departments;

-- Read: All authenticated users can see active specialties, admins see all
CREATE POLICY specialty_departments_read ON specialty_departments
  FOR SELECT USING (
    is_active = true 
    OR auth.uid() IN (SELECT user_id FROM staff WHERE role IN ('super_admin', 'admin'))
  );

-- Write: Only admins can modify
CREATE POLICY specialty_departments_admin_write ON specialty_departments
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM staff WHERE role IN ('super_admin', 'admin'))
  );

-- =============================================================================
-- QUEUE RLS POLICIES (Specialty-filtered)
-- =============================================================================

-- Drop existing specialty policies
DROP POLICY IF EXISTS queue_specialty_select ON queue;
DROP POLICY IF EXISTS queue_specialty_insert ON queue;
DROP POLICY IF EXISTS queue_specialty_update ON queue;

-- SELECT: Access based on specialty
CREATE POLICY queue_specialty_select ON queue
  FOR SELECT USING (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );

-- INSERT: Can create queue entries for own specialty
CREATE POLICY queue_specialty_insert ON queue
  FOR INSERT WITH CHECK (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );

-- UPDATE: Can update queue entries for own specialty
CREATE POLICY queue_specialty_update ON queue
  FOR UPDATE USING (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );

-- =============================================================================
-- CLINICAL_REQUESTS RLS POLICIES (Target specialty filtered)
-- =============================================================================

-- Drop existing specialty policies
DROP POLICY IF EXISTS referrals_specialty_select ON clinical_requests;
DROP POLICY IF EXISTS referrals_specialty_update ON clinical_requests;

-- SELECT: Access referrals to your specialty
CREATE POLICY referrals_specialty_select ON clinical_requests
  FOR SELECT USING (
    request_type != 'Referral'
    OR target_specialty_code IS NULL
    OR can_access_specialty(target_specialty_code)
  );

-- UPDATE: Can update referrals to your specialty
CREATE POLICY referrals_specialty_update ON clinical_requests
  FOR UPDATE USING (
    target_specialty_code IS NULL
    OR can_access_specialty(target_specialty_code)
  );

-- =============================================================================
-- SPECIALTY QUEUE VIEW (for dashboard)
-- =============================================================================

CREATE OR REPLACE VIEW specialty_queue_view AS
SELECT 
  q.id,
  q.ticket_number,
  q.status,
  q.priority,
  q.specialty_code,
  q.location,
  q.created_at,
  q.called_at,
  q.completed_at,
  q.assigned_to,
  sd.specialty_name,
  sd.icon_name,
  sd.color_class,
  p.first_name || ' ' || p.surname AS patient_name,
  p.emr_number,
  p.patient_id AS display_patient_id
FROM queue q
LEFT JOIN specialty_departments sd ON sd.specialty_code = q.specialty_code
JOIN patients p ON p.id = q.patient_id
WHERE q.status IN ('Waiting', 'In Progress', 'Called');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE specialty_departments IS 'Single source of truth for all specialty configurations. Adding a new specialty = inserting a row here.';
COMMENT ON COLUMN specialty_departments.specialty_code IS 'Unique code: DENTAL, CARDIOLOGY, etc.';
COMMENT ON COLUMN specialty_departments.queue_department IS 'Maps to queue location (existing enum value)';
COMMENT ON COLUMN specialty_departments.requires_dedicated_queue IS 'True = uses dedicated queue location (Dental, Ophthalmology, Physiotherapy)';
COMMENT ON COLUMN specialty_departments.feature_flags IS 'JSON flags for specialty-specific UI capabilities';

COMMENT ON FUNCTION can_access_specialty(varchar) IS 'Checks if current user can access the given specialty. Admins can access all.';
COMMENT ON FUNCTION get_specialty_dashboard(varchar) IS 'Returns aggregated dashboard data for a specialty in ONE call.';
COMMENT ON FUNCTION accept_specialty_referral(uuid, text) IS 'Accept a referral with audit trail (timestamp + user).';
COMMENT ON FUNCTION reject_specialty_referral(uuid, text) IS 'Reject a referral with reason and audit trail.';
COMMENT ON FUNCTION start_specialty_session(uuid) IS 'Start a specialty session (queue → in-progress).';
COMMENT ON FUNCTION complete_specialty_session(uuid, text) IS 'Complete a specialty session with optional notes.';

-- =============================================================================
-- VERIFICATION QUERIES (Run manually to verify migration)
-- =============================================================================

-- Test 1: Verify specialty_departments has all records
-- SELECT COUNT(*) FROM specialty_departments WHERE is_active = true;
-- Expected: 20

-- Test 2: Verify staff FK works
-- SELECT s.id, s.first_name, s.specialty_code, sd.specialty_name
-- FROM staff s
-- LEFT JOIN specialty_departments sd ON sd.specialty_code = s.specialty_code
-- WHERE s.specialty_code IS NOT NULL;

-- Test 3: Verify indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'specialty_departments';

-- Test 4: Verify RLS is enabled
-- SELECT relname, relrowsecurity FROM pg_class 
-- WHERE relname IN ('specialty_departments', 'queue', 'clinical_requests');
-- =============================================================================
-- PHASE 9: LINK SPECIALTY DEPARTMENTS TO SPECIALTY-SPECIFIC TABLES
-- =============================================================================
-- Note: These ALTER TABLE statements only run if the tables exist.
-- The specialty clinic tables are created by their respective migrations.

-- Add specialty_code and encounter_id to dental_exams (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_exams' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'dental_exams' AND column_name = 'specialty_code'
    ) THEN
      ALTER TABLE dental_exams ADD COLUMN specialty_code varchar(50) DEFAULT 'DENTAL';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'dental_exams' AND column_name = 'encounter_id'
    ) THEN
      ALTER TABLE dental_exams ADD COLUMN encounter_id uuid REFERENCES visits(id);
    END IF;
  END IF;
END $$;

-- Add specialty_code and encounter_id to dental_procedures (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_procedures' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'dental_procedures' AND column_name = 'specialty_code'
    ) THEN
      ALTER TABLE dental_procedures ADD COLUMN specialty_code varchar(50) DEFAULT 'DENTAL';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'dental_procedures' AND column_name = 'encounter_id'
    ) THEN
      ALTER TABLE dental_procedures ADD COLUMN encounter_id uuid REFERENCES visits(id);
    END IF;
  END IF;
END $$;

-- Add encounter_id to dental_chart (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_chart' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'dental_chart' AND column_name = 'encounter_id'
    ) THEN
      ALTER TABLE dental_chart ADD COLUMN encounter_id uuid REFERENCES visits(id);
    END IF;
  END IF;
END $$;

-- Add specialty_code and encounter_id to eye_exams (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eye_exams' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'eye_exams' AND column_name = 'specialty_code'
    ) THEN
      ALTER TABLE eye_exams ADD COLUMN specialty_code varchar(50) DEFAULT 'OPHTHALMOLOGY';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'eye_exams' AND column_name = 'encounter_id'
    ) THEN
      ALTER TABLE eye_exams ADD COLUMN encounter_id uuid REFERENCES visits(id);
    END IF;
  END IF;
END $$;

-- Add specialty_code and encounter_id to physio_assessments (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_assessments' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'physio_assessments' AND column_name = 'specialty_code'
    ) THEN
      ALTER TABLE physio_assessments ADD COLUMN specialty_code varchar(50) DEFAULT 'PHYSIOTHERAPY';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'physio_assessments' AND column_name = 'encounter_id'
    ) THEN
      ALTER TABLE physio_assessments ADD COLUMN encounter_id uuid REFERENCES visits(id);
    END IF;
  END IF;
END $$;

-- Add specialty_code to physio_sessions (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_sessions' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'physio_sessions' AND column_name = 'specialty_code'
    ) THEN
      ALTER TABLE physio_sessions ADD COLUMN specialty_code varchar(50) DEFAULT 'PHYSIOTHERAPY';
    END IF;
  END IF;
END $$;

-- Add specialty_code to physio_plans (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_plans' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'physio_plans' AND column_name = 'specialty_code'
    ) THEN
      ALTER TABLE physio_plans ADD COLUMN specialty_code varchar(50) DEFAULT 'PHYSIOTHERAPY';
    END IF;
  END IF;
END $$;

-- Add specialty_code to consultations (for generic specialties)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultations' AND column_name = 'specialty_code'
  ) THEN
    ALTER TABLE consultations ADD COLUMN specialty_code varchar(50);
  END IF;
END $$;

-- Add encounter_id to consultations (for encounter-centric views)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultations' AND column_name = 'encounter_id'
  ) THEN
    ALTER TABLE consultations ADD COLUMN encounter_id uuid REFERENCES visits(id);
  END IF;
END $$;

-- =============================================================================
-- PHASE 10: LINK TO SPECIALTY TEMPLATES (Migration 126)
-- =============================================================================

-- Add FK from specialty_departments to specialty_templates (one-to-one relationship)
-- Only adds if specialty_templates table exists (migration 126 must run first for FK)
DO $$
BEGIN
  -- Only add template_id column if specialty_templates table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'specialty_templates' AND table_schema = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'specialty_departments' AND column_name = 'template_id'
    ) THEN
      ALTER TABLE specialty_departments 
      ADD COLUMN template_id uuid REFERENCES specialty_templates(id);
    END IF;
  ELSE
    -- Add column without FK if specialty_templates doesn't exist yet
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'specialty_departments' AND column_name = 'template_id'
    ) THEN
      ALTER TABLE specialty_departments 
      ADD COLUMN template_id uuid;
      RAISE NOTICE 'template_id added without FK - run migration 126 to add specialty_templates table';
    END IF;
  END IF;
END $$;

-- Add exam_table_name to specify which table stores exams for this specialty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'specialty_departments' AND column_name = 'exam_table_name'
  ) THEN
    ALTER TABLE specialty_departments 
    ADD COLUMN exam_table_name varchar(100);
  END IF;
END $$;

-- Update specialty departments with their exam table mappings
UPDATE specialty_departments SET exam_table_name = 'dental_exams' WHERE specialty_code = 'DENTAL';
UPDATE specialty_departments SET exam_table_name = 'eye_exams' WHERE specialty_code = 'OPHTHALMOLOGY';
UPDATE specialty_departments SET exam_table_name = 'physio_assessments' WHERE specialty_code = 'PHYSIOTHERAPY';
-- Other specialties use the generic consultations table
UPDATE specialty_departments SET exam_table_name = 'consultations' WHERE exam_table_name IS NULL;

-- =============================================================================
-- PHASE 11: SPECIALTY EXAMINATION COUNTS VIEW (ENCOUNTER-CENTRIC)
-- =============================================================================
-- Only counts exams from Active or Closed encounters (not Created/Cancelled)
-- This ensures statistics represent valid clinical activity
-- Note: Uses dynamic SQL to handle cases where specialty tables don't exist yet

DO $$
BEGIN
  -- Drop and recreate view
  DROP VIEW IF EXISTS specialty_examination_stats;
  
  -- Create a simpler view that only uses consultations (always exists)
  -- Specialty-specific exam counts will be 0 until their tables are created
  EXECUTE '
    CREATE VIEW specialty_examination_stats AS
    SELECT 
      sd.specialty_code,
      sd.specialty_name,
      sd.exam_table_name,
      sd.icon_name,
      sd.color_class,
      CASE 
        WHEN sd.exam_table_name = ''consultations'' THEN (
          SELECT COUNT(*) FROM consultations c 
          LEFT JOIN visits v ON v.id = c.encounter_id 
          WHERE c.specialty_code = sd.specialty_code 
            AND c.consultation_date::date = CURRENT_DATE 
            AND (v.status IS NULL OR v.status IN (''Active'', ''Closed''))
        )
        ELSE 0
      END AS exams_today,
      CASE 
        WHEN sd.exam_table_name = ''consultations'' THEN (
          SELECT COUNT(*) FROM consultations c 
          LEFT JOIN visits v ON v.id = c.encounter_id 
          WHERE c.specialty_code = sd.specialty_code 
            AND c.consultation_date >= CURRENT_DATE - INTERVAL ''7 days'' 
            AND (v.status IS NULL OR v.status IN (''Active'', ''Closed''))
        )
        ELSE 0
      END AS exams_week,
      CASE 
        WHEN sd.exam_table_name = ''consultations'' THEN (
          SELECT COUNT(*) FROM consultations c 
          LEFT JOIN visits v ON v.id = c.encounter_id 
          WHERE c.specialty_code = sd.specialty_code 
            AND c.consultation_date >= CURRENT_DATE - INTERVAL ''30 days'' 
            AND (v.status IS NULL OR v.status IN (''Active'', ''Closed''))
        )
        ELSE 0
      END AS exams_month
    FROM specialty_departments sd
    WHERE sd.is_active = true
    ORDER BY sd.display_order
  ';
END $$;

COMMENT ON VIEW specialty_examination_stats IS 'Aggregated examination statistics for each specialty clinic. Returns 0 for specialties whose exam tables are not yet created.';

-- =============================================================================
-- PHASE 12: UNIFIED SPECIALTY PATIENT VIEW
-- =============================================================================

-- Create a unified view of all patients across all specialty clinics
-- ENCOUNTER-CENTRIC: All records linked to encounters (visits)
-- Note: Only includes consultations for now. Specialty-specific views added by their migrations.

DROP VIEW IF EXISTS specialty_patients_unified;
CREATE VIEW specialty_patients_unified AS
-- All specialties using consultations table (generic and those with specialty_code)
SELECT 
  c.specialty_code,
  COALESCE(sd.specialty_name, c.specialty_code) AS specialty_name,
  c.patient_id AS patient_id,
  p.id AS patient_uuid,
  c.encounter_id,
  v.visit_type,
  v.current_stage AS encounter_stage,
  v.status AS encounter_status,
  p.first_name,
  p.surname,
  p.emr_number,
  c.consultation_id::text AS record_id,
  'consultations' AS source_table,
  COALESCE(c.complaints, c.subjective) AS chief_complaint,
  COALESCE(c.diagnosis_text, array_to_string(c.diagnosis, ', ')) AS diagnosis,
  c.status::text,
  c.consultation_date AS created_at,
  c.doctor_id AS created_by
FROM consultations c
LEFT JOIN specialty_departments sd ON sd.specialty_code = c.specialty_code
LEFT JOIN visits v ON v.id = c.encounter_id
LEFT JOIN patients p ON p.patient_id = c.patient_id
WHERE c.specialty_code IS NOT NULL;

COMMENT ON VIEW specialty_patients_unified IS 'Unified view of specialty clinic patients. Specialty-specific exam tables (dental, eye, physio) join in when their migrations run.';

-- =============================================================================
-- PHASE 13: SPECIALTY PROCEDURE REQUEST VIEW (ENCOUNTER-CENTRIC)
-- =============================================================================

DROP VIEW IF EXISTS specialty_procedures_view;
CREATE VIEW specialty_procedures_view AS
SELECT 
  sd.specialty_code,
  sd.specialty_name,
  sd.icon_name,
  sd.color_class,
  cr.id AS request_id,
  cr.request_number,
  cr.encounter_id,
  v.visit_type,
  v.current_stage AS encounter_stage,
  v.status AS encounter_status,
  cr.procedure_name,
  cr.request_type AS procedure_type,
  cr.status,
  cr.urgency,
  cr.clinical_reason,
  cr.created_at AS requested_at,
  cr.scheduled_date,
  p.first_name AS patient_first_name,
  p.surname AS patient_last_name,
  p.emr_number,
  s.first_name AS requested_by_first,
  s.last_name AS requested_by_last
FROM clinical_requests cr
JOIN specialty_departments sd ON sd.specialty_code = cr.target_specialty_code
LEFT JOIN visits v ON v.id = cr.encounter_id
JOIN patients p ON p.id = cr.patient_id
LEFT JOIN staff s ON s.id = cr.requesting_doctor_id
WHERE cr.request_type = 'Procedure'
  AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
ORDER BY cr.urgency DESC, cr.created_at;

COMMENT ON VIEW specialty_procedures_view IS 'All specialty procedure requests with patient, staff, and encounter details (encounter-centric)';

-- =============================================================================
-- PHASE 14: DENTAL-SPECIFIC VIEWS (ENCOUNTER-CENTRIC)
-- =============================================================================
-- Only created if dental tables exist

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_chart' AND table_schema = 'public') THEN
    DROP VIEW IF EXISTS dental_chart_summary;
    EXECUTE '
      CREATE VIEW dental_chart_summary AS
      SELECT 
        dc.patient_id,
        dc.patient_uuid,
        dc.encounter_id,
        v.visit_type,
        v.status AS encounter_status,
        p.first_name,
        p.surname,
        p.emr_number,
        COUNT(*) FILTER (WHERE dc.tooth_status = ''Present'') AS teeth_present,
        COUNT(*) FILTER (WHERE dc.tooth_status = ''Missing'') AS teeth_missing,
        COUNT(*) FILTER (WHERE dc.condition = ''Caries'') AS teeth_with_caries,
        COUNT(*) FILTER (WHERE dc.condition = ''Filled'') AS teeth_filled,
        COUNT(*) FILTER (WHERE dc.condition = ''Crown'') AS teeth_with_crown,
        COUNT(*) FILTER (WHERE dc.mobility_grade >= 2) AS mobile_teeth,
        MAX(dc.recorded_at) AS last_charted
      FROM dental_chart dc
      LEFT JOIN visits v ON v.id = dc.encounter_id
      LEFT JOIN patients p ON p.id = dc.patient_uuid OR p.patient_id = dc.patient_id
      GROUP BY dc.patient_id, dc.patient_uuid, dc.encounter_id, v.visit_type, v.status, 
               p.first_name, p.surname, p.emr_number
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_procedures' AND table_schema = 'public') THEN
    DROP VIEW IF EXISTS dental_procedures_summary;
    EXECUTE '
      CREATE VIEW dental_procedures_summary AS
      SELECT 
        dp.patient_id,
        dp.encounter_id,
        v.visit_type,
        v.status AS encounter_status,
        p.first_name,
        p.surname,
        p.emr_number,
        COUNT(*) AS total_procedures,
        COUNT(*) FILTER (WHERE dp.status = ''Completed'') AS completed_procedures,
        COUNT(*) FILTER (WHERE dp.status = ''Pending'') AS pending_procedures,
        SUM(dp.fee) AS total_fees,
        MAX(dp.procedure_date) AS last_procedure_date
      FROM dental_procedures dp
      LEFT JOIN visits v ON v.id = dp.encounter_id
      LEFT JOIN patients p ON p.patient_id = dp.patient_id
      GROUP BY dp.patient_id, dp.encounter_id, v.visit_type, v.status, 
               p.first_name, p.surname, p.emr_number
    ';
  END IF;
END $$;

-- =============================================================================
-- PHASE 15: OPHTHALMOLOGY-SPECIFIC VIEWS (ENCOUNTER-CENTRIC)
-- =============================================================================
-- Only created if eye_exams table exists

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eye_exams' AND table_schema = 'public') THEN
    DROP VIEW IF EXISTS eye_exam_summary;
    EXECUTE '
      CREATE VIEW eye_exam_summary AS
      SELECT 
        ee.patient_id,
        ee.patient_uuid,
        ee.encounter_id,
        v.visit_type,
        v.status AS encounter_status,
        p.first_name,
        p.surname,
        p.emr_number,
        ee.va_right_aided,
        ee.va_left_aided,
        ee.bcva_right,
        ee.bcva_left,
        ee.iop_right,
        ee.iop_left,
        CONCAT(
          CASE WHEN ee.rx_right_sphere >= 0 THEN ''+'' ELSE '''' END,
          ee.rx_right_sphere, ''/'',
          ee.rx_right_cylinder, ''x'',
          ee.rx_right_axis
        ) AS rx_right,
        CONCAT(
          CASE WHEN ee.rx_left_sphere >= 0 THEN ''+'' ELSE '''' END,
          ee.rx_left_sphere, ''/'',
          ee.rx_left_cylinder, ''x'',
          ee.rx_left_axis
        ) AS rx_left,
        ee.final_diagnosis,
        ee.glasses_prescribed,
        ee.surgery_recommended,
        ee.created_at AS exam_date
      FROM eye_exams ee
      LEFT JOIN visits v ON v.id = ee.encounter_id
      LEFT JOIN patients p ON p.id = ee.patient_uuid OR p.patient_id = ee.patient_id
    ';
  END IF;
END $$;

-- =============================================================================
-- PHASE 16: PHYSIOTHERAPY-SPECIFIC VIEWS (ENCOUNTER-CENTRIC)
-- =============================================================================
-- Only created if physio tables exist

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_assessments' AND table_schema = 'public') THEN
    DROP VIEW IF EXISTS physio_patient_journey;
    EXECUTE '
      CREATE VIEW physio_patient_journey AS
      SELECT 
        pa.patient_id,
        pa.encounter_id,
        v.visit_type,
        v.status AS encounter_status,
        p.first_name,
        p.surname,
        p.emr_number,
        pa.assessment_id,
        pa.chief_complaint,
        pa.physio_diagnosis,
        pa.pain_score AS initial_pain,
        pa.estimated_sessions,
        pa.status AS assessment_status,
        pa.created_at AS assessment_date,
        pp.plan_id,
        pp.treatment_approach,
        pp.status AS plan_status,
        (SELECT COUNT(*) FROM physio_sessions ps WHERE ps.plan_id = pp.plan_id) AS sessions_completed,
        (SELECT MAX(session_date) FROM physio_sessions ps WHERE ps.plan_id = pp.plan_id) AS last_session,
        (SELECT pain_score FROM physio_sessions ps WHERE ps.plan_id = pp.plan_id ORDER BY session_date DESC LIMIT 1) AS current_pain,
        pd.discharge_id IS NOT NULL AS is_discharged,
        pd.discharge_date,
        pd.discharge_reason
      FROM physio_assessments pa
      LEFT JOIN visits v ON v.id = pa.encounter_id
      LEFT JOIN patients p ON p.patient_id = pa.patient_id
      LEFT JOIN physio_plans pp ON pp.assessment_id = pa.assessment_id
      LEFT JOIN physio_discharge pd ON pd.assessment_id = pa.assessment_id
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_sessions' AND table_schema = 'public') 
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_assessments' AND table_schema = 'public') THEN
    DROP VIEW IF EXISTS physio_sessions_summary;
    EXECUTE '
      CREATE VIEW physio_sessions_summary AS
      SELECT 
        ps.plan_id,
        pa.patient_id,
        pa.encounter_id,
        v.visit_type,
        v.status AS encounter_status,
        p.first_name,
        p.surname,
        p.emr_number,
        COUNT(*) AS total_sessions,
        COUNT(*) FILTER (WHERE ps.attendance_status = ''Attended'') AS attended,
        COUNT(*) FILTER (WHERE ps.attendance_status = ''Missed'') AS missed,
        COUNT(*) FILTER (WHERE ps.attendance_status = ''Cancelled'') AS cancelled,
        AVG(ps.pain_score_before) AS avg_pain_before,
        AVG(ps.pain_score_after) AS avg_pain_after,
        AVG(ps.duration_minutes) AS avg_session_duration,
        MIN(ps.session_date) AS first_session,
        MAX(ps.session_date) AS last_session
      FROM physio_sessions ps
      JOIN physio_plans pp ON pp.plan_id = ps.plan_id
      JOIN physio_assessments pa ON pa.assessment_id = pp.assessment_id
      LEFT JOIN visits v ON v.id = pa.encounter_id
      LEFT JOIN patients p ON p.patient_id = pa.patient_id
      GROUP BY ps.plan_id, pa.patient_id, pa.encounter_id, v.visit_type, v.status, 
               p.first_name, p.surname, p.emr_number
    ';
  END IF;
END $$;

-- =============================================================================
-- PHASE 17: SPECIALTY DASHBOARD DATA FUNCTION (ENHANCED - ENCOUNTER-CENTRIC)
-- =============================================================================

-- Enhanced function to get comprehensive specialty data
-- ENCOUNTER-CENTRIC: Only counts records from Active/Closed encounters
-- Handles missing specialty tables gracefully by using consultations fallback
CREATE OR REPLACE FUNCTION get_specialty_comprehensive_stats(p_specialty_code varchar)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_config RECORD;
  v_exam_stats jsonb;
  v_table_exists boolean;
BEGIN
  -- Access control
  IF NOT can_access_specialty(p_specialty_code) THEN
    RAISE EXCEPTION 'Access denied to specialty: %', p_specialty_code;
  END IF;

  -- Get config
  SELECT * INTO v_config 
  FROM specialty_departments 
  WHERE specialty_code = p_specialty_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Specialty not found: %', p_specialty_code;
  END IF;

  -- Check which specialty tables exist
  -- For specialties with dedicated tables, fall back to consultations if table doesn't exist
  
  IF p_specialty_code = 'DENTAL' THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_exams' AND table_schema = 'public') INTO v_table_exists;
    IF v_table_exists THEN
      SELECT jsonb_build_object(
        'exams_today', (
          SELECT COUNT(*) FROM dental_exams de 
          LEFT JOIN visits v ON v.id = de.encounter_id 
          WHERE de.created_at::date = CURRENT_DATE AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ),
        'exams_pending', (
          SELECT COUNT(*) FROM dental_exams de 
          LEFT JOIN visits v ON v.id = de.encounter_id 
          WHERE de.status = 'Pending' AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ),
        'procedures_pending', COALESCE((
          SELECT COUNT(*) FROM dental_procedures dp 
          LEFT JOIN visits v ON v.id = dp.encounter_id 
          WHERE dp.status = 'Pending' AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ), 0),
        'procedures_today', COALESCE((
          SELECT COUNT(*) FROM dental_procedures dp 
          LEFT JOIN visits v ON v.id = dp.encounter_id 
          WHERE dp.procedure_date::date = CURRENT_DATE AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ), 0),
        'teeth_charted_today', COALESCE((
          SELECT COUNT(*) FROM dental_chart dc 
          LEFT JOIN visits v ON v.id = dc.encounter_id 
          WHERE dc.recorded_at::date = CURRENT_DATE AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ), 0)
      ) INTO v_exam_stats;
    ELSE
      v_exam_stats := jsonb_build_object('message', 'Dental tables not yet created');
    END IF;
      
  ELSIF p_specialty_code = 'OPHTHALMOLOGY' THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eye_exams' AND table_schema = 'public') INTO v_table_exists;
    IF v_table_exists THEN
      SELECT jsonb_build_object(
        'exams_today', (
          SELECT COUNT(*) FROM eye_exams ee 
          LEFT JOIN visits v ON v.id = ee.encounter_id 
          WHERE ee.created_at::date = CURRENT_DATE AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ),
        'exams_pending', (
          SELECT COUNT(*) FROM eye_exams ee 
          LEFT JOIN visits v ON v.id = ee.encounter_id 
          WHERE ee.status = 'Pending' AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ),
        'glasses_prescribed_today', (
          SELECT COUNT(*) FROM eye_exams ee 
          LEFT JOIN visits v ON v.id = ee.encounter_id 
          WHERE ee.created_at::date = CURRENT_DATE AND ee.glasses_prescribed = true AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ),
        'surgeries_recommended_month', (
          SELECT COUNT(*) FROM eye_exams ee 
          LEFT JOIN visits v ON v.id = ee.encounter_id 
          WHERE ee.created_at >= CURRENT_DATE - INTERVAL '30 days' AND ee.surgery_recommended = true AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        )
      ) INTO v_exam_stats;
    ELSE
      v_exam_stats := jsonb_build_object('message', 'Eye exams table not yet created');
    END IF;
      
  ELSIF p_specialty_code = 'PHYSIOTHERAPY' THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_assessments' AND table_schema = 'public') INTO v_table_exists;
    IF v_table_exists THEN
      SELECT jsonb_build_object(
        'assessments_today', (
          SELECT COUNT(*) FROM physio_assessments pa 
          LEFT JOIN visits v ON v.id = pa.encounter_id 
          WHERE pa.created_at::date = CURRENT_DATE AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ),
        'assessments_pending', (
          SELECT COUNT(*) FROM physio_assessments pa 
          LEFT JOIN visits v ON v.id = pa.encounter_id 
          WHERE pa.status = 'Pending' AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ),
        'sessions_today', COALESCE((
          SELECT COUNT(*) FROM physio_sessions ps
          JOIN physio_plans pp ON pp.plan_id = ps.plan_id
          JOIN physio_assessments pa ON pa.assessment_id = pp.assessment_id
          LEFT JOIN visits v ON v.id = pa.encounter_id
          WHERE ps.session_date::date = CURRENT_DATE AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ), 0),
        'active_plans', COALESCE((
          SELECT COUNT(*) FROM physio_plans pp
          JOIN physio_assessments pa ON pa.assessment_id = pp.assessment_id
          LEFT JOIN visits v ON v.id = pa.encounter_id
          WHERE pp.status = 'Active' AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ), 0),
        'discharges_this_week', COALESCE((
          SELECT COUNT(*) FROM physio_discharge pd
          JOIN physio_assessments pa ON pa.assessment_id = pd.assessment_id
          LEFT JOIN visits v ON v.id = pa.encounter_id
          WHERE pd.discharge_date >= CURRENT_DATE - INTERVAL '7 days' AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
        ), 0)
      ) INTO v_exam_stats;
    ELSE
      v_exam_stats := jsonb_build_object('message', 'Physio tables not yet created');
    END IF;
      
  ELSE
    -- Generic specialty (uses consultations table)
    SELECT jsonb_build_object(
      'consultations_today', (
        SELECT COUNT(*) FROM consultations c 
        LEFT JOIN visits v ON v.id = c.encounter_id 
        WHERE c.specialty_code = p_specialty_code AND c.consultation_date::date = CURRENT_DATE AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
      ),
      'consultations_pending', (
        SELECT COUNT(*) FROM consultations c 
        LEFT JOIN visits v ON v.id = c.encounter_id 
        WHERE c.specialty_code = p_specialty_code AND c.status = 'Pending' AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
      ),
      'consultations_month', (
        SELECT COUNT(*) FROM consultations c 
        LEFT JOIN visits v ON v.id = c.encounter_id 
        WHERE c.specialty_code = p_specialty_code AND c.consultation_date >= CURRENT_DATE - INTERVAL '30 days' AND (v.status IS NULL OR v.status IN ('Active', 'Closed'))
      )
    ) INTO v_exam_stats;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'specialty_code', v_config.specialty_code,
    'specialty_name', v_config.specialty_name,
    'icon_name', v_config.icon_name,
    'color_class', v_config.color_class,
    'exam_table_name', v_config.exam_table_name,
    'feature_flags', v_config.feature_flags,
    'exam_stats', v_exam_stats
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_specialty_comprehensive_stats(varchar) IS 'Returns comprehensive specialty-specific statistics (encounter-centric). Falls back gracefully if specialty tables not yet created.';

-- =============================================================================
-- PHASE 18: INDEXES FOR SPECIALTY-SPECIFIC QUERIES
-- =============================================================================
-- Only creates indexes if the tables exist

DO $$
BEGIN
  -- Dental indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_exams' AND table_schema = 'public') THEN
    DROP INDEX IF EXISTS idx_dental_exams_specialty;
    CREATE INDEX idx_dental_exams_specialty ON dental_exams(created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_procedures' AND table_schema = 'public') THEN
    DROP INDEX IF EXISTS idx_dental_procedures_status;
    CREATE INDEX idx_dental_procedures_status ON dental_procedures(status, procedure_date);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_chart' AND table_schema = 'public') THEN
    DROP INDEX IF EXISTS idx_dental_chart_patient;
    CREATE INDEX idx_dental_chart_patient ON dental_chart(patient_uuid, recorded_at DESC);
  END IF;

  -- Eye exam indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eye_exams' AND table_schema = 'public') THEN
    DROP INDEX IF EXISTS idx_eye_exams_specialty;
    CREATE INDEX idx_eye_exams_specialty ON eye_exams(created_at DESC);
    
    DROP INDEX IF EXISTS idx_eye_exams_patient;
    CREATE INDEX idx_eye_exams_patient ON eye_exams(patient_uuid, created_at DESC);
  END IF;

  -- Physio indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_assessments' AND table_schema = 'public') THEN
    DROP INDEX IF EXISTS idx_physio_assessments_status;
    CREATE INDEX idx_physio_assessments_status ON physio_assessments(status, created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_sessions' AND table_schema = 'public') THEN
    DROP INDEX IF EXISTS idx_physio_sessions_plan;
    CREATE INDEX idx_physio_sessions_plan ON physio_sessions(plan_id, session_date DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'physio_plans' AND table_schema = 'public') THEN
    DROP INDEX IF EXISTS idx_physio_plans_status;
    CREATE INDEX idx_physio_plans_status ON physio_plans(status);
  END IF;
END $$;

-- =============================================================================
-- PHASE 19: COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN specialty_departments.exam_table_name IS 'Name of the table that stores exams for this specialty (dental_exams, eye_exams, physio_assessments, or consultations)';
COMMENT ON COLUMN specialty_departments.template_id IS 'FK to specialty_templates for dynamic form generation';
COMMENT ON COLUMN specialty_departments.feature_flags IS 'JSON flags for specialty features: has_tooth_chart, has_vision_test, has_exercises, has_ecg, etc.';

-- =============================================================================
-- MASTER SCHEMA VERIFICATION QUERIES
-- =============================================================================

-- Test: List all specialty tables and their record counts
-- SELECT 
--   'specialty_departments' AS table_name, COUNT(*) FROM specialty_departments WHERE is_active = true
-- UNION ALL SELECT 'dental_exams', COUNT(*) FROM dental_exams
-- UNION ALL SELECT 'dental_procedures', COUNT(*) FROM dental_procedures
-- UNION ALL SELECT 'dental_chart', COUNT(*) FROM dental_chart
-- UNION ALL SELECT 'eye_exams', COUNT(*) FROM eye_exams
-- UNION ALL SELECT 'physio_assessments', COUNT(*) FROM physio_assessments
-- UNION ALL SELECT 'physio_plans', COUNT(*) FROM physio_plans
-- UNION ALL SELECT 'physio_sessions', COUNT(*) FROM physio_sessions
-- UNION ALL SELECT 'consultations (specialty)', COUNT(*) FROM consultations WHERE specialty_code IS NOT NULL;

-- Test: All specialty view data
-- SELECT * FROM specialty_examination_stats;
-- SELECT * FROM specialty_patients_unified LIMIT 10;
-- SELECT * FROM specialty_procedures_view LIMIT 10;
