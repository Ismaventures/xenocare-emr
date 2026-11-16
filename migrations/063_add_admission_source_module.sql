-- Migration: Add 'admission' to source_module enum
-- Version: 063
-- Date: 2026-01-07
-- Description: Adds 'admission' as a new source_module for billing orders

-- Add the new enum value to source_module type
ALTER TYPE source_module ADD VALUE IF NOT EXISTS 'admission';

-- Update the active_admissions_view to also check for 'admission' source_module
DROP VIEW IF EXISTS active_admissions_view;

CREATE OR REPLACE VIEW active_admissions_view AS
SELECT
    a.id AS admission_id,
    a.admission_number,
    a.admission_date,
    a.admission_type,
    a.admission_status,
    a.admitting_diagnosis,
    a.acuity_level,
    a.expected_discharge_date,
    p.id AS patient_id,
    p.first_name,
    p.surname AS last_name,
    p.date_of_birth,
    p.gender,
    p.emr_number AS hospital_id,
    w.name AS ward_name,
    w.ward_type,
    b.bed_number,
    s.first_name AS physician_first_name,
    s.last_name AS physician_last_name,
    a.facility_id,
    -- Enhanced fields for strict typing
    a.current_ward_id,
    a.current_bed_id,
    a.encounter_id,
    -- Billing Status for the Admission Fee
    -- Get billing status from the latest billing order that:
    -- 1. Matches the encounter_id, OR
    -- 2. Is for this patient with an Admission item created around the same time
    COALESCE(bo.status::text, 'Pending') AS billing_status,
    bo.id AS billing_order_id,
    bo.total_amount AS billing_amount
FROM admissions a
JOIN patients p ON p.id = a.patient_id
LEFT JOIN wards w ON w.id = a.current_ward_id
LEFT JOIN beds b ON b.id = a.current_bed_id
LEFT JOIN staff s ON s.id = a.attending_physician_id
-- Use LATERAL JOIN to get the billing order for this admission
-- Match by source_module='admission' and patient, or by encounter_id, or fallback by patient + date
LEFT JOIN LATERAL (
    SELECT 
        orders.id,
        orders.status,
        orders.total_amount
    FROM billing_orders orders
    WHERE (
        -- Primary match: by source_module and patient_id (most reliable for direct admissions)
        (orders.source_module = 'admission' AND orders.patient_id = a.patient_id 
         AND DATE(orders.created_at) = DATE(a.admission_date))
        OR
        -- Secondary match: by encounter_id (for admissions linked to outpatient encounters)
        (a.encounter_id IS NOT NULL AND orders.encounter_id = a.encounter_id)
    )
    ORDER BY orders.created_at DESC
    LIMIT 1
) bo ON true
WHERE a.admission_status NOT IN ('discharged', 'deceased');
