-- =====================================================
-- COMPREHENSIVE DATABASE INTEGRITY VERIFICATION
-- Covers ALL EMR Modules
-- Run these in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- SECTION A: PATIENT REGISTRATION MODULE
-- =====================================================

-- A1. Patients without EMR numbers
SELECT 
    patient_id,
    first_name,
    surname,
    emr_number,
    insurance_type,
    created_at
FROM patients 
WHERE emr_number IS NULL OR emr_number = ''
ORDER BY created_at DESC;

-- A2. Count of patients with/without EMR numbers
SELECT 
    CASE 
        WHEN emr_number IS NOT NULL AND emr_number != '' THEN 'Has EMR Number'
        ELSE 'Missing EMR Number'
    END as status,
    COUNT(*) as count
FROM patients
GROUP BY 1;

-- A3. Check for duplicate EMR numbers (should be 0)
SELECT emr_number, COUNT(*) as count
FROM patients
WHERE emr_number IS NOT NULL AND emr_number != ''
GROUP BY emr_number
HAVING COUNT(*) > 1;

-- A4. Patients with incomplete basic information
SELECT 
    patient_id,
    emr_number,
    first_name,
    surname,
    date_of_birth,
    gender,
    contact_phone,
    created_at,
    CASE 
        WHEN first_name IS NULL OR first_name = '' THEN 'Missing First Name'
        WHEN surname IS NULL OR surname = '' THEN 'Missing Surname'
        WHEN date_of_birth IS NULL THEN 'Missing DOB'
        WHEN gender IS NULL THEN 'Missing Gender'
        ELSE 'Complete'
    END as issue
FROM patients
WHERE first_name IS NULL OR first_name = ''
   OR surname IS NULL OR surname = ''
   OR date_of_birth IS NULL
   OR gender IS NULL;

-- A5. NHIS patients without NHIS number
SELECT 
    patient_id,
    emr_number,
    first_name || ' ' || surname as patient_name,
    insurance_type,
    nhis_number,
    created_at
FROM patients
WHERE insurance_type IN ('Civilian_NHIS', 'DHML')
  AND (nhis_number IS NULL OR nhis_number = '');

-- A6. Dependents without principal linkage
SELECT 
    patient_id,
    emr_number,
    first_name || ' ' || surname as patient_name,
    patient_type,
    principal_id,
    relationship_to_principal,
    created_at
FROM patients
WHERE patient_type = 'Dependent'
  AND principal_id IS NULL;

-- A7. Patient category breakdown
SELECT 
    patient_category,
    insurance_type,
    patient_type,
    COUNT(*) as count
FROM patients
GROUP BY patient_category, insurance_type, patient_type
ORDER BY patient_category, insurance_type;

-- =====================================================
-- SECTION B: ENCOUNTER/VISIT MODULE
-- =====================================================

-- B1. Visits without patient linkage (orphan visits)
SELECT 
    v.id,
    v.visit_id,
    v.encounter_number,
    v.patient_id,
    v.created_at,
    'Missing patient link' as issue
FROM visits v
LEFT JOIN patients p ON v.patient_id = p.id
WHERE p.id IS NULL;

-- B2. Visits without clinic assignment
SELECT 
    v.id,
    v.visit_id,
    v.encounter_number,
    v.clinic_id,
    v.created_at
FROM visits v
WHERE v.clinic_id IS NULL;

-- B3. Open visits older than 24 hours (potential stuck visits)
SELECT 
    v.id,
    v.visit_id,
    v.encounter_number,
    v.status,
    v.created_at,
    NOW() - v.created_at as age,
    p.first_name || ' ' || p.surname as patient_name
FROM visits v
JOIN patients p ON v.patient_id = p.id
WHERE v.status NOT IN ('Completed', 'Cancelled')
  AND v.created_at < NOW() - INTERVAL '24 hours'
ORDER BY v.created_at;

-- B4. Visit status breakdown
SELECT 
    status,
    visit_type,
    COUNT(*) as count
FROM visits
GROUP BY status, visit_type
ORDER BY status, visit_type;

-- B5. Visits by payment category
SELECT 
    payment_category,
    COUNT(*) as total_visits,
    COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status NOT IN ('Completed', 'Cancelled') THEN 1 END) as active
FROM visits
GROUP BY payment_category;

-- =====================================================
-- SECTION C: CONSULTATION MODULE
-- =====================================================

-- C1. Consultations without encounter linkage
SELECT 
    c.consultation_id,
    c.patient_id,
    c.encounter_id,
    c.complaints,
    c.created_at,
    'Missing encounter link' as issue
