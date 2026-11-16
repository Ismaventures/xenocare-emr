-- Migration: In-Patient and Procedure Modules
-- Version: 037
-- Date: 2026-01-01
-- Description: Creates tables for ward management, admissions, bed tracking, and procedure management
-- NOTE: This migration is designed to work with existing schema - adds missing columns/tables

-- ============================================================================
-- SECTION 0: CLEANUP OLD CONFLICTING SCHEMA (from 001_fresh_schema.sql)
-- ============================================================================

-- Drop old wards table if it exists with old structure (department-based)
DO $$
BEGIN
    -- Check if old wards table exists with department_id (old schema)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wards' AND column_name = 'department_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wards' AND column_name = 'facility_id'
    ) THEN
        -- Old schema detected - drop dependent objects first
        DROP VIEW IF EXISTS ward_census CASCADE;
        DROP VIEW IF EXISTS bed_availability CASCADE;
        DROP VIEW IF EXISTS active_admissions_view CASCADE;
        DROP TABLE IF EXISTS bed_transfers CASCADE;
        DROP TABLE IF EXISTS ward_round_notes CASCADE;
        DROP TABLE IF EXISTS admissions CASCADE;
        DROP TABLE IF EXISTS beds CASCADE;
        DROP TABLE IF EXISTS wards CASCADE;
        RAISE NOTICE 'Dropped old wards/beds schema (department-based) to recreate with facility-based schema';
    END IF;
END $$;

-- ============================================================================
-- SECTION 1: WARD AND BED MANAGEMENT TABLES
-- ============================================================================

-- Wards table - defines hospital wards/units
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    ward_type VARCHAR(50) NOT NULL CHECK (ward_type IN (
        'general', 'icu', 'pediatric', 'maternity', 'surgical', 
        'orthopedic', 'cardiac', 'emergency', 'psychiatric', 'isolation'
    )),
    total_beds INTEGER NOT NULL DEFAULT 0,
    available_beds INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    floor_number INTEGER,
    building VARCHAR(100),
    nurse_station_phone VARCHAR(20),
    head_nurse_id UUID REFERENCES staff(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id),
    
    CONSTRAINT available_beds_check CHECK (available_beds >= 0 AND available_beds <= total_beds)
);

-- Add missing columns to wards if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wards' AND column_name = 'facility_id') THEN
        ALTER TABLE wards ADD COLUMN facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wards' AND column_name = 'head_nurse_id') THEN
        ALTER TABLE wards ADD COLUMN head_nurse_id UUID REFERENCES staff(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wards' AND column_name = 'is_active') THEN
        ALTER TABLE wards ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wards' AND column_name = 'created_by') THEN
        ALTER TABLE wards ADD COLUMN created_by UUID REFERENCES staff(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wards' AND column_name = 'updated_by') THEN
        ALTER TABLE wards ADD COLUMN updated_by UUID REFERENCES staff(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wards' AND column_name = 'nurse_station_phone') THEN
        ALTER TABLE wards ADD COLUMN nurse_station_phone VARCHAR(20);
    END IF;
END $$;

-- Beds table - individual beds within wards
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    bed_number VARCHAR(20) NOT NULL,
    bed_type VARCHAR(50) NOT NULL CHECK (bed_type IN (
        'standard', 'electric', 'icu', 'pediatric', 'bariatric', 
        'low', 'stretcher', 'crib', 'bassinet'
    )),
    status VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (status IN (
        'available', 'occupied', 'reserved', 'maintenance', 'cleaning'
    )),
    features JSONB DEFAULT '[]'::jsonb, -- e.g., ["oxygen", "suction", "cardiac_monitor"]
    daily_rate DECIMAL(10,2),
    current_patient_id UUID REFERENCES patients(id),
    current_admission_id UUID, -- Will be set after admissions table is created
    location_details TEXT, -- e.g., "Near window", "Corner bed"
    is_active BOOLEAN DEFAULT TRUE,
    last_cleaned_at TIMESTAMPTZ,
    last_maintenance_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(ward_id, bed_number)
);

-- Add missing columns to beds if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'features') THEN
        ALTER TABLE beds ADD COLUMN features JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'daily_rate') THEN
        ALTER TABLE beds ADD COLUMN daily_rate DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'current_patient_id') THEN
        ALTER TABLE beds ADD COLUMN current_patient_id UUID REFERENCES patients(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'current_admission_id') THEN
        ALTER TABLE beds ADD COLUMN current_admission_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'location_details') THEN
        ALTER TABLE beds ADD COLUMN location_details TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'is_active') THEN
        ALTER TABLE beds ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'last_cleaned_at') THEN
        ALTER TABLE beds ADD COLUMN last_cleaned_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'last_maintenance_at') THEN
        ALTER TABLE beds ADD COLUMN last_maintenance_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: ADMISSION MANAGEMENT TABLES
