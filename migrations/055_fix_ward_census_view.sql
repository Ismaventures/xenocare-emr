-- Migration: Fix Ward Census View
-- Version: 051
-- Date: 2026-01-03
-- Description: Updates ward_census view to correctly calculate occupied beds based on bed status

-- Drop the existing view first
DROP VIEW IF EXISTS ward_census;

-- Recreate the view with correct logic
CREATE OR REPLACE VIEW ward_census AS
WITH bed_counts AS (
    SELECT
        ward_id,
        COUNT(*) FILTER (WHERE status = 'available') as available_count,
        COUNT(*) FILTER (WHERE status = 'occupied') as occupied_count,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_count,
        COUNT(*) FILTER (WHERE status = 'cleaning') as cleaning_count,
        COUNT(*) FILTER (WHERE status = 'reserved') as reserved_count
    FROM beds
    WHERE is_active = TRUE
    GROUP BY ward_id
)
SELECT
    w.id AS ward_id,
    w.name AS ward_name,
    w.ward_type,
    w.total_beds,
    -- Use the actual count from beds table for accuracy
    COALESCE(bc.available_count, 0) AS available_beds,
    COALESCE(bc.occupied_count, 0) AS occupied_beds,
    -- Occupancy rate based on occupied beds vs total capacity
    ROUND((COALESCE(bc.occupied_count, 0)::DECIMAL / NULLIF(w.total_beds, 0)) * 100, 1) AS occupancy_rate,
    -- Patient stats from admissions
    COUNT(a.id) FILTER (WHERE a.admission_status = 'critical') AS critical_patients,
    COUNT(a.id) FILTER (WHERE a.isolation_required = TRUE) AS isolation_patients,
    w.facility_id
FROM wards w
LEFT JOIN bed_counts bc ON w.id = bc.ward_id
LEFT JOIN admissions a ON a.current_ward_id = w.id
    AND a.admission_status NOT IN ('discharged', 'transferred', 'deceased')
WHERE w.is_active = TRUE
GROUP BY
    w.id,
    w.name,
    w.ward_type,
    w.total_beds,
    bc.available_count,
    bc.occupied_count,
    w.facility_id;

-- Grant permissions (if needed, though usually inherited)
GRANT SELECT ON ward_census TO authenticated;
