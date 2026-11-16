-- =============================================================================
-- Migration: 064_category_based_invoicing.sql
-- Purpose: Implement category-based invoicing system
-- Description:
--   - Add invoice_category enum for service categories
--   - Add item verification fields to billing_items
--   - Create category_invoices table (one invoice per category per encounter)
--   - Create category_invoice_items junction table
--   - Create billing_audit_log table for comprehensive audit trail
-- =============================================================================

-- =============================================================================
-- 1. CREATE ENUMS
-- =============================================================================

-- Invoice Category Enum (matches service types for billing)
DO $$ BEGIN
  CREATE TYPE "public"."invoice_category" AS ENUM (
    'Pharmacy',
    'Laboratory',
    'Radiology',
    'Procedures',
    'Consultation',
    'Nursing',
    'Admission',
    'Supplies',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Item Verification Status Enum
DO $$ BEGIN
  CREATE TYPE "public"."item_verification_status" AS ENUM (
    'pending',
    'verified',
    'adjusted',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Billing Audit Event Type Enum
DO $$ BEGIN
  CREATE TYPE "public"."billing_audit_event" AS ENUM (
    'ITEM_CREATED',
    'ITEM_VERIFIED',
    'ITEM_ADJUSTED',
    'ITEM_REJECTED',
    'PRICE_CHANGED',
    'CATEGORY_GROUPED',
    'INVOICE_GENERATED',
    'INVOICE_VOIDED',
    'RECEIPT_GENERATED',
    'RECEIPT_VOIDED',
    'PAYMENT_RECORDED',
    'PAYMENT_REVERSED',
    'STOCK_VALIDATED',
    'STOCK_VALIDATION_FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. ADD VERIFICATION FIELDS TO BILLING_ITEMS
-- =============================================================================

-- Add verification status field
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "verification_status" "public"."item_verification_status"
DEFAULT 'pending'::"public"."item_verification_status";

-- Add verified_by field (UUID reference to staff)
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "verified_by" "uuid";

-- Add verified_at timestamp
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;

-- Add rejection_reason for rejected items
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "rejection_reason" text;

-- Add adjusted_price for price adjustments during verification
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "adjusted_price" numeric(10,2);

-- Add adjusted_by for tracking who adjusted the price
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "adjusted_by" "uuid";

-- Add adjusted_at timestamp
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "adjusted_at" timestamp with time zone;

-- Add original_price to preserve original price before adjustment
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "original_price" numeric(10,2);

-- Add stock_validated flag for drugs
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "stock_validated" boolean DEFAULT false;

-- Add stock_validated_at timestamp
ALTER TABLE "public"."billing_items"
ADD COLUMN IF NOT EXISTS "stock_validated_at" timestamp with time zone;

-- Add comments for new columns
COMMENT ON COLUMN "public"."billing_items"."verification_status" IS 'Status of item verification: pending, verified, adjusted, or rejected';
COMMENT ON COLUMN "public"."billing_items"."verified_by" IS 'Staff UUID who verified this item';
COMMENT ON COLUMN "public"."billing_items"."verified_at" IS 'Timestamp when item was verified';
COMMENT ON COLUMN "public"."billing_items"."rejection_reason" IS 'Reason for rejection if item was rejected';
COMMENT ON COLUMN "public"."billing_items"."adjusted_price" IS 'New price if item price was adjusted during verification';
COMMENT ON COLUMN "public"."billing_items"."adjusted_by" IS 'Staff UUID who adjusted the price';
COMMENT ON COLUMN "public"."billing_items"."adjusted_at" IS 'Timestamp when price was adjusted';
COMMENT ON COLUMN "public"."billing_items"."original_price" IS 'Original price before any adjustment - preserved for audit';
COMMENT ON COLUMN "public"."billing_items"."stock_validated" IS 'Whether stock availability was validated (for drugs)';
COMMENT ON COLUMN "public"."billing_items"."stock_validated_at" IS 'Timestamp when stock was validated';

-- =============================================================================
-- 3. CREATE CATEGORY_INVOICES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."category_invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "category" "public"."invoice_category" NOT NULL,

    -- Financial fields
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "discount_reason" text,
    "discount_authorized_by" "uuid",
    "tax_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "amount_paid" numeric(12,2) DEFAULT 0 NOT NULL,
    "balance" numeric(12,2) DEFAULT 0 NOT NULL,

    -- NHIS fields
    "nhis_covered" boolean DEFAULT false,
    "nhis_percentage" integer DEFAULT 0,
    "nhis_payable" numeric(12,2) DEFAULT 0,
    "patient_payable" numeric(12,2) DEFAULT 0,

    -- Status and tracking
    "status" character varying(50) DEFAULT 'Draft' NOT NULL,
    "verification_complete" boolean DEFAULT false,
    "all_items_verified" boolean DEFAULT false,
    "item_count" integer DEFAULT 0,
    "verified_item_count" integer DEFAULT 0,
    "rejected_item_count" integer DEFAULT 0,

    -- Metadata
    "notes" text,
    "due_date" date,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" text,

    CONSTRAINT "category_invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "category_invoices_invoice_number_key" UNIQUE ("invoice_number"),
    -- Ensure only one invoice per category per encounter
    CONSTRAINT "category_invoices_encounter_category_unique" UNIQUE ("encounter_id", "category"),
    -- Status must be valid
    CONSTRAINT "category_invoices_status_check" CHECK (
        status IN ('Draft', 'Pending', 'Verified', 'Partial', 'Paid', 'Overdue', 'Cancelled', 'Voided')
    ),
    -- Totals must be non-negative
    CONSTRAINT "category_invoices_amounts_positive" CHECK (
        subtotal >= 0 AND total_amount >= 0 AND amount_paid >= 0 AND balance >= 0
    ),
    -- Balance must equal total minus paid
    CONSTRAINT "category_invoices_balance_check" CHECK (
        balance = total_amount - amount_paid
    )
);

ALTER TABLE "public"."category_invoices" OWNER TO "postgres";

-- Add comments
COMMENT ON TABLE "public"."category_invoices" IS 'Category-based invoices - one invoice per service category per encounter';
COMMENT ON COLUMN "public"."category_invoices"."category" IS 'Service category: Pharmacy, Laboratory, Radiology, Procedures, etc.';
COMMENT ON COLUMN "public"."category_invoices"."verification_complete" IS 'True when all items have been verified (verified, adjusted, or rejected)';
COMMENT ON COLUMN "public"."category_invoices"."all_items_verified" IS 'True when all items are verified or adjusted (none pending or rejected)';

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_category_invoices_encounter" ON "public"."category_invoices" ("encounter_id");
CREATE INDEX IF NOT EXISTS "idx_category_invoices_patient" ON "public"."category_invoices" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_category_invoices_category" ON "public"."category_invoices" ("category");
CREATE INDEX IF NOT EXISTS "idx_category_invoices_status" ON "public"."category_invoices" ("status");
CREATE INDEX IF NOT EXISTS "idx_category_invoices_created_at" ON "public"."category_invoices" ("created_at" DESC);

-- =============================================================================
-- 4. CREATE CATEGORY_INVOICE_ITEMS JUNCTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."category_invoice_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_invoice_id" "uuid" NOT NULL,
    "billing_item_id" "uuid" NOT NULL,
    "billing_order_id" "uuid",

    -- Snapshot of item details at invoice generation time
    "item_name" character varying(255) NOT NULL,
    "item_type" "public"."service_type",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,

    -- NHIS snapshot
    "nhis_covered" boolean DEFAULT false,
    "nhis_percentage" integer DEFAULT 0,
    "nhis_payable" numeric(10,2) DEFAULT 0,
    "patient_payable" numeric(10,2) DEFAULT 0,

    -- Verification snapshot
    "verification_status" "public"."item_verification_status" NOT NULL,
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "adjusted_price" numeric(10,2),
    "rejection_reason" text,

    -- Display order
    "display_order" integer DEFAULT 0,

    "created_at" timestamp with time zone DEFAULT "now"(),

    CONSTRAINT "category_invoice_items_pkey" PRIMARY KEY ("id"),
    -- Each billing item can only appear once per category invoice
    CONSTRAINT "category_invoice_items_unique" UNIQUE ("category_invoice_id", "billing_item_id")
);

ALTER TABLE "public"."category_invoice_items" OWNER TO "postgres";

COMMENT ON TABLE "public"."category_invoice_items" IS 'Junction table linking category invoices to their billing items with snapshots';

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_category_invoice_items_invoice" ON "public"."category_invoice_items" ("category_invoice_id");
CREATE INDEX IF NOT EXISTS "idx_category_invoice_items_billing_item" ON "public"."category_invoice_items" ("billing_item_id");

-- =============================================================================
-- 5. CREATE CATEGORY_RECEIPTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."category_receipts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "receipt_number" character varying(50) NOT NULL,
    "category_invoice_id" "uuid" NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "category" "public"."invoice_category" NOT NULL,

    -- Payment details
    "amount_paid" numeric(12,2) NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "reference_number" character varying(100),

    -- NHIS details (mirror of invoice)
    "nhis_covered" boolean DEFAULT false,
    "nhis_amount" numeric(12,2) DEFAULT 0,
    "patient_amount" numeric(12,2) DEFAULT 0,

    -- Item summary (denormalized for quick access)
    "item_count" integer DEFAULT 0,
    "items_summary" jsonb,

    -- Metadata
    "issued_by" "uuid",
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" text,

    CONSTRAINT "category_receipts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "category_receipts_receipt_number_key" UNIQUE ("receipt_number")
);

