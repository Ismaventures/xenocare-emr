-- =============================================================================
-- Migration: Add NHIS fields and audit-safe billing fields to all billing tables
-- Ensures consistent, audit-safe storage of all billing and NHIS-related fields
-- across all service modules (Consultation, Drugs, Lab, Imaging, Procedures, etc.)
-- =============================================================================

-- =============================================================================
-- PART 0: Drug Catalogue - Add missing columns
-- =============================================================================

-- Add is_controlled column to drug_catalogue (marks controlled substances)
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT FALSE;

-- Add nhis_eligible column to drug_catalogue (marks NHIS eligible drugs)
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS nhis_eligible BOOLEAN DEFAULT FALSE;

-- Add nhis_percentage column to drug_catalogue (NHIS coverage percentage for this drug)
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 0;

-- Add requires_prescription column to drug_catalogue (marks prescription-only drugs)
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT TRUE;

-- Add unit_cost column to drug_catalogue (cost price for inventory)
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0;

-- Add unit_of_measure column to drug_catalogue (Unit, Box, Bottle, etc.)
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'Unit';

-- Add manufacturer column to drug_catalogue
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);

-- Add brand_name column to drug_catalogue
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(100);

-- Add selling_price column to drug_catalogue (may differ from unit_price)
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0;

-- =============================================================================
-- PART 1: Billing Orders - Order-level NHIS tracking
-- =============================================================================

-- Add NHIS fields to billing_orders
ALTER TABLE billing_orders
ADD COLUMN IF NOT EXISTS nhis_covered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nhis_payable DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS patient_payable DECIMAL(10, 2) DEFAULT 0;

-- =============================================================================
-- PART 2: Billing Items - Mandatory audit-safe fields for every line item
-- =============================================================================

-- Add mandatory audit-safe fields to billing_items (snapshot at time of billing)
ALTER TABLE billing_items
ADD COLUMN IF NOT EXISTS service_reference_id UUID,  -- References source record (lab request, imaging request, prescription, etc.)
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),  -- Snapshot of service name at billing time
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2),   -- Snapshot of unit cost at billing time (may differ from current price)
ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10, 2), -- quantity * unit_cost (stored, not calculated)
ADD COLUMN IF NOT EXISTS nhis_covered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 0 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100),
ADD COLUMN IF NOT EXISTS nhis_payable DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS patient_payable DECIMAL(10, 2) DEFAULT 0;

-- Rename existing columns for consistency (if they exist with old names)
-- unit_price -> keep as alias, unit_cost is the audit field
-- total_price -> keep as alias, gross_amount is the audit field

-- Add NOT NULL constraints after backfilling existing data
-- For now, use defaults for existing records

-- Update existing billing_items to have service_name from item_name if null
UPDATE billing_items 
SET service_name = item_name 
WHERE service_name IS NULL AND item_name IS NOT NULL;

-- Update existing billing_items to have unit_cost from unit_price if null  
UPDATE billing_items 
SET unit_cost = unit_price 
WHERE unit_cost IS NULL AND unit_price IS NOT NULL;

-- Update existing billing_items to have gross_amount from total_price if null
UPDATE billing_items 
SET gross_amount = total_price 
WHERE gross_amount IS NULL AND total_price IS NOT NULL;

-- Update existing billing_items to have patient_payable from gross_amount if null (no NHIS)
UPDATE billing_items 
SET patient_payable = COALESCE(gross_amount, total_price, 0)
WHERE patient_payable IS NULL OR patient_payable = 0;

-- =============================================================================
-- PART 3: Visits - Store insurance_type snapshot at encounter creation
-- =============================================================================

