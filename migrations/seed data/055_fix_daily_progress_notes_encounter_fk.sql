-- =============================================================================
-- Migration 055: Fix daily_progress_notes encounter_id FK to use UUID
-- =============================================================================
-- 
-- PROBLEM: daily_progress_notes.encounter_id was VARCHAR(50) referencing visits.visit_id
-- but the application passes UUID (visits.id)
--
-- SOLUTION: Change encounter_id to UUID referencing visits.id
-- =============================================================================

-- Step 0: Drop RLS policies that depend on encounter_id column
DROP POLICY IF EXISTS "daily_progress_notes_select" ON daily_progress_notes;
DROP POLICY IF EXISTS "daily_progress_notes_insert" ON daily_progress_notes;
DROP POLICY IF EXISTS "daily_progress_notes_update" ON daily_progress_notes;
DROP POLICY IF EXISTS "Allow all access" ON daily_progress_notes;

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE daily_progress_notes 
DROP CONSTRAINT IF EXISTS daily_progress_notes_encounter_id_fkey;

-- Step 2: Drop the unique constraint that references encounter_id
ALTER TABLE daily_progress_notes 
DROP CONSTRAINT IF EXISTS daily_progress_notes_encounter_id_note_date_key;

-- Step 3: Add a new UUID column for the proper FK
ALTER TABLE daily_progress_notes 
ADD COLUMN IF NOT EXISTS encounter_uuid UUID;

-- Step 4: Migrate existing data - map visit_id to UUID
-- This updates encounter_uuid based on matching visit_id values
UPDATE daily_progress_notes dpn
SET encounter_uuid = v.id
FROM visits v
WHERE dpn.encounter_id = v.visit_id
AND dpn.encounter_uuid IS NULL;

-- Step 5: Drop the old VARCHAR column
ALTER TABLE daily_progress_notes 
DROP COLUMN IF EXISTS encounter_id;

-- Step 6: Rename the new column to encounter_id
ALTER TABLE daily_progress_notes 
RENAME COLUMN encounter_uuid TO encounter_id;

-- Step 7: Add NOT NULL constraint (only if there's data, otherwise skip)
-- We do this carefully to avoid errors on empty tables
DO $$
BEGIN
  -- Check if there are any NULL encounter_ids
  IF EXISTS (SELECT 1 FROM daily_progress_notes WHERE encounter_id IS NULL) THEN
    -- Delete orphaned records that couldn't be mapped
    DELETE FROM daily_progress_notes WHERE encounter_id IS NULL;
  END IF;
  
  -- Now add NOT NULL constraint
  ALTER TABLE daily_progress_notes 
  ALTER COLUMN encounter_id SET NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not set NOT NULL constraint: %', SQLERRM;
END;
$$;

-- Step 8: Add the proper foreign key constraint
ALTER TABLE daily_progress_notes 
ADD CONSTRAINT daily_progress_notes_encounter_id_fkey 
FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE CASCADE;

-- Step 9: Recreate the unique constraint for one note per encounter per day
ALTER TABLE daily_progress_notes 
ADD CONSTRAINT daily_progress_notes_encounter_id_note_date_key 
UNIQUE (encounter_id, note_date);

-- Step 10: Create index for performance
CREATE INDEX IF NOT EXISTS idx_daily_progress_notes_encounter 
ON daily_progress_notes(encounter_id);

-- =============================================================================
-- Also fix patient_id if it's VARCHAR referencing patients.patient_id
-- =============================================================================

-- Check if patient_id needs fixing (VARCHAR -> UUID)
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'daily_progress_notes' AND column_name = 'patient_id';
  
  IF col_type = 'character varying' THEN
    -- Drop existing FK
    ALTER TABLE daily_progress_notes 
    DROP CONSTRAINT IF EXISTS daily_progress_notes_patient_id_fkey;
    
    -- Add new UUID column
    ALTER TABLE daily_progress_notes 
    ADD COLUMN IF NOT EXISTS patient_uuid UUID;
    
    -- Migrate data
    UPDATE daily_progress_notes dpn
    SET patient_uuid = p.id
    FROM patients p
    WHERE dpn.patient_id::text = p.patient_id
    AND dpn.patient_uuid IS NULL;
    
    -- Drop old column
    ALTER TABLE daily_progress_notes 
    DROP COLUMN IF EXISTS patient_id;
    
    -- Rename new column
    ALTER TABLE daily_progress_notes 
    RENAME COLUMN patient_uuid TO patient_id;
    
    -- Add NOT NULL
    DELETE FROM daily_progress_notes WHERE patient_id IS NULL;
    ALTER TABLE daily_progress_notes 
    ALTER COLUMN patient_id SET NOT NULL;
    
    -- Add FK constraint
    ALTER TABLE daily_progress_notes 
    ADD CONSTRAINT daily_progress_notes_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed patient_id column from VARCHAR to UUID';
  ELSE
    RAISE NOTICE 'patient_id is already UUID type';
  END IF;
END;
$$;

COMMENT ON TABLE daily_progress_notes IS 'Daily progress notes - encounter_id now references visits.id (UUID)';

-- =============================================================================
-- Recreate RLS policies with UUID encounter_id
-- =============================================================================

-- SELECT: All authenticated users can read
CREATE POLICY "daily_progress_notes_select" ON daily_progress_notes
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Only for Active encounters
CREATE POLICY "daily_progress_notes_insert" ON daily_progress_notes
FOR INSERT
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id)
);

-- UPDATE: Only for Active encounters
CREATE POLICY "daily_progress_notes_update" ON daily_progress_notes
FOR UPDATE
USING (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id)
)
WITH CHECK (
  encounter_id IS NOT NULL
  AND is_encounter_writable(encounter_id)
);
