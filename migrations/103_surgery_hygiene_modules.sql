-- ============================================================================
-- Migration: 103_surgery_hygiene_modules.sql
-- Description: Surgery/Theatre and Hygiene/Infection Control Modules
-- Date: 2026-02-03
-- 
-- This migration creates comprehensive tables for:
-- 1. Surgery/Theatre management (major operative interventions)
-- 2. Hygiene/Infection Control (nursing-driven care activities)
-- 
-- Both modules are ENCOUNTER-CENTRIC - all records must reference an encounter
-- ============================================================================

-- ============================================================================
-- SECTION 1: SURGERY ENUMS
-- ============================================================================

-- Surgery status state machine
DO $$ BEGIN
    CREATE TYPE surgery_status AS ENUM (
        'Planned', 'Pre_Op', 'In_Theatre', 'Recovery', 
        'Completed', 'Cancelled', 'Complicated'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ASA Physical Status Classification
DO $$ BEGIN
    CREATE TYPE asa_classification AS ENUM (
        'ASA_I', 'ASA_II', 'ASA_III', 'ASA_IV', 'ASA_V', 'ASA_VI'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Anesthesia types
DO $$ BEGIN
    CREATE TYPE surgery_anesthesia_type AS ENUM (
        'General', 'Regional', 'Spinal', 'Epidural', 
        'Local', 'Sedation', 'Combined', 'None'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Wound classification (CDC)
DO $$ BEGIN
    CREATE TYPE wound_classification AS ENUM (
        'Clean', 'Clean_Contaminated', 'Contaminated', 'Dirty_Infected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Consent type
DO $$ BEGIN
    CREATE TYPE consent_type AS ENUM (
        'Written', 'Verbal', 'Emergency', 'Guardian'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Post-surgery disposition
DO $$ BEGIN
    CREATE TYPE surgery_disposition AS ENUM (
        'Ward', 'ICU', 'HDU', 'PACU', 'Day_Case_Discharge', 'Morgue'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Theatre room types
DO $$ BEGIN
    CREATE TYPE theatre_room_type AS ENUM (
        'General', 'Cardiac', 'Neuro', 'Orthopedic', 'Obstetric',
        'Ophthalmic', 'ENT', 'Minor', 'Emergency', 'Hybrid'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Theatre room status
DO $$ BEGIN
    CREATE TYPE theatre_room_status AS ENUM (
        'Available', 'In_Use', 'Cleaning', 'Maintenance', 'Reserved'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 2: HYGIENE ENUMS
-- ============================================================================

-- Hygiene activity categories
DO $$ BEGIN
    CREATE TYPE hygiene_activity_category AS ENUM (
        'BATH', 'ORAL', 'WOUND', 'CATH', 'LINE', 'DRAIN',
        'SKIN', 'LINEN', 'ISOL', 'HAND', 'DEVICE', 'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Patient tolerance levels
DO $$ BEGIN
    CREATE TYPE patient_tolerance AS ENUM (
        'Good', 'Fair', 'Poor', 'Refused', 'Unable_To_Assess'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Hygiene record status
DO $$ BEGIN
    CREATE TYPE hygiene_status AS ENUM (
        'Completed', 'Refused', 'Missed', 'Deferred', 'In_Progress'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Missed care reasons
DO $$ BEGIN
    CREATE TYPE missed_care_reason AS ENUM (
        'Patient_Refused', 'Patient_Unstable', 'Off_Ward',
        'Staffing', 'Emergency', 'Equipment_Issue', 'Other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Infection types
DO $$ BEGIN
    CREATE TYPE infection_type AS ENUM (
        'SSI', 'CAUTI', 'CLABSI', 'VAP', 'CDI', 'MRSA', 'Other_HAI'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Infection severity
DO $$ BEGIN
    CREATE TYPE infection_severity AS ENUM (
        'Mild', 'Moderate', 'Severe'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Infection outcome
DO $$ BEGIN
    CREATE TYPE infection_outcome AS ENUM (
        'Resolved', 'Ongoing', 'Worsened', 'Death_Related', 'Death_Unrelated'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 3: THEATRE ROOMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS theatre_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    
    room_code VARCHAR(20) NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    room_type theatre_room_type NOT NULL DEFAULT 'General',
    
    -- Capacity and level
    capacity_level VARCHAR(20) DEFAULT 'Standard',
    
    -- Equipment (stored as JSONB for flexibility)
    standard_equipment JSONB DEFAULT '[]'::jsonb,
    special_equipment JSONB DEFAULT '[]'::jsonb,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT TRUE,
    current_status theatre_room_status DEFAULT 'Available',
    current_surgery_id UUID,
    
    -- Location
    floor VARCHAR(20),
    building VARCHAR(100),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id),
    
    UNIQUE(facility_id, room_code)
);

-- ============================================================================
-- SECTION 4: SURGERIES TABLE (Main Surgery Record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS surgeries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surgery_number VARCHAR(50) NOT NULL,
    
    -- Core references (ENCOUNTER-CENTRIC - MANDATORY)
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    admission_id UUID REFERENCES admissions(id),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    
    -- Procedure information
    procedure_catalogue_id UUID REFERENCES procedure_catalogue(id),
    primary_procedure VARCHAR(255) NOT NULL,
    secondary_procedures JSONB DEFAULT '[]'::jsonb,
    laterality VARCHAR(20) CHECK (laterality IN ('Left', 'Right', 'Bilateral', 'NA')),
    body_site TEXT,
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    scheduled_duration_minutes INTEGER,
    theatre_room_id UUID REFERENCES theatre_rooms(id),
    theatre_room VARCHAR(50),
    priority VARCHAR(20) NOT NULL DEFAULT 'Routine' 
        CHECK (priority IN ('Emergency', 'Urgent', 'Routine', 'Elective')),
    
    -- Clinical request linkage
    clinical_request_id UUID REFERENCES clinical_requests(id),
    
    -- NHIS/Insurance authorization
    requires_nhis_approval BOOLEAN DEFAULT FALSE,
    nhis_approval_id UUID REFERENCES nhis_approvals(id),
    nhis_authorization_code VARCHAR(100),
    nhis_authorization_expiry DATE,
    
    -- Clinical indication
    indication TEXT NOT NULL,
    pre_op_diagnosis TEXT,
    post_op_diagnosis TEXT,
    icd10_codes JSONB DEFAULT '[]'::jsonb,
    
    -- Status tracking (state machine)
    status surgery_status NOT NULL DEFAULT 'Planned',
    
    -- Timeline tracking
    theatre_entry_time TIMESTAMPTZ,
    anesthesia_start_time TIMESTAMPTZ,
    incision_time TIMESTAMPTZ,
    closure_time TIMESTAMPTZ,
    anesthesia_end_time TIMESTAMPTZ,
    theatre_exit_time TIMESTAMPTZ,
    
    -- Surgical team
    primary_surgeon_id UUID NOT NULL REFERENCES staff(id),
    assistant_surgeon_ids JSONB DEFAULT '[]'::jsonb,
    anesthetist_id UUID REFERENCES staff(id),
    anesthesia_nurse_id UUID REFERENCES staff(id),
    scrub_nurse_id UUID REFERENCES staff(id),
    circulating_nurse_id UUID REFERENCES staff(id),
    other_staff JSONB DEFAULT '[]'::jsonb,
    
    -- Consent documentation
    consent_obtained BOOLEAN DEFAULT FALSE,
    consent_type consent_type,
    consent_date TIMESTAMPTZ,
    consent_obtained_by UUID REFERENCES staff(id),
    consent_witness_id UUID REFERENCES staff(id),
    consent_document_url TEXT,
    consent_notes TEXT,
    
    -- Pre-op checklist (WHO Safe Surgery)
    preop_checklist JSONB DEFAULT '{
        "sign_in": {},
        "time_out": {},
        "sign_out": {}
    }'::jsonb,
    preop_checklist_completed BOOLEAN DEFAULT FALSE,
    preop_checklist_completed_at TIMESTAMPTZ,
    preop_checklist_completed_by UUID REFERENCES staff(id),
    
    -- Intra-operative details
    patient_position VARCHAR(100),
    skin_prep VARCHAR(100),
    approach TEXT,
    incision TEXT,
    findings TEXT,
    procedure_details TEXT,
    technique_description TEXT,
    estimated_blood_loss_ml INTEGER,
    blood_products_given JSONB DEFAULT '[]'::jsonb,
    specimens_collected JSONB DEFAULT '[]'::jsonb,
    implants_used JSONB DEFAULT '[]'::jsonb,
    drains_placed JSONB DEFAULT '[]'::jsonb,
    closure_technique TEXT,
    wound_classification wound_classification,
    intraop_complications TEXT,
    
    -- Post-operative
    recovery_location VARCHAR(100),
    recovery_start_time TIMESTAMPTZ,
    recovery_end_time TIMESTAMPTZ,
    disposition surgery_disposition,
    transfer_ward_id UUID REFERENCES wards(id),
    postop_instructions TEXT,
    postop_complications TEXT,
    
    -- Sign-off (multi-signature - locks record when complete)
    surgeon_signoff_by UUID REFERENCES staff(id),
    surgeon_signoff_at TIMESTAMPTZ,
    anesthetist_signoff_by UUID REFERENCES staff(id),
    anesthetist_signoff_at TIMESTAMPTZ,
    nurse_signoff_by UUID REFERENCES staff(id),
    nurse_signoff_at TIMESTAMPTZ,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    
    -- Billing integration
    billable BOOLEAN DEFAULT TRUE,
    billing_order_id UUID REFERENCES billing_orders(id),
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES staff(id),
    cancellation_reason TEXT,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id),
    
    -- Unique surgery number per facility
    UNIQUE(facility_id, surgery_number)
);

-- Add foreign key for theatre_rooms current_surgery_id
ALTER TABLE theatre_rooms 
    ADD CONSTRAINT fk_theatre_rooms_surgery 
    FOREIGN KEY (current_surgery_id) REFERENCES surgeries(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 5: SURGERY PRE-OP ASSESSMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS surgery_preop_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
    
    -- Assessment details
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assessed_by UUID NOT NULL REFERENCES staff(id),
    
    -- ASA Classification
    asa_classification asa_classification NOT NULL,
    asa_notes TEXT,
    
    -- Airway assessment
    airway_assessment JSONB DEFAULT '{}'::jsonb,
    mallampati_class VARCHAR(10),
    neck_mobility VARCHAR(50),
    mouth_opening VARCHAR(50),
    dentition_notes TEXT,
    
    -- Risk assessments
    cardiac_risk TEXT,
    pulmonary_risk TEXT,
    renal_risk TEXT,
    hepatic_risk TEXT,
    bleeding_risk TEXT,
    dvt_risk VARCHAR(20),
    
    -- Verification
    allergies_verified BOOLEAN DEFAULT FALSE,
    allergies_snapshot JSONB DEFAULT '[]'::jsonb,
    medications_reviewed BOOLEAN DEFAULT FALSE,
    current_medications JSONB DEFAULT '[]'::jsonb,
    fasting_status TEXT,
    fasting_hours INTEGER,
    
    -- Investigations review
    investigations_reviewed JSONB DEFAULT '[]'::jsonb,
    pending_investigations TEXT,
    
    -- Blood preparation
    blood_type VARCHAR(10),
    crossmatch_ordered BOOLEAN DEFAULT FALSE,
    blood_units_ordered INTEGER DEFAULT 0,
    
    -- Final clearance
    fit_for_surgery BOOLEAN,
    clearance_notes TEXT,
    special_considerations TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One assessment per surgery
    UNIQUE(surgery_id)
);

-- ============================================================================
-- SECTION 6: SURGERY ANESTHESIA RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS surgery_anesthesia_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
    
    -- Anesthetist
    anesthetist_id UUID NOT NULL REFERENCES staff(id),
    anesthesia_nurse_id UUID REFERENCES staff(id),
    
    -- Anesthesia type and technique
    anesthesia_type surgery_anesthesia_type NOT NULL,
    anesthesia_technique TEXT,
    
    -- Airway management
    airway_management VARCHAR(50),
    tube_size VARCHAR(20),
    intubation_attempts INTEGER,
    intubation_difficulty TEXT,
    
    -- Medications administered
    premedication JSONB DEFAULT '[]'::jsonb,
    induction_agents JSONB DEFAULT '[]'::jsonb,
    maintenance_agents JSONB DEFAULT '[]'::jsonb,
    muscle_relaxants JSONB DEFAULT '[]'::jsonb,
    reversal_agents JSONB DEFAULT '[]'::jsonb,
    other_medications JSONB DEFAULT '[]'::jsonb,
    
    -- Monitoring
    monitoring_used JSONB DEFAULT '[]'::jsonb,
    
    -- Intraoperative record
    vital_signs_log JSONB DEFAULT '[]'::jsonb,
    fluids_given JSONB DEFAULT '[]'::jsonb,
    urine_output_ml INTEGER,
    
    -- Events and complications
    intraop_events TEXT,
    complications TEXT,
    
    -- Recovery scoring (Aldrete)
    aldrete_score_initial INTEGER CHECK (aldrete_score_initial BETWEEN 0 AND 10),
    aldrete_score_discharge INTEGER CHECK (aldrete_score_discharge BETWEEN 0 AND 10),
    recovery_notes TEXT,
    
    -- Sign-off
    signed_off BOOLEAN DEFAULT FALSE,
    signed_off_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES staff(id),
    
    -- One anesthesia record per surgery
    UNIQUE(surgery_id)
);

-- ============================================================================
-- SECTION 7: SURGERY CONSUMABLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS surgery_consumables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
    
    -- Item identification
    inventory_item_id UUID REFERENCES inventory_items(id),
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(50),
    category VARCHAR(100),
    
    -- Quantity used
    quantity_used DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50),
    
    -- Tracking
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    
    -- Pricing
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    billable BOOLEAN DEFAULT TRUE,
    
    -- Implant tracking
    is_implant BOOLEAN DEFAULT FALSE,
    implant_details JSONB,
    
    -- Audit
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID NOT NULL REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 8: THEATRE SCHEDULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS theatre_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theatre_room_id UUID NOT NULL REFERENCES theatre_rooms(id) ON DELETE CASCADE,
    surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
    
    -- Schedule details
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status
    schedule_status VARCHAR(30) DEFAULT 'Scheduled' 
        CHECK (schedule_status IN ('Scheduled', 'Confirmed', 'In_Progress', 'Completed', 'Cancelled', 'Delayed')),
    
    -- Staff assignments for the slot
    primary_surgeon_id UUID REFERENCES staff(id),
    anesthetist_id UUID REFERENCES staff(id),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

-- Add exclusion constraint to prevent overlapping schedules
-- (Requires btree_gist extension which is already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'theatre_schedules_no_overlap'
    ) THEN
        ALTER TABLE theatre_schedules ADD CONSTRAINT theatre_schedules_no_overlap
        EXCLUDE USING gist (
            theatre_room_id WITH =,
            tsrange(
                (scheduled_date + start_time)::timestamp,
                (scheduled_date + end_time)::timestamp
            ) WITH &&
        ) WHERE (schedule_status NOT IN ('Cancelled'));
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create exclusion constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- SECTION 9: HYGIENE ACTIVITY CATALOGUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hygiene_activity_catalogue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Activity classification
    category hygiene_activity_category NOT NULL,
    activity_code VARCHAR(50) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scheduling defaults
    default_frequency VARCHAR(50),
    frequency_hours INTEGER,
    
    -- Requirements
    requires_two_staff BOOLEAN DEFAULT FALSE,
    requires_supplies JSONB DEFAULT '[]'::jsonb,
    
    -- Clinical flags
    triggers_infection_alert BOOLEAN DEFAULT FALSE,
    requires_documentation BOOLEAN DEFAULT TRUE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(activity_code)
);

-- ============================================================================
-- SECTION 10: HYGIENE CARE RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hygiene_care_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core references (ENCOUNTER-CENTRIC - MANDATORY)
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    admission_id UUID REFERENCES admissions(id),
    
    -- Location context
    ward_id UUID REFERENCES wards(id),
    bed_id UUID REFERENCES beds(id),
    
    -- Activity details
    activity_catalogue_id UUID REFERENCES hygiene_activity_catalogue(id),
    activity_category hygiene_activity_category NOT NULL,
    activity_code VARCHAR(50) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    
    -- Timing
    scheduled_time TIMESTAMPTZ,
    performed_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER,
    shift VARCHAR(20) CHECK (shift IN ('Morning', 'Afternoon', 'Night')),
    
    -- Performers
    performed_by UUID NOT NULL REFERENCES staff(id),
    assisted_by UUID REFERENCES staff(id),
    
    -- Patient response
    patient_tolerance patient_tolerance NOT NULL DEFAULT 'Good',
    patient_response TEXT,
    
    -- Clinical findings
    findings TEXT,
    complications TEXT,
    requires_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    
    -- Infection risk tracking
    infection_risk_flags JSONB DEFAULT '{}'::jsonb,
    
    -- Linked records (cross-module integration)
    linked_surgery_id UUID REFERENCES surgeries(id),
    linked_wound_id UUID,
    linked_device_type VARCHAR(50),
    
    -- Status tracking
    status hygiene_status NOT NULL DEFAULT 'Completed',
    missed_reason missed_care_reason,
    missed_reason_details TEXT,
    deferred_to TIMESTAMPTZ,
    
    -- Supervisor review
    supervisor_reviewed BOOLEAN DEFAULT FALSE,
    supervisor_id UUID REFERENCES staff(id),
    supervisor_reviewed_at TIMESTAMPTZ,
    supervisor_notes TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 11: HYGIENE CARE SCHEDULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hygiene_care_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core references
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    admission_id UUID REFERENCES admissions(id),
    
    -- Activity
    activity_catalogue_id UUID REFERENCES hygiene_activity_catalogue(id),
    activity_code VARCHAR(50) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    
    -- Schedule configuration
    frequency VARCHAR(50) NOT NULL,
    frequency_hours INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    next_due TIMESTAMPTZ,
    
    -- Linked records
    linked_surgery_id UUID REFERENCES surgeries(id),
    linked_device_type VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    paused_reason TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 12: INFECTION SURVEILLANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS infection_surveillance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core references (ENCOUNTER-CENTRIC)
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    admission_id UUID REFERENCES admissions(id),
    
    -- Infection classification
    infection_type infection_type NOT NULL,
    
    -- Related records
    surgery_id UUID REFERENCES surgeries(id),
    hygiene_record_id UUID REFERENCES hygiene_care_records(id),
    
    -- Detection details
    detected_date DATE NOT NULL,
    detected_by UUID NOT NULL REFERENCES staff(id),
    detection_method VARCHAR(100),
    
    -- Clinical details
    symptoms TEXT,
    culture_results TEXT,
    organism VARCHAR(255),
    sensitivity_pattern TEXT,
    
    -- Classification
    severity infection_severity,
    device_related BOOLEAN DEFAULT FALSE,
    device_type VARCHAR(100),
    device_days INTEGER,
    
    -- Action and treatment
    action_taken TEXT,
    treatment_initiated BOOLEAN DEFAULT FALSE,
    treatment_notes TEXT,
    
    -- Outcome tracking
    outcome infection_outcome,
    resolution_date DATE,
    
    -- Reporting
    reported_to_ic BOOLEAN DEFAULT FALSE,
    reported_date DATE,
    ic_officer_id UUID REFERENCES staff(id),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 13: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Theatre rooms indexes
CREATE INDEX IF NOT EXISTS idx_theatre_rooms_facility ON theatre_rooms(facility_id);
CREATE INDEX IF NOT EXISTS idx_theatre_rooms_status ON theatre_rooms(current_status);
CREATE INDEX IF NOT EXISTS idx_theatre_rooms_active ON theatre_rooms(is_active) WHERE is_active = TRUE;

-- Surgeries indexes
CREATE INDEX IF NOT EXISTS idx_surgeries_encounter ON surgeries(encounter_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_admission ON surgeries(admission_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_facility ON surgeries(facility_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(status);
CREATE INDEX IF NOT EXISTS idx_surgeries_scheduled ON surgeries(scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_surgeries_surgeon ON surgeries(primary_surgeon_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_number ON surgeries(surgery_number);
CREATE INDEX IF NOT EXISTS idx_surgeries_pending ON surgeries(status) WHERE status IN ('Planned', 'Pre_Op');
CREATE INDEX IF NOT EXISTS idx_surgeries_nhis ON surgeries(nhis_approval_id) WHERE requires_nhis_approval = TRUE;
CREATE INDEX IF NOT EXISTS idx_surgeries_locked ON surgeries(is_locked) WHERE is_locked = FALSE;
CREATE INDEX IF NOT EXISTS idx_surgeries_theatre ON surgeries(theatre_room_id);

-- Preop assessments indexes
CREATE INDEX IF NOT EXISTS idx_surgery_preop_surgery ON surgery_preop_assessments(surgery_id);
CREATE INDEX IF NOT EXISTS idx_surgery_preop_assessor ON surgery_preop_assessments(assessed_by);

-- Anesthesia records indexes
CREATE INDEX IF NOT EXISTS idx_surgery_anesthesia_surgery ON surgery_anesthesia_records(surgery_id);
CREATE INDEX IF NOT EXISTS idx_surgery_anesthesia_doctor ON surgery_anesthesia_records(anesthetist_id);

-- Surgery consumables indexes
CREATE INDEX IF NOT EXISTS idx_surgery_consumables_surgery ON surgery_consumables(surgery_id);
CREATE INDEX IF NOT EXISTS idx_surgery_consumables_item ON surgery_consumables(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_surgery_consumables_implant ON surgery_consumables(surgery_id) WHERE is_implant = TRUE;

-- Theatre schedules indexes
CREATE INDEX IF NOT EXISTS idx_theatre_schedules_room ON theatre_schedules(theatre_room_id);
CREATE INDEX IF NOT EXISTS idx_theatre_schedules_date ON theatre_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_theatre_schedules_surgery ON theatre_schedules(surgery_id);
CREATE INDEX IF NOT EXISTS idx_theatre_schedules_status ON theatre_schedules(schedule_status);

-- Hygiene catalogue indexes
CREATE INDEX IF NOT EXISTS idx_hygiene_catalogue_category ON hygiene_activity_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_hygiene_catalogue_code ON hygiene_activity_catalogue(activity_code);
CREATE INDEX IF NOT EXISTS idx_hygiene_catalogue_active ON hygiene_activity_catalogue(is_active) WHERE is_active = TRUE;

-- Hygiene care records indexes
CREATE INDEX IF NOT EXISTS idx_hygiene_records_encounter ON hygiene_care_records(encounter_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_patient ON hygiene_care_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_admission ON hygiene_care_records(admission_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_ward ON hygiene_care_records(ward_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_category ON hygiene_care_records(activity_category);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_status ON hygiene_care_records(status);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_performed ON hygiene_care_records(performed_time DESC);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_nurse ON hygiene_care_records(performed_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_surgery ON hygiene_care_records(linked_surgery_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_missed ON hygiene_care_records(status) WHERE status = 'Missed';
CREATE INDEX IF NOT EXISTS idx_hygiene_records_shift ON hygiene_care_records(shift);

-- Hygiene schedules indexes
CREATE INDEX IF NOT EXISTS idx_hygiene_schedules_encounter ON hygiene_care_schedules(encounter_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_schedules_patient ON hygiene_care_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_schedules_admission ON hygiene_care_schedules(admission_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_schedules_due ON hygiene_care_schedules(next_due) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_hygiene_schedules_active ON hygiene_care_schedules(is_active) WHERE is_active = TRUE;

-- Infection surveillance indexes
CREATE INDEX IF NOT EXISTS idx_infection_encounter ON infection_surveillance(encounter_id);
CREATE INDEX IF NOT EXISTS idx_infection_patient ON infection_surveillance(patient_id);
CREATE INDEX IF NOT EXISTS idx_infection_admission ON infection_surveillance(admission_id);
CREATE INDEX IF NOT EXISTS idx_infection_surgery ON infection_surveillance(surgery_id);
CREATE INDEX IF NOT EXISTS idx_infection_type ON infection_surveillance(infection_type);
CREATE INDEX IF NOT EXISTS idx_infection_date ON infection_surveillance(detected_date DESC);
CREATE INDEX IF NOT EXISTS idx_infection_outcome ON infection_surveillance(outcome);

-- ============================================================================
-- SECTION 14: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE theatre_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_preop_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_anesthesia_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE theatre_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hygiene_activity_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE hygiene_care_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hygiene_care_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE infection_surveillance ENABLE ROW LEVEL SECURITY;

-- Theatre rooms policies
CREATE POLICY theatre_rooms_select ON theatre_rooms FOR SELECT USING (true);
CREATE POLICY theatre_rooms_insert ON theatre_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY theatre_rooms_update ON theatre_rooms FOR UPDATE USING (true);

-- Surgeries policies
CREATE POLICY surgeries_select ON surgeries FOR SELECT USING (true);
CREATE POLICY surgeries_insert ON surgeries FOR INSERT WITH CHECK (true);
CREATE POLICY surgeries_update ON surgeries FOR UPDATE USING (NOT is_locked);

-- Preop assessments policies
CREATE POLICY surgery_preop_select ON surgery_preop_assessments FOR SELECT USING (true);
CREATE POLICY surgery_preop_insert ON surgery_preop_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY surgery_preop_update ON surgery_preop_assessments FOR UPDATE USING (true);

-- Anesthesia records policies
CREATE POLICY surgery_anesthesia_select ON surgery_anesthesia_records FOR SELECT USING (true);
CREATE POLICY surgery_anesthesia_insert ON surgery_anesthesia_records FOR INSERT WITH CHECK (true);
CREATE POLICY surgery_anesthesia_update ON surgery_anesthesia_records FOR UPDATE USING (NOT signed_off);

-- Surgery consumables policies
CREATE POLICY surgery_consumables_select ON surgery_consumables FOR SELECT USING (true);
CREATE POLICY surgery_consumables_insert ON surgery_consumables FOR INSERT WITH CHECK (true);

-- Theatre schedules policies
CREATE POLICY theatre_schedules_select ON theatre_schedules FOR SELECT USING (true);
CREATE POLICY theatre_schedules_insert ON theatre_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY theatre_schedules_update ON theatre_schedules FOR UPDATE USING (true);

-- Hygiene catalogue policies
CREATE POLICY hygiene_catalogue_select ON hygiene_activity_catalogue FOR SELECT USING (true);
CREATE POLICY hygiene_catalogue_insert ON hygiene_activity_catalogue FOR INSERT WITH CHECK (true);
CREATE POLICY hygiene_catalogue_update ON hygiene_activity_catalogue FOR UPDATE USING (true);

-- Hygiene records policies
CREATE POLICY hygiene_records_select ON hygiene_care_records FOR SELECT USING (true);
CREATE POLICY hygiene_records_insert ON hygiene_care_records FOR INSERT WITH CHECK (true);
CREATE POLICY hygiene_records_update ON hygiene_care_records FOR UPDATE USING (true);

-- Hygiene schedules policies
CREATE POLICY hygiene_schedules_select ON hygiene_care_schedules FOR SELECT USING (true);
CREATE POLICY hygiene_schedules_insert ON hygiene_care_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY hygiene_schedules_update ON hygiene_care_schedules FOR UPDATE USING (true);

-- Infection surveillance policies
CREATE POLICY infection_select ON infection_surveillance FOR SELECT USING (true);
CREATE POLICY infection_insert ON infection_surveillance FOR INSERT WITH CHECK (true);
CREATE POLICY infection_update ON infection_surveillance FOR UPDATE USING (true);

-- ============================================================================
-- SECTION 15: TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function: Generate surgery number
CREATE OR REPLACE FUNCTION generate_surgery_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    year_prefix VARCHAR(4);
BEGIN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(surgery_number FROM 'SUR-' || year_prefix || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM surgeries
    WHERE surgery_number LIKE 'SUR-' || year_prefix || '-%';
    
    NEW.surgery_number := 'SUR-' || year_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_surgery_number
    BEFORE INSERT ON surgeries
    FOR EACH ROW
    WHEN (NEW.surgery_number IS NULL OR NEW.surgery_number = '')
    EXECUTE FUNCTION generate_surgery_number();

-- Function: Lock surgery after all sign-offs
CREATE OR REPLACE FUNCTION lock_surgery_after_signoff()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.surgeon_signoff_at IS NOT NULL 
       AND NEW.anesthetist_signoff_at IS NOT NULL 
       AND NEW.nurse_signoff_at IS NOT NULL
       AND NEW.is_locked = FALSE THEN
        NEW.is_locked := TRUE;
        NEW.locked_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_lock_surgery_after_signoff
    BEFORE UPDATE ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION lock_surgery_after_signoff();

-- Function: Update theatre room status
CREATE OR REPLACE FUNCTION update_theatre_room_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Surgery starting - mark room as In_Use
    IF NEW.status = 'In_Theatre' AND (OLD.status IS NULL OR OLD.status != 'In_Theatre') THEN
        UPDATE theatre_rooms 
        SET current_status = 'In_Use', 
            current_surgery_id = NEW.id, 
            updated_at = NOW()
        WHERE id = NEW.theatre_room_id;
    END IF;
    
    -- Surgery ending - mark room for cleaning
    IF NEW.status IN ('Completed', 'Recovery', 'Cancelled') 
       AND OLD.status = 'In_Theatre' THEN
        UPDATE theatre_rooms 
        SET current_status = 'Cleaning', 
            current_surgery_id = NULL, 
            updated_at = NOW()
        WHERE id = OLD.theatre_room_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_theatre_status
    AFTER UPDATE ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION update_theatre_room_status();

-- Function: Auto-create SSI surveillance schedule after surgery
CREATE OR REPLACE FUNCTION create_ssi_surveillance_schedule()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Completed' 
       AND NEW.wound_classification IS NOT NULL 
       AND OLD.status != 'Completed' THEN
        -- Create wound care schedule
        INSERT INTO hygiene_care_schedules (
            encounter_id, patient_id, admission_id,
            activity_code, activity_name, frequency,
            start_date, linked_surgery_id, created_by
        )
        VALUES (
            NEW.encounter_id, NEW.patient_id, NEW.admission_id,
            'WOUND_SSI_CHECK', 'Surgical Site Inspection', 'twice_daily',
            CURRENT_DATE, NEW.id, COALESCE(NEW.updated_by, NEW.created_by)
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_create_ssi_surveillance
    AFTER UPDATE ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION create_ssi_surveillance_schedule();

-- Function: Sync hygiene to nursing_interventions for analytics
CREATE OR REPLACE FUNCTION sync_hygiene_to_nursing_interventions()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Completed' THEN
        INSERT INTO nursing_interventions (
            encounter_id, patient_id, ward_id, bed_id,
            category_code, intervention_code, notes,
            performed_at, shift, nurse_id
        )
        VALUES (
            NEW.encounter_id, NEW.patient_id, NEW.ward_id, NEW.bed_id,
            NEW.activity_category::text, NEW.activity_code, NEW.notes,
            NEW.performed_time, NEW.shift, NEW.performed_by
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_hygiene_interventions
    AFTER INSERT ON hygiene_care_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_hygiene_to_nursing_interventions();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_surgery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_surgeries_updated_at
    BEFORE UPDATE ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

CREATE TRIGGER tr_surgery_preop_updated_at
    BEFORE UPDATE ON surgery_preop_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

CREATE TRIGGER tr_surgery_anesthesia_updated_at
    BEFORE UPDATE ON surgery_anesthesia_records
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

CREATE TRIGGER tr_theatre_rooms_updated_at
    BEFORE UPDATE ON theatre_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

CREATE TRIGGER tr_theatre_schedules_updated_at
    BEFORE UPDATE ON theatre_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

CREATE TRIGGER tr_hygiene_catalogue_updated_at
    BEFORE UPDATE ON hygiene_activity_catalogue
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

CREATE TRIGGER tr_hygiene_records_updated_at
    BEFORE UPDATE ON hygiene_care_records
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

CREATE TRIGGER tr_hygiene_schedules_updated_at
    BEFORE UPDATE ON hygiene_care_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

CREATE TRIGGER tr_infection_updated_at
    BEFORE UPDATE ON infection_surveillance
    FOR EACH ROW
    EXECUTE FUNCTION update_surgery_timestamp();

-- ============================================================================
-- SECTION 16: VIEWS FOR REPORTING
-- ============================================================================

-- View: Theatre schedule with details
CREATE OR REPLACE VIEW theatre_schedule_view AS
SELECT 
    ts.id AS schedule_id,
    ts.scheduled_date,
    ts.start_time,
    ts.end_time,
    ts.schedule_status,
    tr.room_code,
    tr.room_name,
    tr.room_type::text,
    s.id AS surgery_id,
    s.surgery_number,
    s.primary_procedure,
    s.status AS surgery_status,
    s.priority,
    p.id AS patient_id,
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number,
    surgeon.first_name || ' ' || surgeon.last_name AS surgeon_name,
    anest.first_name || ' ' || anest.last_name AS anesthetist_name,
    ts.notes
FROM theatre_schedules ts
JOIN theatre_rooms tr ON ts.theatre_room_id = tr.id
JOIN surgeries s ON ts.surgery_id = s.id
JOIN patients p ON s.patient_id = p.id
JOIN staff surgeon ON s.primary_surgeon_id = surgeon.id
LEFT JOIN staff anest ON s.anesthetist_id = anest.id
ORDER BY ts.scheduled_date, ts.start_time;

-- View: Surgery summary for dashboard
CREATE OR REPLACE VIEW surgery_dashboard_view AS
SELECT 
    s.id,
    s.surgery_number,
    s.primary_procedure,
    s.status,
    s.priority,
    s.scheduled_date,
    s.scheduled_time,
    s.theatre_room,
    s.consent_obtained,
    s.preop_checklist_completed,
    s.requires_nhis_approval,
    s.nhis_authorization_code,
    p.id AS patient_id,
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number,
    p.insurance_type,
    surgeon.first_name || ' ' || surgeon.last_name AS surgeon_name,
    s.facility_id,
    s.created_at,
    CASE 
        WHEN s.status = 'Planned' THEN 1
        WHEN s.status = 'Pre_Op' THEN 2
        WHEN s.status = 'In_Theatre' THEN 3
        WHEN s.status = 'Recovery' THEN 4
        ELSE 5
    END AS status_order
FROM surgeries s
JOIN patients p ON s.patient_id = p.id
JOIN staff surgeon ON s.primary_surgeon_id = surgeon.id
ORDER BY 
    CASE s.priority
        WHEN 'Emergency' THEN 1
        WHEN 'Urgent' THEN 2
        WHEN 'Routine' THEN 3
        ELSE 4
    END,
    s.scheduled_date,
    s.scheduled_time;

-- View: Hygiene compliance summary
CREATE OR REPLACE VIEW hygiene_compliance_view AS
SELECT 
    h.ward_id,
    w.name AS ward_name,
    h.activity_category::text,
    h.shift,
    DATE(h.performed_time) AS care_date,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE h.status = 'Completed') AS completed,
    COUNT(*) FILTER (WHERE h.status = 'Missed') AS missed,
    COUNT(*) FILTER (WHERE h.status = 'Refused') AS refused,
    ROUND(
        (COUNT(*) FILTER (WHERE h.status = 'Completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        1
    ) AS compliance_rate
FROM hygiene_care_records h
LEFT JOIN wards w ON h.ward_id = w.id
GROUP BY h.ward_id, w.name, h.activity_category, h.shift, DATE(h.performed_time)
ORDER BY DATE(h.performed_time) DESC, w.name;

-- View: Infection surveillance summary
CREATE OR REPLACE VIEW infection_surveillance_summary AS
SELECT 
    i.infection_type::text,
    DATE_TRUNC('month', i.detected_date) AS month,
    COUNT(*) AS total_cases,
    COUNT(*) FILTER (WHERE i.device_related = TRUE) AS device_related,
    COUNT(*) FILTER (WHERE i.surgery_id IS NOT NULL) AS surgery_related,
    COUNT(*) FILTER (WHERE i.outcome = 'Resolved') AS resolved,
    COUNT(*) FILTER (WHERE i.outcome = 'Ongoing') AS ongoing,
    AVG(i.device_days) FILTER (WHERE i.device_related = TRUE) AS avg_device_days
FROM infection_surveillance i
GROUP BY i.infection_type, DATE_TRUNC('month', i.detected_date)
ORDER BY month DESC, infection_type;

-- ============================================================================
-- SECTION 17: SEED DEFAULT HYGIENE ACTIVITIES
-- ============================================================================

INSERT INTO hygiene_activity_catalogue (category, activity_code, activity_name, description, default_frequency, frequency_hours, requires_two_staff, triggers_infection_alert)
VALUES
    -- Bathing activities
    ('BATH', 'BATH_FULL', 'Full Bed Bath', 'Complete bed bath for immobile patients', 'daily', 24, TRUE, FALSE),
    ('BATH', 'BATH_PARTIAL', 'Partial Bed Bath', 'Partial bath focusing on key areas', 'as_needed', NULL, FALSE, FALSE),
    ('BATH', 'BATH_SHOWER', 'Assisted Shower', 'Assisted shower for mobile patients', 'as_needed', NULL, FALSE, FALSE),
    ('BATH', 'BATH_SPONGE', 'Sponge Bath', 'Quick sponge bath', 'daily', 24, FALSE, FALSE),
    
    -- Oral hygiene
    ('ORAL', 'ORAL_CARE', 'Oral Hygiene', 'Standard oral care with mouthwash', 'twice_daily', 12, FALSE, FALSE),
    ('ORAL', 'ORAL_SUCTION', 'Oral Suctioning', 'Oral suctioning for unconscious patients', 'as_needed', NULL, FALSE, FALSE),
    ('ORAL', 'ORAL_DENTURE', 'Denture Care', 'Cleaning and care of dentures', 'twice_daily', 12, FALSE, FALSE),
    
    -- Wound care
    ('WOUND', 'WOUND_DRESS', 'Wound Dressing Change', 'Change wound dressing per protocol', 'as_ordered', NULL, FALSE, TRUE),
    ('WOUND', 'WOUND_CLEAN', 'Wound Cleaning', 'Clean and assess wound', 'as_ordered', NULL, FALSE, TRUE),
    ('WOUND', 'WOUND_SSI_CHECK', 'Surgical Site Inspection', 'Inspect surgical site for signs of infection', 'twice_daily', 12, FALSE, TRUE),
    
    -- Catheter care
    ('CATH', 'CATH_CARE', 'Catheter Care', 'Urinary catheter hygiene care', 'twice_daily', 12, FALSE, TRUE),
    ('CATH', 'CATH_EMPTY', 'Empty Catheter Bag', 'Empty and measure catheter drainage', 'as_needed', NULL, FALSE, FALSE),
    ('CATH', 'CATH_MEATAL', 'Meatal Care', 'Clean urethral meatus', 'twice_daily', 12, FALSE, FALSE),
    
    -- Line care
    ('LINE', 'LINE_IV_CARE', 'IV Site Care', 'Peripheral IV site assessment and care', 'daily', 24, FALSE, TRUE),
    ('LINE', 'LINE_CVC_DRESS', 'CVC Dressing Change', 'Central venous catheter dressing change', 'per_protocol', 168, FALSE, TRUE),
    ('LINE', 'LINE_FLUSH', 'Line Flushing', 'Flush IV lines per protocol', 'per_protocol', NULL, FALSE, FALSE),
    
    -- Drain care
    ('DRAIN', 'DRAIN_CARE', 'Drain Site Care', 'Surgical drain site care', 'daily', 24, FALSE, TRUE),
    ('DRAIN', 'DRAIN_EMPTY', 'Empty Drain', 'Empty and measure drain output', 'as_needed', NULL, FALSE, FALSE),
    ('DRAIN', 'DRAIN_MEASURE', 'Measure Drain Output', 'Record drain output volume', 'shift', 8, FALSE, FALSE),
    
    -- Skin/Pressure care
    ('SKIN', 'SKIN_TURN', 'Patient Turning/Repositioning', 'Turn and reposition patient', '2_hourly', 2, TRUE, FALSE),
    ('SKIN', 'SKIN_ASSESS', 'Skin Assessment', 'Full skin integrity assessment', 'shift', 8, FALSE, FALSE),
    ('SKIN', 'SKIN_PRESSURE', 'Pressure Relief', 'Apply pressure relieving measures', '2_hourly', 2, FALSE, FALSE),
    ('SKIN', 'SKIN_MOISTURE', 'Moisture Barrier Application', 'Apply barrier cream to at-risk areas', 'as_needed', NULL, FALSE, FALSE),
    
    -- Linen/Environment
    ('LINEN', 'LINEN_CHANGE', 'Bed Linen Change', 'Change bed linens', 'daily', 24, TRUE, FALSE),
    ('LINEN', 'LINEN_SOILED', 'Soiled Linen Change', 'Change soiled linens immediately', 'as_needed', NULL, FALSE, FALSE),
    ('LINEN', 'ENV_CLEAN', 'Bedspace Cleaning', 'Clean patient bedspace environment', 'daily', 24, FALSE, FALSE),
    
    -- Isolation/Precautions
    ('ISOL', 'ISOL_PPE', 'PPE Compliance Check', 'Verify PPE use on entry', 'each_entry', NULL, FALSE, FALSE),
    ('ISOL', 'ISOL_CONTACT', 'Contact Precautions Maintained', 'Document contact precautions compliance', 'shift', 8, FALSE, FALSE),
    ('ISOL', 'ISOL_DROPLET', 'Droplet Precautions Maintained', 'Document droplet precautions compliance', 'shift', 8, FALSE, FALSE),
    ('ISOL', 'ISOL_AIRBORNE', 'Airborne Precautions Maintained', 'Document airborne precautions compliance', 'shift', 8, FALSE, FALSE),
    
    -- Hand hygiene
    ('HAND', 'HAND_AUDIT', 'Hand Hygiene Audit', 'Hand hygiene compliance audit', 'random', NULL, FALSE, FALSE),
    ('HAND', 'HAND_BEFORE', 'Hand Hygiene Before Patient Contact', 'Document hand hygiene before patient', 'each_contact', NULL, FALSE, FALSE),
    ('HAND', 'HAND_AFTER', 'Hand Hygiene After Patient Contact', 'Document hand hygiene after patient', 'each_contact', NULL, FALSE, FALSE),
    
    -- Device care
    ('DEVICE', 'DEV_NG_CARE', 'NG Tube Care', 'Nasogastric tube care and patency check', 'shift', 8, FALSE, FALSE),
    ('DEVICE', 'DEV_TRACH_CARE', 'Tracheostomy Care', 'Tracheostomy site care and suctioning', 'per_protocol', NULL, FALSE, TRUE),
    ('DEVICE', 'DEV_VENT_CHECK', 'Ventilator Circuit Check', 'Check ventilator circuit and settings', 'shift', 8, FALSE, FALSE)
ON CONFLICT (activity_code) DO NOTHING;

-- ============================================================================
-- SECTION 18: SEED DEFAULT THEATRE ROOMS (Example)
-- ============================================================================

-- This will be populated based on facility configuration
-- Example seed for first facility (if exists)
DO $$
DECLARE
    v_facility_id UUID;
    v_admin_id UUID;
BEGIN
    -- Get first active facility
    SELECT id INTO v_facility_id FROM facilities WHERE is_active = TRUE LIMIT 1;
    
    -- Get first admin staff
    SELECT id INTO v_admin_id FROM staff WHERE role = 'admin' OR role = 'super_admin' LIMIT 1;
    
    IF v_facility_id IS NOT NULL AND v_admin_id IS NOT NULL THEN
        INSERT INTO theatre_rooms (facility_id, room_code, room_name, room_type, capacity_level, floor, created_by)
        VALUES
            (v_facility_id, 'OR-1', 'Operating Room 1', 'General', 'Standard', '2nd Floor', v_admin_id),
            (v_facility_id, 'OR-2', 'Operating Room 2', 'General', 'Standard', '2nd Floor', v_admin_id),
            (v_facility_id, 'OR-3', 'Operating Room 3', 'Orthopedic', 'Standard', '2nd Floor', v_admin_id),
            (v_facility_id, 'OR-4', 'Cardiac Theatre', 'Cardiac', 'Advanced', '2nd Floor', v_admin_id),
            (v_facility_id, 'OR-5', 'Emergency Theatre', 'Emergency', 'Standard', '1st Floor', v_admin_id),
            (v_facility_id, 'MINOR-1', 'Minor Procedures Room 1', 'Minor', 'Basic', '1st Floor', v_admin_id),
            (v_facility_id, 'MINOR-2', 'Minor Procedures Room 2', 'Minor', 'Basic', '1st Floor', v_admin_id)
        ON CONFLICT (facility_id, room_code) DO NOTHING;
        
        RAISE NOTICE 'Theatre rooms seeded for facility: %', v_facility_id;
    ELSE
        RAISE NOTICE 'No facility or admin found - skipping theatre room seed';
    END IF;
END $$;

-- ============================================================================
-- SECTION 19: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE surgeries IS 'Main surgery records - encounter-centric, tracks full surgical workflow';
COMMENT ON TABLE surgery_preop_assessments IS 'Pre-operative assessments including ASA classification and clearance';
COMMENT ON TABLE surgery_anesthesia_records IS 'Anesthesia documentation for surgeries';
COMMENT ON TABLE surgery_consumables IS 'Items and implants used during surgery';
COMMENT ON TABLE theatre_rooms IS 'Operating room/theatre configuration';
COMMENT ON TABLE theatre_schedules IS 'Theatre scheduling with overlap prevention';
COMMENT ON TABLE hygiene_activity_catalogue IS 'Configurable list of hygiene activities';
COMMENT ON TABLE hygiene_care_records IS 'Hygiene care documentation - encounter-centric';
COMMENT ON TABLE hygiene_care_schedules IS 'Scheduled hygiene activities for patients';
COMMENT ON TABLE infection_surveillance IS 'Healthcare-associated infection tracking';

COMMENT ON COLUMN surgeries.status IS 'Surgery workflow state: Planned→Pre_Op→In_Theatre→Recovery→Completed';
COMMENT ON COLUMN surgeries.is_locked IS 'TRUE after all sign-offs complete - record becomes read-only';
COMMENT ON COLUMN surgeries.wound_classification IS 'CDC wound classification for SSI surveillance';
COMMENT ON COLUMN hygiene_care_records.status IS 'Completed, Refused, Missed, or Deferred';
COMMENT ON COLUMN hygiene_care_records.missed_reason IS 'Required justification when status is Missed';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
