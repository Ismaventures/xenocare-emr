-- =============================================================================
-- MIGRATION 042: Pharmacy Inventory Enhancement
-- Batch-based inventory with FEFO, full audit trail, EMR/encounter linking
-- =============================================================================

-- =============================================================================
-- 1. DRUG BATCHES TABLE - Track inventory by batch/expiry
-- =============================================================================

CREATE TABLE IF NOT EXISTS drug_batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_id UUID NOT NULL REFERENCES drug_catalogue(id) ON DELETE CASCADE,
    
    -- Batch identification
    batch_number VARCHAR(50) NOT NULL,
    barcode VARCHAR(100),
    
    -- Quantity tracking
    quantity_received INTEGER NOT NULL DEFAULT 0,
    quantity_remaining INTEGER NOT NULL DEFAULT 0,
    
    -- Dates
    manufacture_date DATE,
    expiry_date DATE NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pricing
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10, 2),
    
    -- Supplier info
    supplier_name VARCHAR(100),
    supplier_batch_ref VARCHAR(100),
    purchase_order_id UUID, -- Reference without FK constraint (table may not exist)
    
    -- Staff tracking
    received_by UUID,  -- Reference without FK constraint for flexibility
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'expired', 'recalled', 'quarantine')),
    
    -- Audit
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique batch per drug
    CONSTRAINT unique_drug_batch UNIQUE (drug_id, batch_number)
);

-- Indexes for FEFO queries
CREATE INDEX IF NOT EXISTS idx_drug_batches_drug_id ON drug_batches(drug_id);
CREATE INDEX IF NOT EXISTS idx_drug_batches_expiry ON drug_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_drug_batches_status ON drug_batches(status);
CREATE INDEX IF NOT EXISTS idx_drug_batches_remaining ON drug_batches(quantity_remaining) WHERE quantity_remaining > 0;

