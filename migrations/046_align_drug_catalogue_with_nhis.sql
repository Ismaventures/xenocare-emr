-- Align drug_catalogue with NHIS medicines schema
-- We want drug_catalogue to contain all columns from nhis_medicines to allow direct mapping

-- 0. Drop dependent views
DROP VIEW IF EXISTS v_near_expiry_drugs CASCADE;
DROP VIEW IF EXISTS v_expired_drugs CASCADE;
DROP VIEW IF EXISTS v_drug_inventory_summary CASCADE;

-- 1. Add new columns from NHIS schema
ALTER TABLE drug_catalogue ADD COLUMN IF NOT EXISTS dosage_form TEXT;
ALTER TABLE drug_catalogue ADD COLUMN IF NOT EXISTS strengths TEXT;
ALTER TABLE drug_catalogue ADD COLUMN IF NOT EXISTS presentation TEXT;
ALTER TABLE drug_catalogue ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

-- 2. Ensure Inventory columns exist
ALTER TABLE drug_catalogue ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE drug_catalogue ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;

-- 3. Ensure NHIS coverage fields
ALTER TABLE drug_catalogue ADD COLUMN IF NOT EXISTS is_nhis_covered BOOLEAN DEFAULT TRUE;

-- 4. Drop columns that are no longer needed (cleanup to match "delete all all")
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS generic_name;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS brand_name;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS manufacturer;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS category;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS drug_type;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS strength; -- Replaced by strengths
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS unit_of_measure;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS unit_price; -- Replaced by price
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS selling_price; -- Removed as requested
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS unit_cost; -- Removed as requested
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS nhis_code; -- Replaced by code
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS nhis_price; -- Replaced by price
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS nhis_eligible; -- Replaced by is_nhis_covered
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS nhis_percentage;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS supplier;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS batch_number;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS manufacturing_date;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS expiry_date;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS requires_prescription;
ALTER TABLE drug_catalogue DROP COLUMN IF EXISTS is_controlled;

-- 5. Recreate views with updated schema

CREATE OR REPLACE VIEW v_near_expiry_drugs AS
SELECT 
    db.batch_id,
    db.drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    -- dc.generic_name removed
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
    -- dc.generic_name removed
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

CREATE OR REPLACE VIEW v_drug_inventory_summary AS
SELECT 
    dc.id AS drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    -- dc.generic_name removed
    -- dc.category removed
    -- dc.drug_type removed
    dc.strengths AS strength, -- mapped to new column
    dc.price AS selling_price, -- mapped to price
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

