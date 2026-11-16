-- Fresh Schema for NDC EMR System
-- Generated based on Frontend TypeScript Interfaces (database.types.ts)
-- Date: December 20, 2025

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. ENUMS
-- =====================================================

-- Helper function to create enum if not exists
CREATE OR REPLACE FUNCTION create_enum_if_not_exists(enum_name text, enum_values text[])
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = enum_name) THEN
        EXECUTE format('CREATE TYPE %I AS ENUM (%s)', enum_name, array_to_string(array(SELECT quote_literal(x) FROM unnest(enum_values) x), ', '));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Core Enums
SELECT create_enum_if_not_exists('gender', ARRAY['Male', 'Female', 'Other']);
SELECT create_enum_if_not_exists('staff_category', ARRAY['Military', 'Civilian', 'DS', 'Guest Lecturer']);
SELECT create_enum_if_not_exists('military_branch', ARRAY['Army', 'Navy', 'Air Force']);
SELECT create_enum_if_not_exists('user_role', ARRAY['super_admin', 'admin', 'medical_director', 'doctor', 'nurse', 'lab_technician', 'radiologist', 'pharmacist', 'billing_clerk', 'receptionist', 'cashier', 'customer_service', 'inventory_manager', 'config_admin', 'patient']);

-- Patient Enums
SELECT create_enum_if_not_exists('patient_status', ARRAY['Active', 'Inactive', 'Deceased']);
SELECT create_enum_if_not_exists('patient_category', ARRAY['Military', 'Civilian']);
SELECT create_enum_if_not_exists('insurance_type', ARRAY['Private', 'DHML', 'Civilian_NHIS']);
SELECT create_enum_if_not_exists('patient_type', ARRAY['Principal', 'Dependent', 'Private']);
SELECT create_enum_if_not_exists('nhis_patient_source', ARRAY['Internal', 'Referral']);
SELECT create_enum_if_not_exists('referral_status_enum', ARRAY['Active', 'Expired', 'Used', 'Cancelled']); -- Renamed to avoid conflict with referral module

-- Visit & Queue Enums
SELECT create_enum_if_not_exists('visit_status', ARRAY['Active', 'Completed', 'Cancelled', 'Created', 'Closed']);
SELECT create_enum_if_not_exists('priority', ARRAY['Normal', 'Urgent', 'Emergency']);
SELECT create_enum_if_not_exists('queue_status', ARRAY['Waiting', 'Called', 'In Progress', 'Completed', 'Cancelled', 'No Show']);
SELECT create_enum_if_not_exists('queue_location', ARRAY['Reception', 'Registration', 'Nursing', 'Consultation', 'Laboratory', 'Lab', 'Radiology', 'Pharmacy', 'Billing', 'Cashier', 'CustomerService']);

-- Billing Enums
SELECT create_enum_if_not_exists('payment_method', ARRAY['Cash', 'POS', 'NHIS', 'Retainership']);
SELECT create_enum_if_not_exists('payment_status', ARRAY['Paid', 'Partially Paid', 'Unpaid']);
SELECT create_enum_if_not_exists('billing_order_status', ARRAY['Pending', 'Awaiting_Payment', 'Partially_Paid', 'Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived', 'Cancelled']);
SELECT create_enum_if_not_exists('source_module', ARRAY['registration', 'consultation', 'nursing', 'lab', 'radiology', 'pharmacy']);
SELECT create_enum_if_not_exists('service_type', ARRAY['Consultation', 'Laboratory', 'Radiology', 'Pharmacy', 'Surgery', 'Procedure', 'Nursing', 'Admission', 'Supplies', 'Other']);

-- Clinical Enums
SELECT create_enum_if_not_exists('request_status', ARRAY['Pending', 'In Progress', 'Sample Collected', 'Completed', 'Reported', 'Cancelled', 'Accepted', 'Rejected', 'Awaiting_Payment', 'Paid', 'Waived', 'Sample_Collected', 'Processing', 'Result_Ready', 'Result_Viewed']);
SELECT create_enum_if_not_exists('imaging_type', ARRAY['X-Ray', 'Ultrasound', 'MRI', 'CT', 'Mammography', 'Fluoroscopy', 'Other']);
SELECT create_enum_if_not_exists('dispense_status', ARRAY['Dispensed', 'Pending', 'Partial', 'Out of Stock', 'Cancelled', 'Verified', 'Awaiting_Payment', 'Paid', 'Waived']);
SELECT create_enum_if_not_exists('drug_category', ARRAY['Antibiotics', 'Analgesics', 'Antimalarials', 'Antihypertensives', 'Antidiabetics', 'Antivirals', 'Antifungals', 'Vaccines', 'IV Fluids', 'Vitamins and Supplements']);
SELECT create_enum_if_not_exists('drug_type', ARRAY['Tablets', 'Capsules', 'Syrups', 'Injections', 'Creams/Ointments', 'IV Infusions']);
SELECT create_enum_if_not_exists('shift', ARRAY['Morning', 'Evening', 'Night']);
SELECT create_enum_if_not_exists('audit_action', ARRAY['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT']);

-- Additional Enums from other modules
SELECT create_enum_if_not_exists('department_status', ARRAY['Active', 'Inactive', 'Maintenance']);
SELECT create_enum_if_not_exists('department_category', ARRAY['Clinical', 'Diagnostic', 'Support', 'Administrative']);
SELECT create_enum_if_not_exists('ward_type', ARRAY['General', 'ICU', 'Emergency', 'Pediatric', 'Maternity', 'Surgical', 'Psychiatric', 'Isolation', 'Outpatient']);
SELECT create_enum_if_not_exists('bed_status', ARRAY['Available', 'Occupied', 'Reserved', 'Maintenance', 'Cleaning']);
SELECT create_enum_if_not_exists('triage_status', ARRAY['Pending', 'In Progress', 'Completed', 'Cancelled']);
SELECT create_enum_if_not_exists('consciousness_level', ARRAY['Alert', 'Verbal', 'Pain', 'Unresponsive']);
SELECT create_enum_if_not_exists('referral_module_status', ARRAY['Pending', 'Accepted', 'Rejected', 'InProgress', 'Completed', 'Cancelled']); -- For referral module
SELECT create_enum_if_not_exists('referral_priority', ARRAY['Routine', 'Urgent', 'Emergent', 'Stat']);
SELECT create_enum_if_not_exists('referral_type', ARRAY['Consultation', 'Transfer', 'CoManagement', 'Procedure']);
SELECT create_enum_if_not_exists('exception_type', ARRAY['PaymentOverride', 'QueueSkip', 'PriorityChange', 'TriageOverride', 'AccessException', 'ResultAmendment', 'OrderCancellation', 'DiscountApproval', 'RefundApproval', 'ScheduleOverride', 'MedicationOverride', 'PolicyException', 'RoleElevation', 'SystemOverride', 'Other']);
SELECT create_enum_if_not_exists('exception_status', ARRAY['Pending', 'Approved', 'Rejected', 'AutoApproved', 'Executed']);
SELECT create_enum_if_not_exists('notification_type', ARRAY['Queue', 'Payment', 'LabResult', 'RadiologyResult', 'Prescription', 'Referral', 'Triage', 'CriticalValue', 'SystemAlert', 'Reminder', 'Message']);
SELECT create_enum_if_not_exists('notification_priority', ARRAY['Low', 'Normal', 'High', 'Critical']);
SELECT create_enum_if_not_exists('appointment_status', ARRAY['Scheduled', 'Confirmed', 'Checked-in', 'In Progress', 'Completed', 'Cancelled', 'No Show']);
SELECT create_enum_if_not_exists('appointment_type', ARRAY['Consultation', 'Follow-up', 'Lab', 'Radiology', 'Procedure']);
SELECT create_enum_if_not_exists('feedback_type', ARRAY['Complaint', 'Suggestion', 'Compliment', 'Inquiry']);
SELECT create_enum_if_not_exists('feedback_status', ARRAY['Open', 'In Progress', 'Resolved', 'Closed', 'Escalated']);

-- Treatment Plan Enums
SELECT create_enum_if_not_exists('treatment_plan_status', ARRAY['Created', 'Viewed', 'In_Progress', 'Completed', 'Cancelled']);
SELECT create_enum_if_not_exists('treatment_task_status', ARRAY['Pending', 'In_Progress', 'Completed', 'Skipped', 'Escalated']);
SELECT create_enum_if_not_exists('treatment_task_type', ARRAY['Administer_Medication', 'Monitor_Vitals', 'Procedure', 'Observation', 'Patient_Education', 'Wound_Care', 'Sample_Collection', 'Other']);

-- Medical Report Enums
SELECT create_enum_if_not_exists('report_type', ARRAY['Medical Certificate', 'Sick Leave', 'Fitness Report', 'Referral Letter', 'Discharge Summary', 'Death Certificate', 'Medical Report']);
SELECT create_enum_if_not_exists('report_status', ARRAY['Draft', 'Pending Approval', 'Approved', 'Issued', 'Revoked']);

-- Config Enums
SELECT create_enum_if_not_exists('config_data_type', ARRAY['string', 'number', 'boolean', 'json']);

-- =====================================================
-- 2. TABLES
-- =====================================================

-- Departments Table (Needed for Staff)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category department_category NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(50),
    status department_status DEFAULT 'Active',
    accepts_queue BOOLEAN DEFAULT true,
    accepts_referrals BOOLEAN DEFAULT true,
    requires_payment BOOLEAN DEFAULT false,
    default_priority INTEGER DEFAULT 1,
    head_of_department UUID, -- FK added later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Internal UUID
    staff_id VARCHAR(50) UNIQUE NOT NULL, -- Visible ID
    user_id UUID UNIQUE, -- Link to auth.users
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    
    -- Categorization
    staff_category staff_category,
    military_branch military_branch,
    rank VARCHAR(100),
    service_number VARCHAR(100),
    
    department_id UUID REFERENCES departments(id),
    department VARCHAR(100), -- Added for frontend compatibility
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update department head FK
ALTER TABLE departments ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_of_department) REFERENCES staff(id);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Internal UUID
    patient_id VARCHAR(50) UNIQUE NOT NULL, -- Internal ID in TS
    emr_number VARCHAR(50) UNIQUE, -- Visible EMR Number
    
    -- Demographics
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    surname VARCHAR(100) NOT NULL,
    gender gender NOT NULL,
    date_of_birth DATE,
    nationality VARCHAR(100),
    state_of_origin VARCHAR(100),
    lga VARCHAR(100),
    
    -- Contact
    contact_phone VARCHAR(50),
    email VARCHAR(255),
    residential_address TEXT,
    
    -- Next of Kin
    nok_name VARCHAR(100),
    nok_relationship VARCHAR(100),
    nok_phone VARCHAR(50),
    nok_address TEXT,
    
    -- Categorization
    patient_category patient_category,
    insurance_type insurance_type,
    patient_type patient_type,
    
    -- Dependents
    principal_id UUID REFERENCES patients(id),
    relationship_to_principal VARCHAR(50),
    
    -- Military / Staff Info
    staff_category staff_category,
    military_branch military_branch,
    rank VARCHAR(100),
    service_number VARCHAR(100),
    unit VARCHAR(100),
    occupation VARCHAR(100),
    employer VARCHAR(100),
    
    -- Identification
    nhis_number VARCHAR(50),
    national_id VARCHAR(50),
    
    -- NHIS Referral Fields
    nhis_patient_source nhis_patient_source,
    referral_code VARCHAR(100),
    referring_facility_name VARCHAR(255),
    referring_facility_nhis_id VARCHAR(100),
    referral_date DATE,
    referral_reason TEXT,
    referral_status referral_status_enum,
    referral_expiry_date DATE,
    
    -- Clinical
    clinical_summary TEXT,
    blood_group VARCHAR(10),
    known_allergies TEXT[],
    
    -- Meta
    registered_by UUID REFERENCES staff(id),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status patient_status DEFAULT 'Active',
    photo_url TEXT,
    
    -- Payer Info (JSONB for flexibility as per TS interface)
    payer_info JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinics Table
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id VARCHAR(50) UNIQUE NOT NULL, -- TS uses clinic_id as string ID
    clinic_name VARCHAR(100) NOT NULL,
    clinic_code VARCHAR(50),
    description TEXT,
    
    -- Regular Fees
    consultation_fee DECIMAL(10, 2) DEFAULT 0,
    follow_up_fee DECIMAL(10, 2) DEFAULT 0,
    emergency_fee DECIMAL(10, 2) DEFAULT 0,
    
    -- NHIS Fees
    nhis_consultation_fee DECIMAL(10, 2) DEFAULT 0,
    nhis_follow_up_fee DECIMAL(10, 2) DEFAULT 0,
    nhis_emergency_fee DECIMAL(10, 2) DEFAULT 0,
    updated_by UUID REFERENCES staff(id),
    
    department_id UUID REFERENCES departments(id),
    location VARCHAR(100),
    operating_hours VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- VISITS TABLE (ENCOUNTER MASTER)