-- ============================================================================

-- Admissions table - tracks patient hospital stays
CREATE TABLE IF NOT EXISTS admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id), -- Link to originating encounter (nullable for emergency admits)
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Admission details
    admission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_discharge_date DATE,
    actual_discharge_date TIMESTAMPTZ,
    admission_type VARCHAR(50) NOT NULL CHECK (admission_type IN (
        'emergency', 'elective', 'transfer', 'observation', 'day_case'
    )),
    admission_source VARCHAR(50) CHECK (admission_source IN (
        'emergency', 'outpatient', 'referral', 'transfer', 'direct'
    )),
    
    -- Ward and bed assignment
    current_ward_id UUID REFERENCES wards(id),
    current_bed_id UUID REFERENCES beds(id),
    
    -- Clinical information
    admitting_diagnosis TEXT NOT NULL,
    admitting_diagnosis_icd10 VARCHAR(20),
    secondary_diagnoses JSONB DEFAULT '[]'::jsonb,
    chief_complaint TEXT,
    reason_for_admission TEXT,
    
    -- Care team
    admitting_doctor_id UUID REFERENCES staff(id),
    attending_physician_id UUID REFERENCES staff(id),
    primary_nurse_id UUID REFERENCES staff(id),
    care_team JSONB DEFAULT '[]'::jsonb, -- Array of {user_id, role, assigned_at}
    
    -- Patient condition
    admission_status VARCHAR(30) NOT NULL DEFAULT 'admitted' CHECK (admission_status IN (
        'admitted', 'under_observation', 'critical', 'stable', 
        'improving', 'discharged', 'transferred', 'deceased', 'absconded'
    )),
    acuity_level VARCHAR(20) CHECK (acuity_level IN (
        'low', 'moderate', 'high', 'critical'
    )),
    code_status VARCHAR(30) DEFAULT 'full_code' CHECK (code_status IN (
        'full_code', 'dnr', 'dni', 'dnr_dni', 'comfort_care'
    )),
    isolation_required BOOLEAN DEFAULT FALSE,
    isolation_type VARCHAR(50),
    fall_risk_level VARCHAR(20),
    pressure_ulcer_risk VARCHAR(20),
    
    -- Allergies and alerts (copied from patient for quick reference)
    allergies_snapshot JSONB DEFAULT '[]'::jsonb,
    alerts JSONB DEFAULT '[]'::jsonb,
    
    -- Diet and activity
    diet_type VARCHAR(50),
    diet_restrictions TEXT,
    activity_level VARCHAR(50),
    mobility_status VARCHAR(50),
    
    -- Discharge information
    discharge_type VARCHAR(50) CHECK (discharge_type IN (
        'home', 'transfer', 'against_medical_advice', 'deceased', 
        'skilled_nursing', 'rehabilitation', 'hospice', 'other'
    )),
    discharge_disposition TEXT,
    discharge_diagnosis TEXT,
    discharge_diagnosis_icd10 VARCHAR(20),
    discharge_summary TEXT,
    discharge_instructions TEXT,
    follow_up_appointments JSONB DEFAULT '[]'::jsonb,
    discharge_medications JSONB DEFAULT '[]'::jsonb,
    discharged_by UUID REFERENCES staff(id),
    
    -- Insurance/billing
    insurance_verified BOOLEAN DEFAULT FALSE,
    pre_authorization_number VARCHAR(100),
    estimated_cost DECIMAL(12,2),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- Add current_admission_id column to beds table if it doesn't exist (for existing beds tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'beds' AND column_name = 'current_admission_id'
    ) THEN
        ALTER TABLE beds ADD COLUMN current_admission_id UUID;
    END IF;
END $$;

-- Add foreign key constraint to beds table now that admissions exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_beds_current_admission' AND table_name = 'beds'
    ) THEN
        ALTER TABLE beds 
        ADD CONSTRAINT fk_beds_current_admission 
        FOREIGN KEY (current_admission_id) REFERENCES admissions(id);
    END IF;
END $$;

