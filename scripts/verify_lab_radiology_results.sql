-- =====================================================
-- LAB & RADIOLOGY RESULTS INTEGRITY VERIFICATION
-- Check if results are stored and tied to encounters
-- =====================================================

-- =====================================================
-- SECTION 1: LAB RESULTS OVERVIEW
-- =====================================================

-- 1A. Total lab requests and results summary
SELECT 
    'Total Lab Requests' as metric, COUNT(*)::text as value FROM lab_requests
UNION ALL
SELECT 'Lab Requests with Encounter', COUNT(*)::text FROM lab_requests WHERE encounter_id IS NOT NULL
UNION ALL
SELECT 'Lab Requests without Encounter', COUNT(*)::text FROM lab_requests WHERE encounter_id IS NULL
UNION ALL
SELECT 'Total Lab Results', COUNT(*)::text FROM lab_results
UNION ALL
SELECT 'Lab Results with Values', COUNT(*)::text FROM lab_results WHERE result_value IS NOT NULL AND result_value != ''
UNION ALL
SELECT 'Lab Results without Values', COUNT(*)::text FROM lab_results WHERE result_value IS NULL OR result_value = '';

-- 1B. Lab requests with their result counts
SELECT 
    lr.request_id,
    lr.encounter_id,
    lr.patient_id,
    lr.status as request_status,
    lr.created_at as request_date,
    COUNT(lres.id) as result_count,
    COUNT(CASE WHEN lres.result_value IS NOT NULL AND lres.result_value != '' THEN 1 END) as results_with_value
FROM lab_requests lr
LEFT JOIN lab_results lres ON lr.request_id = lres.request_id
GROUP BY lr.request_id, lr.encounter_id, lr.patient_id, lr.status, lr.created_at
ORDER BY lr.created_at DESC;

-- 1C. Lab requests with encounter and patient details
SELECT 
    lr.request_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    v.encounter_number,
    v.visit_id,
    lr.status as request_status,
    lr.priority,
    lr.created_at,
    CASE 
        WHEN lr.encounter_id IS NULL THEN 'NO ENCOUNTER LINK'
        ELSE 'Linked'
    END as encounter_status
FROM lab_requests lr
LEFT JOIN patients p ON lr.patient_id = p.patient_id
LEFT JOIN visits v ON lr.encounter_id = v.id
ORDER BY lr.created_at DESC;

-- 1D. Lab results with full details
SELECT 
    lres.id as result_id,
    lres.request_id,
    lr.encounter_id,
    v.encounter_number,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    lres.test_id,
    lt.name as test_name,
    lres.result_value,
    lres.reference_range,
    lres.unit,
    lres.is_abnormal,
    lres.created_at as result_date,
    CASE 
        WHEN lr.encounter_id IS NULL THEN 'NO ENCOUNTER'
        WHEN lres.result_value IS NULL OR lres.result_value = '' THEN 'NO RESULT VALUE'
        ELSE 'Complete'
    END as status
FROM lab_results lres
JOIN lab_requests lr ON lres.request_id = lr.request_id
LEFT JOIN visits v ON lr.encounter_id = v.id
LEFT JOIN patients p ON lr.patient_id = p.patient_id
LEFT JOIN lab_test_catalogue lt ON lres.test_id = lt.id
ORDER BY lres.created_at DESC;

-- 1E. Orphan lab results (results without valid request)
SELECT 
    lres.id as result_id,
    lres.request_id,
    lres.test_id,
    lres.result_value,
    lres.created_at,
    'Orphan - No valid request' as issue
FROM lab_results lres
LEFT JOIN lab_requests lr ON lres.request_id = lr.request_id
WHERE lr.request_id IS NULL;

-- 1F. Lab request items without results
SELECT 
    lri.id as item_id,
    lri.request_id,
    lri.test_id,
    lt.name as test_name,
    lr.status as request_status,
    lr.encounter_id,
    lri.created_at,
    'Missing Result' as issue
FROM lab_request_items lri
JOIN lab_requests lr ON lri.request_id = lr.request_id
LEFT JOIN lab_test_catalogue lt ON lri.test_id = lt.id
LEFT JOIN lab_results lres ON lri.request_id = lres.request_id AND lri.test_id = lres.test_id
WHERE lres.id IS NULL
  AND lr.status IN ('Sample_Collected', 'Processing', 'Completed')
ORDER BY lri.created_at DESC;

-- =====================================================
-- SECTION 2: RADIOLOGY RESULTS OVERVIEW
-- =====================================================

-- 2A. Total radiology requests summary
SELECT 
    'Total Radiology Requests' as metric, COUNT(*)::text as value FROM radiology_requests
UNION ALL
SELECT 'Radiology with Encounter', COUNT(*)::text FROM radiology_requests WHERE encounter_id IS NOT NULL
UNION ALL
SELECT 'Radiology without Encounter', COUNT(*)::text FROM radiology_requests WHERE encounter_id IS NULL
UNION ALL
SELECT 'Completed with Findings', COUNT(*)::text FROM radiology_requests WHERE status = 'Completed' AND findings IS NOT NULL AND findings != ''
UNION ALL
SELECT 'Completed without Findings', COUNT(*)::text FROM radiology_requests WHERE status = 'Completed' AND (findings IS NULL OR findings = '');

