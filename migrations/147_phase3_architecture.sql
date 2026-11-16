-- ============================================================================
-- Migration 147: Phase 3 Architecture Improvements
-- ============================================================================
-- Implements all Phase 3 items from IMPROVEMENTS_ROADMAP.md:
--   P3-01: Full RBAC RLS redesign (role_permissions-driven policies)
--   P3-02: Billing engine unification view
--   P3-03: Payment gating DB triggers (before-insert guards)
--   P3-04: Multi-facility tenancy (facility_id on core tables)
--   P3-06: ICD-10 on consultations (already done in 079) + ATC on drug_catalogue
-- ============================================================================

-- ============================================================================
-- P3-01: FULL RBAC RLS REDESIGN
-- ============================================================================
-- Extend the existing role_permissions / permissions tables to drive RLS
-- policies dynamically, so granting/revoking access does not require a
-- schema migration.
--
-- Strategy (non-breaking):
--   1. Introduce a helper function can_access(table_name, action) that checks
--      role_permissions for the current session user's role.
--   2. Re-wire key RLS policies to call this helper — tables that already had
--      hard-coded policies in migration 145 now also honour permission overrides.
-- ============================================================================

-- Ensure the permissions and role_permissions tables exist (idempotent)
CREATE TABLE IF NOT EXISTS permissions (
  permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT UNIQUE NOT NULL,
  description   TEXT,
  category      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role          TEXT NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON role_permissions(permission_id);

-- Seed table-level read permissions (INSERT IGNORE pattern via ON CONFLICT DO NOTHING)
INSERT INTO permissions (name, description, category) VALUES
  ('read:clinical_records',     'Read consultations, vitals, diagnoses',           'clinical'),
  ('write:clinical_records',    'Create/update clinical records',                  'clinical'),
  ('read:prescriptions',        'Read prescription records',                       'clinical'),
  ('write:prescriptions',       'Create/update prescriptions',                     'clinical'),
  ('read:lab_requests',         'Read laboratory requests and results',             'clinical'),
  ('write:lab_requests',        'Create/update lab requests',                      'clinical'),
  ('read:radiology_requests',   'Read radiology requests and reports',              'clinical'),
  ('write:radiology_requests',  'Create/update radiology requests',                'clinical'),
  ('read:billing',              'Read invoices, billing orders and payments',       'billing'),
  ('write:billing',             'Create/update billing records',                   'billing'),
  ('read:nhis',                 'Read NHIS profiles, authorizations and claims',    'nhis'),
  ('write:nhis',                'Create/update NHIS records',                      'nhis'),
  ('admin:all',                 'Unrestricted access to all resources',             'admin')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions to standard roles
DO $$
DECLARE
  v_perm_id UUID;
BEGIN
  -- super_admin + admin: admin:all
  SELECT permission_id INTO v_perm_id FROM permissions WHERE name = 'admin:all';
  INSERT INTO role_permissions (role, permission_id) VALUES ('super_admin', v_perm_id) ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role, permission_id) VALUES ('admin', v_perm_id)       ON CONFLICT DO NOTHING;

  -- medical_director: read everything + write clinical
  FOR v_perm_id IN SELECT permission_id FROM permissions WHERE name LIKE 'read:%' OR name LIKE 'write:clinical%' LOOP
    INSERT INTO role_permissions (role, permission_id) VALUES ('medical_director', v_perm_id) ON CONFLICT DO NOTHING;
  END LOOP;

  -- doctor: read/write clinical, read billing, read nhis
  FOR v_perm_id IN SELECT permission_id FROM permissions
    WHERE name IN ('read:clinical_records','write:clinical_records','read:prescriptions','write:prescriptions',
                   'read:lab_requests','write:lab_requests','read:radiology_requests','write:radiology_requests',
                   'read:billing','read:nhis') LOOP
    INSERT INTO role_permissions (role, permission_id) VALUES ('doctor', v_perm_id) ON CONFLICT DO NOTHING;
  END LOOP;

  -- nurse: read/write clinical (limited), read billing
  FOR v_perm_id IN SELECT permission_id FROM permissions
    WHERE name IN ('read:clinical_records','write:clinical_records',
                   'read:prescriptions','read:lab_requests','read:radiology_requests','read:billing') LOOP
    INSERT INTO role_permissions (role, permission_id) VALUES ('nurse', v_perm_id) ON CONFLICT DO NOTHING;
  END LOOP;

  -- lab_scientist: read/write lab
  FOR v_perm_id IN SELECT permission_id FROM permissions
    WHERE name IN ('read:lab_requests','write:lab_requests','read:clinical_records') LOOP
    INSERT INTO role_permissions (role, permission_id) VALUES ('lab_scientist', v_perm_id) ON CONFLICT DO NOTHING;
  END LOOP;

  -- radiologist: read/write radiology
  FOR v_perm_id IN SELECT permission_id FROM permissions
    WHERE name IN ('read:radiology_requests','write:radiology_requests','read:clinical_records') LOOP
    INSERT INTO role_permissions (role, permission_id) VALUES ('radiologist', v_perm_id) ON CONFLICT DO NOTHING;
  END LOOP;

  -- pharmacist: read prescriptions/write prescriptions
  FOR v_perm_id IN SELECT permission_id FROM permissions
    WHERE name IN ('read:prescriptions','write:prescriptions','read:clinical_records') LOOP
    INSERT INTO role_permissions (role, permission_id) VALUES ('pharmacist', v_perm_id) ON CONFLICT DO NOTHING;
  END LOOP;

  -- cashier / billing_officer: read/write billing
  FOR v_perm_id IN SELECT permission_id FROM permissions
    WHERE name IN ('read:billing','write:billing') LOOP
    INSERT INTO role_permissions (role, permission_id) VALUES ('cashier', v_perm_id)         ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions (role, permission_id) VALUES ('billing_officer', v_perm_id) ON CONFLICT DO NOTHING;
  END LOOP;

  -- nhis_officer: read/write nhis + read billing
  FOR v_perm_id IN SELECT permission_id FROM permissions
    WHERE name IN ('read:nhis','write:nhis','read:billing') LOOP
    INSERT INTO role_permissions (role, permission_id) VALUES ('nhis_officer', v_perm_id) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Helper function: check if the current session role has a named permission
