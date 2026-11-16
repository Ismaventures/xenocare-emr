-- =====================================================
-- Migration: Standardize Encounter References
-- Date: 2025-12-26
-- Purpose: Ensure all tables consistently reference visits(id) as encounter_id
-- =====================================================

-- The visits table is THE encounter table
-- All clinical/billing records should link via: encounter_id UUID REFERENCES visits(id)
-- The encounter_number (ENC-YYYYMMDD-XXXX) is displayed via JOIN to visits

-- =====================================================
-- PART 1: Fix consultations table (SAFE - only if encounter_id exists)
-- =====================================================
-- Add FK constraint if column exists and constraint missing
DO $$ 
BEGIN
    -- Only proceed if encounter_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'consultations' AND column_name = 'encounter_id'
    ) THEN
        -- Clean up any orphan records first (set to NULL if visit doesn't exist)
        UPDATE consultations c
        SET encounter_id = NULL
        WHERE encounter_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.id = c.encounter_id);
        
        -- Now add FK if not exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_consultations_encounter' 
            AND table_name = 'consultations'
        ) THEN
            ALTER TABLE consultations 
            DROP CONSTRAINT IF EXISTS consultations_encounter_id_fkey;
            
            ALTER TABLE consultations
            ADD CONSTRAINT fk_consultations_encounter 
            FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Backfill encounter_id from visit_id for existing records
-- Cast to text for safe comparison
UPDATE consultations c
SET encounter_id = v.id
FROM visits v
WHERE c.visit_id::text = v.visit_id::text
AND c.encounter_id IS NULL;

-- =====================================================
-- PART 2: Fix vitals table (SAFE)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vitals' AND column_name = 'encounter_id'
    ) THEN
        -- Clean up orphans first
        UPDATE vitals SET encounter_id = NULL
        WHERE encounter_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.id = vitals.encounter_id);
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_vitals_encounter' 
            AND table_name = 'vitals'
        ) THEN
            ALTER TABLE vitals 
            DROP CONSTRAINT IF EXISTS vitals_encounter_id_fkey;
            
            ALTER TABLE vitals
            ADD CONSTRAINT fk_vitals_encounter 
            FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- PART 3: Fix treatment_plans table (SAFE)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'treatment_plans' AND column_name = 'encounter_id'
    ) THEN
        UPDATE treatment_plans SET encounter_id = NULL
        WHERE encounter_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.id = treatment_plans.encounter_id);
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_treatment_plans_encounter' 
            AND table_name = 'treatment_plans'
        ) THEN
            ALTER TABLE treatment_plans 
            DROP CONSTRAINT IF EXISTS treatment_plans_encounter_id_fkey;
            
            ALTER TABLE treatment_plans
            ADD CONSTRAINT fk_treatment_plans_encounter 
            FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- PART 4: Fix treatment_tasks table (SAFE)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'treatment_tasks' AND column_name = 'encounter_id'
    ) THEN
        UPDATE treatment_tasks SET encounter_id = NULL
        WHERE encounter_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.id = treatment_tasks.encounter_id);
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_treatment_tasks_encounter' 
            AND table_name = 'treatment_tasks'
        ) THEN
            ALTER TABLE treatment_tasks 
            DROP CONSTRAINT IF EXISTS treatment_tasks_encounter_id_fkey;
            
            ALTER TABLE treatment_tasks
            ADD CONSTRAINT fk_treatment_tasks_encounter 
            FOREIGN KEY (encounter_id) REFERENCES visits(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- PART 5: Add encounter_id to invoices if not exists (SAFE)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'encounter_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Backfill invoice encounter_id from consultation_id (only NULL values)
-- consultation_id is VARCHAR, visit_id is VARCHAR - cast both to text for safe comparison
UPDATE invoices i
SET encounter_id = v.id
FROM visits v
WHERE i.consultation_id::text = v.visit_id::text
AND i.encounter_id IS NULL
AND i.consultation_id IS NOT NULL;

-- =====================================================
-- PART 6: Add encounter_id to lab_requests if not exists (SAFE)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_requests' AND column_name = 'encounter_id'
    ) THEN
        ALTER TABLE lab_requests ADD COLUMN encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Backfill lab_requests encounter_id from visit_id (only NULL values)
