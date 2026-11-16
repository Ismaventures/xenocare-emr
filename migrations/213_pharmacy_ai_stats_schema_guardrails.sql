-- ============================================================================
-- Migration: 213_pharmacy_ai_stats_schema_guardrails.sql
-- Purpose:
--   Ensure pharmacy AI/reporting can read key status fields used for
--   operational stats, even on environments that missed earlier migrations.
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.prescriptions
  ADD COLUMN IF NOT EXISTS clinical_notes text,
  ADD COLUMN IF NOT EXISTS nhis_approval_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS billing_release_status text DEFAULT 'blocked',
  ADD COLUMN IF NOT EXISTS execution_status text DEFAULT 'draft';

ALTER TABLE IF EXISTS public.billing_items
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';

COMMIT;
