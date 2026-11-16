-- =====================================================
-- ENCOUNTER LINKAGE VERIFICATION
-- Simple queries to check if records are tied to encounters
-- =====================================================

-- =====================================================
-- SECTION 1: QUICK LINKAGE SUMMARY
-- =====================================================

-- 1A. Lab Requests - Encounter Linkage Status
SELECT 
    'Lab Requests' as table_name,
    COUNT(*) as total_records,
    COUNT(encounter_id) as has_encounter,
    COUNT(*) - COUNT(encounter_id) as missing_encounter,
    ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) as linkage_percent
FROM lab_requests;

-- 1B. Radiology Requests - Encounter Linkage Status
SELECT 
    'Radiology Requests' as table_name,
    COUNT(*) as total_records,
    COUNT(encounter_id) as has_encounter,
    COUNT(*) - COUNT(encounter_id) as missing_encounter,
    ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) as linkage_percent
FROM radiology_requests;

-- 1C. Consultations - Encounter Linkage Status
SELECT 
    'Consultations' as table_name,
    COUNT(*) as total_records,
    COUNT(encounter_id) as has_encounter,
    COUNT(*) - COUNT(encounter_id) as missing_encounter,
    ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) as linkage_percent
FROM consultations;

-- 1D. Vitals - Encounter Linkage Status
SELECT 
    'Vitals' as table_name,
    COUNT(*) as total_records,
    COUNT(encounter_id) as has_encounter,
    COUNT(*) - COUNT(encounter_id) as missing_encounter,
    ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) as linkage_percent
FROM vitals;

-- 1E. Prescriptions - Encounter Linkage Status
SELECT 
    'Prescriptions' as table_name,
    COUNT(*) as total_records,
    COUNT(encounter_id) as has_encounter,
    COUNT(*) - COUNT(encounter_id) as missing_encounter,
    ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) as linkage_percent
FROM prescriptions;

-- =====================================================
-- SECTION 2: COMBINED SUMMARY (ALL IN ONE)
-- =====================================================

-- 2A. All modules encounter linkage summary
SELECT 'Lab Requests' as module, COUNT(*) as total, COUNT(encounter_id) as linked, 
       ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) as pct FROM lab_requests
UNION ALL
SELECT 'Radiology Requests', COUNT(*), COUNT(encounter_id), 
       ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) FROM radiology_requests
UNION ALL
SELECT 'Consultations', COUNT(*), COUNT(encounter_id), 
       ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) FROM consultations
UNION ALL
SELECT 'Vitals', COUNT(*), COUNT(encounter_id), 
       ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) FROM vitals
UNION ALL
SELECT 'Prescriptions', COUNT(*), COUNT(encounter_id), 
       ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) FROM prescriptions
UNION ALL
SELECT 'Billing Orders', COUNT(*), COUNT(encounter_id), 
       ROUND(COUNT(encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) FROM billing_orders;

-- =====================================================
-- SECTION 3: LAB REQUESTS DETAILS
-- =====================================================

-- 3A. Lab requests with encounter info (no patient join)
SELECT 
    lr.request_id,
    lr.encounter_id,
    lr.patient_id,
    lr.status,
    lr.created_at,
    v.encounter_number,
    v.visit_id,
    CASE WHEN lr.encounter_id IS NULL THEN 'NO ENCOUNTER' ELSE 'Linked' END as link_status
FROM lab_requests lr
LEFT JOIN visits v ON lr.encounter_id = v.id
ORDER BY lr.created_at DESC
LIMIT 20;

-- 3B. Lab requests WITHOUT encounter (orphans)
SELECT 
    request_id,
    patient_id,
    encounter_id,
    status,
    created_at,
    'ORPHAN - No Encounter' as issue
FROM lab_requests
WHERE encounter_id IS NULL
ORDER BY created_at DESC;

-- 3C. Lab requests with valid encounter linkage
SELECT 
    lr.request_id,
    lr.encounter_id,
    v.encounter_number,
    v.visit_id,
    lr.status,
    lr.created_at
FROM lab_requests lr
INNER JOIN visits v ON lr.encounter_id = v.id
ORDER BY lr.created_at DESC
LIMIT 20;

-- =====================================================
-- SECTION 4: RADIOLOGY REQUESTS DETAILS
-- =====================================================

-- 4A. Radiology requests with encounter info
SELECT 
    rr.request_id,
    rr.encounter_id,
    rr.patient_id,
    rr.status,
    rr.imaging_type,
    rr.created_at,
    v.encounter_number,
    v.visit_id,
    CASE WHEN rr.encounter_id IS NULL THEN 'NO ENCOUNTER' ELSE 'Linked' END as link_status
FROM radiology_requests rr
LEFT JOIN visits v ON rr.encounter_id = v.id
ORDER BY rr.created_at DESC
LIMIT 20;

-- 4B. Radiology requests WITHOUT encounter (orphans)
SELECT 
    request_id,
    patient_id,
    encounter_id,
    imaging_type,
    status,
    created_at,
    'ORPHAN - No Encounter' as issue
FROM radiology_requests
WHERE encounter_id IS NULL
ORDER BY created_at DESC;

-- =====================================================
-- SECTION 5: LAB RESULTS VERIFICATION
-- =====================================================

-- 5A. Lab results count per request
SELECT 
    lr.request_id,
    lr.encounter_id,
    lr.status as request_status,
    COUNT(lres.id) as result_count,
    lr.created_at
FROM lab_requests lr
LEFT JOIN lab_results lres ON lr.request_id = lres.request_id
GROUP BY lr.request_id, lr.encounter_id, lr.status, lr.created_at
ORDER BY lr.created_at DESC;

-- 5B. Lab results with values
SELECT 
    id,
    request_id,
    test_id,
    result_value,
    reference_range,
    is_abnormal,
    created_at
FROM lab_results
WHERE result_value IS NOT NULL AND result_value != ''
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- SECTION 6: SCAN RESULTS (RADIOLOGY RESULTS)
-- =====================================================

-- 6A. Check scan_results table structure
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'scan_results'
ORDER BY ordinal_position;

-- 6B. Scan results data
SELECT * FROM scan_results LIMIT 10;

-- =====================================================
-- SECTION 7: PATIENT_ID TYPE CHECK
-- =====================================================

-- 7A. Check what type patient_id is in key tables
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'patient_id'
  AND table_name IN ('patients', 'lab_requests', 'radiology_requests', 'consultations', 'vitals', 'prescriptions')
ORDER BY table_name;

-- 7B. Check patients table id column type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'patients'
  AND column_name IN ('id', 'patient_id');