-- 2B. Radiology requests with encounter and patient details
SELECT 
    rr.request_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    v.encounter_number,
    v.visit_id,
    rr.imaging_type,
    rr.imaging_id,
    rr.status as request_status,
    rr.priority,
    rr.findings,
    rr.impression,
    rr.created_at,
    CASE 
        WHEN rr.encounter_id IS NULL THEN 'NO ENCOUNTER LINK'
        ELSE 'Linked'
    END as encounter_status,
    CASE 
        WHEN rr.status = 'Completed' AND (rr.findings IS NULL OR rr.findings = '') THEN 'MISSING FINDINGS'
        WHEN rr.status = 'Completed' THEN 'Complete with Findings'
        ELSE rr.status::text
    END as result_status
FROM radiology_requests rr
LEFT JOIN patients p ON rr.patient_id = p.patient_id
LEFT JOIN visits v ON rr.encounter_id = v.id
ORDER BY rr.created_at DESC;

-- 2C. Radiology by imaging type with result status
SELECT 
    rr.imaging_type,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN rr.encounter_id IS NOT NULL THEN 1 END) as with_encounter,
    COUNT(CASE WHEN rr.encounter_id IS NULL THEN 1 END) as without_encounter,
    COUNT(CASE WHEN rr.status = 'Completed' THEN 1 END) as completed,
    COUNT(CASE WHEN rr.status = 'Completed' AND rr.findings IS NOT NULL AND rr.findings != '' THEN 1 END) as with_findings,
    COUNT(CASE WHEN rr.status = 'Completed' AND (rr.findings IS NULL OR rr.findings = '') THEN 1 END) as missing_findings
FROM radiology_requests rr
GROUP BY rr.imaging_type
ORDER BY total_requests DESC;

-- 2D. Completed radiology without findings (need attention)
SELECT 
    rr.request_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    v.encounter_number,
    rr.imaging_type,
    rr.imaging_id,
    rr.status,
    rr.findings,
    rr.impression,
    rr.performed_by,
    rr.created_at,
    rr.performed_at,
    'Missing Findings' as issue
FROM radiology_requests rr
LEFT JOIN patients p ON rr.patient_id = p.patient_id
LEFT JOIN visits v ON rr.encounter_id = v.id
WHERE rr.status = 'Completed'
  AND (rr.findings IS NULL OR rr.findings = '')
ORDER BY rr.created_at DESC;

-- =====================================================
-- SECTION 3: COMBINED ENCOUNTER LINKAGE SUMMARY
-- =====================================================

-- 3A. Per-encounter service summary
SELECT 
    v.id as encounter_id,
    v.encounter_number,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    v.status as visit_status,
    v.created_at,
    COUNT(DISTINCT lr.request_id) as lab_requests,
    COUNT(DISTINCT lres.id) as lab_results,
    COUNT(DISTINCT rr.request_id) as radiology_requests,
    COUNT(DISTINCT CASE WHEN rr.findings IS NOT NULL AND rr.findings != '' THEN rr.request_id END) as radiology_with_findings
FROM visits v
JOIN patients p ON v.patient_id = p.id
LEFT JOIN lab_requests lr ON lr.encounter_id = v.id
LEFT JOIN lab_results lres ON lres.request_id = lr.request_id
LEFT JOIN radiology_requests rr ON rr.encounter_id = v.id
GROUP BY v.id, v.encounter_number, p.emr_number, p.first_name, p.surname, v.status, v.created_at
ORDER BY v.created_at DESC;

-- 3B. Overall encounter linkage integrity score
SELECT 
    'Lab Requests' as service_type,
    COUNT(*) as total,
    COUNT(CASE WHEN encounter_id IS NOT NULL THEN 1 END) as linked,
    COUNT(CASE WHEN encounter_id IS NULL THEN 1 END) as orphan,
    ROUND(COUNT(CASE WHEN encounter_id IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as linkage_percentage
FROM lab_requests
UNION ALL
SELECT 
    'Radiology Requests',
    COUNT(*),
    COUNT(CASE WHEN encounter_id IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN encounter_id IS NULL THEN 1 END),
    ROUND(COUNT(CASE WHEN encounter_id IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2)
FROM radiology_requests;

-- 3C. Results completion rate
SELECT 
    'Lab Results' as result_type,
    COUNT(*) as total_results,
    COUNT(CASE WHEN result_value IS NOT NULL AND result_value != '' THEN 1 END) as with_values,
    COUNT(CASE WHEN result_value IS NULL OR result_value = '' THEN 1 END) as without_values,
    ROUND(COUNT(CASE WHEN result_value IS NOT NULL AND result_value != '' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as completion_percentage
FROM lab_results
UNION ALL
SELECT 
    'Radiology Findings',
    COUNT(*),
    COUNT(CASE WHEN findings IS NOT NULL AND findings != '' THEN 1 END),
    COUNT(CASE WHEN findings IS NULL OR findings = '' THEN 1 END),
    ROUND(COUNT(CASE WHEN findings IS NOT NULL AND findings != '' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2)
FROM radiology_requests
WHERE status = 'Completed';