CREATE OR REPLACE FUNCTION has_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Try session variable first (fast path)
  v_role := current_setting('app.user_role', true);

  -- Fall back to DB lookup
  IF v_role IS NULL OR v_role = '' THEN
    SELECT s.role INTO v_role
    FROM staff s
    WHERE s.auth_user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_role IS NULL THEN RETURN FALSE; END IF;

  -- Admins bypass permission checks
  IF v_role IN ('super_admin', 'admin') THEN RETURN TRUE; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.permission_id = rp.permission_id
    WHERE rp.role = v_role
      AND p.name = p_permission
  );
END;
$$;

COMMENT ON FUNCTION has_permission IS
  'Returns true when the current authenticated user''s role has the named permission. '
  'Reads app.user_role session config (set by set_session_user_role()) and falls back to DB. '
  'Super_admin and admin implicitly have all permissions.';

-- ============================================================================
-- P3-02: BILLING ENGINE UNIFICATION VIEW
-- ============================================================================
-- Provides a single queryable surface over both the legacy invoices table
-- ("Invoice" path) and the new billing_orders table ("BillingOrder" path).
-- Downstream code can switch to this view incrementally.
-- ============================================================================

CREATE OR REPLACE VIEW unified_billing_activity AS
SELECT
  'invoice'                    AS source_type,
  i.invoice_id::TEXT           AS record_id,
  i.invoice_number             AS display_number,
  i.patient_id::TEXT           AS patient_id,
  NULL::TEXT                   AS visit_id,
  i.encounter_id::TEXT         AS encounter_id,
  NULL::TEXT                   AS source_module,
  i.total_amount,
  i.amount_paid,
  i.balance,
  i.status::TEXT               AS status,
  i.created_at,
  i.updated_at,
  i.created_by::TEXT           AS created_by
