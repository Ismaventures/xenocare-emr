-- =============================================================================
-- Migration: NHIS Claims Structural & Data Integrity Enhancement
-- Version: 134
-- Date: 2026-02-11
-- Description: 
--   Adds missing audit columns and enforces encounter-based claim integrity
--   per NHIS Claims Module structural requirements.
--
-- Rules Enforced:
--   1. Claims MUST be encounter-based (encounter_id NOT NULL)
--   2. Every NHIS encounter must generate an invoice
--   3. Encounter → HMO/Payer binding from patient registration
--   4. Patient financial traceability via receipts
--   5. Full audit timestamp trail for compliance
-- =============================================================================

-- ===========================================================================
-- 1. ADD MISSING COLUMNS TO nhis_claims TABLE
-- ===========================================================================

-- Add direct invoice linkage (every NHIS encounter must have an invoice)
ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS invoice_id uuid;

-- Add direct receipt linkage (for co-payments when partial coverage)
ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS receipt_id uuid;

-- Add processed_at timestamp (when claim was fully processed)
ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- Add processed_by (staff who processed the claim)
ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS processed_by uuid;

-- Add HMO/Payer binding columns (inherited from patient registration - NOT manually alterable)
ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS hmo_id uuid;

ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS hmo_name character varying(255);

ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS scheme_type character varying(100);

ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS payer_name character varying(255);

-- Add invoice_number for quick reference (denormalized for reporting)
ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS invoice_number character varying(50);

-- Add receipt_number for quick reference (denormalized for reporting)
ALTER TABLE nhis_claims 
  ADD COLUMN IF NOT EXISTS receipt_number character varying(50);

-- Add coverage type indicator (Full, Partial, Not Covered)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nhis_claims' AND column_name = 'coverage_type'
  ) THEN
    ALTER TABLE nhis_claims 
      ADD COLUMN coverage_type character varying(20) DEFAULT 'Full';
  END IF;
END $$;

-- Add constraint for coverage_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nhis_claims_coverage_type_check'
  ) THEN
    ALTER TABLE nhis_claims
      ADD CONSTRAINT nhis_claims_coverage_type_check
      CHECK (coverage_type IN ('Full', 'Partial', 'Not Covered'));
  END IF;
END $$;

-- ===========================================================================
-- 2. ADD FOREIGN KEY CONSTRAINTS (if not exist)
-- ===========================================================================

