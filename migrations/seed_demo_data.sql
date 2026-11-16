-- =============================================================================
-- NDC Medical Centre EMR - Demo Seed Data
-- =============================================================================
-- IMPORTANT: For user accounts, use Supabase Admin API (not SQL) to create users
-- with passwords that work. SQL-based password hashing is incompatible with GoTrue.
--
-- Run this AFTER creating users via Admin API to seed staff records and demo data.
-- =============================================================================

-- =============================================================================
-- 1. DEPARTMENTS (Required before staff can have department assignments)
-- =============================================================================
INSERT INTO departments (id, code, name, description, category, status, accepts_queue, accepts_referrals, requires_payment)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'ADMIN', 'Administration', 'Hospital administration and management', 'Administrative', 'Active', false, false, false),
    ('22222222-2222-2222-2222-222222222222', 'GOPD', 'General Outpatient', 'General outpatient department', 'Clinical', 'Active', true, true, true),
    ('33333333-3333-3333-3333-333333333333', 'EMERG', 'Emergency', 'Emergency and trauma unit', 'Clinical', 'Active', true, true, false),
    ('44444444-4444-4444-4444-444444444444', 'LAB', 'Laboratory', 'Medical laboratory services', 'Diagnostic', 'Active', true, true, true),
    ('55555555-5555-5555-5555-555555555555', 'RAD', 'Radiology', 'Imaging and radiology services', 'Diagnostic', 'Active', true, true, true),
    ('66666666-6666-6666-6666-666666666666', 'PHARM', 'Pharmacy', 'Pharmaceutical services', 'Support', 'Active', true, false, true),
    ('77777777-7777-7777-7777-777777777777', 'NURS', 'Nursing', 'Nursing services', 'Clinical', 'Active', true, true, false),
    ('88888888-8888-8888-8888-888888888888', 'SURG', 'Surgery', 'Surgical services', 'Clinical', 'Active', true, true, true),
    ('99999999-9999-9999-9999-999999999999', 'OBS', 'Obstetrics & Gynecology', 'Maternity and womens health', 'Clinical', 'Active', true, true, true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PEDS', 'Pediatrics', 'Childrens health services', 'Clinical', 'Active', true, true, true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 2. STAFF RECORDS
-- =============================================================================
-- Note: Create auth users via Admin API first, then run this to create staff records
-- The user_id values below are examples - replace with actual auth.users IDs

-- Function to create staff record for an existing auth user
CREATE OR REPLACE FUNCTION seed_staff_for_user(
    p_user_id UUID,
    p_staff_id TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role user_role,
    p_department_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_email TEXT;
    v_new_staff_id UUID;
BEGIN
    -- Get email from auth.users
    SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
    
    IF v_email IS NULL THEN
        RAISE EXCEPTION 'User % not found in auth.users', p_user_id;
    END IF;
    
    -- Check if staff record already exists
    SELECT id INTO v_new_staff_id FROM staff WHERE user_id = p_user_id;
    IF v_new_staff_id IS NOT NULL THEN
        RAISE NOTICE 'Staff record already exists for user %', p_user_id;
        RETURN v_new_staff_id;
    END IF;
    
    -- Insert staff record
    INSERT INTO staff (
        staff_id,
        user_id,
        email,
        first_name,
        last_name,
        role,
        department_id,
        is_active
    ) VALUES (
        p_staff_id,
        p_user_id,
        v_email,
        p_first_name,
        p_last_name,
        p_role,
        p_department_id,
        true
    )
    RETURNING id INTO v_new_staff_id;
    
    RETURN v_new_staff_id;
END;
$$;

-- =============================================================================
-- 3. DEMO PATIENTS
-- =============================================================================
INSERT INTO patients (
    patient_id, emr_number, first_name, middle_name, surname, gender, 
    date_of_birth, nationality, state_of_origin, contact_phone, email,
    residential_address, patient_status, patient_category, patient_type
)
VALUES
    ('PAT-2026-0001', 'EMR-001', 'John', 'Oluwaseun', 'Adeyemi', 'Male', 
     '1985-03-15', 'Nigerian', 'Lagos', '08012345678', 'john.adeyemi@example.com',
     '12 Marina Road, Lagos Island', 'Active', 'Civilian', 'Principal'),
    
    ('PAT-2026-0002', 'EMR-002', 'Fatima', 'Aisha', 'Mohammed', 'Female', 
     '1990-07-22', 'Nigerian', 'Kano', '08023456789', 'fatima.m@example.com',
     '45 Ahmadu Bello Way, Kano', 'Active', 'Civilian', 'Principal'),
    
    ('PAT-2026-0003', 'EMR-003', 'Chukwuemeka', NULL, 'Okonkwo', 'Male', 
     '1978-11-30', 'Nigerian', 'Anambra', '08034567890', 'emeka.okonkwo@example.com',
     '78 Zik Avenue, Onitsha', 'Active', 'Military', 'Principal'),
    
    ('PAT-2026-0004', 'EMR-004', 'Ngozi', 'Grace', 'Ibe', 'Female', 
     '1995-01-10', 'Nigerian', 'Imo', '08045678901', 'ngozi.ibe@example.com',
     '23 Wetheral Road, Owerri', 'Active', 'Civilian', 'Dependent'),
    
    ('PAT-2026-0005', 'EMR-005', 'Ibrahim', 'Musa', 'Danladi', 'Male', 
     '1965-06-05', 'Nigerian', 'Kaduna', '08056789012', 'ibrahim.d@example.com',
     '56 Independence Way, Kaduna', 'Active', 'Military', 'Principal'),
    
    ('PAT-2026-0006', 'EMR-006', 'Blessing', NULL, 'Okafor', 'Female', 
     '2000-12-25', 'Nigerian', 'Delta', '08067890123', 'blessing.o@example.com',
     '89 Effurun Road, Warri', 'Active', 'Civilian', 'Principal'),
    
    ('PAT-2026-0007', 'EMR-007', 'Yusuf', 'Abdullahi', 'Garba', 'Male', 
     '1988-04-18', 'Nigerian', 'Sokoto', '08078901234', 'yusuf.garba@example.com',
     '12 Sultan Road, Sokoto', 'Active', 'Civilian', 'Principal'),
    
    ('PAT-2026-0008', 'EMR-008', 'Amaka', 'Joy', 'Nwosu', 'Female', 
     '1972-09-08', 'Nigerian', 'Enugu', '08089012345', 'amaka.nwosu@example.com',
     '34 Coal City Road, Enugu', 'Active', 'Civilian', 'Principal'),
    
    ('PAT-2026-0009', 'EMR-009', 'Olumide', NULL, 'Bakare', 'Male', 
     '1992-02-28', 'Nigerian', 'Oyo', '08090123456', 'olumide.b@example.com',
     '67 Ring Road, Ibadan', 'Active', 'Civilian', 'Principal'),
    
    ('PAT-2026-0010', 'EMR-010', 'Halima', 'Zainab', 'Abubakar', 'Female', 
     '1998-08-14', 'Nigerian', 'Borno', '08001234567', 'halima.a@example.com',
     '90 Shehu Shagari Way, Maiduguri', 'Active', 'Civilian', 'Dependent')
ON CONFLICT (patient_id) DO NOTHING;

-- =============================================================================
-- 4. SERVICE PRICES (Common services)
-- =============================================================================
INSERT INTO service_prices (code, name, category, base_price, nhis_price, description, is_active)
VALUES
    ('CONS-GEN', 'General Consultation', 'Consultation', 5000.00, 2500.00, 'General outpatient consultation', true),
    ('CONS-SPEC', 'Specialist Consultation', 'Consultation', 10000.00, 5000.00, 'Specialist consultation', true),
    ('REG-NEW', 'New Patient Registration', 'Registration', 2000.00, 1000.00, 'New patient registration fee', true),
    ('REG-RET', 'Returning Patient', 'Registration', 500.00, 250.00, 'Returning patient folder retrieval', true),
    ('LAB-FBC', 'Full Blood Count', 'Laboratory', 3500.00, 1750.00, 'Complete blood count analysis', true),
    ('LAB-MP', 'Malaria Parasite', 'Laboratory', 1500.00, 750.00, 'Malaria parasite test', true),
    ('LAB-WIDAL', 'Widal Test', 'Laboratory', 2000.00, 1000.00, 'Typhoid fever test', true),
    ('LAB-URINALYSIS', 'Urinalysis', 'Laboratory', 1500.00, 750.00, 'Urine analysis', true),
    ('LAB-RBS', 'Random Blood Sugar', 'Laboratory', 1000.00, 500.00, 'Blood glucose test', true),
    ('LAB-LFT', 'Liver Function Test', 'Laboratory', 8000.00, 4000.00, 'Liver function panel', true),
    ('LAB-RFT', 'Renal Function Test', 'Laboratory', 8000.00, 4000.00, 'Kidney function panel', true),
    ('RAD-XRAY-CHEST', 'Chest X-Ray', 'Radiology', 8000.00, 4000.00, 'Chest radiograph', true),
    ('RAD-XRAY-LIMB', 'Limb X-Ray', 'Radiology', 6000.00, 3000.00, 'Extremity radiograph', true),
    ('RAD-USS-ABD', 'Abdominal Ultrasound', 'Radiology', 15000.00, 7500.00, 'Abdominal ultrasound scan', true),
    ('RAD-USS-PELV', 'Pelvic Ultrasound', 'Radiology', 12000.00, 6000.00, 'Pelvic ultrasound scan', true),
    ('RAD-CT-HEAD', 'CT Scan Head', 'Radiology', 50000.00, 25000.00, 'Computed tomography of head', true),
    ('PROC-DRESS-MINOR', 'Minor Dressing', 'Procedure', 2000.00, 1000.00, 'Minor wound dressing', true),
    ('PROC-DRESS-MAJOR', 'Major Dressing', 'Procedure', 5000.00, 2500.00, 'Major wound dressing', true),
    ('PROC-SUTURE', 'Suturing', 'Procedure', 8000.00, 4000.00, 'Wound suturing', true),
    ('PROC-CATHETER', 'Urinary Catheterization', 'Procedure', 5000.00, 2500.00, 'Urinary catheter insertion', true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 5. LAB TEST CATALOGUE
-- =============================================================================
INSERT INTO lab_tests (code, name, category, sample_type, turnaround_time, price, nhis_price, description, is_active)
VALUES
    ('FBC', 'Full Blood Count', 'Haematology', 'Blood', '2 hours', 3500.00, 1750.00, 'Complete blood count with differentials', true),
    ('MP', 'Malaria Parasite', 'Parasitology', 'Blood', '1 hour', 1500.00, 750.00, 'Thick and thin blood film for malaria', true),
    ('WIDAL', 'Widal Test', 'Serology', 'Blood', '2 hours', 2000.00, 1000.00, 'Typhoid fever antibody test', true),
    ('URINALYSIS', 'Urinalysis', 'Chemical Pathology', 'Urine', '30 minutes', 1500.00, 750.00, 'Complete urine analysis', true),
    ('RBS', 'Random Blood Sugar', 'Chemical Pathology', 'Blood', '30 minutes', 1000.00, 500.00, 'Random glucose level', true),
    ('FBS', 'Fasting Blood Sugar', 'Chemical Pathology', 'Blood', '30 minutes', 1000.00, 500.00, 'Fasting glucose level', true),
    ('LFT', 'Liver Function Test', 'Chemical Pathology', 'Blood', '4 hours', 8000.00, 4000.00, 'Complete liver panel', true),
    ('RFT', 'Renal Function Test', 'Chemical Pathology', 'Blood', '4 hours', 8000.00, 4000.00, 'Kidney function panel', true),
    ('LIPID', 'Lipid Profile', 'Chemical Pathology', 'Blood', '4 hours', 6000.00, 3000.00, 'Cholesterol and triglycerides', true),
    ('PT', 'Prothrombin Time', 'Haematology', 'Blood', '2 hours', 4000.00, 2000.00, 'Coagulation test', true),
    ('ESR', 'Erythrocyte Sedimentation Rate', 'Haematology', 'Blood', '1 hour', 1500.00, 750.00, 'Inflammation marker', true),
    ('HBA1C', 'Glycated Hemoglobin', 'Chemical Pathology', 'Blood', '4 hours', 8000.00, 4000.00, 'Diabetes monitoring', true),
    ('HIV', 'HIV Screening', 'Serology', 'Blood', '30 minutes', 2000.00, 1000.00, 'HIV antibody test', true),
    ('HBSAG', 'Hepatitis B Surface Antigen', 'Serology', 'Blood', '30 minutes', 2000.00, 1000.00, 'Hepatitis B screening', true),
    ('HCV', 'Hepatitis C Antibody', 'Serology', 'Blood', '30 minutes', 3000.00, 1500.00, 'Hepatitis C screening', true),
    ('VDRL', 'VDRL Test', 'Serology', 'Blood', '1 hour', 1500.00, 750.00, 'Syphilis screening', true),
    ('CULTURE', 'Culture and Sensitivity', 'Microbiology', 'Various', '48-72 hours', 5000.00, 2500.00, 'Bacterial culture', true),
    ('STOOL-MCS', 'Stool MCS', 'Microbiology', 'Stool', '24 hours', 2500.00, 1250.00, 'Stool microscopy culture sensitivity', true),
    ('PSA', 'Prostate Specific Antigen', 'Chemical Pathology', 'Blood', '4 hours', 8000.00, 4000.00, 'Prostate cancer marker', true),
    ('THYROID', 'Thyroid Function Test', 'Chemical Pathology', 'Blood', '4 hours', 12000.00, 6000.00, 'T3, T4, TSH panel', true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 6. RADIOLOGY SERVICES
-- =============================================================================
INSERT INTO radiology_services (code, name, modality, body_part, price, nhis_price, preparation, duration_minutes, is_active)
VALUES
    ('XRAY-CHEST-PA', 'Chest X-Ray PA View', 'X-Ray', 'Chest', 8000.00, 4000.00, 'Remove metallic objects', 10, true),
    ('XRAY-CHEST-LAT', 'Chest X-Ray Lateral', 'X-Ray', 'Chest', 8000.00, 4000.00, 'Remove metallic objects', 10, true),
    ('XRAY-SKULL', 'Skull X-Ray', 'X-Ray', 'Head', 8000.00, 4000.00, 'Remove jewelry', 15, true),
    ('XRAY-SPINE-C', 'Cervical Spine X-Ray', 'X-Ray', 'Spine', 10000.00, 5000.00, 'Remove necklaces', 15, true),
    ('XRAY-SPINE-L', 'Lumbar Spine X-Ray', 'X-Ray', 'Spine', 10000.00, 5000.00, 'None required', 15, true),
    ('XRAY-PELVIS', 'Pelvic X-Ray', 'X-Ray', 'Pelvis', 10000.00, 5000.00, 'Empty bladder', 10, true),
    ('XRAY-HAND', 'Hand X-Ray', 'X-Ray', 'Upper Limb', 6000.00, 3000.00, 'Remove rings', 10, true),
    ('XRAY-KNEE', 'Knee X-Ray', 'X-Ray', 'Lower Limb', 6000.00, 3000.00, 'None required', 10, true),
    ('USS-ABD', 'Abdominal Ultrasound', 'Ultrasound', 'Abdomen', 15000.00, 7500.00, 'Fasting 6-8 hours, full bladder', 30, true),
    ('USS-PELV', 'Pelvic Ultrasound', 'Ultrasound', 'Pelvis', 12000.00, 6000.00, 'Full bladder', 20, true),
    ('USS-OBS', 'Obstetric Ultrasound', 'Ultrasound', 'Pelvis', 15000.00, 7500.00, 'Full bladder for early pregnancy', 30, true),
    ('USS-BREAST', 'Breast Ultrasound', 'Ultrasound', 'Breast', 12000.00, 6000.00, 'None required', 20, true),
    ('USS-THYROID', 'Thyroid Ultrasound', 'Ultrasound', 'Neck', 10000.00, 5000.00, 'None required', 15, true),
    ('USS-PROSTATE', 'Prostate Ultrasound', 'Ultrasound', 'Pelvis', 12000.00, 6000.00, 'Full bladder', 20, true),
    ('CT-HEAD', 'CT Scan Head', 'CT', 'Head', 50000.00, 25000.00, 'Remove metallic objects', 30, true),
    ('CT-CHEST', 'CT Scan Chest', 'CT', 'Chest', 60000.00, 30000.00, 'May require contrast', 45, true),
    ('CT-ABD', 'CT Scan Abdomen', 'CT', 'Abdomen', 70000.00, 35000.00, 'Fasting, may require contrast', 45, true),
    ('MRI-BRAIN', 'MRI Brain', 'MRI', 'Head', 80000.00, 40000.00, 'Remove all metallic objects', 60, true),
    ('MRI-SPINE', 'MRI Spine', 'MRI', 'Spine', 80000.00, 40000.00, 'Remove all metallic objects', 60, true),
    ('ECG', 'Electrocardiogram', 'Other', 'Heart', 5000.00, 2500.00, 'None required', 15, true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 7. PHARMACY DRUGS (Sample inventory)
-- =============================================================================
INSERT INTO drugs (code, name, generic_name, category, drug_type, strength, unit, unit_price, nhis_price, stock_quantity, reorder_level, is_active)
VALUES
    ('PARA-500', 'Paracetamol 500mg', 'Paracetamol', 'Analgesics', 'Tablets', '500mg', 'tablet', 20.00, 10.00, 10000, 1000, true),
    ('IBUP-400', 'Ibuprofen 400mg', 'Ibuprofen', 'Analgesics', 'Tablets', '400mg', 'tablet', 30.00, 15.00, 5000, 500, true),
    ('AMOX-500', 'Amoxicillin 500mg', 'Amoxicillin', 'Antibiotics', 'Capsules', '500mg', 'capsule', 50.00, 25.00, 8000, 800, true),
    ('AMOX-250', 'Amoxicillin 250mg/5ml', 'Amoxicillin', 'Antibiotics', 'Syrups', '250mg/5ml', 'bottle', 800.00, 400.00, 500, 50, true),
    ('CIPR-500', 'Ciprofloxacin 500mg', 'Ciprofloxacin', 'Antibiotics', 'Tablets', '500mg', 'tablet', 80.00, 40.00, 5000, 500, true),
    ('METR-400', 'Metronidazole 400mg', 'Metronidazole', 'Antibiotics', 'Tablets', '400mg', 'tablet', 25.00, 12.50, 6000, 600, true),
    ('ARTEM-20', 'Artemether/Lumefantrine', 'Artemether-Lumefantrine', 'Antimalarials', 'Tablets', '20/120mg', 'pack', 1500.00, 750.00, 2000, 200, true),
    ('AMLO-5', 'Amlodipine 5mg', 'Amlodipine', 'Antihypertensives', 'Tablets', '5mg', 'tablet', 40.00, 20.00, 5000, 500, true),
    ('AMLO-10', 'Amlodipine 10mg', 'Amlodipine', 'Antihypertensives', 'Tablets', '10mg', 'tablet', 50.00, 25.00, 4000, 400, true),
    ('METF-500', 'Metformin 500mg', 'Metformin', 'Antidiabetics', 'Tablets', '500mg', 'tablet', 30.00, 15.00, 8000, 800, true),
    ('METF-850', 'Metformin 850mg', 'Metformin', 'Antidiabetics', 'Tablets', '850mg', 'tablet', 40.00, 20.00, 6000, 600, true),
    ('OMEP-20', 'Omeprazole 20mg', 'Omeprazole', 'Antacids', 'Capsules', '20mg', 'capsule', 60.00, 30.00, 5000, 500, true),
    ('LORA-10', 'Loratadine 10mg', 'Loratadine', 'Antihistamines', 'Tablets', '10mg', 'tablet', 40.00, 20.00, 3000, 300, true),
    ('DEXT-SALINE', 'Dextrose Saline', 'Dextrose/Sodium Chloride', 'IV Fluids', 'IV Infusions', '500ml', 'bottle', 500.00, 250.00, 1000, 100, true),
    ('NORMAL-SALINE', 'Normal Saline', 'Sodium Chloride 0.9%', 'IV Fluids', 'IV Infusions', '500ml', 'bottle', 400.00, 200.00, 1000, 100, true),
    ('RINGER', 'Ringers Lactate', 'Ringers Lactate', 'IV Fluids', 'IV Infusions', '500ml', 'bottle', 500.00, 250.00, 800, 80, true),
    ('VITB-COMP', 'Vitamin B Complex', 'Vitamin B Complex', 'Vitamins and Supplements', 'Tablets', 'Standard', 'tablet', 15.00, 7.50, 10000, 1000, true),
    ('VITC-1000', 'Vitamin C 1000mg', 'Ascorbic Acid', 'Vitamins and Supplements', 'Tablets', '1000mg', 'tablet', 30.00, 15.00, 5000, 500, true),
    ('FERR-FOLIC', 'Ferrous Sulphate + Folic Acid', 'Ferrous Sulphate/Folic Acid', 'Vitamins and Supplements', 'Tablets', '200mg/0.5mg', 'tablet', 20.00, 10.00, 8000, 800, true),
    ('DIAZ-5', 'Diazepam 5mg', 'Diazepam', 'Sedatives', 'Tablets', '5mg', 'tablet', 50.00, 25.00, 500, 50, true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 8. FACILITIES (for multi-facility support)
-- =============================================================================
INSERT INTO facilities (id, name, code, address, phone, email, is_main, is_active)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'NDC Medical Centre Main Campus', 'NDC-MAIN', 'NDC Complex, Abuja', '+234-9-123-4567', 'main@ndchospital.com', true, true),
    ('00000000-0000-0000-0000-000000000002', 'NDC Medical Centre Annex', 'NDC-ANNEX', 'NDC Annex Building, Abuja', '+234-9-123-4568', 'annex@ndchospital.com', false, true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 9. SUMMARY
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== SEED DATA SUMMARY ===';
    RAISE NOTICE 'Departments: %', (SELECT COUNT(*) FROM departments);
    RAISE NOTICE 'Patients: %', (SELECT COUNT(*) FROM patients);
    RAISE NOTICE 'Service Prices: %', (SELECT COUNT(*) FROM service_prices);
    RAISE NOTICE 'Lab Tests: %', (SELECT COUNT(*) FROM lab_tests);
    RAISE NOTICE 'Radiology Services: %', (SELECT COUNT(*) FROM radiology_services);
    RAISE NOTICE 'Drugs: %', (SELECT COUNT(*) FROM drugs);
    RAISE NOTICE 'Facilities: %', (SELECT COUNT(*) FROM facilities);
    RAISE NOTICE 'Staff: %', (SELECT COUNT(*) FROM staff);
    RAISE NOTICE '=========================';
END $$;