FROM consultations c
WHERE c.encounter_id IS NULL;

-- C2. Consultations without diagnosis
SELECT 
    c.consultation_id,
    c.patient_id,
    c.encounter_id,
    c.complaints,
    c.diagnosis,
    c.status,
    c.created_at
FROM consultations c
WHERE (c.diagnosis IS NULL OR array_length(c.diagnosis, 1) IS NULL OR array_length(c.diagnosis, 1) = 0)
  AND c.status = 'Completed';

-- C3. Consultations without doctor assignment
SELECT 
    c.consultation_id,
    c.patient_id,
    c.doctor_id,
    c.status,
    c.created_at
FROM consultations c
WHERE c.doctor_id IS NULL
  AND c.status != 'Pending';

-- C4. Consultation status breakdown
SELECT 
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN diagnosis IS NOT NULL AND array_length(diagnosis, 1) > 0 THEN 1 END) as with_diagnosis
FROM consultations
GROUP BY status;

-- C5. Consultations with patient details
SELECT 
    c.consultation_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    v.encounter_number,
    c.complaints,
    c.diagnosis,
    c.status,
    c.created_at
FROM consultations c
LEFT JOIN patients p ON c.patient_id = p.patient_id
LEFT JOIN visits v ON c.encounter_id = v.id
ORDER BY c.created_at DESC
LIMIT 50;

-- =====================================================
-- SECTION D: LABORATORY MODULE
-- =====================================================

-- D1. Lab requests without encounter linkage
SELECT 
    lr.request_id,
    lr.patient_id,
    lr.encounter_id,
    lr.status,
    lr.created_at,
    'Missing encounter link' as issue
FROM lab_requests lr
WHERE lr.encounter_id IS NULL;

-- D2. Lab requests without any test items
SELECT 
    lr.request_id,
    lr.patient_id,
    lr.status,
    lr.created_at,
    COUNT(lri.id) as test_count
FROM lab_requests lr
LEFT JOIN lab_request_items lri ON lr.request_id = lri.request_id
GROUP BY lr.request_id, lr.patient_id, lr.status, lr.created_at
HAVING COUNT(lri.id) = 0;

-- D3. Lab tests pending for more than 48 hours
SELECT 
    lr.request_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    lr.status,
    lr.priority,
    lr.created_at,
    NOW() - lr.created_at as age
FROM lab_requests lr
JOIN patients p ON lr.patient_id = p.patient_id
WHERE lr.status IN ('Pending', 'Sample_Collected', 'Processing')
  AND lr.created_at < NOW() - INTERVAL '48 hours'
ORDER BY lr.created_at;

-- D4. Lab request status breakdown
SELECT 
    status,
    priority,
    COUNT(*) as count
FROM lab_requests
GROUP BY status, priority
ORDER BY status, priority;

-- D5. Lab results without values (completed but empty)
SELECT 
    lr.id,
    lr.request_id,
    lr.test_id,
    lr.result_value,
    lr.created_at
FROM lab_results lr
WHERE lr.result_value IS NULL OR lr.result_value = '';

-- D6. Lab test catalogue items not used in last 90 days
SELECT 
    lt.id,
    lt.code,
    lt.name,
    lt.category,
    lt.is_active,
    MAX(lr.created_at) as last_ordered
FROM lab_test_catalogue lt
LEFT JOIN lab_requests lr ON lt.id = lr.test_id
WHERE lt.is_active = true
GROUP BY lt.id, lt.code, lt.name, lt.category, lt.is_active
HAVING MAX(lr.created_at) IS NULL OR MAX(lr.created_at) < NOW() - INTERVAL '90 days';

-- =====================================================
-- SECTION E: RADIOLOGY MODULE
-- =====================================================

-- E1. Radiology requests without encounter linkage
SELECT 
    rr.request_id,
    rr.patient_id,
    rr.encounter_id,
    rr.status,
    rr.created_at,
    'Missing encounter link' as issue
FROM radiology_requests rr
WHERE rr.encounter_id IS NULL;

-- E2. Radiology requests pending for more than 24 hours
SELECT 
    rr.request_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    rr.status,
    rr.priority,
    rr.created_at,
    NOW() - rr.created_at as age
FROM radiology_requests rr
JOIN patients p ON rr.patient_id = p.patient_id
WHERE rr.status IN ('Pending', 'Scheduled')
  AND rr.created_at < NOW() - INTERVAL '24 hours'
ORDER BY rr.created_at;