-- =============================================================================
-- 2. INVENTORY_STOCK_MOVEMENTS - Create table or enhance existing
-- =============================================================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_stock_movements (
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Item references (one of these should be set)
    item_id UUID,  -- For general inventory items
    drug_id UUID REFERENCES drug_catalogue(id),  -- For pharmacy drugs
    batch_id UUID,  -- Reference to drug_batches (added after table creation)
    
    -- Movement details
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'EXPIRED', 'DAMAGED')),
    quantity INTEGER NOT NULL,
    
    -- Reference tracking
    reference_number VARCHAR(100),
    
    -- Encounter/Patient linking for dispensing audit
    encounter_id UUID,
    patient_id VARCHAR(50),
    dispense_id UUID,
    
    -- Audit info
    reason TEXT,
    notes TEXT,
    performed_by VARCHAR(50),
    approved_by VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add FK constraint for batch_id after table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_movements_batch' 
        AND table_name = 'inventory_stock_movements'
    ) THEN
        ALTER TABLE inventory_stock_movements 
        ADD CONSTRAINT fk_stock_movements_batch 
        FOREIGN KEY (batch_id) REFERENCES drug_batches(batch_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if constraint already exists or batch_id column missing
    NULL;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_drug ON inventory_stock_movements(drug_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON inventory_stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON inventory_stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_encounter ON inventory_stock_movements(encounter_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_patient ON inventory_stock_movements(patient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON inventory_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON inventory_stock_movements(created_at);

-- =============================================================================
-- 3. DISPENSE RECORDS TABLE - Enhanced dispense tracking
-- =============================================================================

-- Rename/recreate dispenses table with full tracking
CREATE TABLE IF NOT EXISTS dispense_records (
    dispense_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Source references (FKs made optional for flexibility)
    prescription_id UUID,  -- References prescriptions if exists
    patient_id VARCHAR(50),
    encounter_id UUID,
    
    -- Drug and batch
    drug_id UUID NOT NULL REFERENCES drug_catalogue(id),
    batch_id UUID REFERENCES drug_batches(batch_id),
    
    -- Quantities
    quantity_dispensed INTEGER NOT NULL,
    
    -- Staff (VARCHAR to match staff_id format)
    pharmacist_id VARCHAR(50),
    verified_by VARCHAR(50),
    
    -- Timing
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Substitution tracking
    is_substitution BOOLEAN DEFAULT FALSE,
    original_drug_id UUID REFERENCES drug_catalogue(id),
    substitution_reason TEXT,
    
    -- NHIS tracking
    nhis_claim_id UUID,
    nhis_amount DECIMAL(10, 2) DEFAULT 0,
    patient_copay DECIMAL(10, 2) DEFAULT 0,
    
    -- Status and notes
    status VARCHAR(20) DEFAULT 'dispensed' CHECK (status IN ('dispensed', 'returned', 'cancelled')),
    counseling_provided BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispense_records_prescription ON dispense_records(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispense_records_patient ON dispense_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispense_records_encounter ON dispense_records(encounter_id);
CREATE INDEX IF NOT EXISTS idx_dispense_records_batch ON dispense_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_dispense_records_date ON dispense_records(dispensed_at);

-- =============================================================================
-- 4. FEFO FUNCTION - Get dispensable batches in First-Expiry-First-Out order
-- =============================================================================

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS get_dispensable_batches(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_dispensable_batches(
    p_drug_id UUID, 
    p_quantity INTEGER
)
RETURNS TABLE (
    batch_id UUID,
    batch_number VARCHAR,
    quantity_available INTEGER,
    quantity_to_take INTEGER,
    expiry_date DATE,
    days_to_expiry INTEGER,
    cost_price DECIMAL,
    selling_price DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_batches AS (
        SELECT 
            db.batch_id,
            db.batch_number,
            db.quantity_remaining AS quantity_available,
            db.expiry_date,
            (db.expiry_date - CURRENT_DATE)::INTEGER AS days_to_expiry,
            db.cost_price,
            db.selling_price,
            ROW_NUMBER() OVER (ORDER BY db.expiry_date ASC, db.received_date ASC) AS rn
        FROM drug_batches db
        WHERE db.drug_id = p_drug_id
          AND db.quantity_remaining > 0
          AND db.expiry_date > CURRENT_DATE  -- Not expired
          AND db.status = 'active'
    ),
    cumulative AS (
        SELECT 
            rb.*,
            SUM(rb.quantity_available) OVER (ORDER BY rb.rn) AS running_total
        FROM ranked_batches rb
    )
    SELECT 
        c.batch_id,
        c.batch_number,
        c.quantity_available,
        LEAST(
            c.quantity_available, 
            GREATEST(0, p_quantity - COALESCE(
                (SELECT SUM(c2.quantity_available) FROM cumulative c2 WHERE c2.rn < c.rn), 
                0
            ))
        )::INTEGER AS quantity_to_take,
        c.expiry_date,
        c.days_to_expiry,
        c.cost_price,
        c.selling_price
    FROM cumulative c
    WHERE c.running_total - c.quantity_available < p_quantity
    ORDER BY c.expiry_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 5. HELPER FUNCTION - Check total available stock for a drug
-- =============================================================================

CREATE OR REPLACE FUNCTION get_drug_available_stock(p_drug_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_total
    FROM drug_batches
    WHERE drug_id = p_drug_id
      AND status = 'active'
      AND expiry_date > CURRENT_DATE;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 6. TRIGGER - Update drug_catalogue.stock_quantity from batches (derived)
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_drug_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the drug_catalogue stock_quantity to match sum of active batches
    UPDATE drug_catalogue
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity_remaining), 0)
        FROM drug_batches
        WHERE drug_id = COALESCE(NEW.drug_id, OLD.drug_id)
          AND status = 'active'
          AND expiry_date > CURRENT_DATE
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.drug_id, OLD.drug_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_drug_stock ON drug_batches;
CREATE TRIGGER trg_sync_drug_stock
    AFTER INSERT OR UPDATE OR DELETE ON drug_batches
    FOR EACH ROW EXECUTE FUNCTION sync_drug_stock_quantity();

-- =============================================================================
-- 7. VIEWS - Near-expiry and expired drugs
-- =============================================================================

CREATE OR REPLACE VIEW v_near_expiry_drugs AS
SELECT 
    db.batch_id,
    db.drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    dc.generic_name,
    db.batch_number,
    db.quantity_remaining,
    db.expiry_date,
    (db.expiry_date - CURRENT_DATE) AS days_to_expiry,
    db.cost_price,
    (db.quantity_remaining * db.cost_price) AS batch_value,
    CASE 
        WHEN (db.expiry_date - CURRENT_DATE) <= 30 THEN 'critical'
        WHEN (db.expiry_date - CURRENT_DATE) <= 60 THEN 'warning'
        WHEN (db.expiry_date - CURRENT_DATE) <= 90 THEN 'caution'
    END AS urgency_level
FROM drug_batches db
JOIN drug_catalogue dc ON dc.id = db.drug_id
WHERE db.status = 'active'
  AND db.quantity_remaining > 0
  AND db.expiry_date > CURRENT_DATE
  AND db.expiry_date <= (CURRENT_DATE + INTERVAL '90 days')
ORDER BY db.expiry_date ASC;

CREATE OR REPLACE VIEW v_expired_drugs AS
SELECT 
    db.batch_id,
    db.drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    dc.generic_name,
    db.batch_number,
    db.quantity_remaining,
    db.expiry_date,
    (CURRENT_DATE - db.expiry_date) AS days_expired,
    db.cost_price,
    (db.quantity_remaining * db.cost_price) AS loss_value,
    db.status
FROM drug_batches db
JOIN drug_catalogue dc ON dc.id = db.drug_id
WHERE db.expiry_date <= CURRENT_DATE
  AND db.quantity_remaining > 0
ORDER BY db.expiry_date DESC;

-- =============================================================================
-- 8. VIEW - Drug inventory summary with batch info
-- =============================================================================

CREATE OR REPLACE VIEW v_drug_inventory_summary AS
SELECT 
    dc.id AS drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    dc.generic_name,
    dc.category,
    dc.drug_type,
    dc.strength,
    dc.unit_price AS selling_price,
    dc.reorder_level,
    dc.is_active,
    COALESCE(batch_stats.total_quantity, 0) AS total_stock,
    COALESCE(batch_stats.batch_count, 0) AS batch_count,
    COALESCE(batch_stats.earliest_expiry, NULL) AS earliest_expiry,
    COALESCE(batch_stats.total_cost_value, 0) AS stock_cost_value,
    COALESCE(batch_stats.expiring_soon, 0) AS expiring_soon_qty,
    CASE 
        WHEN COALESCE(batch_stats.total_quantity, 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(batch_stats.total_quantity, 0) <= dc.reorder_level THEN 'low_stock'
        ELSE 'in_stock'
    END AS stock_status
FROM drug_catalogue dc
LEFT JOIN (
    SELECT 
        drug_id,
        SUM(quantity_remaining) AS total_quantity,
        COUNT(*) AS batch_count,
        MIN(expiry_date) FILTER (WHERE quantity_remaining > 0) AS earliest_expiry,
        SUM(quantity_remaining * cost_price) AS total_cost_value,
        SUM(quantity_remaining) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '90 days') AS expiring_soon
    FROM drug_batches
    WHERE status = 'active' AND expiry_date > CURRENT_DATE
    GROUP BY drug_id
) batch_stats ON batch_stats.drug_id = dc.id
WHERE dc.is_active = true;

-- =============================================================================
-- 9. PHARMACY STATS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_pharmacy_inventory_stats()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_drugs', (SELECT COUNT(*) FROM drug_catalogue WHERE is_active = true),
        'total_batches', (SELECT COUNT(*) FROM drug_batches WHERE status = 'active' AND quantity_remaining > 0),
        'low_stock_count', (
            SELECT COUNT(DISTINCT drug_id) 
            FROM v_drug_inventory_summary 
            WHERE stock_status = 'low_stock'
        ),
        'out_of_stock_count', (
            SELECT COUNT(DISTINCT drug_id) 
            FROM v_drug_inventory_summary 
            WHERE stock_status = 'out_of_stock'
        ),
        'expiring_30_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE 
              AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        ),
        'expiring_60_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE + INTERVAL '30 days'
              AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
        ),
        'expiring_90_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE + INTERVAL '60 days'
              AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'
        ),
        'expired_batches', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE quantity_remaining > 0 
              AND expiry_date <= CURRENT_DATE
        ),
        'total_stock_value_cost', (
            SELECT COALESCE(SUM(quantity_remaining * cost_price), 0) 
            FROM drug_batches 
            WHERE status = 'active' AND expiry_date > CURRENT_DATE
        ),
        'total_stock_value_selling', (
            SELECT COALESCE(SUM(db.quantity_remaining * dc.unit_price), 0) 
            FROM drug_batches db
            JOIN drug_catalogue dc ON dc.id = db.drug_id
            WHERE db.status = 'active' AND db.expiry_date > CURRENT_DATE
        ),
        'dispensed_today_count', (
            SELECT COUNT(*) FROM dispense_records 
            WHERE DATE(dispensed_at) = CURRENT_DATE
        ),
        'received_today_count', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE DATE(received_date) = CURRENT_DATE
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 10. MIGRATE EXISTING STOCK TO BATCHES (One-time migration)
-- =============================================================================

-- Create initial batches for drugs that have stock but no batches
INSERT INTO drug_batches (
    drug_id,
    batch_number,
    quantity_received,
    quantity_remaining,
    expiry_date,
    cost_price,
    selling_price,
    received_by,
    notes,
    status
)
SELECT 
    dc.id AS drug_id,
    'LEGACY-' || dc.code AS batch_number,
    dc.stock_quantity AS quantity_received,
    dc.stock_quantity AS quantity_remaining,
    CURRENT_DATE + INTERVAL '1 year' AS expiry_date, -- Default 1 year expiry for legacy
    dc.unit_price AS cost_price,
    dc.unit_price AS selling_price,
    NULL AS received_by,
    'Auto-migrated from legacy stock_quantity field' AS notes,
    'active' AS status
FROM drug_catalogue dc
WHERE dc.stock_quantity > 0
  AND dc.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM drug_batches db WHERE db.drug_id = dc.id
  )
ON CONFLICT (drug_id, batch_number) DO NOTHING;

-- =============================================================================
-- 11. ADD NHIS FIELDS TO DRUG_CATALOGUE IF MISSING
-- =============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'drug_catalogue' AND column_name = 'nhis_code') THEN
        ALTER TABLE drug_catalogue ADD COLUMN nhis_code VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'drug_catalogue' AND column_name = 'nhis_price') THEN
        ALTER TABLE drug_catalogue ADD COLUMN nhis_price DECIMAL(10, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'drug_catalogue' AND column_name = 'nhis_coverage_percent') THEN
        ALTER TABLE drug_catalogue ADD COLUMN nhis_coverage_percent INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'drug_catalogue' AND column_name = 'requires_prior_auth') THEN
        ALTER TABLE drug_catalogue ADD COLUMN requires_prior_auth BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

COMMENT ON TABLE drug_batches IS 'Tracks drug inventory by batch with expiry dates for FEFO dispensing';
COMMENT ON TABLE dispense_records IS 'Records each dispensing event with full traceability to encounter/patient/batch';
COMMENT ON FUNCTION get_dispensable_batches IS 'Returns batches in FEFO order for dispensing a given quantity';
COMMENT ON FUNCTION get_drug_available_stock IS 'Returns total available (non-expired, active) stock for a drug';
COMMENT ON VIEW v_near_expiry_drugs IS 'Drugs expiring within 90 days - for alerts';
COMMENT ON VIEW v_expired_drugs IS 'Expired drug batches - for write-off processing';
