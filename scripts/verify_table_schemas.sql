-- =====================================================
-- TABLE SCHEMA VERIFICATION
-- Check actual column types in your database
-- =====================================================

-- =====================================================
-- SECTION 1: LIST ALL TABLE COLUMNS AND TYPES
-- =====================================================

-- 1A. Core Tables Schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('patients', 'visits', 'consultations', 'vitals')
ORDER BY table_name, ordinal_position;

-- 1B. Lab Module Tables Schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('lab_requests', 'lab_results', 'lab_request_items', 'lab_test_catalogue')
ORDER BY table_name, ordinal_position;

-- 1C. Radiology Module Tables Schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('radiology_requests', 'scan_results', 'scan_images', 'imaging_catalogue')
ORDER BY table_name, ordinal_position;

-- 1D. Pharmacy Module Tables Schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('prescriptions', 'prescription_items', 'drug_catalogue', 'dispenses')
ORDER BY table_name, ordinal_position;

-- 1E. Billing Module Tables Schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('billing_orders', 'billing_items', 'receipts', 'receipt_items')
ORDER BY table_name, ordinal_position;

-- 1F. Queue and Staff Tables Schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('queue', 'staff', 'clinics', 'departments')
ORDER BY table_name, ordinal_position;

-- =====================================================
-- SECTION 2: CONSULTATION MODULE VERIFICATION
-- =====================================================

-- 2A. Consultations table schema
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'consultations'
ORDER BY ordinal_position;

-- 2B. Sample consultations data (first 10 records)
SELECT * FROM consultations LIMIT 10;

-- 2C. Consultation foreign key relationships
SELECT 
    c.consultation_id,
    c.patient_id as consultation_patient_id,
    c.encounter_id,
    c.doctor_id,
    p.id as patients_id,
    p.patient_id as patients_patient_id,
    v.id as visits_id,
    v.visit_id as visits_visit_id
FROM consultations c
LEFT JOIN patients p ON c.patient_id::uuid = p.id  -- Try UUID cast
LEFT JOIN visits v ON c.encounter_id = v.id
LIMIT 5;

-- =====================================================
-- SECTION 3: CLINICAL NURSING (VITALS) MODULE VERIFICATION
-- =====================================================

-- 3A. Vitals table schema
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'vitals'
ORDER BY ordinal_position;

-- 3B. Sample vitals data (first 10 records)
SELECT * FROM vitals LIMIT 10;

-- 3C. Vitals foreign key relationships
SELECT 
    v.id as vital_id,
    v.patient_id as vitals_patient_id,
    v.encounter_id,
    p.id as patients_id,
    p.patient_id as patients_patient_id,
    vis.id as visits_id,
    vis.visit_id as visits_visit_id
FROM vitals v
LEFT JOIN patients p ON v.patient_id = p.id
LEFT JOIN visits vis ON v.encounter_id = vis.id
LIMIT 5;

-- =====================================================
-- SECTION 4: PATIENTS TABLE KEY COLUMNS
-- =====================================================

-- 4A. Patients table - check id vs patient_id types
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'patients'
  AND column_name IN ('id', 'patient_id', 'emr_number')
ORDER BY ordinal_position;

-- 4B. Sample patient IDs
SELECT 
    id,
    patient_id,
    emr_number,
    first_name || ' ' || surname as name
FROM patients
LIMIT 5;

-- =====================================================
-- SECTION 5: LAB_REQUESTS PATIENT_ID TYPE CHECK
-- =====================================================

-- 5A. Lab requests patient_id type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lab_requests'
  AND column_name = 'patient_id';

-- 5B. Sample lab_requests patient_id values
SELECT 
    request_id,
    patient_id,
    encounter_id
FROM lab_requests
LIMIT 5;

-- =====================================================
-- SECTION 6: RADIOLOGY_REQUESTS PATIENT_ID TYPE CHECK
-- =====================================================

-- 6A. Radiology requests patient_id type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'radiology_requests'
  AND column_name = 'patient_id';

-- 6B. Sample radiology_requests patient_id values
SELECT 
    request_id,
    patient_id,
    encounter_id
FROM radiology_requests
LIMIT 5;

-- =====================================================
-- SECTION 7: ALL TABLES LIST
-- =====================================================

-- List all tables in the public schema
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
