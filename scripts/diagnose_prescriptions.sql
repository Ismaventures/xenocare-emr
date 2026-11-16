-- =====================================================
-- PRESCRIPTIONS DIAGNOSTIC
-- Check why pending prescriptions shows 0
-- =====================================================

-- 1. Total prescriptions count
SELECT COUNT(*) as total_prescriptions FROM prescriptions;

-- 2. Check prescriptions patient_id column type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'prescriptions'
  AND column_name IN ('patient_id', 'prescription_id', 'status', 'encounter_id');

-- 3. Count prescriptions by status
SELECT 
    status::text as status_value,
    COUNT(*) as count
FROM prescriptions
GROUP BY status
ORDER BY count DESC;

-- 4. All prescriptions (raw data, no joins)
SELECT 
    prescription_id,
    patient_id,
    encounter_id,
    status,
    created_at
FROM prescriptions
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check all unique status values in prescriptions table
SELECT DISTINCT status::text as status_value FROM prescriptions;

-- 6. Prescriptions with patient details (using patient_id = patient_id VARCHAR join)
SELECT 
    pr.prescription_id,
    pr.patient_id as rx_patient_id,
    p.patient_id as pt_patient_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    pr.status::text as status,
    pr.encounter_id,
    pr.created_at
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.patient_id
ORDER BY pr.created_at DESC
LIMIT 20;

-- 7. Count prescriptions with valid patient link
SELECT 
    'Total Prescriptions' as metric,
    COUNT(*) as value
FROM prescriptions
UNION ALL
SELECT 
    'With Patient Link',
    COUNT(*)
FROM prescriptions pr
JOIN patients p ON pr.patient_id = p.patient_id
UNION ALL
SELECT 
    'Without Patient Link',
    COUNT(*)
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.patient_id
WHERE p.patient_id IS NULL;

-- 8. Pending/Awaiting prescriptions (matching DispenseStatus enum)
SELECT 
    prescription_id,
    patient_id,
    status::text,
    created_at
FROM prescriptions
WHERE status IN ('Pending', 'Awaiting_Payment')
ORDER BY created_at DESC;

-- 9. All prescription statuses from the DispenseStatus enum
-- Expected values: 'Dispensed', 'Pending', 'Partial', 'Out of Stock', 'Cancelled', 'Verified', 'Awaiting_Payment', 'Paid', 'Waived'
SELECT 
    status::text as status_value,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM prescriptions), 0), 2) as percentage
FROM prescriptions
GROUP BY status
ORDER BY count DESC;