-- =====================================================
-- IMPORTANT: ID USAGE DOCUMENTATION
-- =====================================================
-- id (UUID)            = THE primary encounter identifier. ALL foreign keys 
--                        from other tables should reference visits(id).
--                        Column name in other tables: encounter_id
--
-- visit_id (VARCHAR)   = Display-only sequential ID like "V-00001"
--                        Used for human-readable display, receipts, reports.
--                        DO NOT use as foreign key.
--
-- encounter_number     = Display-only format like "ENC-YYYYMMDD-XXXX"
-- (VARCHAR)              Used for human-readable display only.
--                        DO NOT use as foreign key.
-- =====================================================
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id VARCHAR(50) UNIQUE NOT NULL, -- Display only: "V-00001"
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id),
    
    visit_type VARCHAR(50),
    encounter_number VARCHAR(50), -- Display only: "ENC-YYYYMMDD-XXXX"
    encounter_date DATE,
    priority priority DEFAULT 'Normal',
    chief_complaint TEXT,
    
    payment_category payment_method,
    insurance_type VARCHAR(50),  -- Patient insurance type at time of visit (DHML, Civilian_NHIS, Private) - snapshot for audit
    status visit_status DEFAULT 'Active',
    
    current_stage TEXT DEFAULT 'registered',
    stage_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    
    discharge_date TIMESTAMP WITH TIME ZONE,
    discharge_notes TEXT,
    attending_doctor_id UUID REFERENCES staff(id),
    registered_by UUID REFERENCES staff(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wards Table
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    ward_type ward_type NOT NULL,
    total_beds INTEGER DEFAULT 0,
    available_beds INTEGER DEFAULT 0,
    status department_status DEFAULT 'Active',
    gender_restriction gender,
    nurse_in_charge UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department_id, code)
);

-- Beds Table
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ward_id UUID REFERENCES wards(id) ON DELETE CASCADE,
    bed_number VARCHAR(50) NOT NULL,
    status bed_status DEFAULT 'Available',
    current_patient_id UUID REFERENCES patients(id),
    current_visit_id UUID REFERENCES visits(id),
    has_oxygen BOOLEAN DEFAULT false,
    has_monitor BOOLEAN DEFAULT false,
    is_isolation BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ward_id, bed_number)
);

-- Queue Table
CREATE TABLE IF NOT EXISTS queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link (same as visit_id)
    patient_id UUID REFERENCES patients(id),
    department_id UUID REFERENCES departments(id),
    clinic_id UUID REFERENCES clinics(id),
    
    ticket_number VARCHAR(50),
    status queue_status DEFAULT 'Waiting',
    priority priority DEFAULT 'Normal',
    location queue_location NOT NULL,
    
    assigned_to UUID REFERENCES staff(id),
    called_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triage Assessments Table