ALTER TABLE "public"."category_receipts" OWNER TO "postgres";

COMMENT ON TABLE "public"."category_receipts" IS 'Category-based receipts - one receipt per category invoice, mirrors invoice structure';

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_category_receipts_invoice" ON "public"."category_receipts" ("category_invoice_id");
CREATE INDEX IF NOT EXISTS "idx_category_receipts_encounter" ON "public"."category_receipts" ("encounter_id");
CREATE INDEX IF NOT EXISTS "idx_category_receipts_patient" ON "public"."category_receipts" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_category_receipts_issued_at" ON "public"."category_receipts" ("issued_at" DESC);

-- =============================================================================
-- 6. CREATE BILLING_AUDIT_LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."billing_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_type" "public"."billing_audit_event" NOT NULL,

    -- Entity being audited
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,

    -- Related entities for context
    "encounter_id" "uuid",
    "patient_id" "uuid",
    "billing_order_id" "uuid",
    "billing_item_id" "uuid",
    "category_invoice_id" "uuid",
    "category_receipt_id" "uuid",

    -- Change details
    "old_value" jsonb,
    "new_value" jsonb,
    "changes_summary" text,

    -- Actor information
    "performed_by" "uuid" NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" inet,
    "user_agent" text,

    -- Additional context
    "notes" text,
    "metadata" jsonb,

    CONSTRAINT "billing_audit_log_pkey" PRIMARY KEY ("id"),
    -- Entity type must be valid
    CONSTRAINT "billing_audit_log_entity_type_check" CHECK (
        entity_type IN ('billing_item', 'billing_order', 'category_invoice', 'category_receipt', 'receipt', 'invoice')
    )
);

