-- =============================================================================
-- SPECIALTY CLINICAL MODULES: Dental, Ophthalmology, Physiotherapy
-- Migration: 048_specialty_clinical_modules.sql
-- Description: Creates tables for specialty clinical documentation
-- =============================================================================

-- =============================================================================
-- ENUMS FOR SPECIALTY MODULES
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE tooth_status AS ENUM (
        'Present', 'Missing', 'Impacted', 'Deciduous', 'Unerupted', 'Partial_Eruption'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tooth_condition AS ENUM (
        'Healthy', 'Caries', 'Filled', 'Crown', 'Bridge_Abutment', 
        'Root_Canal_Treated', 'Fractured', 'Mobile', 'Extracted'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gingival_status AS ENUM (
        'Healthy', 'Gingivitis', 'Mild_Periodontitis', 
        'Moderate_Periodontitis', 'Severe_Periodontitis'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE dental_urgency AS ENUM (
        'Routine', 'Urgent', 'Emergency'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE affected_eye AS ENUM (
        'Right', 'Left', 'Both'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE iop_method AS ENUM (
        'NCT', 'Goldmann', 'iCare', 'Schiotz', 'Palpation'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE lens_type AS ENUM (
        'Single_Vision', 'Bifocal', 'Progressive', 'Photochromic', 'Contact_Lens'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE onset_type AS ENUM (
        'Sudden', 'Gradual', 'Traumatic', 'Post_Surgical', 'Unknown'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE mobility_status AS ENUM (
        'Independent', 'Assisted', 'Dependent', 'Bed_Bound'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE physio_plan_status AS ENUM (
        'Active', 'On_Hold', 'Completed', 'Discharged', 'Transferred'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM (
        'Attended', 'Missed', 'Cancelled', 'Rescheduled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE evaluation_type AS ENUM (
        'Initial', 'Progress', 'Discharge', 'Re_Evaluation'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- DENTAL MODULE TABLES
-- =============================================================================

-- Dental Examination Record (main encounter-linked record)
CREATE TABLE IF NOT EXISTS dental_exams (
    exam_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    consultation_id UUID REFERENCES consultations(consultation_id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    -- Chief Complaint
    chief_complaint TEXT,
    complaint_duration VARCHAR(100),
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    pain_character VARCHAR(50), -- 'Sharp', 'Dull', 'Throbbing', 'Intermittent', 'Constant'
    
    -- History
    dental_history TEXT,
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    
    -- Oral Examination
    extraoral_findings TEXT,
    intraoral_findings TEXT,
    soft_tissue_exam TEXT,
    hard_tissue_exam TEXT,
    occlusion_notes TEXT,
    occlusion_class VARCHAR(20), -- 'Class_I', 'Class_II_Div1', 'Class_II_Div2', 'Class_III'
    tmj_assessment TEXT,
    
    -- Periodontal Assessment
    gingival_status gingival_status DEFAULT 'Healthy',
    bleeding_on_probing BOOLEAN DEFAULT FALSE,
    plaque_score INTEGER CHECK (plaque_score >= 0 AND plaque_score <= 100),
    calculus_present BOOLEAN DEFAULT FALSE,
    pocket_depth_notes TEXT,
    
    -- Radiographic Findings
    radiograph_taken BOOLEAN DEFAULT FALSE,
    radiograph_type VARCHAR(50), -- 'Periapical', 'Bitewing', 'OPG', 'CBCT', 'Lateral_Ceph'
    radiograph_findings TEXT,
    
    -- Diagnosis
    provisional_diagnosis TEXT,
    final_diagnosis TEXT,
    icd_codes TEXT[],
    
    -- Treatment Plan
    treatment_plan TEXT,
    urgency dental_urgency DEFAULT 'Routine',
    estimated_sessions INTEGER,
    estimated_cost DECIMAL(10,2),
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Audit
    status request_status DEFAULT 'Pending',
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    CONSTRAINT dental_exam_finalized_check CHECK (
        (finalized_at IS NULL) OR (finalized_by IS NOT NULL)
    )
);

-- Dental Chart (Tooth-by-Tooth Documentation)
CREATE TABLE IF NOT EXISTS dental_chart (
    chart_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    exam_id UUID NOT NULL REFERENCES dental_exams(exam_id) ON DELETE CASCADE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    
    -- Tooth Identification (FDI/ISO System)
    -- Adult: 11-18 (UR), 21-28 (UL), 31-38 (LL), 41-48 (LR)
    -- Pediatric: 51-55 (UR), 61-65 (UL), 71-75 (LL), 81-85 (LR)
    tooth_number INTEGER NOT NULL CHECK (
        (tooth_number >= 11 AND tooth_number <= 18) OR
        (tooth_number >= 21 AND tooth_number <= 28) OR
        (tooth_number >= 31 AND tooth_number <= 38) OR
        (tooth_number >= 41 AND tooth_number <= 48) OR
        (tooth_number >= 51 AND tooth_number <= 55) OR
        (tooth_number >= 61 AND tooth_number <= 65) OR
        (tooth_number >= 71 AND tooth_number <= 75) OR
        (tooth_number >= 81 AND tooth_number <= 85)
    ),
    
    -- Condition
    tooth_status tooth_status NOT NULL DEFAULT 'Present',
    condition tooth_condition DEFAULT 'Healthy',
    caries_classification VARCHAR(20), -- 'Class_I' to 'Class_VI' (Black's Classification)
    mobility_grade INTEGER CHECK (mobility_grade >= 0 AND mobility_grade <= 3),
    
    -- Surface Involvement (MODBL)
    mesial BOOLEAN DEFAULT FALSE,
    occlusal BOOLEAN DEFAULT FALSE,
    distal BOOLEAN DEFAULT FALSE,
    buccal BOOLEAN DEFAULT FALSE,
    lingual BOOLEAN DEFAULT FALSE,
    incisal BOOLEAN DEFAULT FALSE,
    
    -- Additional Findings
    periapical_status VARCHAR(50), -- 'Normal', 'Periapical_Abscess', 'Granuloma', 'Cyst'
    restoration_material VARCHAR(50), -- 'Amalgam', 'Composite', 'GIC', 'Ceramic', 'Gold'
    restoration_date DATE,
    prosthesis_type VARCHAR(50), -- 'Crown', 'Bridge_Pontic', 'Denture_Tooth', 'Implant'
    sensitivity VARCHAR(20), -- 'None', 'Cold', 'Hot', 'Percussion', 'Palpation'
    notes TEXT,
    
    -- Audit
    recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(exam_id, tooth_number)
);

-- Dental Procedures
CREATE TABLE IF NOT EXISTS dental_procedures (
    procedure_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    exam_id UUID REFERENCES dental_exams(exam_id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    -- Procedure Details
    procedure_code VARCHAR(50), -- ADA/CDT code
    procedure_type VARCHAR(100) NOT NULL,
    procedure_category VARCHAR(50), -- 'Preventive', 'Restorative', 'Endodontic', 'Periodontic', 'Prosthodontic', 'Surgical'
    tooth_numbers INTEGER[], -- Array of affected teeth
    surfaces TEXT[], -- Surfaces involved
    procedure_description TEXT,
    
    -- Anesthesia
    anesthesia_type VARCHAR(50), -- 'None', 'Topical', 'Local', 'Block', 'Sedation', 'General'
    anesthesia_agent VARCHAR(100),
    anesthesia_quantity VARCHAR(50),
    anesthesia_site VARCHAR(100),
    
    -- Pre-Procedure
    consent_obtained BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP WITH TIME ZONE,
    pre_procedure_notes TEXT,
    
    -- Procedure Execution
    procedure_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    materials_used TEXT,
    complications TEXT,
    
    -- Post-Procedure
    post_procedure_instructions TEXT,
    medications_prescribed TEXT,
    sutures_placed BOOLEAN DEFAULT FALSE,
    suture_type VARCHAR(50),
    suture_removal_date DATE,
    
    -- Billing
    fee DECIMAL(10,2),
    discount_percent INTEGER DEFAULT 0,
    
    -- Status & Audit
    status request_status DEFAULT 'Pending',
    priority priority DEFAULT 'Normal',
    scheduled_date TIMESTAMP WITH TIME ZONE,
    performed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    assisted_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Dental Prescriptions
CREATE TABLE IF NOT EXISTS dental_prescriptions (
    prescription_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    exam_id UUID REFERENCES dental_exams(exam_id) ON DELETE SET NULL,
    procedure_id UUID REFERENCES dental_procedures(procedure_id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    -- Medication Details
    medication_name VARCHAR(255) NOT NULL,
    medication_type VARCHAR(50), -- 'Analgesic', 'Antibiotic', 'Antiseptic', 'Anti_Inflammatory', 'Other'
    generic_name VARCHAR(255),
    dosage VARCHAR(100) NOT NULL,
    dosage_form VARCHAR(50), -- 'Tablet', 'Capsule', 'Syrup', 'Mouthwash', 'Gel', 'Injection'
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    route VARCHAR(50) DEFAULT 'Oral',
    quantity INTEGER,
    refills_allowed INTEGER DEFAULT 0,
    
    -- Instructions
    special_instructions TEXT,
    warnings TEXT,
    
    -- Audit
    prescribed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Dispensed', 'Cancelled', 'Expired'
    dispensed_at TIMESTAMP WITH TIME ZONE,
    dispensed_by UUID REFERENCES staff(id) ON DELETE SET NULL
);


-- =============================================================================
-- OPHTHALMOLOGY MODULE TABLES
-- =============================================================================

-- Eye Examination Record
CREATE TABLE IF NOT EXISTS eye_exams (
    exam_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    consultation_id UUID REFERENCES consultations(consultation_id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    -- Chief Complaint
    chief_complaint TEXT,
    complaint_duration VARCHAR(100),
    affected_eye affected_eye,
    
    -- History
    ocular_history TEXT,
    ocular_surgery_history TEXT,
    systemic_history TEXT, -- Diabetes, Hypertension relevant
    family_history TEXT,
    drug_allergy TEXT,
    current_medications TEXT,
    glasses_history TEXT,
    contact_lens_history TEXT,
    
    -- Visual Acuity (VA)
    -- Notation: 6/6, 6/9, 6/12, 6/18, 6/24, 6/36, 6/60, CF (Counting Fingers), 
    --           HM (Hand Movement), PL (Perception of Light), NPL (No PL)
    va_right_unaided VARCHAR(20),
    va_left_unaided VARCHAR(20),
    va_right_aided VARCHAR(20), -- With current glasses
    va_left_aided VARCHAR(20),
    va_right_pinhole VARCHAR(20),
    va_left_pinhole VARCHAR(20),
    va_right_near VARCHAR(20), -- Near vision (N5, N6, etc.)
    va_left_near VARCHAR(20),
    
    -- Auto-Refraction (objective)
    ar_right_sphere DECIMAL(5,2),
    ar_right_cylinder DECIMAL(5,2),
    ar_right_axis INTEGER CHECK (ar_right_axis >= 0 AND ar_right_axis <= 180),
    ar_left_sphere DECIMAL(5,2),
    ar_left_cylinder DECIMAL(5,2),
    ar_left_axis INTEGER CHECK (ar_left_axis >= 0 AND ar_left_axis <= 180),
    
    -- Subjective Refraction (Final Rx)
    rx_right_sphere DECIMAL(5,2),
    rx_right_cylinder DECIMAL(5,2),
    rx_right_axis INTEGER CHECK (rx_right_axis >= 0 AND rx_right_axis <= 180),
    rx_right_add DECIMAL(5,2), -- For presbyopia
    rx_right_prism VARCHAR(50),
    rx_left_sphere DECIMAL(5,2),
    rx_left_cylinder DECIMAL(5,2),
    rx_left_axis INTEGER CHECK (rx_left_axis >= 0 AND rx_left_axis <= 180),
    rx_left_add DECIMAL(5,2),
    rx_left_prism VARCHAR(50),
    rx_pd INTEGER, -- Pupillary distance (mm)
    rx_pd_right INTEGER, -- Monocular PD
    rx_pd_left INTEGER,
    
    -- Best Corrected Visual Acuity
    bcva_right VARCHAR(20),
    bcva_left VARCHAR(20),
    
    -- Intraocular Pressure (IOP)
    iop_right DECIMAL(4,1) CHECK (iop_right >= 0 AND iop_right <= 80), -- mmHg
    iop_left DECIMAL(4,1) CHECK (iop_left >= 0 AND iop_left <= 80),
    iop_method iop_method,
    iop_time TIME,
    cct_right INTEGER, -- Central Corneal Thickness (microns)
    cct_left INTEGER,
    
    -- Pupil Assessment
    pupil_right_size INTEGER, -- mm
    pupil_left_size INTEGER,
    pupil_right_reaction VARCHAR(50), -- 'Brisk', 'Sluggish', 'Fixed', 'RAPD'
    pupil_left_reaction VARCHAR(50),
    
    -- Cover Test & Motility
    cover_test TEXT,
    ocular_motility TEXT,
    convergence TEXT,
    npc VARCHAR(50), -- Near Point of Convergence
    
    -- Anterior Segment (Slit Lamp Examination)
    anterior_right_lids TEXT,
    anterior_right_lacrimal TEXT,
    anterior_right_conjunctiva TEXT,
    anterior_right_sclera TEXT,
    anterior_right_cornea TEXT,
    anterior_right_ac TEXT, -- Anterior Chamber
    anterior_right_ac_depth VARCHAR(20), -- 'Deep', 'Normal', 'Shallow', 'Flat'
    anterior_right_iris TEXT,
    anterior_right_pupil TEXT,
    anterior_right_lens TEXT,
    anterior_right_lens_status VARCHAR(50), -- 'Clear', 'Cataract', 'Pseudophakia', 'Aphakia'
    
    anterior_left_lids TEXT,
    anterior_left_lacrimal TEXT,
    anterior_left_conjunctiva TEXT,
    anterior_left_sclera TEXT,
    anterior_left_cornea TEXT,
    anterior_left_ac TEXT,
    anterior_left_ac_depth VARCHAR(20),
    anterior_left_iris TEXT,
    anterior_left_pupil TEXT,
    anterior_left_lens TEXT,
    anterior_left_lens_status VARCHAR(50),
    
    -- Gonioscopy
    gonioscopy_right TEXT,
    gonioscopy_left TEXT,
    angle_right VARCHAR(20), -- 'Open', 'Narrow', 'Occludable', 'Closed'
    angle_left VARCHAR(20),
    
    -- Posterior Segment (Fundoscopy/Dilated Exam)
    dilation_performed BOOLEAN DEFAULT FALSE,
    dilation_agent VARCHAR(100),
    
    posterior_right_media TEXT,
    posterior_right_disc TEXT,
    posterior_right_disc_color VARCHAR(50), -- 'Pink', 'Pale', 'Hyperemic'
    posterior_right_cdr DECIMAL(3,2) CHECK (posterior_right_cdr >= 0 AND posterior_right_cdr <= 1), -- Cup-Disc Ratio
    posterior_right_rim TEXT, -- ISNT rule compliance
    posterior_right_macula TEXT,
    posterior_right_foveal_reflex VARCHAR(20), -- 'Present', 'Absent', 'Dull'
    posterior_right_vessels TEXT,
    posterior_right_av_ratio VARCHAR(20), -- A:V ratio e.g., '2:3'
    posterior_right_periphery TEXT,
    
    posterior_left_media TEXT,
    posterior_left_disc TEXT,
    posterior_left_disc_color VARCHAR(50),
    posterior_left_cdr DECIMAL(3,2) CHECK (posterior_left_cdr >= 0 AND posterior_left_cdr <= 1),
    posterior_left_rim TEXT,
    posterior_left_macula TEXT,
    posterior_left_foveal_reflex VARCHAR(20),
    posterior_left_vessels TEXT,
    posterior_left_av_ratio VARCHAR(20),
    posterior_left_periphery TEXT,
    
    -- Additional Tests
    color_vision VARCHAR(100), -- 'Normal', 'Red-Green Defect', 'Blue-Yellow Defect'
    color_vision_method VARCHAR(50), -- 'Ishihara', 'Farnsworth D15'
    contrast_sensitivity TEXT,
    amsler_grid TEXT,
    schirmer_test_right INTEGER, -- mm
    schirmer_test_left INTEGER,
    
    -- Visual Field Notes (detailed in separate order)
    visual_field_notes TEXT,
    
    -- Diagnosis
    provisional_diagnosis TEXT,
    final_diagnosis TEXT,
    icd_codes TEXT[],
    
    -- Treatment Plan
    treatment_plan TEXT,
    glasses_prescribed BOOLEAN DEFAULT FALSE,
    contact_lens_prescribed BOOLEAN DEFAULT FALSE,
    medications_prescribed BOOLEAN DEFAULT FALSE,
    surgery_recommended BOOLEAN DEFAULT FALSE,
    surgery_type VARCHAR(100),
    
    -- Referral
    referral_needed BOOLEAN DEFAULT FALSE,
    referral_to VARCHAR(100), -- 'Retina Specialist', 'Glaucoma Specialist', 'Oculoplasty', etc.
    referral_reason TEXT,
    
    -- Follow-up
    follow_up_interval VARCHAR(50), -- '1 week', '1 month', '3 months'
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Audit
    status request_status DEFAULT 'Pending',
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    CONSTRAINT eye_exam_finalized_check CHECK (
        (finalized_at IS NULL) OR (finalized_by IS NOT NULL)
    )
);

-- Eye Procedures/Investigations
CREATE TABLE IF NOT EXISTS eye_procedures (
    procedure_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    exam_id UUID REFERENCES eye_exams(exam_id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    procedure_type VARCHAR(100) NOT NULL,
    -- Types: 'Refraction', 'Tonometry', 'Fundoscopy', 'Slit_Lamp', 'Visual_Field',
    --        'OCT', 'Fundus_Photo', 'Fluorescein_Angio', 'Gonioscopy', 'Pachymetry',
    --        'A_Scan', 'B_Scan', 'Keratometry', 'Topography', 'Specular_Microscopy',
    --        'Minor_Surgery', 'Chalazion_Excision', 'Pterygium_Excision', 'Injection'
    
    procedure_category VARCHAR(50), -- 'Diagnostic', 'Therapeutic', 'Surgical'
    affected_eye affected_eye,
    procedure_notes TEXT,
    findings TEXT,
    interpretation TEXT,
    
    -- For diagnostic procedures
    machine_used VARCHAR(100),
    parameters TEXT,
    images_attached BOOLEAN DEFAULT FALSE,
    
    -- For therapeutic/surgical procedures
    anesthesia_used VARCHAR(100),
    materials_used TEXT,
    complications TEXT,
    
    -- Billing
    fee DECIMAL(10,2),
    
    status request_status DEFAULT 'Pending',
    performed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    performed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Glasses/Contact Lens/Eye Medication Prescription
CREATE TABLE IF NOT EXISTS eye_prescriptions (
    prescription_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    exam_id UUID REFERENCES eye_exams(exam_id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    prescription_type VARCHAR(50) NOT NULL, -- 'Glasses', 'Contact_Lens', 'Eye_Drops', 'Ointment', 'Oral_Medication'
    
    -- For Glasses/Contact Lens
    right_sphere DECIMAL(5,2),
    right_cylinder DECIMAL(5,2),
    right_axis INTEGER CHECK (right_axis >= 0 AND right_axis <= 180),
    right_add DECIMAL(5,2),
    right_prism VARCHAR(50),
    right_base_curve DECIMAL(4,2), -- For contact lens
    right_diameter DECIMAL(4,2), -- For contact lens
    
    left_sphere DECIMAL(5,2),
    left_cylinder DECIMAL(5,2),
    left_axis INTEGER CHECK (left_axis >= 0 AND left_axis <= 180),
    left_add DECIMAL(5,2),
    left_prism VARCHAR(50),
    left_base_curve DECIMAL(4,2),
    left_diameter DECIMAL(4,2),
    
    pd INTEGER,
    pd_right INTEGER,
    pd_left INTEGER,
    
    -- Lens specifications
    lens_type lens_type,
    lens_material VARCHAR(100), -- 'CR39', 'Polycarbonate', 'High_Index_1.67', 'Trivex'
    lens_coating TEXT[], -- 'Anti_Reflective', 'Blue_Light_Filter', 'Photochromic', 'Scratch_Resistant'
    tint VARCHAR(50),
    frame_recommendation TEXT,
    
    -- Contact lens specific
    contact_lens_brand VARCHAR(100),
    contact_lens_type VARCHAR(50), -- 'Daily', 'Weekly', 'Monthly', 'Extended_Wear'
    wearing_schedule TEXT,
    care_instructions TEXT,
    
    -- For Eye Drops/Medications
    medication_name VARCHAR(255),
    generic_name VARCHAR(255),
    concentration VARCHAR(50),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    affected_eye affected_eye,
    special_instructions TEXT,
    quantity INTEGER,
    refills_allowed INTEGER DEFAULT 0,
    
    -- Audit
    prescribed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Dispensed', 'Cancelled', 'Expired'
    dispensed_at TIMESTAMP WITH TIME ZONE,
    dispensed_by UUID REFERENCES staff(id) ON DELETE SET NULL
);


-- =============================================================================
-- PHYSIOTHERAPY MODULE TABLES
-- =============================================================================

-- Physiotherapy Assessment (Initial Evaluation)
CREATE TABLE IF NOT EXISTS physio_assessments (
    assessment_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    consultation_id UUID REFERENCES consultations(consultation_id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    -- Referral Information
    referral_source VARCHAR(100), -- Doctor who referred
    referral_doctor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    referral_diagnosis TEXT,
    referral_date DATE,
    referral_reason TEXT,
    
    -- Chief Complaint
    chief_complaint TEXT,
    complaint_duration VARCHAR(100),
    onset_type onset_type,
    onset_date DATE,
    mechanism_of_injury TEXT,
    
    -- Pain Assessment (VAS/NRS 0-10)
    pain_location TEXT,
    pain_location_diagram TEXT, -- Could store body diagram data
    pain_score INTEGER CHECK (pain_score >= 0 AND pain_score <= 10),
    pain_at_rest INTEGER CHECK (pain_at_rest >= 0 AND pain_at_rest <= 10),
    pain_on_activity INTEGER CHECK (pain_on_activity >= 0 AND pain_on_activity <= 10),
    pain_worst INTEGER CHECK (pain_worst >= 0 AND pain_worst <= 10),
    pain_best INTEGER CHECK (pain_best >= 0 AND pain_best <= 10),
    pain_character VARCHAR(100), -- 'Sharp', 'Dull', 'Burning', 'Aching', 'Shooting', 'Throbbing'
    pain_radiation TEXT,
    aggravating_factors TEXT,
    relieving_factors TEXT,
    pain_pattern VARCHAR(50), -- 'Constant', 'Intermittent', 'Activity_Related', 'Positional'
    night_pain BOOLEAN DEFAULT FALSE,
    
    -- History
    medical_history TEXT,
    surgical_history TEXT,
    medications TEXT,
    allergies TEXT,
    occupation VARCHAR(100),
    hobbies TEXT,
    hand_dominance VARCHAR(20), -- 'Right', 'Left', 'Ambidextrous'
    
    -- Functional Assessment
    functional_status TEXT, -- Current functional limitations
    adl_status TEXT, -- Activities of Daily Living
    mobility_status mobility_status,
    gait_pattern VARCHAR(100),
    gait_aids_used TEXT[], -- 'Walker', 'Cane', 'Crutches', 'Wheelchair'
    balance_assessment TEXT,
    fall_history TEXT,
    
    -- Posture Assessment
    posture_standing TEXT,
    posture_sitting TEXT,
    posture_deviations TEXT,
    
    -- Range of Motion (Affected Area)
    rom_joint VARCHAR(100), -- Which joint/region
    rom_notes TEXT, -- Detailed ROM findings
    
    -- Active ROM
    rom_flexion_active INTEGER,
    rom_extension_active INTEGER,
    rom_abduction_active INTEGER,
    rom_adduction_active INTEGER,
    rom_internal_rotation_active INTEGER,
    rom_external_rotation_active INTEGER,
    
    -- Passive ROM
    rom_flexion_passive INTEGER,
    rom_extension_passive INTEGER,
    rom_abduction_passive INTEGER,
    rom_adduction_passive INTEGER,
    rom_internal_rotation_passive INTEGER,
    rom_external_rotation_passive INTEGER,
    
    rom_end_feel TEXT, -- 'Normal', 'Capsular', 'Empty', 'Spasm'
    rom_pain_arc TEXT,
    
    -- Muscle Strength (MRC Scale 0-5)
    muscle_groups_tested TEXT[],
    muscle_strength_grades JSONB, -- {"flexors": 4, "extensors": 5, etc.}
    muscle_strength_notes TEXT,
    
    -- Sensation/Neurological
    sensation_intact BOOLEAN DEFAULT TRUE,
    sensation_notes TEXT,
    dermatome_affected VARCHAR(50),
    myotome_affected VARCHAR(50),
    reflexes_tested TEXT[],
    reflexes_normal BOOLEAN DEFAULT TRUE,
    reflex_notes TEXT,
    neural_tension_tests TEXT,
    
    -- Special Tests
    special_tests_performed TEXT[], -- Array of test names
    special_tests_findings JSONB, -- {"SLR": "Positive right", "Lachman": "Negative"}
    
    -- Palpation
    palpation_findings TEXT,
    trigger_points TEXT,
    tenderness_location TEXT,
    swelling_present BOOLEAN DEFAULT FALSE,
    swelling_notes TEXT,
    
    -- Previous Treatment
    previous_physio_treatment BOOLEAN DEFAULT FALSE,
    previous_treatment_details TEXT,
    previous_treatment_response TEXT,
    
    -- Diagnosis
    physio_diagnosis TEXT,
    icd_codes TEXT[],
    problem_list TEXT[],
    
    -- Goals (SMART Goals)
    short_term_goals TEXT, -- 2-4 weeks
    long_term_goals TEXT, -- 6-12 weeks
    patient_goals TEXT, -- Patient's own goals
    expected_outcomes TEXT,
    estimated_sessions INTEGER,
    estimated_duration_weeks INTEGER,
    
    -- Precautions/Contraindications
    red_flags TEXT[],
    red_flags_present BOOLEAN DEFAULT FALSE,
    yellow_flags TEXT[], -- Psychosocial factors
    precautions TEXT,
    contraindications TEXT,
    
    -- Prognosis
    prognosis VARCHAR(50), -- 'Excellent', 'Good', 'Fair', 'Guarded', 'Poor'
    prognosis_notes TEXT,
    
    -- Audit
    status request_status DEFAULT 'Pending',
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    CONSTRAINT physio_assessment_finalized_check CHECK (
        (finalized_at IS NULL) OR (finalized_by IS NOT NULL)
    )
);

-- Physiotherapy Treatment Plan
CREATE TABLE IF NOT EXISTS physio_plans (
    plan_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES physio_assessments(assessment_id) ON DELETE RESTRICT,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    -- Treatment Approach
    treatment_approach TEXT, -- Overall approach/philosophy
    
    -- Manual Therapy
    manual_therapy BOOLEAN DEFAULT FALSE,
    manual_therapy_techniques TEXT[], -- 'Mobilization', 'Manipulation', 'Massage', 'MFR', 'Stretching'
    manual_therapy_parameters TEXT,
    
    -- Therapeutic Exercise
    therapeutic_exercise BOOLEAN DEFAULT FALSE,
    exercises_prescribed TEXT, -- Detailed exercise program
    exercise_parameters TEXT, -- Sets, reps, frequency
    home_exercises TEXT,
    exercise_progression_criteria TEXT,
    
    -- Electrotherapy
    electrotherapy BOOLEAN DEFAULT FALSE,
    electro_modalities TEXT[], -- 'TENS', 'IFT', 'Ultrasound', 'SWD', 'MWD', 'Laser', 'EMS', 'NMES'
    electro_parameters JSONB, -- Detailed parameters for each modality
    
    -- Thermal Therapy
    heat_therapy BOOLEAN DEFAULT FALSE,
    heat_type VARCHAR(50), -- 'Hot_Pack', 'Wax_Bath', 'Infrared'
    cold_therapy BOOLEAN DEFAULT FALSE,
    cold_type VARCHAR(50), -- 'Ice_Pack', 'Cold_Spray', 'Ice_Massage'
    
    -- Hydrotherapy
    hydrotherapy BOOLEAN DEFAULT FALSE,
    hydro_type VARCHAR(50), -- 'Pool', 'Whirlpool', 'Contrast_Bath'
    
    -- Traction
    traction BOOLEAN DEFAULT FALSE,
    traction_type VARCHAR(50), -- 'Cervical', 'Lumbar', 'Manual', 'Mechanical'
    traction_parameters TEXT,
    
    -- Other Modalities
    other_modalities TEXT[],
    other_modality_details TEXT,
    
    -- Assistive Devices
    assistive_devices TEXT[], -- 'Walker', 'Crutches', 'Wheelchair', 'Splint', 'Brace', 'Orthotics'
    assistive_device_instructions TEXT,
    
    -- Session Details
    frequency VARCHAR(50), -- '3x/week', 'Daily', 'Alternate days', 'Weekly'
    session_duration_minutes INTEGER,
    total_sessions_planned INTEGER,
    
    -- Patient Education
    patient_education TEXT,
    activity_modifications TEXT,
    ergonomic_advice TEXT,
    
    -- Precautions
    treatment_precautions TEXT,
    monitoring_parameters TEXT,
    
    -- Re-evaluation Schedule
    re_eval_interval VARCHAR(50), -- 'Every 6 sessions', 'Every 2 weeks'
    
    -- Status
    status physio_plan_status DEFAULT 'Active',
    status_reason TEXT,
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Physiotherapy Session Notes (Per Visit)
CREATE TABLE IF NOT EXISTS physio_sessions (
    session_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES physio_plans(plan_id) ON DELETE RESTRICT,
    assessment_id UUID NOT NULL REFERENCES physio_assessments(assessment_id) ON DELETE RESTRICT,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    session_number INTEGER NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pre-Session Assessment
    pain_score_before INTEGER CHECK (pain_score_before >= 0 AND pain_score_before <= 10),
    subjective_report TEXT, -- Patient's feedback (S)
    interval_history TEXT, -- What happened since last session
    
    -- Objective Findings (O)
    objective_findings TEXT,
    rom_changes TEXT,
    strength_changes TEXT,
    functional_changes TEXT,
    
    -- Treatment Provided (A/P)
    treatment_provided TEXT NOT NULL,
    modalities_used TEXT[],
    modality_parameters JSONB, -- Detailed parameters
    exercises_performed TEXT,
    exercise_sets_reps TEXT,
    manual_techniques_used TEXT,
    
    -- Response
    patient_response TEXT,
    pain_score_after INTEGER CHECK (pain_score_after >= 0 AND pain_score_after <= 10),
    tolerance VARCHAR(50), -- 'Good', 'Fair', 'Poor'
    adverse_reactions TEXT,
    
    -- Progress Notes
    progress_notes TEXT,
    goals_addressed TEXT[],
    
    -- Plan for Next Session
    next_session_plan TEXT,
    home_program_modified BOOLEAN DEFAULT FALSE,
    home_program_changes TEXT,
    
    -- Attendance
    attendance_status attendance_status DEFAULT 'Attended',
    missed_reason TEXT,
    make_up_scheduled BOOLEAN DEFAULT FALSE,
    
    -- Duration
    duration_minutes INTEGER,
    
    -- Audit
    treated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    supervised_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physiotherapy Progress/Outcome Tracking
CREATE TABLE IF NOT EXISTS physio_progress (
    progress_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES physio_assessments(assessment_id) ON DELETE RESTRICT,
    plan_id UUID REFERENCES physio_plans(plan_id) ON DELETE SET NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    encounter_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    evaluation_date DATE NOT NULL,
    evaluation_type evaluation_type NOT NULL,
    session_number_at_eval INTEGER,
    
    -- Outcome Measures
    pain_score INTEGER CHECK (pain_score >= 0 AND pain_score <= 10),
    pain_change INTEGER, -- Compared to initial
    rom_data JSONB, -- Current ROM values
    rom_improvement_percent INTEGER,
    strength_data JSONB, -- Current strength grades
    functional_score INTEGER, -- e.g., Barthel Index, FIM score
    outcome_measure_used VARCHAR(100), -- 'ODI', 'NDI', 'DASH', 'KOOS', 'WOMAC'
    outcome_score INTEGER,
    
    -- Comparison to Initial
    goals_achieved TEXT[],
    goals_in_progress TEXT[],
    goals_not_achieved TEXT[],
    
    -- Clinical Assessment
    progress_summary TEXT,
    clinical_reasoning TEXT,
    complications TEXT,
    barriers_to_progress TEXT,
    
    -- Plan Modifications
    plan_modified BOOLEAN DEFAULT FALSE,
    modifications_made TEXT,
    new_goals TEXT,
    
    -- Recommendations
    continue_therapy BOOLEAN,
    sessions_remaining INTEGER,
    modify_plan BOOLEAN,
    ready_for_discharge BOOLEAN DEFAULT FALSE,
    discharge_recommendations TEXT,
    home_program_final TEXT,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_interval VARCHAR(50),
    
    -- Referral/Communication
    physician_updated BOOLEAN DEFAULT FALSE,
    update_summary TEXT,
    
    -- Audit
    evaluated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physiotherapy Discharge Summary
CREATE TABLE IF NOT EXISTS physio_discharge (
    discharge_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES physio_assessments(assessment_id) ON DELETE RESTRICT,
    plan_id UUID REFERENCES physio_plans(plan_id) ON DELETE SET NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    
    discharge_date DATE NOT NULL,
    discharge_reason VARCHAR(100), -- 'Goals_Met', 'Patient_Request', 'Non_Compliance', 'Medical_Discharge', 'Transfer'
    
    -- Summary
    initial_diagnosis TEXT,
    initial_presentation TEXT,
    total_sessions_attended INTEGER,
    total_sessions_missed INTEGER,
    duration_of_care VARCHAR(50),
    
    -- Outcomes
    initial_pain INTEGER,
    final_pain INTEGER,
    pain_improvement_percent INTEGER,
    
    initial_rom JSONB,
    final_rom JSONB,
    
    initial_strength JSONB,
    final_strength JSONB,
    
    initial_functional_status TEXT,
    final_functional_status TEXT,
    
    goals_summary JSONB, -- {"achieved": [], "partial": [], "not_achieved": []}
    
    -- Discharge Plan
    discharge_instructions TEXT,
    home_exercise_program TEXT,
    activity_guidelines TEXT,
    precautions TEXT,
    
    -- Follow-up
    follow_up_recommended BOOLEAN DEFAULT FALSE,
    follow_up_interval VARCHAR(50),
    return_criteria TEXT, -- When to return
    
    -- Referrals
    referred_to TEXT,
    referral_reason TEXT,
    
    -- Patient Satisfaction
    patient_satisfaction INTEGER CHECK (patient_satisfaction >= 1 AND patient_satisfaction <= 5),
    patient_feedback TEXT,
    
    -- Audit
    discharged_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Dental Module Indexes
CREATE INDEX IF NOT EXISTS idx_dental_exams_patient ON dental_exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_exams_encounter ON dental_exams(encounter_id);
CREATE INDEX IF NOT EXISTS idx_dental_exams_status ON dental_exams(status);
CREATE INDEX IF NOT EXISTS idx_dental_exams_created_at ON dental_exams(created_at);
CREATE INDEX IF NOT EXISTS idx_dental_exams_facility ON dental_exams(facility_id);

CREATE INDEX IF NOT EXISTS idx_dental_chart_exam ON dental_chart(exam_id);
CREATE INDEX IF NOT EXISTS idx_dental_chart_patient ON dental_chart(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_chart_tooth ON dental_chart(tooth_number);

CREATE INDEX IF NOT EXISTS idx_dental_procedures_patient ON dental_procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_procedures_encounter ON dental_procedures(encounter_id);
CREATE INDEX IF NOT EXISTS idx_dental_procedures_status ON dental_procedures(status);
CREATE INDEX IF NOT EXISTS idx_dental_procedures_date ON dental_procedures(procedure_date);

CREATE INDEX IF NOT EXISTS idx_dental_prescriptions_patient ON dental_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_prescriptions_encounter ON dental_prescriptions(encounter_id);

-- Ophthalmology Module Indexes
CREATE INDEX IF NOT EXISTS idx_eye_exams_patient ON eye_exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_eye_exams_encounter ON eye_exams(encounter_id);
CREATE INDEX IF NOT EXISTS idx_eye_exams_status ON eye_exams(status);
CREATE INDEX IF NOT EXISTS idx_eye_exams_created_at ON eye_exams(created_at);
CREATE INDEX IF NOT EXISTS idx_eye_exams_facility ON eye_exams(facility_id);

CREATE INDEX IF NOT EXISTS idx_eye_procedures_patient ON eye_procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_eye_procedures_encounter ON eye_procedures(encounter_id);
CREATE INDEX IF NOT EXISTS idx_eye_procedures_type ON eye_procedures(procedure_type);

CREATE INDEX IF NOT EXISTS idx_eye_prescriptions_patient ON eye_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_eye_prescriptions_encounter ON eye_prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_eye_prescriptions_type ON eye_prescriptions(prescription_type);

-- Physiotherapy Module Indexes
CREATE INDEX IF NOT EXISTS idx_physio_assessments_patient ON physio_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_assessments_encounter ON physio_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_physio_assessments_status ON physio_assessments(status);
CREATE INDEX IF NOT EXISTS idx_physio_assessments_created_at ON physio_assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_physio_assessments_facility ON physio_assessments(facility_id);

CREATE INDEX IF NOT EXISTS idx_physio_plans_assessment ON physio_plans(assessment_id);
CREATE INDEX IF NOT EXISTS idx_physio_plans_patient ON physio_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_plans_status ON physio_plans(status);

CREATE INDEX IF NOT EXISTS idx_physio_sessions_plan ON physio_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_physio_sessions_patient ON physio_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_sessions_date ON physio_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_physio_sessions_attendance ON physio_sessions(attendance_status);

CREATE INDEX IF NOT EXISTS idx_physio_progress_patient ON physio_progress(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_progress_assessment ON physio_progress(assessment_id);
CREATE INDEX IF NOT EXISTS idx_physio_progress_date ON physio_progress(evaluation_date);

CREATE INDEX IF NOT EXISTS idx_physio_discharge_patient ON physio_discharge(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_discharge_date ON physio_discharge(discharge_date);


-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all specialty tables
ALTER TABLE dental_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_discharge ENABLE ROW LEVEL SECURITY;

-- Basic policy: Authenticated users can view records from their facility
-- (More granular role-based policies should be added based on RBAC requirements)

-- Dental Module Policies
DROP POLICY IF EXISTS dental_exams_select_policy ON dental_exams;
CREATE POLICY dental_exams_select_policy ON dental_exams
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS dental_exams_insert_policy ON dental_exams;
CREATE POLICY dental_exams_insert_policy ON dental_exams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS dental_exams_update_policy ON dental_exams;
CREATE POLICY dental_exams_update_policy ON dental_exams
    FOR UPDATE USING (auth.role() = 'authenticated' AND finalized_at IS NULL);

-- Eye Module Policies
DROP POLICY IF EXISTS eye_exams_select_policy ON eye_exams;
CREATE POLICY eye_exams_select_policy ON eye_exams
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS eye_exams_insert_policy ON eye_exams;
CREATE POLICY eye_exams_insert_policy ON eye_exams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS eye_exams_update_policy ON eye_exams;
CREATE POLICY eye_exams_update_policy ON eye_exams
    FOR UPDATE USING (auth.role() = 'authenticated' AND finalized_at IS NULL);

-- Physio Module Policies
DROP POLICY IF EXISTS physio_assessments_select_policy ON physio_assessments;
CREATE POLICY physio_assessments_select_policy ON physio_assessments
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS physio_assessments_insert_policy ON physio_assessments;
CREATE POLICY physio_assessments_insert_policy ON physio_assessments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS physio_assessments_update_policy ON physio_assessments;
CREATE POLICY physio_assessments_update_policy ON physio_assessments
    FOR UPDATE USING (auth.role() = 'authenticated' AND finalized_at IS NULL);

-- Policies for child tables
DROP POLICY IF EXISTS dental_chart_all_policy ON dental_chart;
CREATE POLICY dental_chart_all_policy ON dental_chart
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS dental_procedures_all_policy ON dental_procedures;
CREATE POLICY dental_procedures_all_policy ON dental_procedures
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS dental_prescriptions_all_policy ON dental_prescriptions;
CREATE POLICY dental_prescriptions_all_policy ON dental_prescriptions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS eye_procedures_all_policy ON eye_procedures;
CREATE POLICY eye_procedures_all_policy ON eye_procedures
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS eye_prescriptions_all_policy ON eye_prescriptions;
CREATE POLICY eye_prescriptions_all_policy ON eye_prescriptions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS physio_plans_all_policy ON physio_plans;
CREATE POLICY physio_plans_all_policy ON physio_plans
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS physio_sessions_all_policy ON physio_sessions;
CREATE POLICY physio_sessions_all_policy ON physio_sessions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS physio_progress_all_policy ON physio_progress;
CREATE POLICY physio_progress_all_policy ON physio_progress
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS physio_discharge_all_policy ON physio_discharge;
CREATE POLICY physio_discharge_all_policy ON physio_discharge
    FOR ALL USING (auth.role() = 'authenticated');


-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Reuse existing update_updated_at_column function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Dental Module Triggers
DROP TRIGGER IF EXISTS update_dental_exams_updated_at ON dental_exams;
CREATE TRIGGER update_dental_exams_updated_at
    BEFORE UPDATE ON dental_exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dental_chart_updated_at ON dental_chart;
CREATE TRIGGER update_dental_chart_updated_at
    BEFORE UPDATE ON dental_chart
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dental_procedures_updated_at ON dental_procedures;
CREATE TRIGGER update_dental_procedures_updated_at
    BEFORE UPDATE ON dental_procedures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Eye Module Triggers
DROP TRIGGER IF EXISTS update_eye_exams_updated_at ON eye_exams;
CREATE TRIGGER update_eye_exams_updated_at
    BEFORE UPDATE ON eye_exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_eye_procedures_updated_at ON eye_procedures;
CREATE TRIGGER update_eye_procedures_updated_at
    BEFORE UPDATE ON eye_procedures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Physio Module Triggers
DROP TRIGGER IF EXISTS update_physio_assessments_updated_at ON physio_assessments;
CREATE TRIGGER update_physio_assessments_updated_at
    BEFORE UPDATE ON physio_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_physio_plans_updated_at ON physio_plans;
CREATE TRIGGER update_physio_plans_updated_at
    BEFORE UPDATE ON physio_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_physio_sessions_updated_at ON physio_sessions;
CREATE TRIGGER update_physio_sessions_updated_at
    BEFORE UPDATE ON physio_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_physio_progress_updated_at ON physio_progress;
CREATE TRIGGER update_physio_progress_updated_at
    BEFORE UPDATE ON physio_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE dental_exams IS 'Main dental examination record, encounter-linked';
COMMENT ON TABLE dental_chart IS 'Tooth-by-tooth condition documentation (FDI system)';
COMMENT ON TABLE dental_procedures IS 'Dental procedures and treatments performed';
COMMENT ON TABLE dental_prescriptions IS 'Dental-specific prescriptions';

COMMENT ON TABLE eye_exams IS 'Comprehensive eye examination record';
COMMENT ON TABLE eye_procedures IS 'Eye procedures and diagnostic tests';
COMMENT ON TABLE eye_prescriptions IS 'Glasses, contact lens, and eye medication prescriptions';

COMMENT ON TABLE physio_assessments IS 'Initial physiotherapy assessment/evaluation';
COMMENT ON TABLE physio_plans IS 'Physiotherapy treatment plan with modalities';
COMMENT ON TABLE physio_sessions IS 'Per-visit session documentation (SOAP format)';
COMMENT ON TABLE physio_progress IS 'Periodic progress evaluation and outcome tracking';
COMMENT ON TABLE physio_discharge IS 'Discharge summary with outcomes';


-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON dental_exams TO authenticated;
GRANT ALL ON dental_chart TO authenticated;
GRANT ALL ON dental_procedures TO authenticated;
GRANT ALL ON dental_prescriptions TO authenticated;
GRANT ALL ON eye_exams TO authenticated;
GRANT ALL ON eye_procedures TO authenticated;
GRANT ALL ON eye_prescriptions TO authenticated;
GRANT ALL ON physio_assessments TO authenticated;
GRANT ALL ON physio_plans TO authenticated;
GRANT ALL ON physio_sessions TO authenticated;
GRANT ALL ON physio_progress TO authenticated;
GRANT ALL ON physio_discharge TO authenticated;

-- Grant usage on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