-- Ward Round Notes - documentation from daily ward rounds
CREATE TABLE IF NOT EXISTS ward_round_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES visits(id), -- REQUIRED: Every ward round note must be tied to an encounter
    round_date DATE NOT NULL DEFAULT CURRENT_DATE,
    round_type VARCHAR(50) NOT NULL CHECK (round_type IN (
        'morning', 'evening', 'night', 'consultant', 'multidisciplinary', 'teaching'
    )),
    
    -- Clinical assessment
    subjective_notes TEXT, -- Patient complaints, overnight events
    objective_findings TEXT, -- Examination findings
    vital_signs JSONB, -- Snapshot of vitals during round
    assessment TEXT, -- Clinical assessment
    plan TEXT, -- Treatment plan updates
    
    -- Orders and instructions
    new_orders JSONB DEFAULT '[]'::jsonb,
    discontinued_orders JSONB DEFAULT '[]'::jsonb,
    nursing_instructions TEXT,
    
    -- Status updates
    patient_condition VARCHAR(30),
    estimated_discharge_date DATE,
    discharge_planning_notes TEXT,
    
    -- Participants
    attending_physician_id UUID REFERENCES staff(id),
    participants JSONB DEFAULT '[]'::jsonb, -- Array of {staff_id, role}
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- Bed Transfers - tracks patient movement between beds/wards
CREATE TABLE IF NOT EXISTS bed_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    
    -- Source
    from_ward_id UUID REFERENCES wards(id),
    from_bed_id UUID REFERENCES beds(id),
    
    -- Destination
    to_ward_id UUID NOT NULL REFERENCES wards(id),
    to_bed_id UUID NOT NULL REFERENCES beds(id),
    
    -- Transfer details
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transfer_reason VARCHAR(100) NOT NULL CHECK (transfer_reason IN (
        'clinical_upgrade', 'clinical_downgrade', 'bed_availability',
        'patient_request', 'isolation_required', 'isolation_cleared',
        'procedure', 'surgery', 'discharge_preparation', 'other'
    )),
    transfer_reason_details TEXT,
    clinical_status_at_transfer VARCHAR(30),
    
    -- Authorization
    authorized_by UUID NOT NULL REFERENCES staff(id),
    performed_by UUID REFERENCES staff(id),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 3: PROCEDURE MANAGEMENT TABLES
-- ============================================================================

-- Procedure Catalogue - master list of available procedures
CREATE TABLE IF NOT EXISTS procedure_catalogue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES facilities(id),
    
    -- Procedure identification
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'surgical', 'diagnostic', 'therapeutic', 'minor', 'major',
        'endoscopy', 'biopsy', 'injection', 'infusion', 'wound_care',
        'cardiovascular', 'orthopedic', 'neurological', 'obstetric', 'other'
    )),
    subcategory VARCHAR(100),
    
    -- Clinical details
    cpt_code VARCHAR(20),
    icd10_pcs_code VARCHAR(20),
    body_system VARCHAR(100),
    requires_anesthesia BOOLEAN DEFAULT FALSE,
    anesthesia_type VARCHAR(50),
    typical_duration_minutes INTEGER,
    recovery_time_hours INTEGER,
    
    -- Requirements
    requires_consent BOOLEAN DEFAULT TRUE,
    requires_fasting BOOLEAN DEFAULT FALSE,
    fasting_hours INTEGER,
    requires_sedation BOOLEAN DEFAULT FALSE,
    requires_admission BOOLEAN DEFAULT FALSE,
    pre_procedure_instructions TEXT,
    post_procedure_instructions TEXT,
    
    -- Resources
    required_equipment JSONB DEFAULT '[]'::jsonb,
    required_supplies JSONB DEFAULT '[]'::jsonb,
    required_staff JSONB DEFAULT '[]'::jsonb, -- e.g., [{role: "surgeon", count: 1}]
    typical_location VARCHAR(100), -- e.g., "OR", "Procedure Room", "Bedside"
    
    -- Pricing
    base_price DECIMAL(12,2),
    nhis_price DECIMAL(12,2),
    professional_fee DECIMAL(12,2),
    facility_fee DECIMAL(12,2),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- Procedures - actual procedures performed on patients