ALTER TABLE "public"."billing_audit_log" OWNER TO "postgres";

COMMENT ON TABLE "public"."billing_audit_log" IS 'Comprehensive audit log for all billing operations';
COMMENT ON COLUMN "public"."billing_audit_log"."old_value" IS 'Previous state of the entity (JSON snapshot)';
COMMENT ON COLUMN "public"."billing_audit_log"."new_value" IS 'New state of the entity (JSON snapshot)';
COMMENT ON COLUMN "public"."billing_audit_log"."changes_summary" IS 'Human-readable summary of changes';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_billing_audit_log_event_type" ON "public"."billing_audit_log" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_billing_audit_log_entity" ON "public"."billing_audit_log" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_billing_audit_log_encounter" ON "public"."billing_audit_log" ("encounter_id");
CREATE INDEX IF NOT EXISTS "idx_billing_audit_log_patient" ON "public"."billing_audit_log" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_billing_audit_log_performed_at" ON "public"."billing_audit_log" ("performed_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_billing_audit_log_performed_by" ON "public"."billing_audit_log" ("performed_by");

-- =============================================================================
-- 7. ADD FOREIGN KEY CONSTRAINTS (idempotent - skip if already exists)
-- =============================================================================

DO $$ BEGIN
  -- Category Invoices FKs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoices_encounter_fkey') THEN
    ALTER TABLE "public"."category_invoices" ADD CONSTRAINT "category_invoices_encounter_fkey"
      FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoices_patient_fkey') THEN
    ALTER TABLE "public"."category_invoices" ADD CONSTRAINT "category_invoices_patient_fkey"
      FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoices_created_by_fkey') THEN
    ALTER TABLE "public"."category_invoices" ADD CONSTRAINT "category_invoices_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoices_discount_auth_fkey') THEN
    ALTER TABLE "public"."category_invoices" ADD CONSTRAINT "category_invoices_discount_auth_fkey"
      FOREIGN KEY ("discount_authorized_by") REFERENCES "public"."staff"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoices_voided_by_fkey') THEN
    ALTER TABLE "public"."category_invoices" ADD CONSTRAINT "category_invoices_voided_by_fkey"
      FOREIGN KEY ("voided_by") REFERENCES "public"."staff"("id");
  END IF;

  -- Category Invoice Items FKs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoice_items_invoice_fkey') THEN
    ALTER TABLE "public"."category_invoice_items" ADD CONSTRAINT "category_invoice_items_invoice_fkey"
      FOREIGN KEY ("category_invoice_id") REFERENCES "public"."category_invoices"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoice_items_billing_item_fkey') THEN
    ALTER TABLE "public"."category_invoice_items" ADD CONSTRAINT "category_invoice_items_billing_item_fkey"
      FOREIGN KEY ("billing_item_id") REFERENCES "public"."billing_items"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoice_items_billing_order_fkey') THEN
    ALTER TABLE "public"."category_invoice_items" ADD CONSTRAINT "category_invoice_items_billing_order_fkey"
      FOREIGN KEY ("billing_order_id") REFERENCES "public"."billing_orders"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_invoice_items_verified_by_fkey') THEN
    ALTER TABLE "public"."category_invoice_items" ADD CONSTRAINT "category_invoice_items_verified_by_fkey"
      FOREIGN KEY ("verified_by") REFERENCES "public"."staff"("id");
  END IF;

  -- Category Receipts FKs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_receipts_invoice_fkey') THEN
    ALTER TABLE "public"."category_receipts" ADD CONSTRAINT "category_receipts_invoice_fkey"
      FOREIGN KEY ("category_invoice_id") REFERENCES "public"."category_invoices"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_receipts_encounter_fkey') THEN
    ALTER TABLE "public"."category_receipts" ADD CONSTRAINT "category_receipts_encounter_fkey"
      FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_receipts_patient_fkey') THEN
    ALTER TABLE "public"."category_receipts" ADD CONSTRAINT "category_receipts_patient_fkey"
      FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_receipts_issued_by_fkey') THEN
    ALTER TABLE "public"."category_receipts" ADD CONSTRAINT "category_receipts_issued_by_fkey"
      FOREIGN KEY ("issued_by") REFERENCES "public"."staff"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_receipts_voided_by_fkey') THEN
    ALTER TABLE "public"."category_receipts" ADD CONSTRAINT "category_receipts_voided_by_fkey"
      FOREIGN KEY ("voided_by") REFERENCES "public"."staff"("id");
  END IF;

  -- Billing Items verification FKs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_items_verified_by_fkey') THEN
    ALTER TABLE "public"."billing_items" ADD CONSTRAINT "billing_items_verified_by_fkey"
      FOREIGN KEY ("verified_by") REFERENCES "public"."staff"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_items_adjusted_by_fkey') THEN
    ALTER TABLE "public"."billing_items" ADD CONSTRAINT "billing_items_adjusted_by_fkey"
      FOREIGN KEY ("adjusted_by") REFERENCES "public"."staff"("id");
  END IF;

  -- Billing Audit Log FKs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_audit_log_performed_by_fkey') THEN
    ALTER TABLE "public"."billing_audit_log" ADD CONSTRAINT "billing_audit_log_performed_by_fkey"
      FOREIGN KEY ("performed_by") REFERENCES "public"."staff"("id");
  END IF;
