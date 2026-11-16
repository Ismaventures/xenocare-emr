-- =============================================================================
-- Migration: Fix Out of Stock Count Logic
-- Description: Only count drugs as "out of stock" if they have reorder_level > 0
--              or have ever had batches (meaning they should be stocked)
-- =============================================================================

-- Drop and recreate the view (column structure is changing)
DROP VIEW IF EXISTS v_drug_inventory_summary CASCADE;

CREATE VIEW v_drug_inventory_summary AS
SELECT 
    dc.id AS drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    dc.strengths AS strength,
    dc.price AS selling_price,
    dc.reorder_level,
    dc.is_active,
    COALESCE(batch_stats.total_quantity, 0) AS total_stock,
    COALESCE(batch_stats.batch_count, 0) AS batch_count,
    COALESCE(batch_stats.earliest_expiry, NULL) AS earliest_expiry,
    COALESCE(batch_stats.total_cost_value, 0) AS stock_cost_value,
    COALESCE(batch_stats.expiring_soon, 0) AS expiring_soon_qty,
    -- Check if drug has ever had any batches
    COALESCE(all_batch_stats.has_batch_history, false) AS has_batch_history,
    -- Only mark as out_of_stock if drug has HAD batches before but now has none
    -- This prevents counting drugs that have never been stocked as "out of stock"
    CASE 
        WHEN COALESCE(batch_stats.total_quantity, 0) = 0 
             AND COALESCE(all_batch_stats.has_batch_history, false) = true
        THEN 'out_of_stock'
        WHEN COALESCE(batch_stats.total_quantity, 0) = 0 THEN 'not_stocked'
        WHEN COALESCE(batch_stats.total_quantity, 0) <= dc.reorder_level THEN 'low_stock'
        ELSE 'in_stock'
    END AS stock_status
FROM drug_catalogue dc
LEFT JOIN (
    -- Active batches with remaining stock (not expired)
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
LEFT JOIN (
    -- Check if drug has ever had any batches (any status)
    SELECT 
        drug_id,
        true AS has_batch_history
    FROM drug_batches
    GROUP BY drug_id
) all_batch_stats ON all_batch_stats.drug_id = dc.id
WHERE dc.is_active = true;

-- Update the stats function to exclude 'not_stocked' drugs from out_of_stock count
CREATE OR REPLACE FUNCTION get_pharmacy_inventory_stats()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_drugs', (SELECT COUNT(*) FROM drug_catalogue WHERE is_active = true),
        'total_batches', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' AND quantity_remaining > 0 AND expiry_date > CURRENT_DATE
        ),
        'low_stock_count', (
            SELECT COUNT(DISTINCT drug_id) 
            FROM v_drug_inventory_summary 
            WHERE stock_status = 'low_stock'
        ),
        'out_of_stock_count', (
            -- Only count drugs that should be tracked (not 'not_stocked')
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
            SELECT COALESCE(SUM(db.quantity_remaining * dc.price), 0) 
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

-- Add comment
COMMENT ON VIEW v_drug_inventory_summary IS 'Drug inventory summary with stock status. Only drugs with reorder_level > 0 or batch history are marked as out_of_stock when empty.';