CREATE TABLE IF NOT EXISTS procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID NOT NULL REFERENCES visits(id), -- REQUIRED: Every procedure must be tied to an encounter
    admission_id UUID REFERENCES admissions(id),
    
    -- Procedure identification
    procedure_number VARCHAR(50) UNIQUE NOT NULL,
    catalogue_id UUID REFERENCES procedure_catalogue(id),
    procedure_name VARCHAR(200) NOT NULL,
    procedure_code VARCHAR(50),
    
    -- Scheduling
    scheduled_date TIMESTAMPTZ,
    scheduled_duration_minutes INTEGER,
    priority VARCHAR(20) NOT NULL DEFAULT 'routine' CHECK (priority IN (
        'emergency', 'urgent', 'routine', 'elective'
    )),
    
    -- Execution
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'pre_op', 'in_progress', 'completed', 
        'cancelled', 'postponed', 'complications'
    )),
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    actual_duration_minutes INTEGER,
    
    -- Location
    location VARCHAR(100),
    room_number VARCHAR(50),
    
    -- Clinical details
    indication TEXT NOT NULL, -- Reason for procedure
    pre_procedure_diagnosis TEXT,
    post_procedure_diagnosis TEXT,
    laterality VARCHAR(20) CHECK (laterality IN ('left', 'right', 'bilateral', 'na')),
    body_site TEXT,
    
    -- Anesthesia
    anesthesia_type VARCHAR(50) CHECK (anesthesia_type IN (
        'none', 'local', 'regional', 'sedation', 'general', 'spinal', 'epidural'
    )),
    anesthesiologist_id UUID REFERENCES staff(id),
    anesthesia_start_time TIMESTAMPTZ,
    anesthesia_end_time TIMESTAMPTZ,
    anesthesia_notes TEXT,
    
    -- Surgical team
    primary_surgeon_id UUID REFERENCES staff(id),
    assistant_surgeons JSONB DEFAULT '[]'::jsonb,
    scrub_nurse_id UUID REFERENCES staff(id),
    circulating_nurse_id UUID REFERENCES staff(id),
    other_staff JSONB DEFAULT '[]'::jsonb,
    
    -- Consent
    consent_obtained BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMPTZ,
    consent_obtained_by UUID REFERENCES staff(id),
    consent_document_id UUID, -- Reference to uploaded consent form
    consent_notes TEXT,
    
    -- Pre-procedure checklist
    pre_op_checklist JSONB DEFAULT '{}'::jsonb,
    fasting_confirmed BOOLEAN,
    allergies_verified BOOLEAN,
    site_marked BOOLEAN,
    blood_products_available BOOLEAN,
    
    -- Procedure notes
    procedure_notes TEXT,
    findings TEXT,
    technique_description TEXT,
    complications TEXT,
    estimated_blood_loss_ml INTEGER,
    specimens_collected JSONB DEFAULT '[]'::jsonb,
    implants_used JSONB DEFAULT '[]'::jsonb,
    
    -- Post-procedure
    post_op_instructions TEXT,
    recovery_location VARCHAR(100),
    recovery_start_time TIMESTAMPTZ,
    recovery_end_time TIMESTAMPTZ,
    discharge_criteria_met BOOLEAN,
    post_op_diagnosis TEXT,
    
    -- Billing
    billable BOOLEAN DEFAULT TRUE,
    billed BOOLEAN DEFAULT FALSE,
    billing_id UUID, -- Reference to billing record
    
    -- Metadata
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES staff(id),
    cancelled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- Procedure Consumables - items used during procedures