END $$;

-- =============================================================================
-- 8. CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to generate category invoice number
CREATE OR REPLACE FUNCTION "public"."generate_category_invoice_number"(
    p_category "public"."invoice_category"
) RETURNS character varying
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix character varying(4);
    v_year character varying(2);
    v_month character varying(2);
    v_sequence integer;
    v_invoice_number character varying(50);
BEGIN
    -- Get category prefix
    v_prefix := CASE p_category
        WHEN 'Pharmacy' THEN 'PH'
        WHEN 'Laboratory' THEN 'LB'
        WHEN 'Radiology' THEN 'RD'
        WHEN 'Procedures' THEN 'PR'
        WHEN 'Consultation' THEN 'CN'
        WHEN 'Nursing' THEN 'NR'
        WHEN 'Admission' THEN 'AD'
        WHEN 'Supplies' THEN 'SP'
        ELSE 'OT'
    END;

    -- Get current year and month
    v_year := to_char(CURRENT_DATE, 'YY');
    v_month := to_char(CURRENT_DATE, 'MM');

    -- Get next sequence number for this category this month
    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(invoice_number, '^INV-' || v_prefix || '-' || v_year || v_month || '-', ''), '')::integer
    ), 0) + 1
    INTO v_sequence
    FROM "public"."category_invoices"
    WHERE invoice_number LIKE 'INV-' || v_prefix || '-' || v_year || v_month || '-%';

    -- Generate invoice number: INV-PH-2601-00001
    v_invoice_number := 'INV-' || v_prefix || '-' || v_year || v_month || '-' || lpad(v_sequence::text, 5, '0');

    RETURN v_invoice_number;
