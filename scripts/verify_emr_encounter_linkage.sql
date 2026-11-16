-- =====================================================
-- EMR NUMBER & ENCOUNTER LINKAGE VERIFICATION
-- Check if all records are linked to EMR and encounters
-- =====================================================

-- =====================================================
-- SECTION 1: EMR NUMBER COVERAGE
-- =====================================================

-- 1A. Patients with/without EMR numbers
SELECT 
    'Patients' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN emr_number IS NOT NULL AND emr_number != '' THEN 1 END) as has_emr,
    COUNT(CASE WHEN emr_number IS NULL OR emr_number = '' THEN 1 END) as missing_emr,
    ROUND(COUNT(CASE WHEN emr_number IS NOT NULL AND emr_number != '' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as emr_coverage_pct
FROM patients;

-- 1B. List patients without EMR numbers
SELECT 
    id,
    patient_id,
    emr_number,
    first_name || ' ' || surname as patient_name,
    created_at,
    'MISSING EMR NUMBER' as issue
FROM patients
WHERE emr_number IS NULL OR emr_number = '';

-- =====================================================
-- SECTION 2: ALL MODULES - EMR & ENCOUNTER LINKAGE
-- =====================================================

-- 2A. Complete linkage summary for ALL modules
SELECT 
    'Lab Requests' as module,
    COUNT(*) as total_records,
    COUNT(lr.encounter_id) as has_encounter,
    COUNT(p.emr_number) as has_emr,
    COUNT(*) - COUNT(lr.encounter_id) as missing_encounter,
    COUNT(*) - COUNT(p.emr_number) as missing_emr,
    ROUND(COUNT(lr.encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2) as encounter_pct,
    ROUND(COUNT(p.emr_number) * 100.0 / NULLIF(COUNT(*), 0), 2) as emr_pct
FROM lab_requests lr
LEFT JOIN patients p ON lr.patient_id = p.patient_id

UNION ALL

SELECT 
    'Radiology Requests',
    COUNT(*),
    COUNT(rr.encounter_id),
    COUNT(p.emr_number),
    COUNT(*) - COUNT(rr.encounter_id),
    COUNT(*) - COUNT(p.emr_number),
    ROUND(COUNT(rr.encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2),
    ROUND(COUNT(p.emr_number) * 100.0 / NULLIF(COUNT(*), 0), 2)
FROM radiology_requests rr
LEFT JOIN patients p ON rr.patient_id = p.patient_id

UNION ALL

SELECT 
    'Consultations',
    COUNT(*),
    COUNT(c.encounter_id),
    COUNT(p.emr_number),
    COUNT(*) - COUNT(c.encounter_id),
    COUNT(*) - COUNT(p.emr_number),
    ROUND(COUNT(c.encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2),
    ROUND(COUNT(p.emr_number) * 100.0 / NULLIF(COUNT(*), 0), 2)
FROM consultations c
LEFT JOIN patients p ON c.patient_id = p.patient_id

UNION ALL

SELECT 
    'Vitals',
    COUNT(*),
    COUNT(vt.encounter_id),
    COUNT(p.emr_number),
    COUNT(*) - COUNT(vt.encounter_id),
    COUNT(*) - COUNT(p.emr_number),
    ROUND(COUNT(vt.encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2),
    ROUND(COUNT(p.emr_number) * 100.0 / NULLIF(COUNT(*), 0), 2)
FROM vitals vt
LEFT JOIN patients p ON vt.patient_id = p.id

UNION ALL

SELECT 
    'Prescriptions',
    COUNT(*),
    COUNT(pr.encounter_id),
    COUNT(p.emr_number),
    COUNT(*) - COUNT(pr.encounter_id),
    COUNT(*) - COUNT(p.emr_number),
    ROUND(COUNT(pr.encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2),
    ROUND(COUNT(p.emr_number) * 100.0 / NULLIF(COUNT(*), 0), 2)
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.patient_id

UNION ALL

SELECT 
    'Billing Orders',
    COUNT(*),
    COUNT(bo.encounter_id),
    COUNT(p.emr_number),
    COUNT(*) - COUNT(bo.encounter_id),
    COUNT(*) - COUNT(p.emr_number),
    ROUND(COUNT(bo.encounter_id) * 100.0 / NULLIF(COUNT(*), 0), 2),
    ROUND(COUNT(p.emr_number) * 100.0 / NULLIF(COUNT(*), 0), 2)
FROM billing_orders bo
LEFT JOIN patients p ON bo.patient_id = p.id;

-- =====================================================
-- SECTION 3: VISITS/ENCOUNTERS - EMR LINKAGE
-- =====================================================

-- 3A. Visits linked to EMR numbers
SELECT 
    'Visits/Encounters' as module,
    COUNT(*) as total_visits,
    COUNT(p.emr_number) as linked_to_emr,
    COUNT(*) - COUNT(p.emr_number) as missing_emr_link,
    ROUND(COUNT(p.emr_number) * 100.0 / NULLIF(COUNT(*), 0), 2) as emr_linkage_pct
FROM visits v
LEFT JOIN patients p ON v.patient_id = p.id;

-- 3B. Visits without EMR number (orphan encounters)
SELECT 
    v.id as visit_id,
    v.encounter_number,
    v.patient_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    v.status,
    v.created_at,
    CASE 
        WHEN p.id IS NULL THEN 'NO PATIENT LINK'
        WHEN p.emr_number IS NULL OR p.emr_number = '' THEN 'PATIENT HAS NO EMR'
        ELSE 'OK'
    END as issue
FROM visits v
LEFT JOIN patients p ON v.patient_id = p.id
WHERE p.id IS NULL OR p.emr_number IS NULL OR p.emr_number = '';

-- =====================================================
-- SECTION 4: EMR TO ENCOUNTER CHAIN
-- =====================================================

-- 4A. Patients with their encounter counts
SELECT 
    p.emr_number,
    p.patient_id,
    p.first_name || ' ' || p.surname as patient_name,
    COUNT(v.id) as total_encounters,
    COUNT(CASE WHEN v.status = 'Completed' THEN 1 END) as completed_encounters,
    COUNT(CASE WHEN v.status NOT IN ('Completed', 'Cancelled') THEN 1 END) as active_encounters,
    MIN(v.created_at) as first_visit,
    MAX(v.created_at) as last_visit
FROM patients p
LEFT JOIN visits v ON v.patient_id = p.id
WHERE p.emr_number IS NOT NULL AND p.emr_number != ''
GROUP BY p.emr_number, p.patient_id, p.first_name, p.surname
ORDER BY total_encounters DESC;

-- 4B. EMR numbers that have never had an encounter
SELECT 
    p.emr_number,
    p.patient_id,
    p.first_name || ' ' || p.surname as patient_name,
    p.created_at as registration_date,
    'NO ENCOUNTERS' as issue
FROM patients p
LEFT JOIN visits v ON v.patient_id = p.id
WHERE p.emr_number IS NOT NULL AND p.emr_number != ''
  AND v.id IS NULL;

-- =====================================================
-- SECTION 5: FULL DATA CHAIN VERIFICATION
-- =====================================================

-- 5A. Complete chain: EMR -> Encounter -> Services
SELECT 
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    v.encounter_number,
    v.status as visit_status,
    v.created_at as visit_date,
    CASE WHEN vt.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_vitals,
    CASE WHEN c.consultation_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_consultation,
    CASE WHEN lr.request_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_lab,
    CASE WHEN rr.request_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_radiology,
    CASE WHEN pr.prescription_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_prescription,
    CASE WHEN bo.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_billing
FROM patients p
JOIN visits v ON v.patient_id = p.id
LEFT JOIN vitals vt ON vt.encounter_id = v.id
LEFT JOIN consultations c ON c.encounter_id = v.id
LEFT JOIN lab_requests lr ON lr.encounter_id = v.id
LEFT JOIN radiology_requests rr ON rr.encounter_id = v.id
LEFT JOIN prescriptions pr ON pr.encounter_id = v.id
LEFT JOIN billing_orders bo ON bo.encounter_id = v.id
WHERE p.emr_number IS NOT NULL AND p.emr_number != ''
ORDER BY v.created_at DESC
LIMIT 50;

-- =====================================================
-- SECTION 6: ORPHAN RECORDS (NO EMR LINKAGE)
-- =====================================================

-- 6A. Lab requests not linked to valid EMR
SELECT 
    lr.request_id,
    lr.patient_id,
    p.emr_number,
    lr.encounter_id,
    lr.status,
    lr.created_at,
    CASE 
        WHEN p.patient_id IS NULL THEN 'NO PATIENT FOUND'
        WHEN p.emr_number IS NULL OR p.emr_number = '' THEN 'PATIENT HAS NO EMR'
        ELSE 'OK'
    END as emr_issue
FROM lab_requests lr
LEFT JOIN patients p ON lr.patient_id = p.patient_id
WHERE p.patient_id IS NULL OR p.emr_number IS NULL OR p.emr_number = '';

-- 6B. Radiology requests not linked to valid EMR
SELECT 
    rr.request_id,
    rr.patient_id,
    p.emr_number,
    rr.encounter_id,
    rr.imaging_type,
    rr.status,
    rr.created_at,
    CASE 
        WHEN p.patient_id IS NULL THEN 'NO PATIENT FOUND'
        WHEN p.emr_number IS NULL OR p.emr_number = '' THEN 'PATIENT HAS NO EMR'
        ELSE 'OK'
    END as emr_issue
FROM radiology_requests rr
LEFT JOIN patients p ON rr.patient_id = p.patient_id
WHERE p.patient_id IS NULL OR p.emr_number IS NULL OR p.emr_number = '';

-- 6C. Prescriptions not linked to valid EMR
SELECT 
    pr.prescription_id,
    pr.patient_id,
    p.emr_number,
    pr.encounter_id,
    pr.status,
    pr.created_at,
    CASE 
        WHEN p.patient_id IS NULL THEN 'NO PATIENT FOUND'
        WHEN p.emr_number IS NULL OR p.emr_number = '' THEN 'PATIENT HAS NO EMR'
        ELSE 'OK'
    END as emr_issue
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.patient_id
WHERE p.patient_id IS NULL OR p.emr_number IS NULL OR p.emr_number = '';

-- =====================================================
-- SECTION 7: SUMMARY DASHBOARD
-- =====================================================

-- 7A. Overall data integrity score
SELECT 
    'Total Patients' as metric, COUNT(*)::text as value, '' as status FROM patients
UNION ALL
SELECT 'Patients with EMR', COUNT(*)::text, 
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM patients) THEN '✓ 100%' ELSE '⚠ Incomplete' END
FROM patients WHERE emr_number IS NOT NULL AND emr_number != ''
UNION ALL
SELECT 'Total Encounters', COUNT(*)::text, '' FROM visits
UNION ALL
SELECT 'Encounters linked to EMR', COUNT(*)::text,
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM visits) THEN '✓ 100%' ELSE '⚠ Incomplete' END
FROM visits v JOIN patients p ON v.patient_id = p.id WHERE p.emr_number IS NOT NULL AND p.emr_number != ''
UNION ALL
SELECT 'Lab Requests with Encounter', COUNT(*)::text,
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM lab_requests) THEN '✓ 100%' ELSE '⚠ Incomplete' END
FROM lab_requests WHERE encounter_id IS NOT NULL
UNION ALL
SELECT 'Radiology with Encounter', COUNT(*)::text,
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM radiology_requests) THEN '✓ 100%' ELSE '⚠ Incomplete' END
FROM radiology_requests WHERE encounter_id IS NOT NULL
UNION ALL
SELECT 'Prescriptions with Encounter', COUNT(*)::text,
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM prescriptions) THEN '✓ 100%' ELSE '⚠ Incomplete' END
FROM prescriptions WHERE encounter_id IS NOT NULL
UNION ALL
SELECT 'Vitals with Encounter', COUNT(*)::text,
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM vitals) THEN '✓ 100%' ELSE '⚠ Incomplete' END
FROM vitals WHERE encounter_id IS NOT NULL
UNION ALL
SELECT 'Billing with Encounter', COUNT(*)::text,
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM billing_orders) THEN '✓ 100%' ELSE '⚠ Incomplete' END
FROM billing_orders WHERE encounter_id IS NOT NULL;