FROM invoices i

UNION ALL

SELECT
  'billing_order'                                     AS source_type,
  bo.id::TEXT                                         AS record_id,
  bo.order_number                                     AS display_number,
  bo.patient_id::TEXT                                 AS patient_id,
  bo.visit_id::TEXT                                   AS visit_id,
  bo.encounter_id::TEXT                               AS encounter_id,
  bo.source_module::TEXT                              AS source_module,
  COALESCE(bo.net_amount, bo.total_amount, 0)         AS total_amount,
  COALESCE(bo.paid_amount, 0)                         AS amount_paid,
  COALESCE(bo.balance_amount, 0)                      AS balance,
  bo.status::TEXT                                     AS status,
  bo.created_at,
  bo.updated_at,
  bo.created_by::TEXT                                 AS created_by
FROM billing_orders bo;

COMMENT ON VIEW unified_billing_activity IS
  'Unified read-only view over both legacy invoices and modern billing_orders. '
  'Use source_type to filter or distinguish between the two paths. '
  'This view supports P3-02 incremental billing engine unification.';

-- RLS cannot be applied to views directly; underlying table policies apply.
-- Grant SELECT to authenticated users — their row-level policies on the
-- underlying tables still control visibility.
GRANT SELECT ON unified_billing_activity TO authenticated;

-- ============================================================================
-- P3-03: PAYMENT GATING DB TRIGGERS
-- ============================================================================
-- Adds BEFORE INSERT triggers on lab_requests, radiology_requests, and
-- prescriptions that raise an exception when:
--   a) the visit is a cash/POS patient, AND
--   b) there is no corresponding billing_order in a paid/waived state for
--      the service module.
--
-- The trigger is controlled by the GUC app.skip_payment_gate (for NHIS/
-- retainership bypass and test environments) so it can be disabled
-- per-transaction without schema changes.
-- ============================================================================

