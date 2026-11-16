-- =============================================================================
-- MIGRATION: Enforce Encounter-Centric Constraints
-- =============================================================================
-- This migration ensures all clinical records are properly tied to encounters
-- (visits table) and patients, preventing orphaned records.
-- =============================================================================

-- 1. Add NOT NULL constraints and foreign keys to clinical tables
-- =============================================================================

-- Daily Progress Notes - ensure encounter_id and patient_id are required
ALTER TABLE daily_progress_notes 
  ALTER COLUMN encounter_id SET NOT NULL,
  ALTER COLUMN patient_id SET NOT NULL;

-- Add FK if not exists (with ON DELETE RESTRICT to prevent orphans)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'daily_progress_notes_encounter_id_fkey'
    AND table_name = 'daily_progress_notes'
  ) THEN
    ALTER TABLE daily_progress_notes 
    ADD CONSTRAINT daily_progress_notes_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Consultations - ensure encounter_id is required
ALTER TABLE consultations 
  ALTER COLUMN encounter_id SET NOT NULL;

-- Lab Requests - ensure encounter_id is required
DO $$ 
BEGIN
  ALTER TABLE lab_requests ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Radiology Requests - ensure encounter_id is required  
DO $$ 
BEGIN
  ALTER TABLE radiology_requests ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Prescriptions - ensure encounter_id is required
DO $$ 
BEGIN
  ALTER TABLE prescriptions ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Vitals - ensure encounter_id is required
DO $$ 
BEGIN
  ALTER TABLE vitals ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Nursing Notes - ensure encounter_id is required
DO $$ 
BEGIN
  ALTER TABLE nursing_notes ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Procedures - ensure encounter_id is required
DO $$ 
BEGIN
  ALTER TABLE procedures ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Doctor Orders - ensure encounter_id is required
DO $$ 
BEGIN
  ALTER TABLE doctor_orders ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Clinical Requests - ensure encounter_id is required
DO $$ 
BEGIN
  ALTER TABLE clinical_requests ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =============================================================================
-- 2. Add foreign key constraints with ON DELETE RESTRICT
-- =============================================================================

-- Function to safely add FK constraint
CREATE OR REPLACE FUNCTION add_encounter_fk_if_not_exists(
  p_table_name TEXT,
  p_constraint_name TEXT
) RETURNS VOID AS $$
BEGIN
  -- Check if constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = p_constraint_name
    AND table_name = p_table_name
  ) THEN
    -- Check if column exists and add FK
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = p_table_name 
      AND column_name = 'encounter_id'
      AND table_schema = 'public'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE RESTRICT',
        p_table_name, p_constraint_name
      );
      RAISE NOTICE 'Added FK constraint % to %', p_constraint_name, p_table_name;
    END IF;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add FK to %: %', p_table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Add FK constraints to all clinical tables
SELECT add_encounter_fk_if_not_exists('consultations', 'consultations_encounter_fk');
SELECT add_encounter_fk_if_not_exists('lab_requests', 'lab_requests_encounter_fk');
SELECT add_encounter_fk_if_not_exists('radiology_requests', 'radiology_requests_encounter_fk');
SELECT add_encounter_fk_if_not_exists('prescriptions', 'prescriptions_encounter_fk');
SELECT add_encounter_fk_if_not_exists('vitals', 'vitals_encounter_fk');
SELECT add_encounter_fk_if_not_exists('nursing_notes', 'nursing_notes_encounter_fk');
SELECT add_encounter_fk_if_not_exists('procedures', 'procedures_encounter_fk');
SELECT add_encounter_fk_if_not_exists('doctor_orders', 'doctor_orders_encounter_fk');
SELECT add_encounter_fk_if_not_exists('clinical_requests', 'clinical_requests_encounter_fk');
SELECT add_encounter_fk_if_not_exists('billing_orders', 'billing_orders_encounter_fk');
SELECT add_encounter_fk_if_not_exists('treatment_plans', 'treatment_plans_encounter_fk');
SELECT add_encounter_fk_if_not_exists('treatment_tasks', 'treatment_tasks_encounter_fk');
SELECT add_encounter_fk_if_not_exists('medication_administration', 'medication_administration_encounter_fk');
SELECT add_encounter_fk_if_not_exists('ward_round_notes', 'ward_round_notes_encounter_fk');

-- Clean up helper function
DROP FUNCTION IF EXISTS add_encounter_fk_if_not_exists(TEXT, TEXT);

-- =============================================================================
-- 3. Prevent patient deletion if they have any records
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_patient_deletion()
RETURNS TRIGGER AS $$
DECLARE
  record_count INTEGER;
BEGIN
  -- Check visits/encounters
  SELECT COUNT(*) INTO record_count FROM visits WHERE patient_id = OLD.id;
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete patient with % encounter(s). Mark as Inactive instead.', record_count;
  END IF;
  
  -- Check consultations
  SELECT COUNT(*) INTO record_count FROM consultations WHERE patient_id::uuid = OLD.id;
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete patient with % consultation(s). Mark as Inactive instead.', record_count;
  END IF;
  
  -- Check billing orders
  SELECT COUNT(*) INTO record_count FROM billing_orders WHERE patient_id = OLD.id;
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete patient with % billing record(s). Mark as Inactive instead.', record_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent patient deletion
DROP TRIGGER IF EXISTS prevent_patient_deletion_trigger ON patients;
CREATE TRIGGER prevent_patient_deletion_trigger
  BEFORE DELETE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION prevent_patient_deletion();

-- =============================================================================
-- 4. Prevent encounter/visit deletion if it has clinical records
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_encounter_deletion()
RETURNS TRIGGER AS $$
DECLARE
  record_count INTEGER;
BEGIN
  -- Check daily_progress_notes
  SELECT COUNT(*) INTO record_count FROM daily_progress_notes WHERE encounter_id = OLD.id;
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete encounter with % progress note(s).', record_count;
  END IF;
  
  -- Check consultations
  SELECT COUNT(*) INTO record_count FROM consultations WHERE encounter_id = OLD.id;
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete encounter with % consultation(s).', record_count;
  END IF;
  
  -- Check vitals
  SELECT COUNT(*) INTO record_count FROM vitals WHERE encounter_id = OLD.id;
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete encounter with % vital record(s).', record_count;
  END IF;
  
  -- Check lab_requests
  SELECT COUNT(*) INTO record_count FROM lab_requests WHERE encounter_id = OLD.id;
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete encounter with % lab request(s).', record_count;
  END IF;
  
  -- Check prescriptions
  SELECT COUNT(*) INTO record_count FROM prescriptions WHERE encounter_id = OLD.id;
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete encounter with % prescription(s).', record_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent encounter deletion
DROP TRIGGER IF EXISTS prevent_encounter_deletion_trigger ON visits;
CREATE TRIGGER prevent_encounter_deletion_trigger
  BEFORE DELETE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION prevent_encounter_deletion();

-- =============================================================================
-- 5. Create index for better query performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_daily_progress_notes_encounter ON daily_progress_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_consultations_encounter ON consultations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter ON vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter ON lab_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_encounter ON nursing_notes(encounter_id);

-- =============================================================================
-- DONE
-- =============================================================================
COMMENT ON TRIGGER prevent_patient_deletion_trigger ON patients IS 
  'Prevents deletion of patients with existing records - use status=Inactive instead';

COMMENT ON TRIGGER prevent_encounter_deletion_trigger ON visits IS 
  'Prevents deletion of encounters/visits with existing clinical records';
