-- =============================================================================
-- Migration 058: Fix shift_handovers column names to match application
-- =============================================================================
-- 
-- PROBLEM: Table uses from_shift/to_shift but app uses outgoing_shift/incoming_shift
-- Also need to rename 'id' to 'handover_id' and ensure all columns exist
-- patient_id is VARCHAR but app passes UUID
-- =============================================================================

-- First fix patient_id column type (VARCHAR -> UUID)
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'shift_handovers' AND column_name = 'patient_id';
  
  IF col_type = 'character varying' THEN
    -- Drop existing FK
    ALTER TABLE shift_handovers DROP CONSTRAINT IF EXISTS shift_handovers_patient_id_fkey;
    
    -- Add new UUID column
    ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS patient_uuid UUID;
    
    -- Migrate data - try to map VARCHAR patient_id to UUID
    UPDATE shift_handovers sh
    SET patient_uuid = p.id
    FROM patients p
    WHERE sh.patient_id::text = p.patient_id
    AND sh.patient_uuid IS NULL;
    
    -- Drop old column
    ALTER TABLE shift_handovers DROP COLUMN patient_id;
    
    -- Rename new column
    ALTER TABLE shift_handovers RENAME COLUMN patient_uuid TO patient_id;
    
    -- Add FK constraint to patients.id (UUID)
    ALTER TABLE shift_handovers 
    ADD CONSTRAINT shift_handovers_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Converted patient_id from VARCHAR to UUID';
  ELSE
    RAISE NOTICE 'patient_id is already UUID type';
  END IF;
END;
$$;

-- Handle the case where BOTH old and new columns exist - drop the old ones
DO $$
BEGIN
  -- If both from_shift and outgoing_shift exist, drop from_shift
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'from_shift'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'outgoing_shift'
  ) THEN
    ALTER TABLE shift_handovers DROP COLUMN from_shift;
    RAISE NOTICE 'Dropped duplicate from_shift column';
  END IF;
  
  -- If both to_shift and incoming_shift exist, drop to_shift
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'to_shift'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'incoming_shift'
  ) THEN
    ALTER TABLE shift_handovers DROP COLUMN to_shift;
    RAISE NOTICE 'Dropped duplicate to_shift column';
  END IF;
END;
$$;

-- Rename columns if only old names exist
DO $$
BEGIN
  -- Rename from_shift to outgoing_shift (only if from_shift exists and outgoing_shift doesn't)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'from_shift'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'outgoing_shift'
  ) THEN
    ALTER TABLE shift_handovers RENAME COLUMN from_shift TO outgoing_shift;
    RAISE NOTICE 'Renamed from_shift to outgoing_shift';
  END IF;
  
  -- Rename to_shift to incoming_shift (only if to_shift exists and incoming_shift doesn't)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'to_shift'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'incoming_shift'
  ) THEN
    ALTER TABLE shift_handovers RENAME COLUMN to_shift TO incoming_shift;
    RAISE NOTICE 'Renamed to_shift to incoming_shift';
  END IF;
  
  -- Rename id to handover_id (only if id exists and handover_id doesn't)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'handover_id'
  ) THEN
    ALTER TABLE shift_handovers RENAME COLUMN id TO handover_id;
    RAISE NOTICE 'Renamed id to handover_id';
  END IF;
END;
$$;

-- Add missing columns that the application expects
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS handover_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS consciousness_level VARCHAR(50);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS mobility_status VARCHAR(50);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS pending_tasks JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS isolation_precautions TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS fall_risk_level VARCHAR(20);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS medication_due JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS investigations_pending JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS last_vitals JSONB;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS vitals_trend TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS iv_access JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS drains_catheters JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS diet_type VARCHAR(100);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS feeding_route VARCHAR(50);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS last_meal_time TIMESTAMPTZ;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS follow_up_actions TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS handover_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN DEFAULT FALSE;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Copy shift_date to handover_date if handover_date is null
UPDATE shift_handovers 
SET handover_date = shift_date 
WHERE handover_date IS NULL AND shift_date IS NOT NULL;

-- Make outgoing_shift and incoming_shift nullable (in case they have NOT NULL and we need flexibility)
DO $$
BEGIN
  ALTER TABLE shift_handovers ALTER COLUMN outgoing_shift DROP NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'outgoing_shift already nullable or does not exist';
END;
$$;

DO $$
BEGIN
  ALTER TABLE shift_handovers ALTER COLUMN incoming_shift DROP NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'incoming_shift already nullable or does not exist';
END;
$$;

-- Make patient_status nullable to allow partial handovers
DO $$
BEGIN
  ALTER TABLE shift_handovers ALTER COLUMN patient_status DROP NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'patient_status already nullable or does not exist';
END;
$$;

-- Make outgoing_nurse_id nullable
DO $$
BEGIN
  ALTER TABLE shift_handovers ALTER COLUMN outgoing_nurse_id DROP NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'outgoing_nurse_id already nullable or does not exist';
END;
$$;

-- Make shift_date nullable (app uses handover_date instead)
DO $$
BEGIN
  ALTER TABLE shift_handovers ALTER COLUMN shift_date DROP NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'shift_date already nullable or does not exist';
END;
$$;

-- Create trigger to copy handover_date to shift_date for backward compatibility
CREATE OR REPLACE FUNCTION sync_shift_handover_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- If shift_date is null but handover_date is set, copy it
  IF NEW.shift_date IS NULL AND NEW.handover_date IS NOT NULL THEN
    NEW.shift_date := NEW.handover_date;
  END IF;
  -- If handover_date is null but shift_date is set, copy it
  IF NEW.handover_date IS NULL AND NEW.shift_date IS NOT NULL THEN
    NEW.handover_date := NEW.shift_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_shift_dates ON shift_handovers;
CREATE TRIGGER trigger_sync_shift_dates
  BEFORE INSERT OR UPDATE ON shift_handovers
  FOR EACH ROW
  EXECUTE FUNCTION sync_shift_handover_dates();

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE shift_handovers IS 'Nursing shift handover - columns renamed to match app expectations';