-- E3. Radiology status breakdown
SELECT 
    status,
    priority,
    COUNT(*) as count
FROM radiology_requests
GROUP BY status, priority
ORDER BY status, priority;

-- E4. Completed radiology without reports
SELECT 
    rr.request_id,
    rr.patient_id,
    rr.imaging_id,
    rr.imaging_type,
    rr.findings,
    rr.status,
    rr.created_at
FROM radiology_requests rr
WHERE rr.status = 'Completed'
  AND (rr.findings IS NULL OR rr.findings = '');

-- =====================================================
-- SECTION F: PHARMACY MODULE
-- =====================================================

-- F1. Prescriptions without encounter linkage
SELECT 
    p.prescription_id,
    p.patient_id,
    p.encounter_id,
    p.status,
    p.created_at,
    'Missing encounter link' as issue
FROM prescriptions p
WHERE p.encounter_id IS NULL;

-- F2. Prescriptions without items
SELECT 
    p.prescription_id,
    p.patient_id,
    p.status,
    p.created_at,
    COUNT(pi.id) as item_count
FROM prescriptions p
LEFT JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
GROUP BY p.prescription_id, p.patient_id, p.status, p.created_at
HAVING COUNT(pi.id) = 0;

-- F3. Pending prescriptions older than 24 hours
SELECT 
    p.prescription_id,
    pt.emr_number,
    pt.first_name || ' ' || pt.surname as patient_name,
    p.status,
    p.created_at,
    NOW() - p.created_at as age
FROM prescriptions p
JOIN patients pt ON p.patient_id = pt.patient_id
WHERE p.status IN ('Pending', 'Awaiting_Payment')
  AND p.created_at < NOW() - INTERVAL '24 hours'
ORDER BY p.created_at;

-- F4. Prescription status breakdown
SELECT 
    status,
    COUNT(*) as count
FROM prescriptions
GROUP BY status;

-- F5. Drug catalogue items with low/zero stock
SELECT 
    id,
    code,
    name,
    generic_name,
    category,
    stock_quantity,
    reorder_level,
    is_active
FROM drug_catalogue
WHERE is_active = true
  AND (stock_quantity <= 0 OR stock_quantity <= reorder_level)
ORDER BY stock_quantity;

-- F6. Dispensing records without prescription link
SELECT 
    d.id,
    d.patient_id,
    d.prescription_id,
    d.created_at
FROM dispenses d
WHERE d.prescription_id IS NULL;

-- =====================================================
-- SECTION G: NURSING MODULE
-- =====================================================

-- G1. Vitals without encounter linkage
SELECT 
    v.id,
    v.patient_id,
    v.encounter_id,
    v.created_at,
    'Missing encounter link' as issue
FROM vitals v
WHERE v.encounter_id IS NULL;

-- G2. Encounters without vitals
SELECT 
    vis.id,
    vis.visit_id,
    vis.encounter_number,
    p.first_name || ' ' || p.surname as patient_name,
    vis.status,
    vis.created_at
FROM visits vis
JOIN patients p ON vis.patient_id = p.id
LEFT JOIN vitals v ON vis.id = v.encounter_id
WHERE v.id IS NULL
  AND vis.status NOT IN ('Cancelled')
  AND vis.created_at > NOW() - INTERVAL '7 days';

-- G3. Abnormal vitals (for review)
SELECT 
    v.id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    v.blood_pressure_systolic,
    v.blood_pressure_diastolic,
    v.pulse,
    v.temperature,
    v.oxygen_saturation,
    v.created_at,
    CASE 
        WHEN v.blood_pressure_systolic > 140 OR v.blood_pressure_systolic < 90 THEN 'Abnormal BP'
        WHEN v.pulse > 100 OR v.pulse < 60 THEN 'Abnormal HR'
        WHEN v.temperature > 38 OR v.temperature < 36 THEN 'Abnormal Temp'
        WHEN v.oxygen_saturation < 95 THEN 'Low SpO2'
        ELSE 'Normal'
    END as alert
FROM vitals v
JOIN patients p ON v.patient_id = p.id
WHERE v.blood_pressure_systolic > 140 OR v.blood_pressure_systolic < 90
   OR v.pulse > 100 OR v.pulse < 60
   OR v.temperature > 38 OR v.temperature < 36
   OR v.oxygen_saturation < 95
ORDER BY v.created_at DESC
LIMIT 50;

-- =====================================================
-- SECTION H: QUEUE MODULE
-- =====================================================

-- H1. Orphan queue entries (no valid visit)
SELECT 
    q.id,
    q.visit_id,
    q.department_id,
    q.status,
    q.created_at
