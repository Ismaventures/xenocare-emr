-- =============================================================================
-- Migration: Fix Ward Census and Bed Availability Views Case Sensitivity
-- Date: 2026-01-19
-- Description: Fix views that compare bed status using lowercase instead of
--              PascalCase (e.g., 'available' should be 'Available')
-- =============================================================================

-- Drop and recreate the ward_census view with correct case for status values
DROP VIEW IF EXISTS ward_census CASCADE;

CREATE VIEW ward_census AS
WITH bed_counts AS (
    SELECT 
        beds.ward_id,
        count(*) FILTER (WHERE beds.status = 'Available') AS available_count,
        count(*) FILTER (WHERE beds.status = 'Occupied') AS occupied_count,
        count(*) FILTER (WHERE beds.status = 'Maintenance') AS maintenance_count,
        count(*) FILTER (WHERE beds.status = 'Cleaning') AS cleaning_count,
        count(*) FILTER (WHERE beds.status = 'Reserved') AS reserved_count
    FROM beds
    WHERE beds.is_active = true
    GROUP BY beds.ward_id
)
SELECT 
    w.id AS ward_id,
    w.name AS ward_name,
    w.ward_type,
    w.total_beds,
    COALESCE(bc.available_count, 0)::integer AS available_beds,
    COALESCE(bc.occupied_count, 0)::integer AS occupied_beds,
    COALESCE(bc.maintenance_count, 0)::integer AS maintenance_beds,
    COALESCE(bc.cleaning_count, 0)::integer AS cleaning_beds,
    COALESCE(bc.reserved_count, 0)::integer AS reserved_beds,
    ROUND(
        (COALESCE(bc.occupied_count, 0)::numeric / NULLIF(w.total_beds, 0)::numeric) * 100, 
        1
    ) AS occupancy_rate,
    count(a.id) FILTER (WHERE a.admission_status = 'critical') AS critical_patients,
    count(a.id) FILTER (WHERE a.isolation_required = true) AS isolation_patients,
    w.facility_id
FROM wards w
LEFT JOIN bed_counts bc ON w.id = bc.ward_id
LEFT JOIN admissions a ON (
    a.current_ward_id = w.id 
    AND a.admission_status NOT IN ('discharged', 'transferred', 'deceased')
)
WHERE w.is_active = true
GROUP BY w.id, w.name, w.ward_type, w.total_beds, 
         bc.available_count, bc.occupied_count, bc.maintenance_count,
         bc.cleaning_count, bc.reserved_count, w.facility_id;

COMMENT ON VIEW ward_census IS 'Real-time ward census showing bed occupancy and patient statistics';

-- Drop and recreate the bed_availability view with correct case for status values
DROP VIEW IF EXISTS bed_availability CASCADE;

CREATE VIEW bed_availability AS
SELECT 
    w.id AS ward_id,
    w.name AS ward_name,
    w.ward_type,
    b.id AS bed_id,
    b.bed_number,
    b.bed_type,
    b.status,
    b.features,
    b.daily_rate,
    CASE 
        WHEN b.status = 'Available' THEN NULL
        ELSE (p.first_name || ' ' || p.surname)
    END AS current_patient_name,
    CASE 
        WHEN b.status = 'Available' THEN NULL
        ELSE p.emr_number
    END AS current_patient_emr,
    CASE 
        WHEN b.status = 'Available' THEN NULL
        ELSE a.admission_number
    END AS admission_number,
    b.last_cleaned_at,
    b.last_maintenance_at,
    w.facility_id
FROM beds b
JOIN wards w ON w.id = b.ward_id
LEFT JOIN patients p ON p.id = b.current_patient_id
LEFT JOIN admissions a ON a.id = b.current_admission_id
WHERE w.is_active = true AND b.is_active = true
ORDER BY w.name, b.bed_number;

COMMENT ON VIEW bed_availability IS 'Real-time bed availability with patient and admission details';

-- Update the available_beds count in wards table to reflect actual counts
UPDATE wards w
SET available_beds = (
    SELECT COUNT(*)::integer
    FROM beds b
    WHERE b.ward_id = w.id 
    AND b.status = 'Available'
    AND b.is_active = true
);

-- Also ensure total_beds matches actual bed count
UPDATE wards w
SET total_beds = (
    SELECT COUNT(*)::integer
    FROM beds b
    WHERE b.ward_id = w.id
    AND b.is_active = true
);

-- Grant access to authenticated users
GRANT SELECT ON ward_census TO authenticated;
GRANT SELECT ON ward_census TO anon;
GRANT SELECT ON bed_availability TO authenticated;
GRANT SELECT ON bed_availability TO anon;

-- =============================================================================
-- Add RLS policies for anonymous users to view wards and beds
-- =============================================================================

-- Add anon policy for wards (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'wards' AND policyname = 'anon_view_wards'
    ) THEN
        EXECUTE 'CREATE POLICY anon_view_wards ON wards FOR SELECT TO anon USING (is_active = true)';
        RAISE NOTICE 'Created anon_view_wards policy';
    END IF;
END $$;

-- Add anon policy for beds (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'beds' AND policyname = 'anon_view_beds'
    ) THEN
        EXECUTE 'CREATE POLICY anon_view_beds ON beds FOR SELECT TO anon USING (is_active = true)';
        RAISE NOTICE 'Created anon_view_beds policy';
    END IF;
END $$;

-- =============================================================================
-- Verify the fix
-- =============================================================================
DO $$
DECLARE
    v_available_count INTEGER;
    v_ward_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_available_count FROM beds WHERE status = 'Available';
    SELECT SUM(available_beds) INTO v_ward_count FROM wards;
    
    RAISE NOTICE 'Migration 076: Fixed ward_census and bed_availability views';
    RAISE NOTICE 'Total Available Beds: %', v_available_count;
    RAISE NOTICE 'Wards available_beds sum: %', v_ward_count;
END $$;