END;
$$;

-- Function to generate category receipt number
CREATE OR REPLACE FUNCTION "public"."generate_category_receipt_number"(
    p_category "public"."invoice_category"
) RETURNS character varying
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix character varying(4);
    v_year character varying(2);
    v_month character varying(2);
    v_sequence integer;
    v_receipt_number character varying(50);
BEGIN
    -- Get category prefix
    v_prefix := CASE p_category
        WHEN 'Pharmacy' THEN 'PH'
        WHEN 'Laboratory' THEN 'LB'
        WHEN 'Radiology' THEN 'RD'
        WHEN 'Procedures' THEN 'PR'
        WHEN 'Consultation' THEN 'CN'
        WHEN 'Nursing' THEN 'NR'
        WHEN 'Admission' THEN 'AD'
        WHEN 'Supplies' THEN 'SP'
        ELSE 'OT'
    END;

    -- Get current year and month
    v_year := to_char(CURRENT_DATE, 'YY');
    v_month := to_char(CURRENT_DATE, 'MM');

    -- Get next sequence number
    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(receipt_number, '^RCP-' || v_prefix || '-' || v_year || v_month || '-', ''), '')::integer
    ), 0) + 1
    INTO v_sequence
    FROM "public"."category_receipts"
    WHERE receipt_number LIKE 'RCP-' || v_prefix || '-' || v_year || v_month || '-%';

    -- Generate receipt number: RCP-PH-2601-00001
    v_receipt_number := 'RCP-' || v_prefix || '-' || v_year || v_month || '-' || lpad(v_sequence::text, 5, '0');

    RETURN v_receipt_number;