FROM queue q
LEFT JOIN visits v ON q.visit_id = v.id
WHERE v.id IS NULL;

-- H2. Stuck queue entries (waiting > 2 hours)
SELECT 
    q.id,
    q.visit_id,
    q.department_id,
    q.status,
    q.priority,
    q.created_at,
    NOW() - q.created_at as wait_time,
    p.first_name || ' ' || p.surname as patient_name
FROM queue q
JOIN visits v ON q.visit_id = v.id
JOIN patients p ON v.patient_id = p.id
WHERE q.status = 'Waiting'
  AND q.created_at < NOW() - INTERVAL '2 hours'
ORDER BY q.created_at;

-- H3. Queue status by department
SELECT 
    department_id,
    status,
    COUNT(*) as count
FROM queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY department_id, status
ORDER BY department_id, status;

-- =====================================================
-- SECTION I: BILLING MODULE
-- =====================================================

-- I1. Billing orders without encounter/visit linkage
SELECT 
    bo.id,
    bo.order_number,
    bo.patient_id,
    bo.visit_id,
    bo.encounter_id,
    bo.created_at,
    'Missing encounter link' as issue
FROM billing_orders bo
WHERE bo.encounter_id IS NULL AND bo.visit_id IS NULL;

-- I2. Billing orders with invalid patient reference
SELECT 
    bo.id,
    bo.order_number,
    bo.patient_id as billing_patient_id,
    bo.created_at,
    'Invalid patient reference' as issue
FROM billing_orders bo
LEFT JOIN patients p ON bo.patient_id = p.id
WHERE bo.patient_id IS NOT NULL AND p.id IS NULL;

-- I3. Unpaid billing orders older than 7 days
SELECT 
    bo.id,
    bo.order_number,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    bo.total_amount,
    bo.balance_amount,
    bo.status,
    bo.created_at,
    NOW() - bo.created_at as age
FROM billing_orders bo
JOIN patients p ON bo.patient_id = p.id
WHERE bo.status IN ('Pending', 'Awaiting_Payment')
  AND bo.created_at < NOW() - INTERVAL '7 days'
ORDER BY bo.created_at;

-- I4. Receipts without billing order linkage
SELECT 
    r.receipt_id,
    r.receipt_number,
    r.billing_order_id,
    r.patient_id,
    r.created_at,
    'Missing billing order link' as issue
FROM receipts r
WHERE r.billing_order_id IS NULL;

-- I5. Billing status breakdown
SELECT 
    status,
    payment_method,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    SUM(paid_amount) as paid_amount
FROM billing_orders
GROUP BY status, payment_method
ORDER BY status;

-- =====================================================
-- SECTION J: STAFF/USER MODULE
-- =====================================================

-- J1. Staff without user account
SELECT 
    s.staff_id,
    s.first_name || ' ' || s.last_name as staff_name,
    s.email,
    s.role,
    s.is_active,
    s.user_id
FROM staff s
WHERE s.user_id IS NULL
  AND s.is_active = true;

-- J2. Inactive staff with recent activity
SELECT 
    s.staff_id,
    s.first_name || ' ' || s.last_name as staff_name,
    s.role,
    s.is_active,
    s.last_login
FROM staff s
WHERE s.is_active = false
  AND s.last_login > NOW() - INTERVAL '30 days';

-- J3. Staff role breakdown
SELECT 
    role,
    is_active,
    COUNT(*) as count
FROM staff
GROUP BY role, is_active
ORDER BY role;

-- =====================================================
-- SECTION K: COMPREHENSIVE ORPHAN SUMMARY
-- =====================================================