-- Add insurance_type column to visits table to store the actual insurance type
-- (payment_category uses payment_method enum which doesn't include DHML/Civilian_NHIS)
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS insurance_type VARCHAR(50);

-- =============================================================================
-- PART 4: NHIS Configuration Table - Configurable NHIS rates
-- =============================================================================

-- Create NHIS configuration table to store rates (can be updated by admin)
CREATE TABLE IF NOT EXISTS nhis_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_category VARCHAR(100) NOT NULL UNIQUE,
    coverage_percentage INTEGER NOT NULL DEFAULT 0 CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
    consultation_fully_covered BOOLEAN DEFAULT FALSE, -- Consultation is 100% free for this category
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add consultation_fully_covered column if table already exists without it
ALTER TABLE nhis_config
ADD COLUMN IF NOT EXISTS consultation_fully_covered BOOLEAN DEFAULT FALSE;

-- Add other columns that might be missing if table was created earlier
ALTER TABLE nhis_config
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Insert default NHIS rates with consultation rules
INSERT INTO nhis_config (payment_category, coverage_percentage, consultation_fully_covered, description)
VALUES 
    ('Military_NHIS', 100, TRUE, 'Military NHIS - 100% coverage for all services, consultation fully covered'),
    ('DHML', 100, TRUE, 'Defence Health Maintenance Limited (Military NHIS) - 100% coverage, consultation fully covered'),
    ('Civilian_NHIS', 90, TRUE, 'Civilian NHIS - 90% coverage for services, consultation fully covered (100%)'),
    ('Private', 0, FALSE, 'Private patients - patient pays 100%'),
    ('Cash', 0, FALSE, 'Cash patients - patient pays 100%')
ON CONFLICT (payment_category) DO UPDATE SET
    coverage_percentage = EXCLUDED.coverage_percentage,
    consultation_fully_covered = EXCLUDED.consultation_fully_covered,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =============================================================================
-- PART 5: Indexes for Performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_billing_orders_nhis_covered ON billing_orders(nhis_covered);
CREATE INDEX IF NOT EXISTS idx_billing_items_nhis_covered ON billing_items(nhis_covered);
CREATE INDEX IF NOT EXISTS idx_billing_items_service_reference ON billing_items(service_reference_id);
CREATE INDEX IF NOT EXISTS idx_nhis_config_payment_category ON nhis_config(payment_category);
CREATE INDEX IF NOT EXISTS idx_visits_insurance_type ON visits(insurance_type);

-- =============================================================================
-- PART 6: Documentation Comments
-- =============================================================================

-- Billing Orders Comments
COMMENT ON COLUMN billing_orders.nhis_covered IS 'Whether this billing order is covered by NHIS';
COMMENT ON COLUMN billing_orders.nhis_percentage IS 'Percentage of the total bill covered by NHIS (0-100)';
COMMENT ON COLUMN billing_orders.nhis_payable IS 'Total amount payable by NHIS for this order';
COMMENT ON COLUMN billing_orders.patient_payable IS 'Total amount payable by the patient (after NHIS deduction)';

-- Billing Items Comments (Audit-Safe Fields)
COMMENT ON COLUMN billing_items.service_reference_id IS 'UUID reference to source record (lab_requests.id, imaging_requests.id, prescriptions.id, etc.) - immutable audit link';
COMMENT ON COLUMN billing_items.service_name IS 'Snapshot of service/item name at billing time - does not change if catalogue is updated';
COMMENT ON COLUMN billing_items.unit_cost IS 'Snapshot of unit cost at billing time - does not change if price list is updated';
COMMENT ON COLUMN billing_items.gross_amount IS 'Snapshot of gross amount (quantity * unit_cost) - stored, never recalculated';
COMMENT ON COLUMN billing_items.nhis_covered IS 'Whether this line item is covered by NHIS';
COMMENT ON COLUMN billing_items.nhis_percentage IS 'Percentage of this item covered by NHIS (0-100) - snapshot at billing time';
COMMENT ON COLUMN billing_items.nhis_payable IS 'Amount of this item payable by NHIS - snapshot at billing time';
COMMENT ON COLUMN billing_items.patient_payable IS 'Amount of this item payable by patient - snapshot at billing time';

-- Visits Comments
COMMENT ON COLUMN visits.insurance_type IS 'Patient insurance type at time of visit (DHML, Civilian_NHIS, Private) - snapshot for audit';

-- NHIS Config Comments
COMMENT ON TABLE nhis_config IS 'Configuration table for NHIS coverage rates by payment category - admin editable';
COMMENT ON COLUMN nhis_config.consultation_fully_covered IS 'If TRUE, consultation is 100% free regardless of general coverage_percentage';

-- =============================================================================
-- PART 7: Validation Function - Ensure billing items have all required fields
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_billing_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure all mandatory audit fields are present
    IF NEW.service_name IS NULL OR NEW.service_name = '' THEN
        RAISE EXCEPTION 'service_name is required for billing items';
    END IF;
    
    IF NEW.unit_cost IS NULL THEN
        RAISE EXCEPTION 'unit_cost is required for billing items';
    END IF;
    
    IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
        RAISE EXCEPTION 'quantity must be at least 1 for billing items';
    END IF;
    
    IF NEW.gross_amount IS NULL THEN
        -- Auto-calculate if not provided
        NEW.gross_amount := NEW.quantity * NEW.unit_cost;
    END IF;
    
    -- Ensure NHIS fields are set (defaults to 0/false if not provided)
    IF NEW.nhis_covered IS NULL THEN
        NEW.nhis_covered := FALSE;
    END IF;
    
    IF NEW.nhis_percentage IS NULL THEN
        NEW.nhis_percentage := 0;
    END IF;
    
    IF NEW.nhis_payable IS NULL THEN
        NEW.nhis_payable := 0;
    END IF;
    
    IF NEW.patient_payable IS NULL THEN
        -- Default to gross_amount if not set (patient pays all)
        NEW.patient_payable := COALESCE(NEW.gross_amount, NEW.quantity * NEW.unit_cost);
    END IF;
    
    -- Sync legacy fields for backward compatibility
    IF NEW.item_name IS NULL THEN
        NEW.item_name := NEW.service_name;
    END IF;
    
    IF NEW.unit_price IS NULL THEN
        NEW.unit_price := NEW.unit_cost;
    END IF;
    
    IF NEW.total_price IS NULL THEN
        NEW.total_price := NEW.gross_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_validate_billing_item ON billing_items;
CREATE TRIGGER trg_validate_billing_item
    BEFORE INSERT OR UPDATE ON billing_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_billing_item();

-- =============================================================================
-- PART 8: Helper Function to Calculate NHIS Amounts
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_nhis_amounts(
    p_gross_amount DECIMAL,
    p_insurance_type VARCHAR,
    p_service_type VARCHAR DEFAULT 'Other'
)
RETURNS TABLE (
    nhis_covered BOOLEAN,
    nhis_percentage INTEGER,
    nhis_payable DECIMAL,
    patient_payable DECIMAL
) AS $$
DECLARE
    v_coverage_pct INTEGER := 0;
    v_is_nhis BOOLEAN := FALSE;
    v_consultation_free BOOLEAN := FALSE;
BEGIN
    -- Normalize insurance type
    p_insurance_type := LOWER(REPLACE(COALESCE(p_insurance_type, ''), '_', ' '));
    
    -- Check if NHIS patient
    IF p_insurance_type IN ('military nhis', 'dhml', 'civilian nhis') THEN
        v_is_nhis := TRUE;
        
        -- Get coverage from config
        SELECT nc.coverage_percentage, nc.consultation_fully_covered
        INTO v_coverage_pct, v_consultation_free
        FROM nhis_config nc
        WHERE LOWER(REPLACE(nc.payment_category, '_', ' ')) = p_insurance_type
        LIMIT 1;
        
        -- Default coverage if not in config
        IF v_coverage_pct IS NULL THEN
            IF p_insurance_type IN ('military nhis', 'dhml') THEN
                v_coverage_pct := 100;
                v_consultation_free := TRUE;
            ELSE
                v_coverage_pct := 90;
                v_consultation_free := TRUE;
            END IF;
        END IF;
        
        -- Special rule: Consultation is 100% free for ALL NHIS patients
        IF LOWER(p_service_type) = 'consultation' AND v_consultation_free THEN
            v_coverage_pct := 100;
        END IF;
    END IF;
    
    -- Return calculated values
    nhis_covered := v_is_nhis;
    nhis_percentage := v_coverage_pct;
    nhis_payable := ROUND(p_gross_amount * v_coverage_pct / 100, 2);
    patient_payable := p_gross_amount - nhis_payable;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