CREATE TABLE IF NOT EXISTS procedure_consumables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    
    -- Item details
    item_id UUID REFERENCES inventory_items(id),
    item_name VARCHAR(200) NOT NULL,
    item_code VARCHAR(50),
    category VARCHAR(100),
    
    -- Quantity
    quantity_used DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    
    -- Pricing
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    billable BOOLEAN DEFAULT TRUE,
    
    -- Tracking
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    
    -- Metadata
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES staff(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Wards indexes
CREATE INDEX IF NOT EXISTS idx_wards_facility ON wards(facility_id);
CREATE INDEX IF NOT EXISTS idx_wards_type ON wards(ward_type);
CREATE INDEX IF NOT EXISTS idx_wards_active ON wards(is_active) WHERE is_active = TRUE;

-- Beds indexes
CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_beds_patient ON beds(current_patient_id) WHERE current_patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beds_available ON beds(ward_id, status) WHERE status = 'available';

-- Admissions indexes
CREATE INDEX IF NOT EXISTS idx_admissions_facility ON admissions(facility_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_encounter ON admissions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_admissions_ward ON admissions(current_ward_id);
CREATE INDEX IF NOT EXISTS idx_admissions_bed ON admissions(current_bed_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(admission_status);
CREATE INDEX IF NOT EXISTS idx_admissions_date ON admissions(admission_date);
CREATE INDEX IF NOT EXISTS idx_admissions_active ON admissions(admission_status) 
    WHERE admission_status NOT IN ('discharged', 'transferred', 'deceased');
CREATE INDEX IF NOT EXISTS idx_admissions_attending ON admissions(attending_physician_id);
CREATE INDEX IF NOT EXISTS idx_admissions_number ON admissions(admission_number);

-- Ward round notes indexes
CREATE INDEX IF NOT EXISTS idx_ward_rounds_admission ON ward_round_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_ward_rounds_date ON ward_round_notes(round_date);
CREATE INDEX IF NOT EXISTS idx_ward_rounds_physician ON ward_round_notes(attending_physician_id);

-- Bed transfers indexes
CREATE INDEX IF NOT EXISTS idx_transfers_admission ON bed_transfers(admission_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON bed_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_transfers_from_ward ON bed_transfers(from_ward_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_ward ON bed_transfers(to_ward_id);

-- Procedure catalogue indexes
CREATE INDEX IF NOT EXISTS idx_proc_catalogue_facility ON procedure_catalogue(facility_id);
CREATE INDEX IF NOT EXISTS idx_proc_catalogue_category ON procedure_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_proc_catalogue_code ON procedure_catalogue(code);
CREATE INDEX IF NOT EXISTS idx_proc_catalogue_active ON procedure_catalogue(is_active) WHERE is_active = TRUE;

-- Procedures indexes
CREATE INDEX IF NOT EXISTS idx_procedures_facility ON procedures(facility_id);
CREATE INDEX IF NOT EXISTS idx_procedures_patient ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_encounter ON procedures(encounter_id);
CREATE INDEX IF NOT EXISTS idx_procedures_admission ON procedures(admission_id);
CREATE INDEX IF NOT EXISTS idx_procedures_catalogue ON procedures(catalogue_id);
CREATE INDEX IF NOT EXISTS idx_procedures_status ON procedures(status);
CREATE INDEX IF NOT EXISTS idx_procedures_scheduled ON procedures(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_procedures_surgeon ON procedures(primary_surgeon_id);
CREATE INDEX IF NOT EXISTS idx_procedures_number ON procedures(procedure_number);
CREATE INDEX IF NOT EXISTS idx_procedures_pending ON procedures(status, scheduled_date) 
    WHERE status IN ('scheduled', 'pre_op');

-- Procedure consumables indexes
CREATE INDEX IF NOT EXISTS idx_consumables_procedure ON procedure_consumables(procedure_id);
CREATE INDEX IF NOT EXISTS idx_consumables_item ON procedure_consumables(item_id);

-- ============================================================================
-- SECTION 5: USEFUL VIEWS
-- ============================================================================

-- View: Current ward census
CREATE OR REPLACE VIEW ward_census AS
SELECT 
    w.id AS ward_id,
    w.name AS ward_name,
    w.ward_type,
    w.total_beds,
    w.available_beds,
    w.total_beds - w.available_beds AS occupied_beds,
    ROUND(((w.total_beds - w.available_beds)::DECIMAL / NULLIF(w.total_beds, 0)) * 100, 1) AS occupancy_rate,
    COUNT(a.id) FILTER (WHERE a.admission_status = 'critical') AS critical_patients,
    COUNT(a.id) FILTER (WHERE a.isolation_required = TRUE) AS isolation_patients,
    w.facility_id
FROM wards w
LEFT JOIN admissions a ON a.current_ward_id = w.id 
    AND a.admission_status NOT IN ('discharged', 'transferred', 'deceased')
WHERE w.is_active = TRUE
GROUP BY w.id, w.name, w.ward_type, w.total_beds, w.available_beds, w.facility_id;

-- View: Active admissions with patient and ward details
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
    a.facility_id
FROM admissions a
JOIN patients p ON p.id = a.patient_id
LEFT JOIN wards w ON w.id = a.current_ward_id
LEFT JOIN beds b ON b.id = a.current_bed_id
LEFT JOIN staff s ON s.id = a.attending_physician_id
WHERE a.admission_status NOT IN ('discharged', 'transferred', 'deceased');

-- View: Today's scheduled procedures
CREATE OR REPLACE VIEW todays_procedures AS
SELECT 
    pr.id AS procedure_id,
    pr.procedure_number,
    pr.procedure_name,
    pr.scheduled_date,
    pr.scheduled_duration_minutes,
    pr.priority,
    pr.status,
    pr.location,
    pr.room_number,
    pr.anesthesia_type,
    p.id AS patient_id,
    p.first_name,
    p.surname AS last_name,
    p.emr_number AS hospital_id,
    s.first_name AS surgeon_first_name,
    s.last_name AS surgeon_last_name,
    pr.facility_id
FROM procedures pr
JOIN patients p ON p.id = pr.patient_id
LEFT JOIN staff s ON s.id = pr.primary_surgeon_id
WHERE DATE(pr.scheduled_date) = CURRENT_DATE
    AND pr.status NOT IN ('cancelled', 'completed')
ORDER BY pr.scheduled_date;

-- View: Bed availability by ward
CREATE OR REPLACE VIEW bed_availability AS
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
        WHEN b.status = 'available' THEN NULL
        ELSE p.first_name || ' ' || p.surname
    END AS current_patient_name,
    CASE 
        WHEN b.status = 'available' THEN NULL
        ELSE a.admission_number
    END AS admission_number,
    w.facility_id
FROM beds b
JOIN wards w ON w.id = b.ward_id
LEFT JOIN patients p ON p.id = b.current_patient_id
LEFT JOIN admissions a ON a.id = b.current_admission_id
WHERE w.is_active = TRUE AND b.is_active = TRUE
ORDER BY w.name, b.bed_number;

-- ============================================================================
-- SECTION 6: HELPER FUNCTIONS
-- ============================================================================

-- Function to generate admission number
CREATE OR REPLACE FUNCTION generate_admission_number(facility_code VARCHAR DEFAULT 'ADM')
RETURNS VARCHAR AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
    new_number VARCHAR(50);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(admission_number FROM LENGTH(facility_code) + 6) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM admissions
    WHERE admission_number LIKE facility_code || '-' || year_part || '-%';
    
    new_number := facility_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate procedure number
CREATE OR REPLACE FUNCTION generate_procedure_number(facility_code VARCHAR DEFAULT 'PRC')
RETURNS VARCHAR AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
    new_number VARCHAR(50);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(procedure_number FROM LENGTH(facility_code) + 6) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM procedures
    WHERE procedure_number LIKE facility_code || '-' || year_part || '-%';
    
    new_number := facility_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update ward bed counts
CREATE OR REPLACE FUNCTION update_ward_bed_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the ward's available beds count
    UPDATE wards
    SET 
        total_beds = (SELECT COUNT(*) FROM beds WHERE ward_id = COALESCE(NEW.ward_id, OLD.ward_id) AND is_active = TRUE),
        available_beds = (SELECT COUNT(*) FROM beds WHERE ward_id = COALESCE(NEW.ward_id, OLD.ward_id) AND is_active = TRUE AND status = 'available'),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.ward_id, OLD.ward_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to handle bed assignment on admission
CREATE OR REPLACE FUNCTION assign_bed_on_admission()
RETURNS TRIGGER AS $$
BEGIN
    -- If a bed is being assigned
    IF NEW.current_bed_id IS NOT NULL AND (OLD.current_bed_id IS NULL OR NEW.current_bed_id != OLD.current_bed_id) THEN
        -- Release old bed if there was one
        IF OLD.current_bed_id IS NOT NULL THEN
            UPDATE beds 
            SET status = 'cleaning', 
                current_patient_id = NULL, 
                current_admission_id = NULL,
                updated_at = NOW()
            WHERE id = OLD.current_bed_id;
        END IF;
        
        -- Assign new bed
        UPDATE beds 
        SET status = 'occupied', 
            current_patient_id = NEW.patient_id, 
            current_admission_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.current_bed_id;
    END IF;
    
    -- If admission is being discharged, release the bed
    IF NEW.admission_status IN ('discharged', 'transferred', 'deceased') 
       AND OLD.admission_status NOT IN ('discharged', 'transferred', 'deceased') THEN
        UPDATE beds 
        SET status = 'cleaning', 
            current_patient_id = NULL, 
            current_admission_id = NULL,
            updated_at = NOW()
        WHERE id = NEW.current_bed_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers (idempotent)
DROP TRIGGER IF EXISTS trigger_update_ward_bed_counts ON beds;
CREATE TRIGGER trigger_update_ward_bed_counts
AFTER INSERT OR UPDATE OR DELETE ON beds
FOR EACH ROW EXECUTE FUNCTION update_ward_bed_counts();

DROP TRIGGER IF EXISTS trigger_assign_bed_on_admission ON admissions;
CREATE TRIGGER trigger_assign_bed_on_admission
AFTER INSERT OR UPDATE ON admissions
FOR EACH ROW EXECUTE FUNCTION assign_bed_on_admission();

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ward_round_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_consumables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view wards in their facility" ON wards;
DROP POLICY IF EXISTS "Admins can manage wards" ON wards;
DROP POLICY IF EXISTS "Users can view beds in their facility" ON beds;
DROP POLICY IF EXISTS "Nurses and admins can manage beds" ON beds;
DROP POLICY IF EXISTS "Clinical staff can view admissions" ON admissions;
DROP POLICY IF EXISTS "Doctors and nurses can manage admissions" ON admissions;
DROP POLICY IF EXISTS "Clinical staff can view ward round notes" ON ward_round_notes;
DROP POLICY IF EXISTS "Doctors can manage ward round notes" ON ward_round_notes;
DROP POLICY IF EXISTS "Clinical staff can view transfers" ON bed_transfers;
DROP POLICY IF EXISTS "Nurses and admins can manage transfers" ON bed_transfers;
DROP POLICY IF EXISTS "All staff can view procedure catalogue" ON procedure_catalogue;
DROP POLICY IF EXISTS "Admins can manage procedure catalogue" ON procedure_catalogue;
DROP POLICY IF EXISTS "Clinical staff can view procedures" ON procedures;
DROP POLICY IF EXISTS "Doctors can manage procedures" ON procedures;
DROP POLICY IF EXISTS "Clinical staff can view consumables" ON procedure_consumables;
DROP POLICY IF EXISTS "Clinical staff can manage consumables" ON procedure_consumables;

-- Wards policies
CREATE POLICY "Users can view wards in their facility" ON wards
    FOR SELECT USING (
        facility_id IN (
            SELECT facility_id FROM staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage wards" ON wards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND facility_id = wards.facility_id
        )
    );

-- Beds policies
CREATE POLICY "Users can view beds in their facility" ON beds
    FOR SELECT USING (
        ward_id IN (
            SELECT id FROM wards WHERE facility_id IN (
                SELECT facility_id FROM staff WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Nurses and admins can manage beds" ON beds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN wards w ON w.facility_id = s.facility_id
            WHERE s.user_id = auth.uid() 
            AND s.role IN ('admin', 'super_admin', 'nurse')
            AND w.id = beds.ward_id
        )
    );

-- Admissions policies
CREATE POLICY "Clinical staff can view admissions" ON admissions
    FOR SELECT USING (
        facility_id IN (
            SELECT facility_id FROM staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors and nurses can manage admissions" ON admissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'doctor', 'nurse')
            AND facility_id = admissions.facility_id
        )
    );

-- Ward round notes policies
CREATE POLICY "Clinical staff can view ward round notes" ON ward_round_notes
    FOR SELECT USING (
        admission_id IN (
            SELECT id FROM admissions WHERE facility_id IN (
                SELECT facility_id FROM staff WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Doctors can manage ward round notes" ON ward_round_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN admissions a ON a.facility_id = s.facility_id
            WHERE s.user_id = auth.uid() 
            AND s.role IN ('admin', 'super_admin', 'doctor')
            AND a.id = ward_round_notes.admission_id
        )
    );

-- Bed transfers policies
CREATE POLICY "Clinical staff can view transfers" ON bed_transfers
    FOR SELECT USING (
        admission_id IN (
            SELECT id FROM admissions WHERE facility_id IN (
                SELECT facility_id FROM staff WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Nurses and admins can manage transfers" ON bed_transfers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN admissions a ON a.facility_id = s.facility_id
            WHERE s.user_id = auth.uid() 
            AND s.role IN ('admin', 'super_admin', 'nurse')
            AND a.id = bed_transfers.admission_id
        )
    );

-- Procedure catalogue policies
CREATE POLICY "All staff can view procedure catalogue" ON procedure_catalogue
    FOR SELECT USING (
        facility_id IS NULL OR facility_id IN (
            SELECT facility_id FROM staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage procedure catalogue" ON procedure_catalogue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Procedures policies
CREATE POLICY "Clinical staff can view procedures" ON procedures
    FOR SELECT USING (
        facility_id IN (
            SELECT facility_id FROM staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can manage procedures" ON procedures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'doctor')
            AND facility_id = procedures.facility_id
        )
    );

-- Procedure consumables policies
CREATE POLICY "Clinical staff can view consumables" ON procedure_consumables
    FOR SELECT USING (
        procedure_id IN (
            SELECT id FROM procedures WHERE facility_id IN (
                SELECT facility_id FROM staff WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Clinical staff can manage consumables" ON procedure_consumables
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN procedures p ON p.facility_id = s.facility_id
            WHERE s.user_id = auth.uid() 
            AND s.role IN ('admin', 'super_admin', 'doctor', 'nurse')
            AND p.id = procedure_consumables.procedure_id
        )
    );

-- ============================================================================
-- SECTION 8: SEED DATA FOR PROCEDURE CATALOGUE
-- ============================================================================

-- Insert common procedures into the catalogue
INSERT INTO procedure_catalogue (code, name, description, category, requires_anesthesia, anesthesia_type, typical_duration_minutes, requires_consent, base_price) VALUES
-- Minor procedures
('PRC001', 'Wound Suturing', 'Closure of wounds using sutures', 'minor', TRUE, 'local', 30, TRUE, 150.00),
('PRC002', 'Abscess Incision and Drainage', 'Surgical drainage of abscess', 'minor', TRUE, 'local', 45, TRUE, 200.00),
('PRC003', 'Foreign Body Removal', 'Removal of foreign objects from wounds', 'minor', TRUE, 'local', 30, TRUE, 175.00),
('PRC004', 'Wound Debridement', 'Removal of dead tissue from wounds', 'wound_care', TRUE, 'local', 60, TRUE, 300.00),
('PRC005', 'Skin Biopsy', 'Removal of skin sample for testing', 'biopsy', TRUE, 'local', 20, TRUE, 250.00),

-- Diagnostic procedures
('PRC010', 'Lumbar Puncture', 'Spinal tap for CSF analysis', 'diagnostic', TRUE, 'local', 45, TRUE, 400.00),
('PRC011', 'Bone Marrow Aspiration', 'Extraction of bone marrow sample', 'diagnostic', TRUE, 'local', 30, TRUE, 500.00),
('PRC012', 'Thoracentesis', 'Removal of fluid from pleural space', 'diagnostic', TRUE, 'local', 45, TRUE, 450.00),
('PRC013', 'Paracentesis', 'Removal of fluid from abdominal cavity', 'diagnostic', TRUE, 'local', 45, TRUE, 400.00),
('PRC014', 'Arthrocentesis', 'Joint fluid aspiration', 'diagnostic', TRUE, 'local', 30, TRUE, 350.00),

-- Endoscopy
('PRC020', 'Upper GI Endoscopy', 'Examination of upper digestive tract', 'endoscopy', TRUE, 'sedation', 30, TRUE, 800.00),
('PRC021', 'Colonoscopy', 'Examination of colon', 'endoscopy', TRUE, 'sedation', 60, TRUE, 1000.00),
('PRC022', 'Bronchoscopy', 'Examination of airways', 'endoscopy', TRUE, 'sedation', 45, TRUE, 900.00),
('PRC023', 'Cystoscopy', 'Examination of bladder', 'endoscopy', TRUE, 'local', 30, TRUE, 700.00),

-- Cardiovascular
('PRC030', 'Central Line Insertion', 'Placement of central venous catheter', 'cardiovascular', TRUE, 'local', 45, TRUE, 600.00),
('PRC031', 'Arterial Line Insertion', 'Placement of arterial catheter', 'cardiovascular', TRUE, 'local', 30, TRUE, 400.00),
('PRC032', 'Temporary Pacemaker Insertion', 'Emergency pacing wire placement', 'cardiovascular', TRUE, 'local', 60, TRUE, 1500.00),

-- Orthopedic
('PRC040', 'Closed Fracture Reduction', 'Non-surgical fracture alignment', 'orthopedic', TRUE, 'sedation', 45, TRUE, 500.00),
('PRC041', 'Joint Injection', 'Intra-articular injection', 'injection', TRUE, 'local', 15, TRUE, 200.00),
('PRC042', 'Cast Application', 'Immobilization with plaster/fiberglass', 'orthopedic', FALSE, NULL, 30, TRUE, 150.00),

-- Surgical
('PRC050', 'Appendectomy', 'Surgical removal of appendix', 'surgical', TRUE, 'general', 90, TRUE, 3000.00),
('PRC051', 'Cholecystectomy', 'Surgical removal of gallbladder', 'surgical', TRUE, 'general', 120, TRUE, 4000.00),
('PRC052', 'Hernia Repair', 'Surgical repair of hernia', 'surgical', TRUE, 'general', 90, TRUE, 3500.00),
('PRC053', 'Cesarean Section', 'Surgical delivery of baby', 'obstetric', TRUE, 'spinal', 60, TRUE, 5000.00),
('PRC054', 'Hysterectomy', 'Surgical removal of uterus', 'surgical', TRUE, 'general', 180, TRUE, 6000.00)

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SECTION 9: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE wards IS 'Hospital wards/units for in-patient care';
COMMENT ON TABLE beds IS 'Individual beds within hospital wards';
COMMENT ON TABLE admissions IS 'Patient hospital admissions tracking';
COMMENT ON TABLE ward_round_notes IS 'Documentation from daily ward rounds';
COMMENT ON TABLE bed_transfers IS 'Patient bed/ward transfer history';
COMMENT ON TABLE procedure_catalogue IS 'Master list of available procedures';
COMMENT ON TABLE procedures IS 'Procedures performed on patients';
COMMENT ON TABLE procedure_consumables IS 'Items used during procedures';

COMMENT ON COLUMN admissions.admission_status IS 'Current status: admitted, under_observation, critical, stable, improving, discharged, transferred, deceased, absconded';
COMMENT ON COLUMN admissions.code_status IS 'Resuscitation preference: full_code, dnr, dni, dnr_dni, comfort_care';
COMMENT ON COLUMN procedures.status IS 'Procedure status: scheduled, pre_op, in_progress, completed, cancelled, postponed, complications';
COMMENT ON COLUMN procedures.priority IS 'Urgency: emergency, urgent, routine, elective';
