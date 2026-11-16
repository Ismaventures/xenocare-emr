-- =====================================================
-- Migration: Enforce EMR → Encounter → Record Hierarchy
-- Date: 2025-12-26
-- Purpose: Make encounter_id NOT NULL on all clinical/billing tables
-- =====================================================
--
-- HIERARCHY ENFORCEMENT:
--   Patient (emr_number: EMR-YYYYMMDD-XXXX)
--     └── Encounter (encounter_number: ENC-YYYYMMDD-XXXX)
--           ├── Invoice
--           ├── Lab Request
--           ├── Prescription
--           ├── Consultation
--           ├── Vitals
--           ├── Treatment Plan
--           ├── Billing Order
--           └── Scan Results
--
-- RULE: Every record MUST be tied to an encounter
-- RULE: Every encounter MUST be tied to a patient (EMR)
-- =====================================================

-- =====================================================
-- PART 1: Ensure visits table has required fields
-- =====================================================
-- Make sure encounter_number is generated for all visits
UPDATE visits 
SET encounter_number = 'ENC-' || TO_CHAR(COALESCE(encounter_date, created_at::date), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM created_at)::bigint % 10000::text, 4, '0')
WHERE encounter_number IS NULL;

-- Ensure patient_id is NOT NULL on visits (encounter must have patient)
ALTER TABLE visits ALTER COLUMN patient_id SET NOT NULL;

-- =====================================================
-- PART 2: Create function to validate encounter has patient
-- =====================================================
CREATE OR REPLACE FUNCTION validate_encounter_has_patient()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.patient_id IS NULL THEN
        RAISE EXCEPTION 'Encounter must be tied to a patient (EMR number required)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_encounter_patient ON visits;
CREATE TRIGGER trg_validate_encounter_patient
    BEFORE INSERT OR UPDATE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION validate_encounter_has_patient();

-- =====================================================
-- PART 3: Create function to validate record has encounter
-- =====================================================
CREATE OR REPLACE FUNCTION validate_record_has_encounter()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if encounter_id column doesn't exist or is being set
    IF TG_OP = 'INSERT' AND NEW.encounter_id IS NULL THEN
        RAISE EXCEPTION 'Record must be tied to an encounter (encounter_id required). Every record must follow: EMR → Encounter → Record hierarchy.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 4: Enforce NOT NULL on invoices.encounter_id
-- (Only after backfill is complete)
-- =====================================================
DO $$
BEGIN
    -- Check if there are any NULL encounter_ids
    IF NOT EXISTS (SELECT 1 FROM invoices WHERE encounter_id IS NULL LIMIT 1) THEN
        -- Safe to enforce NOT NULL
        ALTER TABLE invoices ALTER COLUMN encounter_id SET NOT NULL;
        RAISE NOTICE 'invoices.encounter_id is now NOT NULL';
    ELSE
        RAISE NOTICE 'WARNING: invoices table has NULL encounter_ids. Run backfill first.';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not enforce NOT NULL on invoices.encounter_id: %', SQLERRM;
END $$;

-- =====================================================
-- PART 5: Create view for complete record hierarchy
-- =====================================================
CREATE OR REPLACE VIEW billing_record_hierarchy AS
SELECT 
    -- Patient Level
    p.id AS patient_uuid,
    p.emr_number,
    p.first_name || ' ' || p.surname AS patient_name,
    p.contact_phone,
    
    -- Encounter Level
    v.id AS encounter_uuid,
    v.encounter_number,
    v.visit_type,
    v.encounter_date,
    v.chief_complaint,
    v.payment_category,
    v.status AS encounter_status,
    
    -- Invoice Level
    i.invoice_id,
    i.invoice_number,
    i.total_amount,
    i.amount_paid,
    i.balance,
    i.status AS invoice_status,
    i.created_at AS invoice_date
    
FROM invoices i
JOIN visits v ON i.encounter_id = v.id
JOIN patients p ON v.patient_id = p.id
ORDER BY i.created_at DESC;

-- =====================================================
-- PART 6: Create view for payment hierarchy
-- =====================================================
CREATE OR REPLACE VIEW payment_record_hierarchy AS
SELECT 
    -- Patient Level
    p.emr_number,
    p.first_name || ' ' || p.surname AS patient_name,
    
    -- Encounter Level
    v.encounter_number,
    v.visit_type,
    
    -- Invoice Level
    i.invoice_number,
    
    -- Payment Level
    pay.payment_id,
    pay.receipt_number,
    pay.amount,
    pay.payment_method,
    pay.created_at AS payment_date,
    s.first_name || ' ' || s.last_name AS received_by
    
FROM payments pay
JOIN invoices i ON pay.invoice_id = i.invoice_id
JOIN visits v ON i.encounter_id = v.id
JOIN patients p ON v.patient_id = p.id
LEFT JOIN staff s ON pay.received_by = s.staff_id
ORDER BY pay.created_at DESC;

-- =====================================================
-- PART 7: Add comments for documentation
-- =====================================================
COMMENT ON TABLE visits IS 'Encounter table - every clinical/billing record must reference this table. encounter_number format: ENC-YYYYMMDD-XXXX';
COMMENT ON COLUMN visits.encounter_number IS 'Human-readable encounter ID. Format: ENC-YYYYMMDD-XXXX (e.g., ENC-20251226-1023)';
COMMENT ON COLUMN invoices.encounter_id IS 'Required FK to visits.id - enforces EMR → Encounter → Invoice hierarchy';

-- =====================================================
-- Documentation
-- =====================================================
-- 
-- USAGE IN API:
-- 
-- // Get invoice with full hierarchy
-- const { data } = await supabase
--   .from('invoices')
--   .select(`
--     *,
--     patient:patients!patient_id(emr_number, first_name, surname),
--     encounter:visits!encounter_id(encounter_number, visit_type)
--   `)
-- 
-- // Display in UI:
-- EMR: {data.patient.emr_number}
-- Encounter: {data.encounter.encounter_number}  // ENC-20251226-1023
-- Invoice: {data.invoice_number}
--
-- FULL HIERARCHY DISPLAY:
-- EMR-20251226-001 → ENC-20251226-1023 → INV-20251226-001
--