-- Cast to text for safe comparison
UPDATE lab_requests lr
SET encounter_id = v.id
FROM visits v
WHERE lr.visit_id::text = v.visit_id::text
AND lr.encounter_id IS NULL
AND lr.visit_id IS NOT NULL;

-- =====================================================
-- PART 7: Add encounter_id to prescriptions if not exists (SAFE)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prescriptions' AND column_name = 'encounter_id'
    ) THEN
        ALTER TABLE prescriptions ADD COLUMN encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Backfill prescriptions encounter_id (only NULL values)
-- Cast to text for safe comparison
UPDATE prescriptions p
SET encounter_id = v.id
FROM visits v
WHERE p.visit_id::text = v.visit_id::text
AND p.encounter_id IS NULL
AND p.visit_id IS NOT NULL;

-- =====================================================
-- PART 8: Add encounter_id to billing_orders if not exists (SAFE)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_orders' AND column_name = 'encounter_id'
    ) THEN
        ALTER TABLE billing_orders ADD COLUMN encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Backfill billing_orders encounter_id (only NULL values)
-- billing_orders.visit_id references visits.id (UUID)
UPDATE billing_orders bo
SET encounter_id = bo.visit_id
WHERE bo.encounter_id IS NULL
AND bo.visit_id IS NOT NULL;

-- =====================================================
-- PART 9: Add encounter_id to scan_results (SAFE)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scan_results' AND column_name = 'encounter_id'
    ) THEN
        ALTER TABLE scan_results ADD COLUMN encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- PART 10: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_consultations_encounter ON consultations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter ON vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_encounter ON treatment_plans(encounter_id);
CREATE INDEX IF NOT EXISTS idx_treatment_tasks_encounter ON treatment_tasks(encounter_id);
CREATE INDEX IF NOT EXISTS idx_invoices_encounter ON invoices(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter ON lab_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_encounter ON billing_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_encounter ON scan_results(encounter_id);

-- =====================================================
-- PART 11: Create helper view for easy encounter data access
-- =====================================================
CREATE OR REPLACE VIEW encounter_summary AS
SELECT 
    v.id AS encounter_id,
    v.visit_id,
    v.encounter_number,
    v.encounter_date,
    v.visit_type,
    v.status,
    v.current_stage,
    v.chief_complaint,
    v.payment_category,
    p.id AS patient_id,
    p.emr_number,
    p.first_name,
    p.surname,
    p.contact_phone,
    v.created_at,
    v.updated_at
FROM visits v
JOIN patients p ON v.patient_id = p.id;

-- =====================================================
-- Documentation: Standard Encounter Reference Pattern
-- =====================================================
-- 
-- HIERARCHY:
--   Patient (emr_number) 
--     └── Encounter/Visit (encounter_number from visits table)
--           ├── Invoice
--           ├── Lab Request
--           ├── Prescription
--           ├── Consultation
--           ├── Vitals
--           ├── Treatment Plan
--           └── Billing Order
--
-- STANDARD QUERY PATTERN:
--   SELECT 
--     p.emr_number,
--     v.encounter_number,
--     i.invoice_number
--   FROM invoices i
--   JOIN visits v ON i.encounter_id = v.id
--   JOIN patients p ON v.patient_id = p.id;
--
-- API PATTERN (Supabase):
--   .select(`
--     *,
--     encounter:visits!encounter_id(
--       id, visit_id, encounter_number, visit_type, chief_complaint
--     ),
--     patient:patients(patient_id, emr_number, first_name, surname)
--   `)
--