CREATE TABLE IF NOT EXISTS triage_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link
    patient_id UUID REFERENCES patients(id),
    
    -- Vitals
    temperature DECIMAL(4, 1),
    pulse_rate INTEGER,
    respiratory_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    oxygen_saturation INTEGER,
    weight DECIMAL(5, 2),
    height DECIMAL(5, 2),
    bmi DECIMAL(5, 2),
    blood_glucose DECIMAL(5, 2),
    
    -- Assessment
    chief_complaint_text TEXT,
    consciousness consciousness_level DEFAULT 'Alert',
    pain_score INTEGER, -- 0-10
    
    -- Triage Level
    triage_level INTEGER, -- 1-5 (ESI)
    triage_color VARCHAR(20),
    
    status triage_status DEFAULT 'Completed',
    triaged_by UUID REFERENCES staff(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
    consultation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id VARCHAR(50) REFERENCES visits(visit_id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    doctor_id VARCHAR(50) REFERENCES staff(staff_id),
    clinic_id VARCHAR(50) REFERENCES clinics(clinic_id),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link (UUID)
    
    -- Clinical Notes
    complaints TEXT,
    history_of_present_illness TEXT,
    past_medical_history TEXT,
    examination_findings TEXT,
    diagnosis TEXT[], -- Array of diagnosis codes/names
    diagnosis_text TEXT,
    differential_diagnosis TEXT[],
    treatment_plan TEXT,
    
    -- SOAP Notes (Legacy/Alternative)
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    
    clinical_notes TEXT,
    notes TEXT,
    
    -- Follow up
    follow_up_date TIMESTAMP WITH TIME ZONE,
    follow_up_notes TEXT,
    
    status request_status DEFAULT 'Completed',
    consultation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lab Test Catalogue
CREATE TABLE IF NOT EXISTS lab_test_catalogue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    specimen_type VARCHAR(50),
    price DECIMAL(10, 2) DEFAULT 0,
    tat_minutes INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- NHIS Pricing Fields
    nhis_code VARCHAR(50),                    -- NHIS tariff code
    nhis_price DECIMAL(10, 2),                -- NHIS approved price
    is_nhis_covered BOOLEAN DEFAULT TRUE,     -- Whether covered under NHIS
    nhis_percentage INTEGER DEFAULT 0 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100), -- Override percentage (0 = use default)
    updated_by UUID REFERENCES staff(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lab Requests
CREATE TABLE IF NOT EXISTS lab_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id VARCHAR(50) REFERENCES visits(visit_id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link (UUID)
    test_id UUID REFERENCES lab_test_catalogue(id),
    
    ordered_by VARCHAR(50) REFERENCES staff(staff_id),
    
    clinical_notes TEXT,
    priority priority DEFAULT 'Normal',
    status request_status DEFAULT 'Pending',
    
    -- Results
    result JSONB,
    result_notes TEXT,
    result_file_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lab Request Items (Many-to-Many) - DEPRECATED but kept for structure if needed
CREATE TABLE IF NOT EXISTS lab_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES lab_requests(request_id) ON DELETE CASCADE,
    test_id UUID REFERENCES lab_test_catalogue(id),
    status request_status DEFAULT 'Pending',
    price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lab Results
CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES lab_requests(request_id),
    test_id UUID REFERENCES lab_test_catalogue(id),
    patient_id UUID REFERENCES patients(id),
    
    result_value TEXT,
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    is_abnormal BOOLEAN DEFAULT false,
    is_critical BOOLEAN DEFAULT false,
    
    technician_id UUID REFERENCES staff(id),
    verified_by UUID REFERENCES staff(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lab Result Components (for panel tests)
CREATE TABLE IF NOT EXISTS lab_result_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_result_id UUID REFERENCES lab_results(id) ON DELETE CASCADE NOT NULL,
    
    component_name VARCHAR(255) NOT NULL,
    component_code VARCHAR(50),
    
    result_value DECIMAL(20,6),
    result_text VARCHAR(255),
    result_unit VARCHAR(50),
    reference_range VARCHAR(255),
    result_status VARCHAR(50) DEFAULT 'Normal',
    
    sequence_number INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Imaging Catalogue (Radiology)
CREATE TABLE IF NOT EXISTS imaging_catalogue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    modality imaging_type NOT NULL,
    body_part VARCHAR(100),
    price DECIMAL(10, 2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- NHIS Pricing Fields
    nhis_code VARCHAR(50),                    -- NHIS tariff code
    nhis_price DECIMAL(10, 2),                -- NHIS approved price
    is_nhis_covered BOOLEAN DEFAULT TRUE,     -- Whether covered under NHIS
    nhis_percentage INTEGER DEFAULT 0 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100), -- Override percentage (0 = use default)
    updated_by UUID REFERENCES staff(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Radiology Requests
CREATE TABLE IF NOT EXISTS radiology_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id VARCHAR(50) REFERENCES visits(visit_id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link (UUID)
    
    imaging_id UUID REFERENCES imaging_catalogue(id),
    imaging_type VARCHAR(50),
    
    ordered_by VARCHAR(50) REFERENCES staff(staff_id),
    
    body_part TEXT,
    clinical_indication TEXT,
    clinical_history TEXT,
    priority priority DEFAULT 'Normal',
    status request_status DEFAULT 'Pending',
    
    scheduled_date TIMESTAMP WITH TIME ZONE,
    performed_at TIMESTAMP WITH TIME ZONE,
    performed_by VARCHAR(50) REFERENCES staff(staff_id),
    
    -- Results
    findings TEXT,
    impression TEXT,
    recommendation TEXT,
    radiologist_id UUID REFERENCES staff(id),
    report_date TIMESTAMP WITH TIME ZONE,
    image_urls TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Radiology Request Items (DEPRECATED)
CREATE TABLE IF NOT EXISTS radiology_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES radiology_requests(request_id) ON DELETE CASCADE,
    imaging_id UUID REFERENCES imaging_catalogue(id),
    status request_status DEFAULT 'Pending',
    price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan Results
CREATE TABLE IF NOT EXISTS scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES radiology_requests(request_id),
    imaging_id UUID REFERENCES imaging_catalogue(id),
    patient_id UUID REFERENCES patients(id),
    
    findings TEXT,
    impression TEXT,
    recommendation TEXT,
    
    radiologist_id UUID REFERENCES staff(id),
    report_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    image_urls TEXT[],
    dicom_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan Images (for multiple images per scan)
CREATE TABLE IF NOT EXISTS scan_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES radiology_requests(request_id) ON DELETE CASCADE NOT NULL,
    
    image_path TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    view_plane VARCHAR(50),
    sequence_number INTEGER DEFAULT 1,
    is_key_image BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drug Catalogue
CREATE TABLE IF NOT EXISTS drug_catalogue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    generic_name VARCHAR(100),
    brand_name VARCHAR(100),
    manufacturer VARCHAR(100),
    category drug_category,
    drug_type drug_type,
    strength VARCHAR(50),
    unit_of_measure VARCHAR(50) DEFAULT 'Unit',
    unit_price DECIMAL(10, 2) DEFAULT 0,
    unit_cost DECIMAL(10, 2) DEFAULT 0,
    selling_price DECIMAL(10, 2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    is_controlled BOOLEAN DEFAULT FALSE,
    requires_prescription BOOLEAN DEFAULT TRUE,
    description TEXT,
    -- NHIS fields
    nhis_code VARCHAR(50),
    nhis_price DECIMAL(10, 2),
    is_nhis_covered BOOLEAN DEFAULT FALSE,
    nhis_eligible BOOLEAN DEFAULT FALSE,
    nhis_percentage INTEGER DEFAULT 0 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100),
    updated_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drug Batches (Batch-based inventory with FEFO tracking)
CREATE TABLE IF NOT EXISTS drug_batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_id UUID NOT NULL REFERENCES drug_catalogue(id) ON DELETE CASCADE,
    
    -- Batch identification
    batch_number VARCHAR(50) NOT NULL,
    barcode VARCHAR(100),
    
    -- Quantity tracking
    quantity_received INTEGER NOT NULL DEFAULT 0,
    quantity_remaining INTEGER NOT NULL DEFAULT 0,
    
    -- Dates
    manufacture_date DATE,
    expiry_date DATE NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pricing
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10, 2),
    
    -- Supplier info
    supplier_name VARCHAR(100),
    supplier_batch_ref VARCHAR(100),
    purchase_order_id UUID,
    
    -- Staff tracking
    received_by UUID,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'expired', 'recalled', 'quarantine')),
    
    -- Audit
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique batch per drug
    CONSTRAINT unique_drug_batch UNIQUE (drug_id, batch_number)
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id VARCHAR(50) REFERENCES visits(visit_id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link (UUID)
    doctor_id VARCHAR(50) REFERENCES staff(staff_id),
    
    drug_id UUID REFERENCES drug_catalogue(id),
    
    dosage VARCHAR(100),
    frequency VARCHAR(50),
    duration VARCHAR(50),
    route VARCHAR(50),
    quantity_prescribed INTEGER,
    quantity_dispensed INTEGER DEFAULT 0,
    instructions TEXT,
    
    status dispense_status DEFAULT 'Pending',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prescription Items (DEPRECATED)
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    drug_id UUID REFERENCES drug_catalogue(id),
    
    dosage VARCHAR(100),
    frequency VARCHAR(50),
    duration VARCHAR(50),
    quantity INTEGER NOT NULL,
    
    status dispense_status DEFAULT 'Pending',
    price DECIMAL(10, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispenses (Legacy table)
CREATE TABLE IF NOT EXISTS dispenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id),
    patient_id UUID REFERENCES patients(id),
    pharmacist_id UUID REFERENCES staff(id),
    
    status dispense_status DEFAULT 'Dispensed',
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispense Items (Legacy table)
CREATE TABLE IF NOT EXISTS dispense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispense_id UUID REFERENCES dispenses(id) ON DELETE CASCADE,
    prescription_item_id UUID REFERENCES prescription_items(id),
    drug_id UUID REFERENCES drug_catalogue(id),
    
    quantity_dispensed INTEGER NOT NULL,
    batch_number VARCHAR(50),
    expiry_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispense Records (Enhanced dispense tracking with batch/FEFO support)
CREATE TABLE IF NOT EXISTS dispense_records (
    dispense_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Source references
    prescription_id UUID REFERENCES prescriptions(prescription_id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    encounter_id UUID REFERENCES visits(id),
    
    -- Drug and batch
    drug_id UUID NOT NULL REFERENCES drug_catalogue(id),
    batch_id UUID REFERENCES drug_batches(batch_id),
    
    -- Quantities
    quantity_dispensed INTEGER NOT NULL,
    
    -- Staff
    pharmacist_id VARCHAR(50) REFERENCES staff(staff_id),
    verified_by VARCHAR(50) REFERENCES staff(staff_id),
    
    -- Timing
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Substitution tracking
    is_substitution BOOLEAN DEFAULT FALSE,
    original_drug_id UUID REFERENCES drug_catalogue(id),
    substitution_reason TEXT,
    
    -- NHIS tracking
    nhis_claim_id UUID,
    nhis_amount DECIMAL(10, 2) DEFAULT 0,
    patient_copay DECIMAL(10, 2) DEFAULT 0,
    
    -- Status and notes
    status VARCHAR(20) DEFAULT 'dispensed' CHECK (status IN ('dispensed', 'returned', 'cancelled')),
    counseling_provided BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing Orders (Master bill for a visit or transaction)
CREATE TABLE IF NOT EXISTS billing_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    visit_id UUID REFERENCES visits(id),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link
    patient_id UUID REFERENCES patients(id),
    
    total_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2) DEFAULT 0,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    balance_amount DECIMAL(10, 2) DEFAULT 0,
    
    -- NHIS audit fields (snapshots at billing time - NEVER recalculated)
    nhis_covered BOOLEAN DEFAULT FALSE,           -- Whether this billing order is covered by NHIS
    nhis_percentage INTEGER DEFAULT 0,            -- Percentage covered by NHIS (0-100)
    nhis_payable DECIMAL(10, 2) DEFAULT 0,        -- Total amount payable by NHIS
    patient_payable DECIMAL(10, 2) DEFAULT 0,     -- Total amount payable by patient
    
    status billing_order_status DEFAULT 'Pending',
    payment_method payment_method,
    source_module source_module,
    
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing Items (Line items with audit-safe snapshots)
CREATE TABLE IF NOT EXISTS billing_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_order_id UUID REFERENCES billing_orders(id) ON DELETE CASCADE,
    
    item_type service_type,
    item_id UUID,                                  -- Legacy: reference to catalogue ID
    service_reference_id UUID,                     -- UUID reference to source record (lab_requests.id, imaging_requests.id, prescriptions.id, etc.)
    
    -- Audit-safe snapshots (captured at billing time - NEVER recalculated even if prices change)
    item_name VARCHAR(255) NOT NULL,               -- Legacy field for backward compatibility
    service_name VARCHAR(255),                     -- Snapshot of service name at billing time
    
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,            -- Legacy field for backward compatibility
    unit_cost DECIMAL(10, 2),                      -- Snapshot of unit cost at billing time
    total_price DECIMAL(10, 2) NOT NULL,           -- Legacy field for backward compatibility
    gross_amount DECIMAL(10, 2),                   -- Snapshot: quantity * unit_cost (stored, not calculated)
    
    -- NHIS audit fields (snapshots at billing time - NEVER recalculated)
    nhis_covered BOOLEAN DEFAULT FALSE,            -- Whether this line item is covered by NHIS
    nhis_percentage INTEGER DEFAULT 0 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100),
    nhis_payable DECIMAL(10, 2) DEFAULT 0,         -- Amount payable by NHIS
    patient_payable DECIMAL(10, 2) DEFAULT 0,      -- Amount payable by patient
    
    status payment_status DEFAULT 'Unpaid',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES invoices(invoice_id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    
    amount DECIMAL(10, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    transaction_reference VARCHAR(100),
    
    received_by VARCHAR(50) REFERENCES staff(staff_id),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing Rules
CREATE TABLE IF NOT EXISTS billing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_category VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    pay_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    consultation_fee_waived BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NHIS Configuration Table (Configurable NHIS coverage rates by payment category)
CREATE TABLE IF NOT EXISTS nhis_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_category VARCHAR(100) NOT NULL UNIQUE,
    coverage_percentage INTEGER NOT NULL DEFAULT 0 CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
    consultation_fully_covered BOOLEAN DEFAULT FALSE,  -- If TRUE, consultation is 100% free regardless of general coverage_percentage
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE CASCADE NOT NULL,
    consultation_id UUID REFERENCES consultations(consultation_id) ON DELETE SET NULL,
    
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(50) DEFAULT 'Pending',
    due_date DATE,
    notes TEXT,
    
    created_by VARCHAR(50) REFERENCES staff(staff_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(invoice_id) ON DELETE CASCADE NOT NULL,
    
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    reference_id UUID,
    reference_type VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    billing_order_id UUID REFERENCES billing_orders(id),
    invoice_id UUID REFERENCES invoices(invoice_id) ON DELETE SET NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    visit_id VARCHAR(50) REFERENCES visits(visit_id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link (UUID)
    
    amount_paid DECIMAL(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(100),
    
    issued_by VARCHAR(50) REFERENCES staff(staff_id),
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price List
CREATE TABLE IF NOT EXISTS price_list (
    price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    visit_id UUID REFERENCES visits(id),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link
    
    source_department_id UUID REFERENCES departments(id),
    target_department_id UUID REFERENCES departments(id),
    referring_physician_id UUID REFERENCES staff(id),
    receiving_physician_id UUID REFERENCES staff(id),
    
    referral_type referral_type NOT NULL,
    priority referral_priority DEFAULT 'Routine',
    status referral_module_status DEFAULT 'Pending',
    
    reason_for_referral TEXT,
    clinical_summary TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Exceptions Table
CREATE TABLE IF NOT EXISTS workflow_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_number VARCHAR(50) UNIQUE NOT NULL,
    exception_type exception_type NOT NULL,
    severity VARCHAR(20) DEFAULT 'Normal',
    
    entity_type VARCHAR(50),
    entity_id UUID,
    
    reason TEXT,
    status exception_status DEFAULT 'Pending',
    
    requested_by UUID REFERENCES staff(id),
    approved_by UUID REFERENCES staff(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES staff(id), -- Target user
    department_id UUID REFERENCES departments(id), -- Target department
    
    type notification_type NOT NULL,
    priority notification_priority DEFAULT 'Normal',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    entity_type VARCHAR(50),
    entity_id UUID,
    
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    type notification_type NOT NULL,
    priority notification_priority DEFAULT 'Normal',
    
    title_template VARCHAR(200) NOT NULL,
    message_template TEXT NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES staff(id),
    department_id UUID REFERENCES departments(id),
    
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 15,
    
    type appointment_type DEFAULT 'Consultation',
    status appointment_status DEFAULT 'Scheduled',
    
    reason TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Feedback Table
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    
    feedback_type feedback_type NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    
    status feedback_status DEFAULT 'Open',
    assigned_to UUID REFERENCES staff(id),
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vitals Table (Nursing)
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link (UUID)
    patient_id UUID REFERENCES patients(id),
    
    temperature DECIMAL(4, 1),
    blood_pressure VARCHAR(20),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    pulse INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER,
    
    weight DECIMAL(5, 2),
    height DECIMAL(5, 2),
    bmi DECIMAL(5, 2),
    
    blood_glucose DECIMAL(5, 2),
    pain_level INTEGER,
    
    nurse_id UUID REFERENCES staff(id),
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    is_critical BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treatment Plans
CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link (UUID)
    patient_id UUID REFERENCES patients(id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    status treatment_plan_status DEFAULT 'Created',
    
    created_by UUID REFERENCES staff(id),
    viewed_by UUID REFERENCES staff(id),
    viewed_at TIMESTAMP WITH TIME ZONE,
    
    completed_by UUID REFERENCES staff(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treatment Tasks
CREATE TABLE IF NOT EXISTS treatment_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
    encounter_id UUID,
    patient_id UUID REFERENCES patients(id),
    
    task_type treatment_task_type NOT NULL,
    description TEXT,
    
    status treatment_task_status DEFAULT 'Pending',
    
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES staff(id),
    
    notes TEXT,
    result_value TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nursing Notes (Nursing Reports)
-- Allows nurses to document observations, progress notes, and other reports
-- for patients who have been attended to by doctors (consultants)
-- NOTE: Treatment plan is OPTIONAL - nurses can add reports for any consulted patient
CREATE TABLE IF NOT EXISTS nursing_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core relationships (encounter-centric)
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Optional linkages
    consultation_id UUID REFERENCES consultations(consultation_id),
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    treatment_task_id UUID REFERENCES treatment_tasks(id),
    
    -- Note content
    note_type VARCHAR(30) NOT NULL DEFAULT 'Progress_Note',
    title VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Clinical observations
    patient_condition VARCHAR(30),
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    
    -- Additional fields for specific note types
    interventions_performed TEXT,
    patient_response TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    
    -- Recording info
    recorded_by UUID NOT NULL REFERENCES staff(id),
    shift VARCHAR(20),
    
    -- Flags
    is_critical BOOLEAN DEFAULT false,
    requires_doctor_review BOOLEAN DEFAULT false,
    doctor_reviewed_by UUID REFERENCES staff(id),
    doctor_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Categories
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES inventory_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES inventory_categories(id),
    
    quantity_in_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    unit_of_measure VARCHAR(50),
    
    unit_cost DECIMAL(10, 2) DEFAULT 0,
    selling_price DECIMAL(10, 2) DEFAULT 0,
    
    supplier VARCHAR(100),
    batch_number VARCHAR(50),
    expiry_date DATE,
    
    is_active BOOLEAN DEFAULT true,
    is_consumable BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Stock Movements (Enhanced with pharmacy batch support)
CREATE TABLE IF NOT EXISTS inventory_stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    drug_id UUID REFERENCES drug_catalogue(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES drug_batches(batch_id),
    
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'EXPIRED', 'DAMAGED')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    
    reference_type VARCHAR(50), -- 'purchase_order', 'prescription', 'adjustment', 'transfer'
    reference_id UUID,
    reference_number VARCHAR(100),
    
    -- Encounter/Patient linking for dispensing audit
    encounter_id UUID REFERENCES visits(id),
    patient_id VARCHAR(50),
    dispense_id UUID,
    
    previous_quantity INTEGER,
    new_quantity INTEGER,
    
    batch_number VARCHAR(50),
    expiry_date DATE,
    reason TEXT,
    notes TEXT,
    
    performed_by UUID REFERENCES staff(id),
    approved_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    supplier_contact VARCHAR(100),
    supplier_address TEXT,
    
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Submitted', 'Approved', 'Ordered', 'Partial', 'Received', 'Cancelled'
    
    created_by UUID REFERENCES staff(id),
    approved_by UUID REFERENCES staff(id),
    received_by UUID REFERENCES staff(id),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    
    item_id UUID REFERENCES inventory_items(id),
    drug_id UUID REFERENCES drug_catalogue(id),
    item_type VARCHAR(50) NOT NULL, -- 'inventory' or 'drug'
    
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Partial', 'Received', 'Cancelled'
    batch_number VARCHAR(50),
    expiry_date DATE,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medical Reports
CREATE TABLE IF NOT EXISTS medical_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    visit_id UUID REFERENCES visits(id),
    encounter_id UUID REFERENCES visits(id),  -- PRIMARY encounter link
    
    report_type report_type NOT NULL,
    report_title VARCHAR(255) NOT NULL,
    report_content TEXT,
    
    valid_from DATE,
    valid_to DATE,
    
    status report_status DEFAULT 'Draft',
    
    created_by UUID REFERENCES staff(id),
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    issued_at TIMESTAMP WITH TIME ZONE,
    
    document_url TEXT,
    document_number VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type report_type NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_content TEXT,
    placeholders JSONB, -- Array of placeholders
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Config Categories
CREATE TABLE IF NOT EXISTS config_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configurations
CREATE TABLE IF NOT EXISTS system_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES config_categories(id),
    
    is_system BOOLEAN DEFAULT false,
    data_type config_data_type DEFAULT 'string',
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuration Audit Log
CREATE TABLE IF NOT EXISTS config_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID REFERENCES system_configurations(id),
    config_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    changed_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Price Audit Log (for NHIS pricing changes)
CREATE TABLE IF NOT EXISTS service_price_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type VARCHAR(50) NOT NULL,        -- 'lab', 'radiology', 'consultation'
    service_id UUID NOT NULL,                 -- Reference to the service
    service_name VARCHAR(255) NOT NULL,
    field_changed VARCHAR(50) NOT NULL,       -- e.g., 'nhis_price', 'nhis_percentage'
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES staff(id),
    changed_by_name VARCHAR(255),
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_price_audit_service ON service_price_audit(service_type, service_id);
CREATE INDEX IF NOT EXISTS idx_service_price_audit_date ON service_price_audit(created_at DESC);

-- Cash Register Sessions
CREATE TABLE IF NOT EXISTS cash_register_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID REFERENCES staff(id) NOT NULL,
    
    register_number VARCHAR(50),
    opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    closing_balance DECIMAL(12, 2),
    
    total_cash_received DECIMAL(12, 2) DEFAULT 0.00,
    total_pos_received DECIMAL(12, 2) DEFAULT 0.00,
    total_refunds DECIMAL(12, 2) DEFAULT 0.00,
    expected_balance DECIMAL(12, 2),
    difference DECIMAL(12, 2),
    
    status VARCHAR(50) DEFAULT 'Open', -- 'Open', 'Closed', 'Reconciled'
    
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by UUID REFERENCES staff(id),
    notes TEXT
);

-- Payment Transactions (detailed payment records for cashier)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES cash_register_sessions(id),
    billing_order_id UUID REFERENCES billing_orders(id),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    
    transaction_type VARCHAR(50) NOT NULL, -- 'Payment', 'Refund', 'Adjustment'
    amount DECIMAL(12, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    reference_number VARCHAR(100),
    
    status VARCHAR(50) DEFAULT 'Completed', -- 'Completed', 'Void', 'Refunded'
    void_reason TEXT,
    voided_by UUID REFERENCES staff(id),
    voided_at TIMESTAMP WITH TIME ZONE,
    
    processed_by UUID REFERENCES staff(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- States Table (for Dropdowns)
CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LGAs Table (for Dropdowns)
CREATE TABLE IF NOT EXISTS lgas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    state_id UUID REFERENCES states(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(state_id, name)
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patients_search ON patients(surname, first_name, patient_id, emr_number, contact_phone);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_queue_status_loc ON queue(status, location);
CREATE INDEX IF NOT EXISTS idx_lab_requests_visit ON lab_requests(visit_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_visit ON billing_orders(visit_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- New Indexes for added tables
CREATE INDEX IF NOT EXISTS idx_scan_images_request ON scan_images(request_id);
CREATE INDEX IF NOT EXISTS idx_lab_result_components_result ON lab_result_components(lab_result_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_billing ON receipts(billing_order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_patient ON receipts(patient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON inventory_stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON inventory_stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_cashier ON cash_register_sessions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_register_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_trans_session ON payment_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_date ON payment_transactions(created_at);

-- Encounter ID indexes (encounter_id = visits.id UUID, THE primary encounter identifier)
CREATE INDEX IF NOT EXISTS idx_queue_encounter_id ON queue(encounter_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_encounter_id ON billing_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_consultations_encounter_id ON consultations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter_id ON lab_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_encounter_id ON radiology_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter_id ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_receipts_encounter_id ON receipts(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_encounter_id ON treatment_plans(encounter_id);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_encounter_id ON triage_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_referrals_encounter_id ON referrals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_encounter_id ON medical_reports(encounter_id);

-- Nursing Notes Indexes
CREATE INDEX IF NOT EXISTS idx_nursing_notes_encounter ON nursing_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_patient ON nursing_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_treatment_plan ON nursing_notes(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_recorded_by ON nursing_notes(recorded_by);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_created_at ON nursing_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_critical ON nursing_notes(is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_nursing_notes_requires_review ON nursing_notes(requires_doctor_review) WHERE requires_doctor_review = true;

-- NHIS and Billing Audit Indexes
CREATE INDEX IF NOT EXISTS idx_billing_orders_nhis_covered ON billing_orders(nhis_covered);
CREATE INDEX IF NOT EXISTS idx_billing_items_nhis_covered ON billing_items(nhis_covered);
CREATE INDEX IF NOT EXISTS idx_billing_items_service_reference ON billing_items(service_reference_id);
CREATE INDEX IF NOT EXISTS idx_nhis_config_payment_category ON nhis_config(payment_category);
CREATE INDEX IF NOT EXISTS idx_visits_insurance_type ON visits(insurance_type);

-- Drug Batches Indexes (FEFO queries)
CREATE INDEX IF NOT EXISTS idx_drug_batches_drug_id ON drug_batches(drug_id);
CREATE INDEX IF NOT EXISTS idx_drug_batches_expiry ON drug_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_drug_batches_status ON drug_batches(status);
CREATE INDEX IF NOT EXISTS idx_drug_batches_remaining ON drug_batches(quantity_remaining) WHERE quantity_remaining > 0;

-- Stock Movements Additional Indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_drug ON inventory_stock_movements(drug_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON inventory_stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_encounter ON inventory_stock_movements(encounter_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_patient ON inventory_stock_movements(patient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON inventory_stock_movements(movement_type);

-- Dispense Records Indexes
CREATE INDEX IF NOT EXISTS idx_dispense_records_prescription ON dispense_records(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispense_records_patient ON dispense_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispense_records_encounter ON dispense_records(encounter_id);
CREATE INDEX IF NOT EXISTS idx_dispense_records_batch ON dispense_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_dispense_records_date ON dispense_records(dispensed_at);

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at_timestamp ON %I', t);
        EXECUTE format('CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END;
$$;

-- =====================================================
-- 4A. BILLING ITEMS VALIDATION TRIGGER
-- =====================================================
-- Ensures billing items have all required audit-safe fields

CREATE OR REPLACE FUNCTION validate_billing_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure all mandatory audit fields are present
    IF NEW.service_name IS NULL OR NEW.service_name = '' THEN
        -- Fall back to item_name if service_name not provided
        IF NEW.item_name IS NOT NULL AND NEW.item_name != '' THEN
            NEW.service_name := NEW.item_name;
        ELSE
            RAISE EXCEPTION 'service_name or item_name is required for billing items';
        END IF;
    END IF;
    
    IF NEW.unit_cost IS NULL THEN
        -- Fall back to unit_price if unit_cost not provided
        IF NEW.unit_price IS NOT NULL THEN
            NEW.unit_cost := NEW.unit_price;
        ELSE
            RAISE EXCEPTION 'unit_cost or unit_price is required for billing items';
        END IF;
    END IF;
    
    IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
        NEW.quantity := 1;
    END IF;
    
    IF NEW.gross_amount IS NULL THEN
        -- Auto-calculate if not provided
        NEW.gross_amount := NEW.quantity * NEW.unit_cost;
    END IF;
    
    -- Ensure NHIS fields are set (defaults to 0/false if not provided)
    IF NEW.nhis_covered IS NULL THEN
        NEW.nhis_covered := FALSE;
    END IF;
    
    IF NEW.nhis_percentage IS NULL THEN
        NEW.nhis_percentage := 0;
    END IF;
    
    IF NEW.nhis_payable IS NULL THEN
        NEW.nhis_payable := 0;
    END IF;
    
    IF NEW.patient_payable IS NULL THEN
        -- Default to gross_amount if not set (patient pays all)
        NEW.patient_payable := COALESCE(NEW.gross_amount, NEW.quantity * NEW.unit_cost);
    END IF;
    
    -- Sync legacy fields for backward compatibility
    IF NEW.item_name IS NULL THEN
        NEW.item_name := NEW.service_name;
    END IF;
    
    IF NEW.unit_price IS NULL THEN
        NEW.unit_price := NEW.unit_cost;
    END IF;
    
    IF NEW.total_price IS NULL THEN
        NEW.total_price := NEW.gross_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for billing items validation
DROP TRIGGER IF EXISTS trg_validate_billing_item ON billing_items;
CREATE TRIGGER trg_validate_billing_item
    BEFORE INSERT OR UPDATE ON billing_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_billing_item();

-- =====================================================
-- 4B. PHARMACY INVENTORY FUNCTIONS & TRIGGERS
-- =====================================================

-- FEFO FUNCTION - Get dispensable batches in First-Expiry-First-Out order
CREATE OR REPLACE FUNCTION get_dispensable_batches(
    p_drug_id UUID, 
    p_quantity INTEGER
)
RETURNS TABLE (
    batch_id UUID,
    batch_number VARCHAR,
    quantity_available INTEGER,
    quantity_to_take INTEGER,
    expiry_date DATE,
    days_to_expiry INTEGER,
    cost_price DECIMAL,
    selling_price DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_batches AS (
        SELECT 
            db.batch_id,
            db.batch_number,
            db.quantity_remaining AS quantity_available,
            db.expiry_date,
            (db.expiry_date - CURRENT_DATE)::INTEGER AS days_to_expiry,
            db.cost_price,
            db.selling_price,
            ROW_NUMBER() OVER (ORDER BY db.expiry_date ASC, db.received_date ASC) AS rn
        FROM drug_batches db
        WHERE db.drug_id = p_drug_id
          AND db.quantity_remaining > 0
          AND db.expiry_date > CURRENT_DATE
          AND db.status = 'active'
    ),
    cumulative AS (
        SELECT 
            rb.*,
            SUM(rb.quantity_available) OVER (ORDER BY rb.rn) AS running_total
        FROM ranked_batches rb
    )
    SELECT 
        c.batch_id,
        c.batch_number,
        c.quantity_available,
        LEAST(
            c.quantity_available, 
            GREATEST(0, p_quantity - COALESCE(
                (SELECT SUM(c2.quantity_available) FROM cumulative c2 WHERE c2.rn < c.rn), 
                0
            ))
        )::INTEGER AS quantity_to_take,
        c.expiry_date,
        c.days_to_expiry,
        c.cost_price,
        c.selling_price
    FROM cumulative c
    WHERE c.running_total - c.quantity_available < p_quantity
    ORDER BY c.expiry_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- HELPER FUNCTION - Check total available stock for a drug
CREATE OR REPLACE FUNCTION get_drug_available_stock(p_drug_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_total
    FROM drug_batches
    WHERE drug_id = p_drug_id
      AND status = 'active'
      AND expiry_date > CURRENT_DATE;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- TRIGGER FUNCTION - Sync drug_catalogue.stock_quantity from batches
CREATE OR REPLACE FUNCTION sync_drug_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE drug_catalogue
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity_remaining), 0)
        FROM drug_batches
        WHERE drug_id = COALESCE(NEW.drug_id, OLD.drug_id)
          AND status = 'active'
          AND expiry_date > CURRENT_DATE
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.drug_id, OLD.drug_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_drug_stock
    AFTER INSERT OR UPDATE OR DELETE ON drug_batches
    FOR EACH ROW EXECUTE FUNCTION sync_drug_stock_quantity();

-- PHARMACY STATS FUNCTION
CREATE OR REPLACE FUNCTION get_pharmacy_inventory_stats()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_drugs', (SELECT COUNT(*) FROM drug_catalogue WHERE is_active = true),
        'total_batches', (SELECT COUNT(*) FROM drug_batches WHERE status = 'active' AND quantity_remaining > 0),
        'low_stock_count', (
            SELECT COUNT(*) FROM drug_catalogue 
            WHERE is_active = true AND stock_quantity <= reorder_level AND stock_quantity > 0
        ),
        'out_of_stock_count', (
            SELECT COUNT(*) FROM drug_catalogue 
            WHERE is_active = true AND stock_quantity = 0
        ),
        'expiring_30_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE 
              AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        ),
        'expiring_60_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE + INTERVAL '30 days'
              AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
        ),
        'expiring_90_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE + INTERVAL '60 days'
              AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'
        ),
        'expired_batches', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE quantity_remaining > 0 
              AND expiry_date <= CURRENT_DATE
        ),
        'total_stock_value_cost', (
            SELECT COALESCE(SUM(quantity_remaining * cost_price), 0) 
            FROM drug_batches 
            WHERE status = 'active' AND expiry_date > CURRENT_DATE
        ),
        'total_stock_value_selling', (
            SELECT COALESCE(SUM(db.quantity_remaining * dc.unit_price), 0) 
            FROM drug_batches db
            JOIN drug_catalogue dc ON dc.id = db.drug_id
            WHERE db.status = 'active' AND db.expiry_date > CURRENT_DATE
        ),
        'dispensed_today_count', (
            SELECT COUNT(*) FROM dispense_records 
            WHERE DATE(dispensed_at) = CURRENT_DATE
        ),
        'received_today_count', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE DATE(received_date) = CURRENT_DATE
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 4C. PHARMACY INVENTORY VIEWS
-- =====================================================

-- VIEW: Near-expiry drugs (within 90 days)
CREATE OR REPLACE VIEW v_near_expiry_drugs AS
SELECT 
    db.batch_id,
    db.drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    dc.generic_name,
    db.batch_number,
    db.quantity_remaining,
    db.expiry_date,
    (db.expiry_date - CURRENT_DATE) AS days_to_expiry,
    db.cost_price,
    (db.quantity_remaining * db.cost_price) AS batch_value,
    CASE 
        WHEN (db.expiry_date - CURRENT_DATE) <= 30 THEN 'critical'
        WHEN (db.expiry_date - CURRENT_DATE) <= 60 THEN 'warning'
        WHEN (db.expiry_date - CURRENT_DATE) <= 90 THEN 'caution'
    END AS urgency_level
FROM drug_batches db
JOIN drug_catalogue dc ON dc.id = db.drug_id
WHERE db.status = 'active'
  AND db.quantity_remaining > 0
  AND db.expiry_date > CURRENT_DATE
  AND db.expiry_date <= (CURRENT_DATE + INTERVAL '90 days')
ORDER BY db.expiry_date ASC;

-- VIEW: Expired drugs
CREATE OR REPLACE VIEW v_expired_drugs AS
SELECT 
    db.batch_id,
    db.drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    dc.generic_name,
    db.batch_number,
    db.quantity_remaining,
    db.expiry_date,
    (CURRENT_DATE - db.expiry_date) AS days_expired,
    db.cost_price,
    (db.quantity_remaining * db.cost_price) AS loss_value,
    db.status
FROM drug_batches db
JOIN drug_catalogue dc ON dc.id = db.drug_id
WHERE db.expiry_date <= CURRENT_DATE
  AND db.quantity_remaining > 0
ORDER BY db.expiry_date DESC;

-- VIEW: Drug inventory summary with batch info
CREATE OR REPLACE VIEW v_drug_inventory_summary AS
SELECT 
    dc.id AS drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    dc.generic_name,
    dc.category,
    dc.drug_type,
    dc.strength,
    dc.unit_price AS selling_price,
    dc.reorder_level,
    dc.is_active,
    COALESCE(batch_stats.total_quantity, 0) AS total_stock,
    COALESCE(batch_stats.batch_count, 0) AS batch_count,
    COALESCE(batch_stats.earliest_expiry, NULL) AS earliest_expiry,
    COALESCE(batch_stats.total_cost_value, 0) AS stock_cost_value,
    COALESCE(batch_stats.expiring_soon, 0) AS expiring_soon_qty,
    CASE 
        WHEN COALESCE(batch_stats.total_quantity, 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(batch_stats.total_quantity, 0) <= dc.reorder_level THEN 'low_stock'
        ELSE 'in_stock'
    END AS stock_status
FROM drug_catalogue dc
LEFT JOIN (
    SELECT 
        drug_id,
        SUM(quantity_remaining) AS total_quantity,
        COUNT(*) AS batch_count,
        MIN(expiry_date) FILTER (WHERE quantity_remaining > 0) AS earliest_expiry,
        SUM(quantity_remaining * cost_price) AS total_cost_value,
        SUM(quantity_remaining) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '90 days') AS expiring_soon
    FROM drug_batches
    WHERE status = 'active' AND expiry_date > CURRENT_DATE
    GROUP BY drug_id
) batch_stats ON batch_stats.drug_id = dc.id
WHERE dc.is_active = true;

-- =====================================================
-- 5. RLS POLICIES (Basic Setup)
-- =====================================================

-- Enable RLS on all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        -- Create a default "allow all" policy for now to prevent lockout during dev
        -- In production, this should be replaced with granular policies
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END;
$$;

-- =====================================================
-- 5b. SEED DATA (NHIS Configuration)
-- =====================================================
-- Default NHIS coverage rates with consultation rules
-- NOTE: For Lab, Radiology, and Pharmacy - percentage is selected at billing point, not auto-calculated
-- Only Consultation has a fixed 100% coverage for all NHIS patients
INSERT INTO nhis_config (payment_category, coverage_percentage, consultation_fully_covered, description)
VALUES 
    ('Military_NHIS', 100, TRUE, 'Military NHIS - 100% coverage for all services, consultation fully covered'),
    ('DHML', 100, TRUE, 'Defence Health Maintenance Limited (Military NHIS) - 100% coverage, consultation fully covered'),
    ('Civilian_NHIS', 90, TRUE, 'Civilian NHIS - 90% coverage for services, consultation fully covered (100%)'),
    ('Private', 0, FALSE, 'Private patients - patient pays 100%'),
    ('Cash', 0, FALSE, 'Cash patients - patient pays 100%')
ON CONFLICT (payment_category) DO UPDATE SET
    coverage_percentage = EXCLUDED.coverage_percentage,
    consultation_fully_covered = EXCLUDED.consultation_fully_covered,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =====================================================
-- 6. SEED DATA (States & LGAs)
-- =====================================================

DO $$
DECLARE
    s_id UUID;
BEGIN
    -- Abuja (FCT)
    INSERT INTO states (name) VALUES ('Abuja (FCT)') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO s_id;
    INSERT INTO lgas (state_id, name) VALUES 
        (s_id, 'Abaji'), (s_id, 'Bwari'), (s_id, 'Gwagwalada'), (s_id, 'Kuje'), (s_id, 'Kwali'), (s_id, 'Municipal Area Council')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Lagos
    INSERT INTO states (name) VALUES ('Lagos') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO s_id;
    INSERT INTO lgas (state_id, name) VALUES 
        (s_id, 'Agege'), (s_id, 'Ajeromi-Ifelodun'), (s_id, 'Alimosho'), (s_id, 'Amuwo-Odofin'), (s_id, 'Apapa'), (s_id, 'Badagry'), (s_id, 'Epe'), (s_id, 'Eti Osa'), (s_id, 'Ibeju-Lekki'), (s_id, 'Ifako-Ijaiye'), (s_id, 'Ikeja'), (s_id, 'Ikorodu'), (s_id, 'Kosofe'), (s_id, 'Lagos Island'), (s_id, 'Lagos Mainland'), (s_id, 'Mushin'), (s_id, 'Ojo'), (s_id, 'Oshodi-Isolo'), (s_id, 'Shomolu'), (s_id, 'Surulere')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Kaduna
    INSERT INTO states (name) VALUES ('Kaduna') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO s_id;
    INSERT INTO lgas (state_id, name) VALUES 
        (s_id, 'Birnin Gwari'), (s_id, 'Chikun'), (s_id, 'Giwa'), (s_id, 'Igabi'), (s_id, 'Ikara'), (s_id, 'Jaba'), (s_id, 'Jema''a'), (s_id, 'Kachia'), (s_id, 'Kaduna North'), (s_id, 'Kaduna South'), (s_id, 'Kagarko'), (s_id, 'Kajuru'), (s_id, 'Kaura'), (s_id, 'Kauru'), (s_id, 'Kubau'), (s_id, 'Kudan'), (s_id, 'Lere'), (s_id, 'Makarfi'), (s_id, 'Sabon Gari'), (s_id, 'Sanga'), (s_id, 'Soba'), (s_id, 'Zangon Kataf'), (s_id, 'Zaria')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Kano
    INSERT INTO states (name) VALUES ('Kano') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO s_id;
    INSERT INTO lgas (state_id, name) VALUES 
        (s_id, 'Ajingi'), (s_id, 'Albasu'), (s_id, 'Bagwai'), (s_id, 'Bebeji'), (s_id, 'Bichi'), (s_id, 'Bunkure'), (s_id, 'Dala'), (s_id, 'Dambatta'), (s_id, 'Dawakin Kudu'), (s_id, 'Dawakin Tofa'), (s_id, 'Doguwa'), (s_id, 'Fagge'), (s_id, 'Gabasawa'), (s_id, 'Garko'), (s_id, 'Garun Mallam'), (s_id, 'Gaya'), (s_id, 'Gezawa'), (s_id, 'Gwale'), (s_id, 'Gwarzo'), (s_id, 'Kabo'), (s_id, 'Kano Municipal'), (s_id, 'Karaye'), (s_id, 'Kibiya'), (s_id, 'Kiru'), (s_id, 'Kumbotso'), (s_id, 'Kunchi'), (s_id, 'Kura'), (s_id, 'Madobi'), (s_id, 'Makoda'), (s_id, 'Minjibir'), (s_id, 'Nasarawa'), (s_id, 'Rano'), (s_id, 'Rimin Gado'), (s_id, 'Rogo'), (s_id, 'Shanono'), (s_id, 'Sumaila'), (s_id, 'Takai'), (s_id, 'Tarauni'), (s_id, 'Tofa'), (s_id, 'Tsanyawa'), (s_id, 'Tudun Wada'), (s_id, 'Ungogo'), (s_id, 'Warawa'), (s_id, 'Wudil')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Rivers
    INSERT INTO states (name) VALUES ('Rivers') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO s_id;
    INSERT INTO lgas (state_id, name) VALUES 
        (s_id, 'Abua/Odual'), (s_id, 'Ahoada East'), (s_id, 'Ahoada West'), (s_id, 'Akuku-Toru'), (s_id, 'Andoni'), (s_id, 'Asari-Toru'), (s_id, 'Bonny'), (s_id, 'Degema'), (s_id, 'Eleme'), (s_id, 'Emohua'), (s_id, 'Etche'), (s_id, 'Gokana'), (s_id, 'Ikwerre'), (s_id, 'Khana'), (s_id, 'Obio/Akpor'), (s_id, 'Ogba/Egbema/Ndoni'), (s_id, 'Ogu/Bolo'), (s_id, 'Okrika'), (s_id, 'Omuma'), (s_id, 'Opobo/Nkoro'), (s_id, 'Oyigbo'), (s_id, 'Port Harcourt'), (s_id, 'Tai')
    ON CONFLICT (state_id, name) DO NOTHING;

END $$;

-- =====================================================
-- 7. SEED DATA (Lab Tests)
-- =====================================================

INSERT INTO lab_test_catalogue (code, name, category, specimen_type, price, tat_minutes) VALUES
    -- Hematology
    ('HEM001', 'Full Blood Count (FBC)', 'Hematology', 'Blood', 3500.00, 60),
    ('HEM002', 'ESR', 'Hematology', 'Blood', 1500.00, 60),
    ('HEM003', 'Blood Group & Genotype', 'Hematology', 'Blood', 2000.00, 30),
    
    -- Chemical Pathology
    ('CHM001', 'Fasting Blood Sugar', 'Chemical Pathology', 'Blood', 1000.00, 30),
    ('CHM002', 'Liver Function Test', 'Chemical Pathology', 'Blood', 5000.00, 120),
    ('CHM003', 'Urea & Electrolytes', 'Chemical Pathology', 'Blood', 4000.00, 90),
    ('CHM004', 'Lipid Profile', 'Chemical Pathology', 'Blood', 4500.00, 120),
    
    -- Microbiology
    ('MIC001', 'Urinalysis', 'Microbiology', 'Urine', 1000.00, 30),
    ('MIC002', 'Stool M/C/S', 'Microbiology', 'Stool', 2500.00, 2880), -- 48 hours
    ('MIC003', 'Blood Culture', 'Microbiology', 'Blood', 6000.00, 10080), -- 7 days
    
    -- Serology
    ('SER001', 'HIV Screening', 'Serology', 'Blood', 1000.00, 30),
    ('SER002', 'HBsAg', 'Serology', 'Blood', 1500.00, 30),
    ('SER003', 'HCV', 'Serology', 'Blood', 1500.00, 30),
    ('SER004', 'VDRL', 'Serology', 'Blood', 1000.00, 30)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 8. SEED DATA (Imaging)
-- =====================================================

INSERT INTO imaging_catalogue (code, name, modality, body_part, price) VALUES
    ('RAD001', 'Chest X-Ray (PA)', 'X-Ray', 'Chest', 5000.00),
    ('RAD002', 'Abdominal Ultrasound', 'Ultrasound', 'Abdomen', 6000.00),
    ('RAD003', 'Pelvic Ultrasound', 'Ultrasound', 'Pelvis', 6000.00),
    ('RAD004', 'Obstetric Ultrasound', 'Ultrasound', 'Pelvis', 5000.00),
    ('RAD005', 'MRI Brain', 'MRI', 'Head', 85000.00),
    ('RAD006', 'CT Head', 'CT', 'Head', 45000.00)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 9. SEED DATA (Drugs)
-- =====================================================

INSERT INTO drug_catalogue (code, name, generic_name, category, drug_type, strength, unit_price, stock_quantity) VALUES
    ('DRG001', 'Paracetamol', 'Paracetamol', 'Analgesics', 'Tablets', '500mg', 20.00, 1000),
    ('DRG002', 'Amoxicillin', 'Amoxicillin', 'Antibiotics', 'Capsules', '500mg', 50.00, 500),
    ('DRG003', 'Artemether/Lumefantrine', 'Artemether/Lumefantrine', 'Antimalarials', 'Tablets', '80/480mg', 1200.00, 200),
    ('DRG004', 'Ciprofloxacin', 'Ciprofloxacin', 'Antibiotics', 'Tablets', '500mg', 100.00, 300),
    ('DRG005', 'Ibuprofen', 'Ibuprofen', 'Analgesics', 'Tablets', '400mg', 30.00, 800),
    ('DRG006', 'Metronidazole', 'Metronidazole', 'Antibiotics', 'Tablets', '400mg', 40.00, 400),
    ('DRG007', 'Vitamin C', 'Ascorbic Acid', 'Vitamins and Supplements', 'Tablets', '100mg', 10.00, 2000)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 10. SEED DATA (Departments)
-- =====================================================

INSERT INTO departments (code, name, category, description) VALUES
    ('DEPT001', 'General Outpatient', 'Clinical', 'General Outpatient Department'),
    ('DEPT002', 'Emergency', 'Clinical', 'Accident and Emergency'),
    ('DEPT003', 'Pediatrics', 'Clinical', 'Pediatrics Department'),
    ('DEPT004', 'Obstetrics & Gynecology', 'Clinical', 'O&G Department'),
    ('DEPT005', 'Surgery', 'Clinical', 'Surgery Department'),
    ('DEPT006', 'Internal Medicine', 'Clinical', 'Internal Medicine Department'),
    ('DEPT007', 'Laboratory', 'Diagnostic', 'Medical Laboratory'),
    ('DEPT008', 'Radiology', 'Diagnostic', 'Medical Imaging'),
    ('DEPT009', 'Pharmacy', 'Support', 'Pharmacy Department'),
    ('DEPT010', 'Nursing', 'Clinical', 'Nursing Services'),
    ('DEPT011', 'Medical Records', 'Administrative', 'Health Information Management'),
    ('DEPT012', 'Billing', 'Administrative', 'Accounts and Billing')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 11. SEED DATA (Clinics)
-- =====================================================

DO $$
DECLARE
    dept_id UUID;
BEGIN
    -- GOPD Clinic
    SELECT id INTO dept_id FROM departments WHERE code = 'DEPT001';
    IF dept_id IS NOT NULL THEN
        INSERT INTO clinics (clinic_id, clinic_name, department_id, consultation_fee) VALUES
            ('CLN001', 'GOPD Clinic', dept_id, 2000.00)
        ON CONFLICT (clinic_id) DO NOTHING;
    END IF;

    -- ANC Clinic
    SELECT id INTO dept_id FROM departments WHERE code = 'DEPT004';
    IF dept_id IS NOT NULL THEN
        INSERT INTO clinics (clinic_id, clinic_name, department_id, consultation_fee) VALUES
            ('CLN002', 'Antenatal Clinic', dept_id, 2500.00)
        ON CONFLICT (clinic_id) DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- 12. SEED DATA (Wards & Beds)
-- =====================================================

DO $$
DECLARE
    dept_id UUID;
    ward_id UUID;
BEGIN
    -- Male Ward (General)
    SELECT id INTO dept_id FROM departments WHERE code = 'DEPT010'; -- Nursing
    IF dept_id IS NOT NULL THEN
        INSERT INTO wards (department_id, code, name, ward_type, total_beds, available_beds, gender_restriction) VALUES
            (dept_id, 'WARD001', 'Male General Ward', 'General', 20, 20, 'Male')
        ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO ward_id;
        
        -- Seed Beds for Male Ward
        IF ward_id IS NOT NULL THEN
            INSERT INTO beds (ward_id, bed_number, status) VALUES
                (ward_id, 'M01', 'Available'), (ward_id, 'M02', 'Available'), (ward_id, 'M03', 'Available'), (ward_id, 'M04', 'Available'), (ward_id, 'M05', 'Available')
            ON CONFLICT (ward_id, bed_number) DO NOTHING;
        END IF;
    END IF;

    -- Female Ward (General)
    SELECT id INTO dept_id FROM departments WHERE code = 'DEPT010'; -- Nursing
    IF dept_id IS NOT NULL THEN
        INSERT INTO wards (department_id, code, name, ward_type, total_beds, available_beds, gender_restriction) VALUES
            (dept_id, 'WARD002', 'Female General Ward', 'General', 20, 20, 'Female')
        ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO ward_id;
        
        -- Seed Beds for Female Ward
        IF ward_id IS NOT NULL THEN
            INSERT INTO beds (ward_id, bed_number, status) VALUES
                (ward_id, 'F01', 'Available'), (ward_id, 'F02', 'Available'), (ward_id, 'F03', 'Available'), (ward_id, 'F04', 'Available'), (ward_id, 'F05', 'Available')
            ON CONFLICT (ward_id, bed_number) DO NOTHING;
        END IF;
    END IF;

    -- Pediatric Ward
    SELECT id INTO dept_id FROM departments WHERE code = 'DEPT003'; -- Pediatrics
    IF dept_id IS NOT NULL THEN
        INSERT INTO wards (department_id, code, name, ward_type, total_beds, available_beds) VALUES
            (dept_id, 'WARD003', 'Pediatric Ward', 'Pediatric', 15, 15)
        ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO ward_id;
        
        -- Seed Beds for Pediatric Ward
        IF ward_id IS NOT NULL THEN
            INSERT INTO beds (ward_id, bed_number, status) VALUES
                (ward_id, 'P01', 'Available'), (ward_id, 'P02', 'Available'), (ward_id, 'P03', 'Available')
            ON CONFLICT (ward_id, bed_number) DO NOTHING;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 13. SEED DATA (Inventory Categories)
-- =====================================================

INSERT INTO inventory_categories (name, description) VALUES
    ('Medical Supplies', 'Consumable medical supplies'),
    ('Equipment', 'Medical equipment'),
    ('Office Supplies', 'Administrative supplies'),
    ('Cleaning Supplies', 'Cleaning and sanitation'),
    ('Laboratory Supplies', 'Lab consumables and reagents'),
    ('Radiology Supplies', 'Imaging consumables')
ON CONFLICT DO NOTHING; -- Assuming name is unique or constraint exists, but schema says ID is PK. 
-- Note: Schema for inventory_categories has 'name' but no unique constraint explicitly in CREATE TABLE above, 
-- but usually names are unique. Let's assume we rely on ID or just insert.
-- To be safe, let's use a DO block to check existence if name isn't unique constraint.
-- Actually, let's add a unique constraint to name if it doesn't exist, or just insert safely.
-- For this script, I'll assume standard insert is fine or use ON CONFLICT if I added a constraint.
-- I'll use a DO block to be safe.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Medical Supplies') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Medical Supplies', 'Consumable medical supplies');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Equipment') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Equipment', 'Medical equipment');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Office Supplies') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Office Supplies', 'Administrative supplies');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Cleaning Supplies') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Cleaning Supplies', 'Cleaning and sanitation');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Laboratory Supplies') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Laboratory Supplies', 'Lab consumables and reagents');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Radiology Supplies') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Radiology Supplies', 'Imaging consumables');
    END IF;
END $$;

-- =====================================================
-- 14. SEED DATA (Config Categories & System Configs)
-- =====================================================

DO $$
DECLARE
    cat_id UUID;
BEGIN
    -- General Config
    INSERT INTO config_categories (name, description) VALUES ('General', 'General system settings') 
    ON CONFLICT DO NOTHING RETURNING id INTO cat_id;
    
    -- Fallback if not returned (already exists)
    IF cat_id IS NULL THEN SELECT id INTO cat_id FROM config_categories WHERE name = 'General'; END IF;

    IF cat_id IS NOT NULL THEN
        INSERT INTO system_configurations (key, value, description, category_id, data_type, display_name) VALUES
            ('hospital_name', 'NDC Medical Centre', 'Name of the hospital', cat_id, 'string', 'Hospital Name'),
            ('hospital_address', 'Abuja, Nigeria', 'Address of the hospital', cat_id, 'string', 'Hospital Address'),
            ('contact_email', 'info@ndchospital.com', 'Contact email', cat_id, 'string', 'Contact Email'),
            ('contact_phone', '+234 800 000 0000', 'Contact phone', cat_id, 'string', 'Contact Phone')
        ON CONFLICT (key) DO NOTHING;
    END IF;

    -- Billing Config
    INSERT INTO config_categories (name, description) VALUES ('Billing', 'Billing and payment settings') 
    ON CONFLICT DO NOTHING RETURNING id INTO cat_id;
    
    IF cat_id IS NULL THEN SELECT id INTO cat_id FROM config_categories WHERE name = 'Billing'; END IF;

    IF cat_id IS NOT NULL THEN
        INSERT INTO system_configurations (key, value, description, category_id, data_type, display_name) VALUES
            ('default_currency', 'NGN', 'Default currency symbol', cat_id, 'string', 'Currency'),
            ('enable_vat', 'false', 'Enable Value Added Tax', cat_id, 'boolean', 'Enable VAT'),
            ('vat_percentage', '7.5', 'VAT Percentage', cat_id, 'number', 'VAT %')
        ON CONFLICT (key) DO NOTHING;
    END IF;
    
    -- Security Config
    INSERT INTO config_categories (name, description) VALUES ('Security', 'Security and access settings') 
    ON CONFLICT DO NOTHING RETURNING id INTO cat_id;
    
    IF cat_id IS NULL THEN SELECT id INTO cat_id FROM config_categories WHERE name = 'Security'; END IF;

    IF cat_id IS NOT NULL THEN
        INSERT INTO system_configurations (key, value, description, category_id, data_type, display_name) VALUES
            ('session_timeout', '30', 'Session timeout in minutes', cat_id, 'number', 'Session Timeout (min)'),
            ('password_expiry_days', '90', 'Password expiry in days', cat_id, 'number', 'Password Expiry (days)')
        ON CONFLICT (key) DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- 15. SEED DATA (Report Templates)
-- =====================================================

INSERT INTO report_templates (report_type, template_name, template_content, placeholders) VALUES
    ('Medical Certificate', 'Standard Medical Certificate', 
    'This is to certify that [Patient Name] (EMR: [EMR Number]) was examined on [Date] and found to be suffering from [Diagnosis].\n\nRecommendation: [Recommendation]\n\nSigned,\n[Doctor Name]', 
    '[{"key": "Patient Name", "description": "Full name of patient"}, {"key": "EMR Number", "description": "Patient EMR ID"}, {"key": "Date", "description": "Date of examination"}, {"key": "Diagnosis", "description": "Medical diagnosis"}, {"key": "Recommendation", "description": "Doctor recommendation"}, {"key": "Doctor Name", "description": "Name of attending doctor"}]'::jsonb),
    
    ('Sick Leave', 'Sick Leave Certificate', 
    'To Whom It May Concern,\n\nThis is to certify that [Patient Name] has been under my care for [Diagnosis].\n\nThey are unfit for duty for a period of [Duration] days, commencing from [Start Date] to [End Date].\n\nSigned,\n[Doctor Name]', 
    '[{"key": "Patient Name", "description": "Full name of patient"}, {"key": "Diagnosis", "description": "Medical diagnosis"}, {"key": "Duration", "description": "Number of days"}, {"key": "Start Date", "description": "Start date of leave"}, {"key": "End Date", "description": "End date of leave"}, {"key": "Doctor Name", "description": "Name of attending doctor"}]'::jsonb),
    
    ('Referral Letter', 'General Referral', 
    'Date: [Date]\n\nTo: [Specialist/Hospital Name]\n\nRe: [Patient Name] (DOB: [DOB])\n\nDear Colleague,\n\nI am referring this patient to you for [Reason for Referral].\n\nClinical Summary:\n[Clinical Summary]\n\nCurrent Medications:\n[Medications]\n\nThank you for your expert management.\n\nSincerely,\n[Doctor Name]', 
    '[{"key": "Date", "description": "Current date"}, {"key": "Specialist/Hospital Name", "description": "Target of referral"}, {"key": "Patient Name", "description": "Full name of patient"}, {"key": "DOB", "description": "Date of birth"}, {"key": "Reason for Referral", "description": "Reason"}, {"key": "Clinical Summary", "description": "Summary of condition"}, {"key": "Medications", "description": "Current meds"}, {"key": "Doctor Name", "description": "Referring doctor"}]'::jsonb)
ON CONFLICT DO NOTHING; -- Assuming no unique constraint on name/type combination, but safe to insert.

-- =====================================================
-- 16. SEED DATA (System User)
-- =====================================================
-- Create a system user for automated tasks if needed
-- Note: This requires an entry in auth.users which we can't easily do here without knowing the ID.
-- Skipping system user creation in this migration.

-- =====================================================
-- 17. PAYER SCHEMES
-- =====================================================

CREATE TABLE IF NOT EXISTS payer_schemes (
    scheme_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payer_schemes ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payer_schemes' AND policyname = 'Allow read access for authenticated users') THEN
        CREATE POLICY "Allow read access for authenticated users" ON payer_schemes FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payer_schemes' AND policyname = 'Allow write access for admins') THEN
        CREATE POLICY "Allow write access for admins" ON payer_schemes FOR ALL USING (
            EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid() AND staff.role IN ('super_admin', 'admin', 'medical_director'))
        );
    END IF;
END $$;

-- Seed Payer Schemes
INSERT INTO payer_schemes (name) VALUES
    ('Private'),
    ('VENUS MEDICARE LTD'),
    ('ZUMA HEALTH TRUST LIMITED'),
    ('CLEARLINE INTERNATIONAL LIMITED'),
    ('LIFE WORTH MEDICAL CARE'),
    ('INTERGRATED HEALTHCARE LIMITED'),
    ('POLICE HEALTH MAINTENANCE LIMITED'),
    ('NONSUCH MEDICARE NIG LTD'),
    ('ULTIMATE HEALTH MANAGEMENT SERVICES'),
    ('UNITED COMPREHENSIVE HEALTH MANAGERS'),
    ('TOTAL HEALTH TRUST LIMITED'),
    ('SUNU HEALTH HMO'),
    ('STERLING HEALTH MANAGED CARE SERVICES'),
    ('DHML'),
    ('NDC Locals'),
    ('NDC Foreign'),
    ('IHMS'),
    ('NDC NYSC')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 18. PERMISSIONS & RBAC
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_name TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    permission_id UUID REFERENCES permissions(permission_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- Seed Permissions
INSERT INTO permissions (permission_name, description, module, action) VALUES
    -- Patient Records
    ('patient.create', 'Create patient records', 'patient_records', 'create'),
    ('patient.read', 'View patient records', 'patient_records', 'read'),
    ('patient.update', 'Update patient records', 'patient_records', 'update'),
    ('patient.delete', 'Delete patient records', 'patient_records', 'delete'),
    -- OPD
    ('opd.create', 'Create consultations', 'opd', 'create'),
    ('opd.read', 'View consultations', 'opd', 'read'),
    -- Pharmacy
    ('pharmacy.create', 'Create prescriptions', 'pharmacy', 'create'),
    ('pharmacy.read', 'View prescriptions', 'pharmacy', 'read'),
    ('pharmacy.dispense', 'Dispense medications', 'pharmacy', 'update'),
    -- Laboratory
    ('lab.create', 'Create lab requests', 'laboratory', 'create'),
    ('lab.read', 'View lab requests', 'laboratory', 'read'),
    ('lab.update', 'Update lab results', 'laboratory', 'update'),
    -- Imaging
    ('imaging.create', 'Create imaging requests', 'imaging', 'create'),
    ('imaging.read', 'View imaging requests', 'imaging', 'read'),
    -- Nursing
    ('nursing.create', 'Create nursing notes', 'nursing', 'create'),
    ('nursing.read', 'View nursing notes', 'nursing', 'read'),
    -- Finance
    ('finance.create', 'Create invoices', 'finance', 'create'),
    ('finance.read', 'View invoices', 'finance', 'read'),
    -- Config
    ('config.read', 'View configurations', 'configurations', 'read'),
    ('config.update', 'Update configurations', 'configurations', 'update')
ON CONFLICT (permission_name) DO NOTHING;

-- Seed Role Permissions
-- Super Admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', permission_id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', permission_id FROM permissions 
WHERE permission_name NOT IN ('config.roles')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Doctor
INSERT INTO role_permissions (role, permission_id)
SELECT 'doctor', permission_id FROM permissions 
WHERE module IN ('patient_records', 'opd', 'nursing', 'medical_reports')
   OR permission_name IN ('pharmacy.create', 'pharmacy.read', 'lab.create', 'lab.read', 'imaging.create', 'imaging.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Nurse
INSERT INTO role_permissions (role, permission_id)
SELECT 'nurse', permission_id FROM permissions 
WHERE module = 'nursing' 
   OR permission_name IN ('patient.read', 'opd.read', 'pharmacy.read', 'lab.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Receptionist
INSERT INTO role_permissions (role, permission_id)
SELECT 'receptionist', permission_id FROM permissions 
WHERE permission_name IN ('patient.create', 'patient.read', 'patient.update')
ON CONFLICT (role, permission_id) DO NOTHING;

-- =====================================================
-- 19. WORKFLOW & AUDIT
-- =====================================================

-- Clinical Audit Log
CREATE TABLE IF NOT EXISTS clinical_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID REFERENCES visits(id),
    patient_id UUID REFERENCES patients(id),
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'CLOSE', 'TRANSITION', 'REOPEN'
    entity_type TEXT NOT NULL, -- 'consultation', 'lab_request', 'prescription', etc.
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by UUID REFERENCES staff(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT,
    
    -- Workflow specific columns
    from_state TEXT,
    to_state TEXT,
    role_at_action TEXT
);

CREATE INDEX IF NOT EXISTS idx_clinical_audit_encounter ON clinical_audit_log(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_patient ON clinical_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_performer ON clinical_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_time ON clinical_audit_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_entity ON clinical_audit_log(entity_type, entity_id);

-- State Transition Permissions
CREATE TABLE IF NOT EXISTS state_transition_permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL, -- 'queue', 'lab', 'radiology', 'pharmacy', 'consultation', 'treatment_plan'
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    allowed_roles TEXT[] NOT NULL, -- Array of role names
    requires_reason BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_roles TEXT[], -- Roles that can approve
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, from_state, to_state)
);

-- Function to check if state transition is allowed
CREATE OR REPLACE FUNCTION can_transition_state(
    p_entity_type TEXT,
    p_from_state TEXT,
    p_to_state TEXT,
    p_user_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_allowed BOOLEAN;
BEGIN
    SELECT TRUE INTO v_allowed
    FROM state_transition_permissions
    WHERE entity_type = p_entity_type
    AND from_state = p_from_state
    AND to_state = p_to_state
    AND p_user_role = ANY(allowed_roles);
    
    RETURN COALESCE(v_allowed, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Seed State Transition Permissions
INSERT INTO state_transition_permissions (entity_type, from_state, to_state, allowed_roles, requires_reason)
VALUES
    -- Queue transitions
    ('queue', 'Waiting', 'Ready_For_Consultation', ARRAY['nurse', 'doctor', 'admin'], false),
    ('queue', 'Ready_For_Consultation', 'In_Consultation', ARRAY['doctor', 'admin'], false),
    ('queue', 'In_Consultation', 'Completed', ARRAY['doctor', 'admin'], false),
    ('queue', 'Waiting', 'Skipped', ARRAY['nurse', 'doctor', 'admin'], true),
    ('queue', 'Waiting', 'Cancelled', ARRAY['nurse', 'receptionist', 'admin'], true),
    ('queue', 'Skipped', 'Waiting', ARRAY['nurse', 'admin'], false),
    
    -- Lab transitions
    ('lab', 'Pending', 'Accepted', ARRAY['lab_technician', 'admin'], false),
    ('lab', 'Pending', 'Rejected', ARRAY['lab_technician', 'admin'], true),
    ('lab', 'Accepted', 'Awaiting_Payment', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('lab', 'Awaiting_Payment', 'Paid', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('lab', 'Awaiting_Payment', 'Waived', ARRAY['cashier', 'admin', 'billing_clerk'], true),
    ('lab', 'Awaiting_Payment', 'Cancelled', ARRAY['cashier', 'admin'], true),
    ('lab', 'Paid', 'Sample_Collected', ARRAY['lab_technician', 'nurse', 'admin'], false),
    ('lab', 'Waived', 'Sample_Collected', ARRAY['lab_technician', 'nurse', 'admin'], false),
    ('lab', 'Sample_Collected', 'Processing', ARRAY['lab_technician', 'admin'], false),
    ('lab', 'Processing', 'Result_Ready', ARRAY['lab_technician', 'admin'], false),
    ('lab', 'Result_Ready', 'Result_Viewed', ARRAY['doctor', 'medical_director', 'admin'], false),
    
    -- Radiology transitions
    ('radiology', 'Pending', 'Accepted', ARRAY['radiologist', 'admin'], false),
    ('radiology', 'Pending', 'Rejected', ARRAY['radiologist', 'admin'], true),
    ('radiology', 'Accepted', 'Awaiting_Payment', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('radiology', 'Awaiting_Payment', 'Paid', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('radiology', 'Awaiting_Payment', 'Waived', ARRAY['cashier', 'admin'], true),
    ('radiology', 'Paid', 'Scheduled', ARRAY['radiologist', 'receptionist', 'admin'], false),
    ('radiology', 'Waived', 'Scheduled', ARRAY['radiologist', 'receptionist', 'admin'], false),
    ('radiology', 'Scheduled', 'Scan_Completed', ARRAY['radiologist', 'admin'], false),
    ('radiology', 'Scan_Completed', 'Report_Uploaded', ARRAY['radiologist', 'admin'], false),
    ('radiology', 'Report_Uploaded', 'Report_Viewed', ARRAY['doctor', 'medical_director', 'admin'], false),
    
    -- Pharmacy transitions
    ('pharmacy', 'Pending', 'Verified', ARRAY['pharmacist', 'admin'], false),
    ('pharmacy', 'Pending', 'Cancelled', ARRAY['pharmacist', 'doctor', 'admin'], true),
    ('pharmacy', 'Verified', 'Awaiting_Payment', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('pharmacy', 'Awaiting_Payment', 'Paid', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('pharmacy', 'Awaiting_Payment', 'Waived', ARRAY['cashier', 'admin'], true),
    ('pharmacy', 'Paid', 'Dispensed', ARRAY['pharmacist', 'admin'], false),
    ('pharmacy', 'Waived', 'Dispensed', ARRAY['pharmacist', 'admin'], false),
    ('pharmacy', 'Paid', 'Partially_Dispensed', ARRAY['pharmacist', 'admin'], true),
    
    -- Treatment plan transitions
    ('treatment_plan', 'Created', 'Viewed', ARRAY['nurse', 'doctor', 'admin'], false),
    ('treatment_plan', 'Viewed', 'In_Progress', ARRAY['nurse', 'admin'], false),
    ('treatment_plan', 'In_Progress', 'Completed', ARRAY['nurse', 'admin'], false),
    ('treatment_plan', 'Created', 'Cancelled', ARRAY['doctor', 'admin'], true)
ON CONFLICT (entity_type, from_state, to_state) DO NOTHING;

-- =====================================================
-- 20. ENCOUNTER MODULE (Advanced)
-- =====================================================

-- Visit ID Sequence (for human-readable visit_id like "VIS-20251227-00001")
CREATE SEQUENCE IF NOT EXISTS visit_id_seq START WITH 1001;

-- Function to generate visit_id
CREATE OR REPLACE FUNCTION generate_visit_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visit_id IS NULL OR NEW.visit_id = '' THEN
        NEW.visit_id := 'VIS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('visit_id_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate visit_id on insert
DROP TRIGGER IF EXISTS trg_generate_visit_id ON visits;
CREATE TRIGGER trg_generate_visit_id
    BEFORE INSERT ON visits
    FOR EACH ROW
    EXECUTE FUNCTION generate_visit_id();

-- Encounter Number Sequence (for human-readable encounter_number like "ENC-20251227-1001")
CREATE SEQUENCE IF NOT EXISTS encounter_number_seq START WITH 1001;

-- Function to generate unique encounter number
CREATE OR REPLACE FUNCTION generate_encounter_number()
RETURNS TRIGGER AS $$
DECLARE
    new_encounter_number TEXT;
BEGIN
    -- Generate encounter number: ENC-YYYYMMDD-SEQUENCE
    new_encounter_number := 'ENC-' || 
                            TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
                            LPAD(nextval('encounter_number_seq')::TEXT, 4, '0');
    
    NEW.encounter_number := new_encounter_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate encounter number on insert
DROP TRIGGER IF EXISTS trg_generate_encounter_number ON visits;
CREATE TRIGGER trg_generate_encounter_number
    BEFORE INSERT ON visits
    FOR EACH ROW
    WHEN (NEW.encounter_number IS NULL)
    EXECUTE FUNCTION generate_encounter_number();

-- Encounter Stage Transitions (Audit Trail)
CREATE TABLE IF NOT EXISTS encounter_stage_transitions (
    transition_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    transitioned_by UUID REFERENCES staff(id),
    transitioned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_transitions_visit ON encounter_stage_transitions(visit_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_date ON encounter_stage_transitions(transitioned_at);

-- Encounter Addendums (Post-closure notes)
CREATE TABLE IF NOT EXISTS encounter_addendums (
    addendum_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    addendum_type TEXT NOT NULL CHECK (addendum_type IN ('clinical_note', 'correction', 'late_result', 'administrative')),
    content TEXT NOT NULL,
    reference_entity_type TEXT, -- 'consultation', 'lab_result', etc.
    reference_entity_id UUID,
    created_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMPTZ,
    is_approved BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_addendum_encounter ON encounter_addendums(encounter_id);
CREATE INDEX IF NOT EXISTS idx_addendum_patient ON encounter_addendums(patient_id);

-- Workflow Transition Rules
CREATE TABLE IF NOT EXISTS workflow_transition_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_stage TEXT NOT NULL,
    to_stage TEXT NOT NULL,
    requires_payment BOOLEAN DEFAULT FALSE,
    requires_vitals BOOLEAN DEFAULT FALSE,
    requires_action TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_stage, to_stage)
);

-- Seed Workflow Transition Rules
INSERT INTO workflow_transition_rules (from_stage, to_stage, requires_payment, requires_vitals, description) VALUES
    -- From registered
    ('registered', 'encounter_created', FALSE, FALSE, 'Create encounter record'),
    
    -- From encounter_created
    ('encounter_created', 'awaiting_consultation_payment', FALSE, FALSE, 'Wait for consultation payment (Cash/POS)'),
    ('encounter_created', 'paid', FALSE, FALSE, 'NHIS/Retainer - skip payment'),
    ('encounter_created', 'waived', FALSE, FALSE, 'Payment waived by authorized staff'),
    
    -- From awaiting_consultation_payment
    ('awaiting_consultation_payment', 'paid', TRUE, FALSE, 'Payment received'),
    ('awaiting_consultation_payment', 'waived', FALSE, FALSE, 'Payment waived'),
    
    -- From paid/waived
    ('paid', 'vitals_taken', FALSE, TRUE, 'Nurse records vitals'),
    ('waived', 'vitals_taken', FALSE, TRUE, 'Nurse records vitals')
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- Function to validate encounter is active
CREATE OR REPLACE FUNCTION validate_encounter_active(p_encounter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status::TEXT INTO v_status
    FROM visits
    WHERE id = p_encounter_id; -- Note: using 'id' not 'visit_id' as per schema
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Encounter not found: %', p_encounter_id;
    END IF;
    
    IF v_status IN ('Completed', 'Closed', 'Cancelled') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 21. AUTH CONTEXT MODULE
-- =====================================================

-- User Preferences (Theme, Dashboard Layout, etc.)
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES staff(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'light',
    dashboard_layout JSONB DEFAULT '{}'::jsonb,
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    default_module VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    pref_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES staff(id) ON DELETE CASCADE UNIQUE,
    
    -- Channels
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    
    -- Types
    enabled_types TEXT[] DEFAULT ARRAY['Queue', 'Payment', 'LabResult', 'RadiologyResult', 'Prescription', 'Referral', 'CriticalValue', 'SystemAlert', 'Message'],
    
    -- Quiet Hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    min_priority notification_priority DEFAULT 'Normal',
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth Audit Log (Login/Logout/Security Events)
CREATE TABLE IF NOT EXISTS auth_audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES staff(id), -- Can be null for failed login with unknown user
    event_type VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'MFA_SETUP'
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILURE'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_date ON auth_audit_log(created_at DESC);

-- Active Sessions (For concurrency control and monitoring)
CREATE TABLE IF NOT EXISTS active_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    token_signature VARCHAR(255), -- Hash of the session token for verification
    ip_address INET,
    user_agent TEXT,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);

-- =====================================================
-- 22. SEED USERS & STAFF (Demo Accounts)
-- =====================================================

-- Note: This section attempts to seed auth.users directly.
-- This requires superuser privileges or specific configuration in Supabase.
-- If this fails, use the scripts/create-demo-users.ts script instead.

DO $$
DECLARE
    v_user_id UUID;
    v_dept_id UUID;
BEGIN
    -- 1. Super Admin
    -- Create auth user
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'superadmin@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    -- Create staff record
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF001', v_user_id, 'Super', 'Admin', 'superadmin@ndchospital.com', '+234-800-000-0001', 'super_admin', NULL, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 2. Admin
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'admin@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF002', v_user_id, 'System', 'Manager', 'admin@ndchospital.com', '+234-800-000-0002', 'admin', NULL, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 3. Medical Director
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'director@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    SELECT id INTO v_dept_id FROM departments WHERE name = 'Internal Medicine' LIMIT 1; -- Assuming Medical Director is in a clinical dept
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF003', v_user_id, 'Medical', 'Director', 'director@ndchospital.com', '+234-800-000-0003', 'medical_director', v_dept_id, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 4. Doctor
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'doctor@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    SELECT id INTO v_dept_id FROM departments WHERE code = 'DEPT001'; -- GOPD
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF004', v_user_id, 'Chidi', 'Okonkwo', 'doctor@ndchospital.com', '+234-800-000-0004', 'doctor', v_dept_id, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 5. Nurse
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'nurse@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    SELECT id INTO v_dept_id FROM departments WHERE code = 'DEPT010'; -- Nursing
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF005', v_user_id, 'Funke', 'Adeyemi', 'nurse@ndchospital.com', '+234-800-000-0005', 'nurse', v_dept_id, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 6. Lab Technician
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'lab@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    SELECT id INTO v_dept_id FROM departments WHERE code = 'DEPT007'; -- Laboratory
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF006', v_user_id, 'Musa', 'Ibrahim', 'lab@ndchospital.com', '+234-800-000-0006', 'lab_technician', v_dept_id, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 7. Radiologist
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'radiology@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    SELECT id INTO v_dept_id FROM departments WHERE code = 'DEPT008'; -- Radiology
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF007', v_user_id, 'Emeka', 'Nwosu', 'radiology@ndchospital.com', '+234-800-000-0007', 'radiologist', v_dept_id, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 8. Pharmacist
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'pharmacy@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    SELECT id INTO v_dept_id FROM departments WHERE code = 'DEPT009'; -- Pharmacy
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF008', v_user_id, 'Aisha', 'Bello', 'pharmacy@ndchospital.com', '+234-800-000-0008', 'pharmacist', v_dept_id, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 9. Billing Clerk
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'billing@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    SELECT id INTO v_dept_id FROM departments WHERE code = 'DEPT012'; -- Billing
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF009', v_user_id, 'Ngozi', 'Eze', 'billing@ndchospital.com', '+234-800-000-0009', 'billing_clerk', v_dept_id, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 10. Receptionist
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 'reception@ndchospital.com', crypt('Demo@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id INTO v_user_id;
    
    SELECT id INTO v_dept_id FROM departments WHERE code = 'DEPT011'; -- Medical Records (often reception)
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO staff (staff_id, user_id, first_name, last_name, email, phone, role, department_id, is_active)
        VALUES ('STAFF010', v_user_id, 'Fatima', 'Ahmed', 'reception@ndchospital.com', '+234-800-000-0010', 'receptionist', v_dept_id, true)
        ON CONFLICT (email) DO NOTHING;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not seed auth.users: %. Please run scripts/create-demo-users.ts instead.', SQLERRM;
END $$;

-- =====================================================
-- NHIS PRICING INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lab_test_nhis_covered ON lab_test_catalogue(is_nhis_covered) WHERE is_nhis_covered = TRUE;
CREATE INDEX IF NOT EXISTS idx_imaging_nhis_covered ON imaging_catalogue(is_nhis_covered) WHERE is_nhis_covered = TRUE;
CREATE INDEX IF NOT EXISTS idx_drug_nhis_covered ON drug_catalogue(is_nhis_covered) WHERE is_nhis_covered = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) FOR PRICING CONTROL
-- Only Super Admin can INSERT/UPDATE pricing tables
-- =====================================================

-- Enable RLS on pricing tables
ALTER TABLE lab_test_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_price_audit ENABLE ROW LEVEL SECURITY;

-- Lab Test Catalogue Policies
CREATE POLICY lab_select_all ON lab_test_catalogue
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY lab_insert_super_admin ON lab_test_catalogue
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin')
  );

CREATE POLICY lab_update_super_admin ON lab_test_catalogue
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'));

-- Imaging Catalogue Policies
CREATE POLICY imaging_select_all ON imaging_catalogue
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY imaging_insert_super_admin ON imaging_catalogue
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin')
  );

CREATE POLICY imaging_update_super_admin ON imaging_catalogue
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'));

-- Drug Catalogue Policies
CREATE POLICY drug_select_all ON drug_catalogue
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY drug_insert_super_admin ON drug_catalogue
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin')
  );

CREATE POLICY drug_update_super_admin ON drug_catalogue
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'));

-- Clinics Policies (consultation fees)
CREATE POLICY clinics_select_all ON clinics
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY clinics_update_super_admin ON clinics
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin'));

-- Service Price Audit Policies
CREATE POLICY audit_select_all ON service_price_audit
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY audit_insert_super_admin ON service_price_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin')
  );

-- =====================================================
-- END OF MIGRATION
-- =====================================================