END;
$$;

-- Function to update category invoice totals
CREATE OR REPLACE FUNCTION "public"."update_category_invoice_totals"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal numeric(12,2);
    v_nhis_payable numeric(12,2);
    v_patient_payable numeric(12,2);
    v_item_count integer;
    v_verified_count integer;
    v_rejected_count integer;
BEGIN
    -- Calculate totals from verified/adjusted items only
    SELECT
        COALESCE(SUM(CASE WHEN verification_status IN ('verified', 'adjusted') THEN total_price ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN verification_status IN ('verified', 'adjusted') THEN nhis_payable ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN verification_status IN ('verified', 'adjusted') THEN patient_payable ELSE 0 END), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE verification_status IN ('verified', 'adjusted')),
        COUNT(*) FILTER (WHERE verification_status = 'rejected')
    INTO v_subtotal, v_nhis_payable, v_patient_payable, v_item_count, v_verified_count, v_rejected_count
    FROM "public"."category_invoice_items"
    WHERE category_invoice_id = COALESCE(NEW.category_invoice_id, OLD.category_invoice_id);

    -- Update the category invoice
    UPDATE "public"."category_invoices"
    SET
        subtotal = v_subtotal,
        nhis_payable = v_nhis_payable,
        patient_payable = v_patient_payable,
        total_amount = v_subtotal - discount_amount + tax_amount,
        balance = v_subtotal - discount_amount + tax_amount - amount_paid,
        item_count = v_item_count,
        verified_item_count = v_verified_count,
        rejected_item_count = v_rejected_count,
        verification_complete = (v_verified_count + v_rejected_count = v_item_count AND v_item_count > 0),
        all_items_verified = (v_verified_count = v_item_count AND v_item_count > 0),
        updated_at = now()
    WHERE id = COALESCE(NEW.category_invoice_id, OLD.category_invoice_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for automatic total updates
DROP TRIGGER IF EXISTS "trg_update_category_invoice_totals" ON "public"."category_invoice_items";
CREATE TRIGGER "trg_update_category_invoice_totals"
AFTER INSERT OR UPDATE OR DELETE ON "public"."category_invoice_items"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_category_invoice_totals"();

-- =============================================================================
-- 9. CREATE VIEWS
-- =============================================================================

-- View: Category invoice summary with items
CREATE OR REPLACE VIEW "public"."category_invoice_summary" AS
SELECT
    ci.id,
    ci.invoice_number,
    ci.encounter_id,
    ci.patient_id,
    ci.category,
    ci.subtotal,
    ci.discount_amount,
    ci.total_amount,
    ci.amount_paid,
    ci.balance,
    ci.nhis_covered,
    ci.nhis_payable,
    ci.patient_payable,
    ci.status,
    ci.verification_complete,
    ci.all_items_verified,
    ci.item_count,
    ci.verified_item_count,
    ci.rejected_item_count,
    ci.created_at,
    p.first_name || ' ' || p.surname AS patient_name,
    p.patient_id AS patient_display_id,
    v.visit_type,
    v.payment_category,
    v.insurance_type,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'item_name', cii.item_name,
            'quantity', cii.quantity,
            'unit_price', cii.unit_price,
            'total_price', cii.total_price,
            'verification_status', cii.verification_status,
            'nhis_payable', cii.nhis_payable,
            'patient_payable', cii.patient_payable
        ) ORDER BY cii.display_order)
        FROM "public"."category_invoice_items" cii
        WHERE cii.category_invoice_id = ci.id
    ) AS items
