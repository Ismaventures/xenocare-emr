-- ============================================================================
-- Migration 144: Security & Integrity Hardening
-- ============================================================================
-- Addresses findings from the deep technical audit:
-- 1. Atomic pharmacy stock operations (prevents race condition)
-- 2. CHECK constraints on financial/quantity columns
-- 3. Single active encounter per patient constraint
-- 4. Audit log immutability triggers
-- 5. Vital sign range validation
-- 6. Billing on closed encounters protection
-- ============================================================================

-- ============================================================================
-- 1. ATOMIC PHARMACY STOCK OPERATIONS
-- Replaces read-modify-write pattern with atomic decrements/increments.
-- Uses row-level locking to prevent concurrent dispensing corruption.
-- ============================================================================

-- 1a. Atomic stock decrement for drug catalogue (overall stock)
CREATE OR REPLACE FUNCTION public.decrement_drug_stock(
    p_drug_id UUID,
    p_quantity NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_qty NUMERIC;
    v_drug_name TEXT;
BEGIN
    -- Atomic: lock row, check, decrement in one statement
    UPDATE drug_catalogue
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = now()
    WHERE id = p_drug_id
      AND stock_quantity >= p_quantity
    RETURNING stock_quantity, name INTO v_new_qty, v_drug_name;

    IF NOT FOUND THEN
        -- Determine if drug doesn't exist or insufficient stock
        SELECT name INTO v_drug_name FROM drug_catalogue WHERE id = p_drug_id;
        IF v_drug_name IS NULL THEN
            RAISE EXCEPTION 'Drug not found: %', p_drug_id;
        ELSE
            RAISE EXCEPTION 'Insufficient stock for "%". Requested: %, Available stock is less.', v_drug_name, p_quantity;
        END IF;
    END IF;

    RETURN v_new_qty;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_drug_stock(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_drug_stock(UUID, NUMERIC) TO service_role;

-- 1b. Atomic stock increment for restocking
CREATE OR REPLACE FUNCTION public.increment_drug_stock(
    p_drug_id UUID,
    p_quantity NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_qty NUMERIC;
BEGIN
    UPDATE drug_catalogue
    SET stock_quantity = stock_quantity + p_quantity,
        updated_at = now()
    WHERE id = p_drug_id
    RETURNING stock_quantity INTO v_new_qty;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Drug not found: %', p_drug_id;
    END IF;

    RETURN v_new_qty;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_drug_stock(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_drug_stock(UUID, NUMERIC) TO service_role;

-- 1c. Atomic batch quantity decrement
CREATE OR REPLACE FUNCTION public.decrement_batch_stock(
    p_batch_id UUID,
    p_quantity NUMERIC
) RETURNS TABLE(new_quantity NUMERIC, new_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining NUMERIC;
    v_status TEXT;
BEGIN
    UPDATE drug_batches
    SET quantity_remaining = quantity_remaining - p_quantity,
        status = CASE
            WHEN quantity_remaining - p_quantity <= 0 THEN 'depleted'
            ELSE status
        END,
        updated_at = now()
    WHERE batch_id = p_batch_id
      AND quantity_remaining >= p_quantity
    RETURNING quantity_remaining, status INTO v_remaining, v_status;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient batch stock or batch not found: %', p_batch_id;
    END IF;

    new_quantity := v_remaining;
    new_status := v_status;
    RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_batch_stock(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_batch_stock(UUID, NUMERIC) TO service_role;

-- ============================================================================
-- 2. CHECK CONSTRAINTS ON FINANCIAL / QUANTITY COLUMNS
-- Prevents negative amounts, invalid percentages, and zero-quantity records.
-- Uses NOT VALID to avoid locking on existing data, then validates separately.
-- ============================================================================

-- Billing orders
ALTER TABLE billing_orders
    ADD CONSTRAINT chk_billing_order_amounts
    CHECK (total_amount >= 0 AND net_amount >= 0 AND paid_amount >= 0 AND discount_amount >= 0)
    NOT VALID;
ALTER TABLE billing_orders VALIDATE CONSTRAINT chk_billing_order_amounts;

ALTER TABLE billing_orders
    ADD CONSTRAINT chk_billing_order_nhis_pct
    CHECK (nhis_percentage IS NULL OR (nhis_percentage >= 0 AND nhis_percentage <= 100))
    NOT VALID;
ALTER TABLE billing_orders VALIDATE CONSTRAINT chk_billing_order_nhis_pct;

-- Billing items
ALTER TABLE billing_items
    ADD CONSTRAINT chk_billing_item_amounts
    CHECK (unit_price >= 0 AND total_price >= 0 AND quantity >= 0)
    NOT VALID;
ALTER TABLE billing_items VALIDATE CONSTRAINT chk_billing_item_amounts;

ALTER TABLE billing_items
    ADD CONSTRAINT chk_billing_item_nhis_pct
    CHECK (nhis_percentage IS NULL OR (nhis_percentage >= 0 AND nhis_percentage <= 100))
    NOT VALID;
ALTER TABLE billing_items VALIDATE CONSTRAINT chk_billing_item_nhis_pct;

-- Payments
ALTER TABLE payments
    ADD CONSTRAINT chk_payment_positive
    CHECK (amount > 0)
    NOT VALID;
ALTER TABLE payments VALIDATE CONSTRAINT chk_payment_positive;

-- Receipts
ALTER TABLE receipts
    ADD CONSTRAINT chk_receipt_positive
    CHECK (amount_paid > 0)
    NOT VALID;
ALTER TABLE receipts VALIDATE CONSTRAINT chk_receipt_positive;

-- Drug catalogue stock
ALTER TABLE drug_catalogue
    ADD CONSTRAINT chk_drug_stock_non_negative
    CHECK (stock_quantity >= 0)
    NOT VALID;
ALTER TABLE drug_catalogue VALIDATE CONSTRAINT chk_drug_stock_non_negative;

-- Drug batches
ALTER TABLE drug_batches
    ADD CONSTRAINT chk_batch_qty_non_negative
    CHECK (quantity_remaining >= 0)
    NOT VALID;
ALTER TABLE drug_batches VALIDATE CONSTRAINT chk_batch_qty_non_negative;

ALTER TABLE drug_batches
    ADD CONSTRAINT chk_batch_cost_non_negative
    CHECK (cost_price >= 0)
    NOT VALID;
ALTER TABLE drug_batches VALIDATE CONSTRAINT chk_batch_cost_non_negative;

-- Invoice items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items' AND table_schema = 'public') THEN
        EXECUTE 'ALTER TABLE invoice_items ADD CONSTRAINT chk_invoice_item_amounts CHECK (unit_price >= 0 AND total >= 0 AND quantity >= 1) NOT VALID';
        EXECUTE 'ALTER TABLE invoice_items VALIDATE CONSTRAINT chk_invoice_item_amounts';
    END IF;
END $$;

-- Clinics fee columns
ALTER TABLE clinics
    ADD CONSTRAINT chk_clinic_fees_non_negative
    CHECK (
        (consultation_fee IS NULL OR consultation_fee >= 0) AND
        (follow_up_fee IS NULL OR follow_up_fee >= 0) AND
        (emergency_fee IS NULL OR emergency_fee >= 0)
    )
    NOT VALID;
ALTER TABLE clinics VALIDATE CONSTRAINT chk_clinic_fees_non_negative;

-- Beds daily rate
ALTER TABLE beds
    ADD CONSTRAINT chk_bed_rate_non_negative
    CHECK (daily_rate IS NULL OR daily_rate >= 0)
    NOT VALID;
ALTER TABLE beds VALIDATE CONSTRAINT chk_bed_rate_non_negative;

-- ============================================================================
-- 3. SINGLE ACTIVE ENCOUNTER PER PATIENT
-- Prevents concurrent encounters for the same patient.
-- Only one visit with status 'Active' or 'Created' per patient at a time.
-- ============================================================================

-- First clean up any existing duplicates by completing older ones
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT patient_id, array_agg(id ORDER BY created_at DESC) AS ids
        FROM visits
        WHERE status IN ('Active', 'Created')
          AND patient_id IS NOT NULL
        GROUP BY patient_id
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the newest (first element), complete the rest
        UPDATE visits
        SET status = 'Completed', updated_at = now()
        WHERE id = ANY(r.ids[2:])
          AND status IN ('Active', 'Created');
    END LOOP;
END $$;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_one_active_encounter_per_patient
    ON visits (patient_id)
    WHERE status IN ('Active', 'Created') AND patient_id IS NOT NULL;

-- ============================================================================
-- 4. AUDIT LOG IMMUTABILITY
-- Prevents modification or deletion of audit records.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable — UPDATE and DELETE operations are not allowed';
END;
$$ LANGUAGE plpgsql;

-- audit_logs immutability
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_immutable_audit_logs'
    ) THEN
        CREATE TRIGGER trg_immutable_audit_logs
            BEFORE UPDATE OR DELETE ON audit_logs
            FOR EACH ROW
            EXECUTE FUNCTION prevent_audit_log_modification();
    END IF;
END $$;

-- clinical_audit_log immutability
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinical_audit_log' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_immutable_clinical_audit_log') THEN
            CREATE TRIGGER trg_immutable_clinical_audit_log
                BEFORE UPDATE OR DELETE ON clinical_audit_log
                FOR EACH ROW
                EXECUTE FUNCTION prevent_audit_log_modification();
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 5. VITAL SIGN RANGE VALIDATION
-- Prevents obviously impossible vital sign values from being stored.
-- Ranges are intentionally wide to accommodate edge cases.
-- ============================================================================

-- vitals table
ALTER TABLE vitals
    ADD CONSTRAINT chk_vitals_temperature
    CHECK (temperature IS NULL OR (temperature >= 25 AND temperature <= 45))
    NOT VALID;
ALTER TABLE vitals VALIDATE CONSTRAINT chk_vitals_temperature;

ALTER TABLE vitals
    ADD CONSTRAINT chk_vitals_pulse
    CHECK (pulse IS NULL OR (pulse >= 0 AND pulse <= 300))
    NOT VALID;
ALTER TABLE vitals VALIDATE CONSTRAINT chk_vitals_pulse;

ALTER TABLE vitals
    ADD CONSTRAINT chk_vitals_spo2
    CHECK (oxygen_saturation IS NULL OR (oxygen_saturation >= 0 AND oxygen_saturation <= 100))
    NOT VALID;
ALTER TABLE vitals VALIDATE CONSTRAINT chk_vitals_spo2;

ALTER TABLE vitals
    ADD CONSTRAINT chk_vitals_pain
    CHECK (pain_level IS NULL OR (pain_level >= 0 AND pain_level <= 10))
    NOT VALID;
ALTER TABLE vitals VALIDATE CONSTRAINT chk_vitals_pain;

ALTER TABLE vitals
    ADD CONSTRAINT chk_vitals_rr
    CHECK (respiratory_rate IS NULL OR (respiratory_rate >= 0 AND respiratory_rate <= 100))
    NOT VALID;
ALTER TABLE vitals VALIDATE CONSTRAINT chk_vitals_rr;

-- triage_assessments vital ranges
ALTER TABLE triage_assessments
    ADD CONSTRAINT chk_triage_temperature
    CHECK (temperature IS NULL OR (temperature >= 25 AND temperature <= 45))
    NOT VALID;
ALTER TABLE triage_assessments VALIDATE CONSTRAINT chk_triage_temperature;

ALTER TABLE triage_assessments
    ADD CONSTRAINT chk_triage_pulse
    CHECK (pulse IS NULL OR (pulse >= 0 AND pulse <= 300))
    NOT VALID;
ALTER TABLE triage_assessments VALIDATE CONSTRAINT chk_triage_pulse;

ALTER TABLE triage_assessments
    ADD CONSTRAINT chk_triage_spo2
    CHECK (spo2 IS NULL OR (spo2 >= 0 AND spo2 <= 100))
    NOT VALID;
ALTER TABLE triage_assessments VALIDATE CONSTRAINT chk_triage_spo2;

ALTER TABLE triage_assessments
    ADD CONSTRAINT chk_triage_pain
    CHECK (pain_score IS NULL OR (pain_score >= 0 AND pain_score <= 10))
    NOT VALID;
ALTER TABLE triage_assessments VALIDATE CONSTRAINT chk_triage_pain;

-- ============================================================================
-- 6. PROTECT BILLING ON CLOSED ENCOUNTERS
-- Extend the closed-encounter trigger to also cover billing_orders.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_billing_on_closed_encounter()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    -- Only check if encounter_id is set
    IF NEW.encounter_id IS NOT NULL THEN
        SELECT status INTO v_status
        FROM visits
        WHERE id = NEW.encounter_id;

        IF v_status IN ('Closed', 'Cancelled') THEN
            RAISE EXCEPTION 'Cannot create billing for a % encounter (encounter_id: %)',
                v_status, NEW.encounter_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_billing_closed_encounter'
    ) THEN
        CREATE TRIGGER trg_prevent_billing_closed_encounter
            BEFORE INSERT ON billing_orders
            FOR EACH ROW
            EXECUTE FUNCTION prevent_billing_on_closed_encounter();
    END IF;
END $$;

-- ============================================================================
-- SUMMARY:
-- 1. Three atomic stock RPCs: decrement_drug_stock, increment_drug_stock,
--    decrement_batch_stock — replace read-modify-write race conditions.
-- 2. CHECK constraints on 11 tables covering financial amounts, percentages,
--    quantities, and stock levels.
-- 3. Unique partial index enforcing one active encounter per patient.
-- 4. Immutability triggers on audit_logs and clinical_audit_log.
-- 5. Vital sign range checks on vitals and triage_assessments.
-- 6. Billing creation blocked on closed/cancelled encounters.
-- ============================================================================
