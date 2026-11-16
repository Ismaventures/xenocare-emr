-- =============================================================================
-- Migration 065: Drop Category-Based Invoicing Tables
-- =============================================================================
-- Purpose: Remove the separate category tables since we will use existing tables
--          and group receipts by item_type (category) instead
-- =============================================================================

-- Drop views first
DROP VIEW IF EXISTS "public"."billing_audit_trail" CASCADE;
DROP VIEW IF EXISTS "public"."encounter_billing_summary" CASCADE;

-- Drop category receipts table
DROP TABLE IF EXISTS "public"."category_receipts" CASCADE;

-- Drop category invoice items table
DROP TABLE IF EXISTS "public"."category_invoice_items" CASCADE;

-- Drop category invoices table
DROP TABLE IF EXISTS "public"."category_invoices" CASCADE;

-- Drop billing audit log table
DROP TABLE IF EXISTS "public"."billing_audit_log" CASCADE;

-- =============================================================================
-- Create a simpler view for receipts grouped by category using existing tables
-- This uses billing_items.item_type to determine the service category
-- =============================================================================

-- View to get receipts with their associated billing items grouped by category
CREATE OR REPLACE VIEW "public"."receipts_by_category" AS
SELECT
  r.receipt_id,
  r.receipt_number,
  r.patient_id,
  r.encounter_id,
  r.billing_order_id,
  r.amount_paid,
  r.payment_method,
  r.issued_by,
  r.issue_date,
  bi.item_type AS category,
  -- Aggregate items by category
  SUM(bi.total_price) AS category_total,
  SUM(COALESCE(bi.nhis_payable, 0)) AS category_nhis_amount,
  SUM(COALESCE(bi.patient_payable, bi.total_price)) AS category_patient_amount,
  COUNT(bi.id) AS item_count,
  array_agg(DISTINCT bi.item_name) AS item_names
FROM receipts r
LEFT JOIN billing_orders bo ON bo.id = r.billing_order_id
LEFT JOIN billing_items bi ON bi.billing_order_id = bo.id
WHERE r.receipt_id IS NOT NULL
GROUP BY
  r.receipt_id,
  r.receipt_number,
  r.patient_id,
  r.encounter_id,
  r.billing_order_id,
  r.amount_paid,
  r.payment_method,
  r.issued_by,
  r.issue_date,
  bi.item_type;

COMMENT ON VIEW "public"."receipts_by_category" IS 'Receipts grouped by service category (item_type from billing_items)';

-- =============================================================================
-- View to get encounter receipts summary with category breakdown
-- =============================================================================

CREATE OR REPLACE VIEW "public"."encounter_receipts_summary" AS
SELECT
  r.encounter_id,
  r.patient_id,
  -- Total amounts across all receipts for this encounter
  SUM(r.amount_paid) AS total_paid,
  COUNT(DISTINCT r.receipt_id) AS receipt_count,
  -- Category breakdown as JSON
  jsonb_object_agg(
    COALESCE(bi.item_type::text, 'Other'),
    jsonb_build_object(
      'total', SUM(bi.total_price),
      'nhis_amount', SUM(COALESCE(bi.nhis_payable, 0)),
      'patient_amount', SUM(COALESCE(bi.patient_payable, bi.total_price)),
      'item_count', COUNT(bi.id)
    )
  ) FILTER (WHERE bi.item_type IS NOT NULL) AS categories,
  -- Latest receipt info
  MAX(r.issue_date) AS last_payment_date,
  MAX(r.receipt_number) AS last_receipt_number
FROM receipts r
LEFT JOIN billing_orders bo ON bo.id = r.billing_order_id
LEFT JOIN billing_items bi ON bi.billing_order_id = bo.id
WHERE r.encounter_id IS NOT NULL
GROUP BY r.encounter_id, r.patient_id;

COMMENT ON VIEW "public"."encounter_receipts_summary" IS 'Summary of all receipts for an encounter with category breakdown';

-- Grant permissions
GRANT SELECT ON "public"."receipts_by_category" TO authenticated;
GRANT SELECT ON "public"."encounter_receipts_summary" TO authenticated;