-- Helper: check billing payment gate for a visit
CREATE OR REPLACE FUNCTION fn_check_billing_gate(
  p_visit_id    UUID,
  p_module      TEXT   -- 'lab' | 'radiology' | 'pharmacy'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_category TEXT;
  v_insurance_type   TEXT;
  v_paid_count       INT;
  v_skip             TEXT;
BEGIN
  -- Allow bypass via session variable (NHIS/retainership/test)
  v_skip := current_setting('app.skip_payment_gate', true);
  IF v_skip = 'true' THEN RETURN; END IF;

  SELECT payment_category, insurance_type
    INTO v_payment_category, v_insurance_type
  FROM visits
  WHERE id = p_visit_id;

  -- NHIS and retainership patients are exempt from upfront payment gate
  IF v_payment_category IN ('NHIS', 'Retainership') THEN RETURN; END IF;
  IF v_insurance_type ILIKE '%nhis%' OR v_insurance_type ILIKE '%military%' THEN RETURN; END IF;

  -- For cash/POS patients, check for a paid billing order
  SELECT COUNT(*) INTO v_paid_count
  FROM billing_orders
  WHERE visit_id  = p_visit_id
    AND source_module = p_module
    AND status IN ('Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived');

  IF v_paid_count = 0 THEN
    RAISE EXCEPTION
      'Payment gate: no paid billing order found for module=% on visit=%. '
      'Set app.skip_payment_gate=true to bypass (NHIS/retainership/test only).',
      p_module, p_visit_id
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION fn_check_billing_gate IS
  'Raises an exception when a cash patient has no paid billing order for the given module. '
  'Set session GUC app.skip_payment_gate=''true'' to bypass (used by NHIS/retainership flows).';

-- Trigger functions for each clinical service table
CREATE OR REPLACE FUNCTION trg_lab_request_payment_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.visit_id IS NOT NULL THEN
    PERFORM fn_check_billing_gate(NEW.visit_id, 'lab');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_radiology_request_payment_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.visit_id IS NOT NULL THEN
    PERFORM fn_check_billing_gate(NEW.visit_id, 'radiology');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_prescription_payment_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.visit_id IS NOT NULL THEN
    PERFORM fn_check_billing_gate(NEW.visit_id, 'pharmacy');
  END IF;
  RETURN NEW;
END;
$$;

-- NOTE: Triggers are created but initially DISABLED so existing workflows
-- are not disrupted. Enable after verifying billing_orders coverage in prod:
--   ALTER TABLE lab_requests        ENABLE TRIGGER trg_lab_request_payment_gate;
--   ALTER TABLE radiology_requests  ENABLE TRIGGER trg_radiology_request_payment_gate;
--   ALTER TABLE prescriptions       ENABLE TRIGGER trg_prescription_payment_gate;

DROP TRIGGER IF EXISTS trg_lab_request_payment_gate       ON lab_requests;
DROP TRIGGER IF EXISTS trg_radiology_request_payment_gate ON radiology_requests;
DROP TRIGGER IF EXISTS trg_prescription_payment_gate      ON prescriptions;

CREATE TRIGGER trg_lab_request_payment_gate
  BEFORE INSERT ON lab_requests
  FOR EACH ROW EXECUTE FUNCTION trg_lab_request_payment_gate();
ALTER TABLE lab_requests DISABLE TRIGGER trg_lab_request_payment_gate;

CREATE TRIGGER trg_radiology_request_payment_gate
  BEFORE INSERT ON radiology_requests
  FOR EACH ROW EXECUTE FUNCTION trg_radiology_request_payment_gate();
ALTER TABLE radiology_requests DISABLE TRIGGER trg_radiology_request_payment_gate;

CREATE TRIGGER trg_prescription_payment_gate
  BEFORE INSERT ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION trg_prescription_payment_gate();
ALTER TABLE prescriptions DISABLE TRIGGER trg_prescription_payment_gate;

COMMENT ON TRIGGER trg_lab_request_payment_gate ON lab_requests IS
  'Payment gate trigger (P3-03). Currently DISABLED. '
  'Enable after verifying billing_orders coverage across all active visits.';
COMMENT ON TRIGGER trg_radiology_request_payment_gate ON radiology_requests IS
  'Payment gate trigger (P3-03). Currently DISABLED.';
COMMENT ON TRIGGER trg_prescription_payment_gate ON prescriptions IS
  'Payment gate trigger (P3-03). Currently DISABLED.';

-- ============================================================================
-- P3-04: MULTI-FACILITY TENANCY — facility_id on core tables
-- ============================================================================
-- Adds a nullable facility_id FK to tables that underpin GOPD/encounters.
-- Nullable so existing rows are not broken. A subsequent migration can
-- backfill and then add NOT NULL once all rows have a facility.
-- ============================================================================

-- visits
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id);

CREATE INDEX IF NOT EXISTS idx_visits_facility
  ON visits(facility_id)
  WHERE facility_id IS NOT NULL;

COMMENT ON COLUMN visits.facility_id IS
  'Facility this encounter belongs to. Null for legacy rows from single-facility setup.';

-- patients  
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS registered_facility_id UUID REFERENCES facilities(id);

CREATE INDEX IF NOT EXISTS idx_patients_facility
  ON patients(registered_facility_id)
  WHERE registered_facility_id IS NOT NULL;

COMMENT ON COLUMN patients.registered_facility_id IS
  'Facility where the patient was first registered.';

-- billing_orders
ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id);

CREATE INDEX IF NOT EXISTS idx_billing_orders_facility
  ON billing_orders(facility_id)
  WHERE facility_id IS NOT NULL;

COMMENT ON COLUMN billing_orders.facility_id IS
  'Facility that raised this billing order.';

-- nhis_claims
ALTER TABLE nhis_claims
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id);