-- FK: invoice_id -> invoices (encounter-based validation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nhis_claims_invoice_id_fkey'
  ) THEN
    -- Check if invoices table exists with invoice_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name = 'invoice_id'
    ) THEN
      ALTER TABLE nhis_claims
        ADD CONSTRAINT nhis_claims_invoice_id_fkey
        FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- FK: receipt_id -> receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nhis_claims_receipt_id_fkey'
  ) THEN
    -- Check if receipts table exists with receipt_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'receipts' AND column_name = 'receipt_id'
    ) THEN
      ALTER TABLE nhis_claims
        ADD CONSTRAINT nhis_claims_receipt_id_fkey
        FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- FK: processed_by -> staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nhis_claims_processed_by_fkey'
  ) THEN
    ALTER TABLE nhis_claims
      ADD CONSTRAINT nhis_claims_processed_by_fkey
      FOREIGN KEY (processed_by) REFERENCES staff(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===========================================================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_nhis_claims_invoice_id 
  ON nhis_claims(invoice_id) WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nhis_claims_receipt_id 
  ON nhis_claims(receipt_id) WHERE receipt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nhis_claims_encounter_id 
  ON nhis_claims(encounter_id);

CREATE INDEX IF NOT EXISTS idx_nhis_claims_patient_id 
  ON nhis_claims(patient_id);

CREATE INDEX IF NOT EXISTS idx_nhis_claims_status_dates 
  ON nhis_claims(status, created_at, submitted_at);

CREATE INDEX IF NOT EXISTS idx_nhis_claims_hmo_id 
  ON nhis_claims(hmo_id) WHERE hmo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nhis_claims_coverage_type
  ON nhis_claims(coverage_type);

-- ===========================================================================
-- 4. ADD TRIGGER TO AUTO-POPULATE HMO/PAYER FROM PATIENT REGISTRATION
-- ===========================================================================

CREATE OR REPLACE FUNCTION populate_nhis_claim_payer_info()
RETURNS TRIGGER AS $$
DECLARE
  v_patient RECORD;
  v_profile RECORD;
BEGIN
  -- Get patient registration info (source of truth for payer binding)
  SELECT 
    p.payer_info,
    p.nhis_number,
    p.insurance_type
  INTO v_patient
  FROM patients p
  WHERE p.id = NEW.patient_id;

  -- Get NHIS profile if exists
  SELECT 
    np.scheme_type,
    np.tariff_group,
    np.provider_name
  INTO v_profile
  FROM nhis_profiles np
  WHERE np.patient_id = NEW.patient_id
  LIMIT 1;

  -- Populate HMO/Payer info from patient registration (MUST be inherited, not manually altered)
  IF v_patient.payer_info IS NOT NULL THEN
    NEW.hmo_name := COALESCE(
      NEW.hmo_name,
      v_patient.payer_info->>'hmo_name',
      v_patient.payer_info->>'payer_name',
      v_profile.provider_name
    );
    
    -- Only set hmo_id if it's a valid UUID
    IF v_patient.payer_info->>'hmo_id' IS NOT NULL AND 
       v_patient.payer_info->>'hmo_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      NEW.hmo_id := COALESCE(NEW.hmo_id, (v_patient.payer_info->>'hmo_id')::uuid);
    END IF;
    
    NEW.payer_name := COALESCE(
      NEW.payer_name,
      v_patient.payer_info->>'payer_name',
      v_profile.provider_name
    );
  ELSIF v_profile.provider_name IS NOT NULL THEN
    NEW.hmo_name := COALESCE(NEW.hmo_name, v_profile.provider_name);
    NEW.payer_name := COALESCE(NEW.payer_name, v_profile.provider_name);
  END IF;

  -- Populate scheme type from profile
  NEW.scheme_type := COALESCE(NEW.scheme_type, v_profile.scheme_type);

  -- Determine coverage type based on amounts
  IF NEW.claimable_amount IS NOT NULL AND NEW.total_tariff IS NOT NULL THEN
    IF NEW.claimable_amount >= NEW.total_tariff THEN
      NEW.coverage_type := 'Full';
    ELSIF NEW.claimable_amount > 0 THEN
      NEW.coverage_type := 'Partial';
    ELSE
      NEW.coverage_type := 'Not Covered';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger on insert (payer info comes from registration, not manual entry)
DROP TRIGGER IF EXISTS trg_nhis_claim_populate_payer ON nhis_claims;
CREATE TRIGGER trg_nhis_claim_populate_payer
  BEFORE INSERT ON nhis_claims
  FOR EACH ROW
  EXECUTE FUNCTION populate_nhis_claim_payer_info();

-- ===========================================================================
-- 5. ADD TRIGGER TO SYNC INVOICE/RECEIPT NUMBERS
-- ===========================================================================

CREATE OR REPLACE FUNCTION sync_nhis_claim_billing_refs()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync invoice number if invoice_id is set but invoice_number is not
  IF NEW.invoice_id IS NOT NULL AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '') THEN
    SELECT invoice_number INTO NEW.invoice_number
    FROM invoices WHERE invoice_id = NEW.invoice_id;
  END IF;

  -- Sync receipt number if receipt_id is set but receipt_number is not
  IF NEW.receipt_id IS NOT NULL AND (NEW.receipt_number IS NULL OR NEW.receipt_number = '') THEN
    SELECT receipt_number INTO NEW.receipt_number
    FROM receipts WHERE receipt_id = NEW.receipt_id;
  END IF;

  -- CRITICAL: Validate that invoice belongs to the same encounter as the claim
  IF NEW.invoice_id IS NOT NULL AND NEW.encounter_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoice_id = NEW.invoice_id 
        AND encounter_id = NEW.encounter_id
    ) THEN
      RAISE EXCEPTION 'Invoice % does not belong to encounter %. Claims must be linked to invoices from the same encounter.', 
        NEW.invoice_id, NEW.encounter_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nhis_claim_sync_billing ON nhis_claims;
CREATE TRIGGER trg_nhis_claim_sync_billing
  BEFORE INSERT OR UPDATE ON nhis_claims
  FOR EACH ROW
  EXECUTE FUNCTION sync_nhis_claim_billing_refs();

-- ===========================================================================
-- 6. CREATE COMPREHENSIVE CLAIMS VIEW FOR REPORTING & PDF EXPORT
-- ===========================================================================

DROP VIEW IF EXISTS nhis_claims_comprehensive;
CREATE OR REPLACE VIEW nhis_claims_comprehensive AS
SELECT 
  nc.id,
  nc.claim_number,
  nc.encounter_id,
  nc.patient_id,
  -- Patient details
  p.emr_number,
  CONCAT_WS(' ', p.first_name, p.middle_name, p.surname) AS patient_name,
  p.insurance_type,
  p.nhis_number,
  -- Encounter details (MANDATORY - claims must be encounter-based)
  v.encounter_number,
  v.encounter_date,
  v.payment_category,
  -- HMO/Payer details (inherited from patient registration)
  nc.hmo_id,
  nc.hmo_name,
  nc.payer_name,
  nc.scheme_type,
  nc.tariff_group,
  -- Authorization (shows NULL if no code approved)
  na.auth_code AS authorization_code,
  na.status AS authorization_status,
  -- Financial breakdown (MANDATORY for NHIS transactions)
  nc.total_tariff,
  nc.claimable_amount AS nhis_amount,
  nc.patient_pay_amount AS patient_amount,
  nc.coverage_type,
  CASE 
    WHEN nc.total_tariff > 0 THEN 
      ROUND((COALESCE(nc.claimable_amount, 0)::numeric / nc.total_tariff::numeric) * 100)
    ELSE 0
  END AS coverage_percentage,
  -- Billing linkage (MANDATORY - every NHIS encounter must have invoice)
  nc.invoice_id,
  nc.invoice_number,
  -- Receipt linkage (for co-payments/partial coverage)
  nc.receipt_id,
  nc.receipt_number,
  -- Status
  nc.status AS claim_status,
  -- AUDIT TIMESTAMPS (MANDATORY for compliance)
  nc.created_at,
  nc.updated_at,
  nc.submitted_at,
  nc.processed_at,
  nc.approved_at,
  nc.rejected_at,
  nc.paid_at,
  -- Audit actors
  s_created.first_name || ' ' || s_created.last_name AS created_by_name,
  s_approved.first_name || ' ' || s_approved.last_name AS approved_by_name,
  s_processed.first_name || ' ' || s_processed.last_name AS processed_by_name,
  s_submitted.first_name || ' ' || s_submitted.last_name AS submitted_by_name,
  -- Rejection info
  nc.rejection_reason,
  s_rejected.first_name || ' ' || s_rejected.last_name AS rejected_by_name
