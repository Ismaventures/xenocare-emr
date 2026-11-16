-- =============================================================================
-- Migration 059: Fix treatment_plans foreign key references
-- =============================================================================
-- 
-- PROBLEM: treatment_plans has FK constraints referencing wrong columns:
-- - patient_id references patients(patient_id) which is VARCHAR
-- - encounter_id references visits(visit_id) which is VARCHAR  
-- - created_by references staff(staff_id) which is VARCHAR
--
-- These should reference the UUID primary keys instead:
-- - patients(id) - UUID
-- - visits(id) - UUID
-- - staff(id) - UUID
-- =============================================================================

-- Drop and recreate foreign key constraints for treatment_plans

-- 1. Fix patient_id FK - should reference patients(id) not patients(patient_id)
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_patient_id_fkey;
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_patient_id_fkey1;

ALTER TABLE treatment_plans 
ADD CONSTRAINT treatment_plans_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

-- 2. Fix encounter_id FK - should reference visits(id) not visits(visit_id)
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_encounter_id_fkey;
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_encounter_id_fkey1;

ALTER TABLE treatment_plans 
ADD CONSTRAINT treatment_plans_encounter_id_fkey 
FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE CASCADE;

-- 3. Fix created_by FK - should reference staff(id) not staff(staff_id)
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_created_by_fkey;
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_created_by_fkey1;

ALTER TABLE treatment_plans 
ADD CONSTRAINT treatment_plans_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL;

-- 4. Fix viewed_by FK
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_viewed_by_fkey;
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_viewed_by_fkey1;

ALTER TABLE treatment_plans 
ADD CONSTRAINT treatment_plans_viewed_by_fkey 
FOREIGN KEY (viewed_by) REFERENCES staff(id) ON DELETE SET NULL;

-- 5. Fix completed_by FK  
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_completed_by_fkey;
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_completed_by_fkey1;

ALTER TABLE treatment_plans 
ADD CONSTRAINT treatment_plans_completed_by_fkey 
FOREIGN KEY (completed_by) REFERENCES staff(id) ON DELETE SET NULL;

-- 6. Fix consultation_id FK - should reference consultations(id) not consultations(consultation_id)
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_consultation_id_fkey;
ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_consultation_id_fkey1;

-- Only add if consultations table has an 'id' column (it might have consultation_id as PK)
DO $$
BEGIN
  -- Check if consultations has 'id' column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultations' AND column_name = 'id'
  ) THEN
    ALTER TABLE treatment_plans 
    ADD CONSTRAINT treatment_plans_consultation_id_fkey 
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL;
  ELSE
    -- Fallback: reference consultation_id column
    ALTER TABLE treatment_plans 
    ADD CONSTRAINT treatment_plans_consultation_id_fkey 
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'consultation_id FK: %', SQLERRM;
END;
$$;

-- =============================================================================
-- Fix treatment_tasks foreign key references
-- =============================================================================

-- 1. Fix plan_id FK - should reference treatment_plans(id)
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_tasks_plan_id_fkey;
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_tasks_plan_id_fkey1;
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_plan_tasks_plan_id_fkey;

-- Check which PK column exists in treatment_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'treatment_plans' AND column_name = 'id'
  ) THEN
    ALTER TABLE treatment_tasks 
    ADD CONSTRAINT treatment_tasks_plan_id_fkey 
    FOREIGN KEY (plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'treatment_plans' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE treatment_tasks 
    ADD CONSTRAINT treatment_tasks_plan_id_fkey 
    FOREIGN KEY (plan_id) REFERENCES treatment_plans(plan_id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'plan_id FK: %', SQLERRM;
END;
$$;

-- 2. Fix patient_id FK - should reference patients(id)
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_tasks_patient_id_fkey;
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_tasks_patient_id_fkey1;
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_plan_tasks_patient_id_fkey;

ALTER TABLE treatment_tasks 
ADD CONSTRAINT treatment_tasks_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

-- 3. Fix encounter_id FK - should reference visits(id)
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_tasks_encounter_id_fkey;
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_tasks_encounter_id_fkey1;
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_plan_tasks_encounter_id_fkey;

ALTER TABLE treatment_tasks 
ADD CONSTRAINT treatment_tasks_encounter_id_fkey 
FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE CASCADE;

-- 4. Fix completed_by FK - should reference staff(id)
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_tasks_completed_by_fkey;
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_tasks_completed_by_fkey1;
ALTER TABLE treatment_tasks DROP CONSTRAINT IF EXISTS treatment_plan_tasks_completed_by_fkey;

ALTER TABLE treatment_tasks 
ADD CONSTRAINT treatment_tasks_completed_by_fkey 
FOREIGN KEY (completed_by) REFERENCES staff(id) ON DELETE SET NULL;

-- =============================================================================
-- Also fix treatment_plan_tasks if that table exists (older schema name)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatment_plan_tasks') THEN
    -- Fix patient_id FK
    ALTER TABLE treatment_plan_tasks DROP CONSTRAINT IF EXISTS treatment_plan_tasks_patient_id_fkey;
    ALTER TABLE treatment_plan_tasks 
    ADD CONSTRAINT treatment_plan_tasks_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    
    -- Fix encounter_id FK
    ALTER TABLE treatment_plan_tasks DROP CONSTRAINT IF EXISTS treatment_plan_tasks_encounter_id_fkey;
    ALTER TABLE treatment_plan_tasks 
    ADD CONSTRAINT treatment_plan_tasks_encounter_id_fkey 
    FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed treatment_plan_tasks FK constraints';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'treatment_plan_tasks FK fix error: %', SQLERRM;
END;
$$;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE treatment_plans IS 'Treatment plans - FK constraints fixed to reference UUID primary keys';