FROM "public"."category_invoices" ci
LEFT JOIN "public"."patients" p ON ci.patient_id = p.id
LEFT JOIN "public"."visits" v ON ci.encounter_id = v.id;

COMMENT ON VIEW "public"."category_invoice_summary" IS 'Summary view of category invoices with patient info and items';

-- View: Billing audit trail
CREATE OR REPLACE VIEW "public"."billing_audit_trail" AS
SELECT
    bal.id,
    bal.event_type,
    bal.entity_type,
    bal.entity_id,
    bal.encounter_id,
    bal.patient_id,
    bal.changes_summary,
    bal.performed_at,
    bal.notes,
    s.first_name || ' ' || s.last_name AS performed_by_name,
    p.first_name || ' ' || p.surname AS patient_name,
    bal.old_value,
    bal.new_value
FROM "public"."billing_audit_log" bal
LEFT JOIN "public"."staff" s ON bal.performed_by = s.id
LEFT JOIN "public"."patients" p ON bal.patient_id = p.id
ORDER BY bal.performed_at DESC;

COMMENT ON VIEW "public"."billing_audit_trail" IS 'Human-readable audit trail for billing operations';

-- =============================================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE "public"."category_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."category_invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."category_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_audit_log" ENABLE ROW LEVEL SECURITY;

-- RLS Policies (DROP IF EXISTS then CREATE to be idempotent)
DROP POLICY IF EXISTS "category_invoices_select_policy" ON "public"."category_invoices";
CREATE POLICY "category_invoices_select_policy" ON "public"."category_invoices"
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "category_invoices_insert_policy" ON "public"."category_invoices";
CREATE POLICY "category_invoices_insert_policy" ON "public"."category_invoices"
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "category_invoices_update_policy" ON "public"."category_invoices";
CREATE POLICY "category_invoices_update_policy" ON "public"."category_invoices"
FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "category_invoice_items_select_policy" ON "public"."category_invoice_items";
CREATE POLICY "category_invoice_items_select_policy" ON "public"."category_invoice_items"
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "category_invoice_items_insert_policy" ON "public"."category_invoice_items";
CREATE POLICY "category_invoice_items_insert_policy" ON "public"."category_invoice_items"
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "category_invoice_items_update_policy" ON "public"."category_invoice_items";
CREATE POLICY "category_invoice_items_update_policy" ON "public"."category_invoice_items"
FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "category_receipts_select_policy" ON "public"."category_receipts";
CREATE POLICY "category_receipts_select_policy" ON "public"."category_receipts"
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "category_receipts_insert_policy" ON "public"."category_receipts";
CREATE POLICY "category_receipts_insert_policy" ON "public"."category_receipts"
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "billing_audit_log_select_policy" ON "public"."billing_audit_log";
CREATE POLICY "billing_audit_log_select_policy" ON "public"."billing_audit_log"
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "billing_audit_log_insert_policy" ON "public"."billing_audit_log";
CREATE POLICY "billing_audit_log_insert_policy" ON "public"."billing_audit_log"
FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- 11. GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON TABLE "public"."category_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."category_invoices" TO "service_role";

GRANT ALL ON TABLE "public"."category_invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."category_invoice_items" TO "service_role";

GRANT ALL ON TABLE "public"."category_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."category_receipts" TO "service_role";

GRANT ALL ON TABLE "public"."billing_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_audit_log" TO "service_role";

GRANT SELECT ON "public"."category_invoice_summary" TO "authenticated";
GRANT SELECT ON "public"."category_invoice_summary" TO "service_role";

GRANT SELECT ON "public"."billing_audit_trail" TO "authenticated";
GRANT SELECT ON "public"."billing_audit_trail" TO "service_role";

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