SELECT 'Patients without EMR' as record_type, COUNT(*) as orphan_count
FROM patients WHERE emr_number IS NULL OR emr_number = ''
UNION ALL
SELECT 'Patients missing basic info', COUNT(*)
FROM patients WHERE first_name IS NULL OR surname IS NULL OR date_of_birth IS NULL
UNION ALL
SELECT 'NHIS patients without NHIS#', COUNT(*)
FROM patients WHERE insurance_type IN ('Civilian_NHIS', 'DHML') AND (nhis_number IS NULL OR nhis_number = '')
UNION ALL
SELECT 'Dependents without Principal', COUNT(*)
FROM patients WHERE patient_type = 'Dependent' AND principal_id IS NULL
UNION ALL
SELECT 'Visits without Patient', COUNT(*)
FROM visits v LEFT JOIN patients p ON v.patient_id = p.id WHERE p.id IS NULL
UNION ALL
SELECT 'Consultations without Encounter', COUNT(*)
FROM consultations WHERE encounter_id IS NULL
UNION ALL
SELECT 'Lab Requests without Encounter', COUNT(*)
FROM lab_requests WHERE encounter_id IS NULL
UNION ALL
SELECT 'Radiology Requests without Encounter', COUNT(*)
FROM radiology_requests WHERE encounter_id IS NULL
UNION ALL
SELECT 'Prescriptions without Encounter', COUNT(*)
FROM prescriptions WHERE encounter_id IS NULL
UNION ALL
SELECT 'Vitals without Encounter', COUNT(*)
FROM vitals WHERE encounter_id IS NULL
UNION ALL
SELECT 'Billing Orders without Encounter', COUNT(*)
FROM billing_orders WHERE encounter_id IS NULL AND visit_id IS NULL
UNION ALL
SELECT 'Receipts without Billing Order', COUNT(*)
FROM receipts WHERE billing_order_id IS NULL
UNION ALL
SELECT 'Queue entries without Visit', COUNT(*)
FROM queue q LEFT JOIN visits v ON q.visit_id = v.id WHERE v.id IS NULL;

-- =====================================================
-- SECTION L: COMPLETE PATIENT JOURNEY VERIFICATION
-- =====================================================

-- Full patient journey: Registration -> Encounter -> Services -> Billing -> Receipt
SELECT 
    p.patient_id,
    p.emr_number,
    p.first_name || ' ' || p.surname as patient_name,
    p.insurance_type,
    v.visit_id,
    v.encounter_number,
    v.status as visit_status,
    c.consultation_id IS NOT NULL as has_consultation,
    lr.request_id IS NOT NULL as has_lab,
    rr.request_id IS NOT NULL as has_radiology,
    pr.prescription_id IS NOT NULL as has_prescription,
    vit.id IS NOT NULL as has_vitals,
    bo.id IS NOT NULL as has_billing,
    r.receipt_id IS NOT NULL as has_receipt,
    CASE 
        WHEN v.id IS NULL THEN 'No Encounter'
        WHEN vit.id IS NULL THEN 'Missing Vitals'
        WHEN c.consultation_id IS NULL AND v.status NOT IN ('Registered', 'Cancelled') THEN 'Missing Consultation'
        WHEN bo.id IS NULL THEN 'Missing Billing'
        WHEN r.receipt_id IS NULL AND bo.status NOT IN ('Pending', 'Awaiting_Payment') THEN 'Missing Receipt'
        ELSE 'Complete'
    END as journey_status
FROM patients p
LEFT JOIN visits v ON v.patient_id = p.id
LEFT JOIN consultations c ON c.encounter_id = v.id
LEFT JOIN lab_requests lr ON lr.encounter_id = v.id
LEFT JOIN radiology_requests rr ON rr.encounter_id = v.id
LEFT JOIN prescriptions pr ON pr.encounter_id = v.id
LEFT JOIN vitals vit ON vit.encounter_id = v.id
LEFT JOIN billing_orders bo ON bo.encounter_id = v.id OR bo.visit_id = v.id
LEFT JOIN receipts r ON r.billing_order_id = bo.id
WHERE p.created_at > NOW() - INTERVAL '30 days'
ORDER BY p.created_at DESC
LIMIT 100;

-- =====================================================
-- SECTION M: DATA QUALITY METRICS
-- =====================================================

-- Overall data quality score
SELECT 
    'Total Patients' as metric, COUNT(*)::text as value FROM patients
UNION ALL
SELECT 'Patients with EMR#', COUNT(*)::text FROM patients WHERE emr_number IS NOT NULL AND emr_number != ''
UNION ALL
SELECT 'Total Encounters', COUNT(*)::text FROM visits
UNION ALL
SELECT 'Encounters with Vitals', COUNT(DISTINCT v.encounter_id)::text FROM vitals v
UNION ALL
SELECT 'Encounters with Consultation', COUNT(DISTINCT c.encounter_id)::text FROM consultations c
UNION ALL
SELECT 'Total Billing Orders', COUNT(*)::text FROM billing_orders
UNION ALL
SELECT 'Billing Orders with Encounter', COUNT(*)::text FROM billing_orders WHERE encounter_id IS NOT NULL
UNION ALL
SELECT 'Total Receipts', COUNT(*)::text FROM receipts
UNION ALL
SELECT 'Receipts with Billing Order', COUNT(*)::text FROM receipts WHERE billing_order_id IS NOT NULL;
