-- =============================================================================
-- MUHEDA CLINIC — Clean operational data for a fresh start
--
-- WARNING: This permanently deletes patients, visits, clinical records,
-- orders, billing, pharmacy stock/batches, admissions, queue entries,
-- notifications, audit/embedding data and other operational records.
--
-- PRESERVED:
--   * staff login accounts and auth mappings
--   * facilities (MUHEDA configuration)
--   * departments, clinics, wards and beds (beds are reset to available)
--   * service catalogues and prices
--   * templates, configurations, permissions and role mappings
--   * schema, migrations and foreign-key structure
--
-- Run only after taking a database backup.
-- Take a backup first. This is not reversible.
-- =============================================================================

BEGIN;

-- 1. Release preserved beds before removing patients/visits.
UPDATE public.beds
SET
  current_patient_id = NULL,
  current_visit_id = NULL,
  status = 'Available',
  updated_at = now()
WHERE current_patient_id IS NOT NULL
   OR current_visit_id IS NOT NULL
   OR status <> 'Available';

-- 2. Temporarily detach preserved-table references to operational tables.
--    Dynamic lookup handles renamed constraints safely.
DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  IF to_regclass('public.beds') IS NOT NULL
     AND to_regclass('public.patients') IS NOT NULL
     AND to_regclass('public.visits') IS NOT NULL THEN
    FOR constraint_row IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.beds'::regclass
        AND confrelid IN (
          'public.patients'::regclass,
          'public.visits'::regclass
        )
    LOOP
      EXECUTE format(
        'ALTER TABLE public.beds DROP CONSTRAINT %I',
        constraint_row.conname
      );
    END LOOP;
  END IF;

  IF to_regclass('public.lab_form_templates') IS NOT NULL
     AND to_regclass('public.lab_requests') IS NOT NULL THEN
    FOR constraint_row IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.lab_form_templates'::regclass
        AND confrelid = 'public.lab_requests'::regclass
    LOOP
      EXECUTE format(
        'ALTER TABLE public.lab_form_templates DROP CONSTRAINT %I',
        constraint_row.conname
      );
    END LOOP;
  END IF;
END $$;

-- 3. Truncate operational data. Missing tables are skipped.
--    CASCADE clears dependent clinical/order/billing child tables.
DO $$
DECLARE
  target_table text;
  truncate_list text := '';
  tables text[] := ARRAY[
    -- Core patient/encounter chain
    'patients',
    'visits',
    'clinical_requests',
    'lab_requests',
    'radiology_requests',
    'prescriptions',
    'procedures',
    'admissions',
    'consultations',
    'queue',
    'queue_daily_counters',

    -- Billing
    'billing_orders',
    'invoices',
    'payments',
    'receipts',
    'category_invoices',

    -- Referrals and NHIS operational records
    'referrals',
    'external_referrals',
    'nhis_profiles',
    'nhis_approvals',
    'nhis_authorizations',
    'nhis_claims',

    -- Messages and notifications
    'notifications',
    'staff_messages',

    -- AI, embeddings and logs
    'ai_interaction_logs',
    'patient_record_embeddings',
    'pharmacy_record_embeddings',
    'audit_logs_archive',
    'comprehensive_audit_log',
    'clinical_audit_log',
    'billing_audit_log',
    'billing_audit_log_archive',
    'user_session_audit',
    'auth_audit_log',
    'service_price_audit',
    'idempotency_hash_mismatches',
    'version_conflict_log',
    'workflow_exceptions',

    -- Pharmacy/inventory operational stock
    'inventory_items',
    'drug_batches',
    'purchase_orders'
  ];
BEGIN
  FOREACH target_table IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      truncate_list := truncate_list || format('%I, ', target_table);
    END IF;
  END LOOP;

  IF length(truncate_list) > 0 THEN
    truncate_list := left(truncate_list, length(truncate_list) - 2);
    EXECUTE 'TRUNCATE TABLE ' || truncate_list || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

-- 4. Restore preserved-table references.
DO $$
BEGIN
  IF to_regclass('public.lab_form_templates') IS NOT NULL THEN
    UPDATE public.lab_form_templates
    SET source_request_id = NULL
    WHERE source_request_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.beds') IS NOT NULL THEN
    ALTER TABLE public.beds
      ADD CONSTRAINT beds_current_patient_id_fkey
      FOREIGN KEY (current_patient_id) REFERENCES public.patients(id);
    ALTER TABLE public.beds
      ADD CONSTRAINT beds_current_visit_id_fkey
      FOREIGN KEY (current_visit_id) REFERENCES public.visits(id);
  END IF;

  IF to_regclass('public.lab_form_templates') IS NOT NULL THEN
    ALTER TABLE public.lab_form_templates
      ADD CONSTRAINT lab_form_templates_source_request_id_fkey
      FOREIGN KEY (source_request_id)
      REFERENCES public.lab_requests(request_id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Reset standalone numbering sequences for a fresh start.
DO $$
BEGIN
  IF to_regclass('public.facility_emr_number_seq') IS NOT NULL THEN
    PERFORM setval('public.facility_emr_number_seq', 1, false);
  END IF;
  IF to_regclass('public.emr_number_seq') IS NOT NULL THEN
    PERFORM setval('public.emr_number_seq', 1, false);
  END IF;
  IF to_regclass('public.visit_id_seq') IS NOT NULL THEN
    PERFORM setval('public.visit_id_seq', 1001, false);
  END IF;
  IF to_regclass('public.encounter_number_seq') IS NOT NULL THEN
    PERFORM setval('public.encounter_number_seq', 1001, false);
  END IF;
END $$;

COMMIT;