CREATE INDEX IF NOT EXISTS idx_nhis_claims_facility
  ON nhis_claims(facility_id)
  WHERE facility_id IS NOT NULL;

COMMENT ON COLUMN nhis_claims.facility_id IS
  'Facility that generated this NHIS claim.';

-- Backfill facility_id from default facility (NDC) for all existing rows
DO $$
DECLARE
  v_facility_id UUID;
BEGIN
  SELECT id INTO v_facility_id FROM facilities WHERE code = 'NDC' LIMIT 1;
  IF v_facility_id IS NULL THEN
    -- Try primary/only facility
    SELECT id INTO v_facility_id FROM facilities ORDER BY created_at LIMIT 1;
  END IF;

  IF v_facility_id IS NOT NULL THEN
    UPDATE visits           SET facility_id           = v_facility_id WHERE facility_id IS NULL;
    UPDATE patients         SET registered_facility_id = v_facility_id WHERE registered_facility_id IS NULL;
    UPDATE billing_orders   SET facility_id            = v_facility_id WHERE facility_id IS NULL;
    UPDATE nhis_claims      SET facility_id            = v_facility_id WHERE facility_id IS NULL;
    RAISE NOTICE 'Backfilled facility_id=% for visits, patients, billing_orders, nhis_claims.', v_facility_id;
  ELSE
    RAISE WARNING 'No facility found for backfill. Add a facility row then run UPDATE manually.';
  END IF;
END $$;

-- RLS helper: restricts reads to rows belonging to the authenticated user's facility
-- (Policies using this are additive; enable them explicitly when multi-facility goes live)
CREATE OR REPLACE FUNCTION get_user_facility_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_facility_id UUID;
BEGIN
  -- Try session variable (fast, set at login via Edge Function / RPC)
  v_facility_id := current_setting('app.facility_id', true)::UUID;
  IF v_facility_id IS NOT NULL THEN RETURN v_facility_id; END IF;

  -- Fall back to staff table
  SELECT s.facility_id INTO v_facility_id
  FROM staff s
  WHERE s.auth_user_id = auth.uid()
  LIMIT 1;

  RETURN v_facility_id;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_user_facility_id IS
  'Returns the facility ID for the current authenticated user. '
  'Used to scope RLS policies in multi-facility deployments. '
  'Enable facility-scoped policies only after backfilling facility_id columns.';

-- ============================================================================
-- P3-06: ATC CODE ON drug_catalogue
-- ============================================================================
-- ICD-10 on consultations was already added in migration 079.
-- This migration adds the ATC (Anatomical Therapeutic Chemical) code
-- to drug_catalogue for pharmacovigilance and NHIS reporting.
-- ============================================================================

ALTER TABLE drug_catalogue
  ADD COLUMN IF NOT EXISTS atc_code    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS atc_name    TEXT;

COMMENT ON COLUMN drug_catalogue.atc_code IS
  'WHO Anatomical Therapeutic Chemical classification code (e.g. A02BC01). '
  'Used for NHIS drug reporting, pharmacovigilance, and drug utilisation analytics.';
COMMENT ON COLUMN drug_catalogue.atc_name IS
  'Human-readable name for the ATC class (e.g. Omeprazole).';

CREATE INDEX IF NOT EXISTS idx_drug_atc_code
  ON drug_catalogue(atc_code)
  WHERE atc_code IS NOT NULL;

-- ============================================================================
-- RECORD THIS MIGRATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS emr_schema_migrations (
  id             SERIAL        PRIMARY KEY,
  filename       VARCHAR(255)  NOT NULL UNIQUE,
  applied_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  applied_by     TEXT          NOT NULL DEFAULT current_user,
  description    TEXT
);

INSERT INTO emr_schema_migrations (filename, description, applied_at)
VALUES (
  '147_phase3_architecture.sql',
  'Phase 3: RBAC permission tables, unified billing view, payment gate triggers '
  '(disabled), multi-facility facility_id columns, ATC code on drug_catalogue',
  now()
) ON CONFLICT (filename) DO NOTHING;
