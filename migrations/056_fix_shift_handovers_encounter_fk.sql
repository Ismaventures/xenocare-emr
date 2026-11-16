-- =============================================================================
-- Migration 056: Fix shift_handovers encounter_id FK to use UUID
-- =============================================================================
-- 
-- PROBLEM: shift_handovers.encounter_id was VARCHAR(50) referencing visits.visit_id
-- but the application passes UUID (visits.id)
--
-- SOLUTION: Change encounter_id to UUID referencing visits.id
-- =============================================================================

-- Step 0: Drop RLS policies that depend on encounter_id column
DROP POLICY IF EXISTS "shift_handovers_select" ON shift_handovers;
DROP POLICY IF EXISTS "shift_handovers_insert" ON shift_handovers;
DROP POLICY IF EXISTS "shift_handovers_update" ON shift_handovers;
DROP POLICY IF EXISTS "Allow all access" ON shift_handovers;

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE shift_handovers 
DROP CONSTRAINT IF EXISTS shift_handovers_encounter_id_fkey;

-- Step 2: Drop indexes that reference encounter_id
DROP INDEX IF EXISTS idx_handovers_encounter;

-- Step 3: Add a new UUID column for the proper FK (if column is still VARCHAR)
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'shift_handovers' AND column_name = 'encounter_id';
  
  IF col_type = 'character varying' THEN
    -- Column is still VARCHAR, proceed with migration
    ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS encounter_uuid UUID;
    
    -- Migrate existing data - map visit_id to UUID
    UPDATE shift_handovers sh
    SET encounter_uuid = v.id
    FROM visits v
    WHERE sh.encounter_id::text = v.visit_id
    AND sh.encounter_uuid IS NULL;
    
    -- Drop the old VARCHAR column
    ALTER TABLE shift_handovers DROP COLUMN IF EXISTS encounter_id;
    
    -- Rename the new column to encounter_id
    ALTER TABLE shift_handovers RENAME COLUMN encounter_uuid TO encounter_id;
    
    RAISE NOTICE 'Converted encounter_id from VARCHAR to UUID';
  ELSE
    RAISE NOTICE 'encounter_id is already UUID type, skipping conversion';
  END IF;
END;
$$;

-- Step 7: Handle NOT NULL constraint
DO $$
BEGIN
  -- Delete orphaned records that couldn't be mapped
  DELETE FROM shift_handovers WHERE encounter_id IS NULL;
  
  -- Add NOT NULL constraint
  ALTER TABLE shift_handovers 
  ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not set NOT NULL constraint: %', SQLERRM;
END;
$$;

-- Step 8: Add the proper foreign key constraint
ALTER TABLE shift_handovers 
ADD CONSTRAINT shift_handovers_encounter_id_fkey 
FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE CASCADE;

-- Step 9: Create index for performance
CREATE INDEX IF NOT EXISTS idx_handovers_encounter 
ON shift_handovers(encounter_id);

-- =============================================================================
-- Also fix patient_id if it's VARCHAR referencing patients.patient_id
-- =============================================================================

DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'shift_handovers' AND column_name = 'patient_id';
  
  IF col_type = 'character varying' THEN
    -- Drop existing FK
    ALTER TABLE shift_handovers 
    DROP CONSTRAINT IF EXISTS shift_handovers_patient_id_fkey;
    
    -- Drop index
    DROP INDEX IF EXISTS idx_handovers_patient;
    
    -- Add new UUID column
    ALTER TABLE shift_handovers 
    ADD COLUMN IF NOT EXISTS patient_uuid UUID;
    
    -- Migrate data
    UPDATE shift_handovers sh
    SET patient_uuid = p.id
    FROM patients p
    WHERE sh.patient_id::text = p.patient_id
    AND sh.patient_uuid IS NULL;
    
    -- Drop old column
    ALTER TABLE shift_handovers 
    DROP COLUMN IF EXISTS patient_id;
    
    -- Rename new column
    ALTER TABLE shift_handovers 
    RENAME COLUMN patient_uuid TO patient_id;
    
    -- Add NOT NULL
    DELETE FROM shift_handovers WHERE patient_id IS NULL;
    ALTER TABLE shift_handovers 
    ALTER COLUMN patient_id SET NOT NULL;
    
    -- Add FK constraint
    ALTER TABLE shift_handovers 
    ADD CONSTRAINT shift_handovers_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    
    -- Recreate index
    CREATE INDEX IF NOT EXISTS idx_handovers_patient ON shift_handovers(patient_id);
    
    RAISE NOTICE 'Fixed patient_id column from VARCHAR to UUID';
  ELSE
    RAISE NOTICE 'patient_id is already UUID type';
  END IF;
END;
$$;

-- =============================================================================
-- Recreate RLS policies with UUID encounter_id
-- =============================================================================

-- SELECT: All authenticated users can read handovers
CREATE POLICY "shift_handovers_select" ON shift_handovers
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Nurses only, Active encounters only
CREATE POLICY "shift_handovers_insert" ON shift_handovers
FOR INSERT
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id)
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
  AND is_encounter_writable(encounter_id)
)
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id)
);

COMMENT ON TABLE shift_handovers IS 'Nursing shift handover - encounter_id now references visits.id (UUID)';