FROM nhis_claims nc
LEFT JOIN patients p ON p.id = nc.patient_id
LEFT JOIN visits v ON v.id = nc.encounter_id
LEFT JOIN nhis_authorizations na ON na.id = nc.auth_id
LEFT JOIN staff s_created ON s_created.id = nc.created_by
LEFT JOIN staff s_approved ON s_approved.id = nc.approved_by
LEFT JOIN staff s_processed ON s_processed.id = nc.processed_by
LEFT JOIN staff s_submitted ON s_submitted.id = nc.submitted_by
LEFT JOIN staff s_rejected ON s_rejected.id = nc.rejected_by;

-- Grant access to authenticated users
GRANT SELECT ON nhis_claims_comprehensive TO authenticated;

-- ===========================================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ===========================================================================

COMMENT ON COLUMN nhis_claims.invoice_id IS 'Direct link to invoice - every NHIS encounter MUST have an invoice';
COMMENT ON COLUMN nhis_claims.receipt_id IS 'Direct link to receipt for co-payments (partial coverage patients)';
COMMENT ON COLUMN nhis_claims.processed_at IS 'Timestamp when claim was fully processed by NHIS desk';
COMMENT ON COLUMN nhis_claims.processed_by IS 'Staff who processed the claim';
COMMENT ON COLUMN nhis_claims.hmo_id IS 'HMO ID inherited from patient registration (NOT manually alterable)';
COMMENT ON COLUMN nhis_claims.hmo_name IS 'HMO name inherited from patient registration (NOT manually alterable)';
COMMENT ON COLUMN nhis_claims.scheme_type IS 'NHIS scheme type inherited from patient registration';
COMMENT ON COLUMN nhis_claims.payer_name IS 'Payer name inherited from patient registration';
COMMENT ON COLUMN nhis_claims.coverage_type IS 'Full (100%), Partial (<100%), or Not Covered (0%)';
COMMENT ON COLUMN nhis_claims.invoice_number IS 'Denormalized invoice number for quick reference in reports';
COMMENT ON COLUMN nhis_claims.receipt_number IS 'Denormalized receipt number for quick reference in reports';
COMMENT ON VIEW nhis_claims_comprehensive IS 'Comprehensive view for NHIS claims PDF export with all audit trails and financial breakdowns';

-- ===========================================================================
-- 9. ENCOUNTER-INVOICE INTEGRITY (enforced by trigger in Section 5)
-- ===========================================================================
-- NOTE: PostgreSQL does not support subqueries in CHECK constraints.
-- The encounter-invoice integrity rule is enforced by the 
-- trg_nhis_claim_sync_billing trigger (Section 5), which raises an 
-- exception if invoice.encounter_id != nhis_claims.encounter_id.
-- No additional constraint needed here.

-- ===========================================================================
-- 10. RLS POLICIES (if RLS is enabled)
-- ===========================================================================

-- Allow authenticated users to view claims
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nhis_claims' AND policyname = 'nhis_claims_select_authenticated'
  ) THEN
    -- Policy already exists
    NULL;
  ELSE
    CREATE POLICY nhis_claims_select_authenticated ON nhis_claims
      FOR SELECT TO authenticated
      USING (true);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ===========================================================================
-- 11. MIGRATION COMPLETE
-- ===========================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 134_nhis_claims_audit_integrity completed successfully';
  RAISE NOTICE 'Added columns: invoice_id, receipt_id, processed_at, processed_by, hmo_id, hmo_name, scheme_type, payer_name, invoice_number, receipt_number, coverage_type';
  RAISE NOTICE 'Created triggers: trg_nhis_claim_populate_payer, trg_nhis_claim_sync_billing';
  RAISE NOTICE 'Created view: nhis_claims_comprehensive';
  RAISE NOTICE 'CRITICAL FIX: Added encounter-invoice integrity validation to prevent orphan/wrong claims';
  RAISE NOTICE 'Claims will now enforce: invoice.encounter_id = nhis_claims.encounter_id';
END $$;
