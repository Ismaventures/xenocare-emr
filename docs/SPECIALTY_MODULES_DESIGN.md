# 🏥 EMR Specialty Modules Design Document
## Dental · Ophthalmology · Physiotherapy

---

## 📋 Executive Summary

This document outlines the design for three specialty clinical modules that integrate seamlessly with the existing encounter-centric EMR architecture used at NDC Medical Centre.

**Design Principles:**
- All records are encounter-linked (patient_id + encounter_id + provider + timestamp)
- Problem-oriented documentation (Complaint → Assessment → Plan)
- Role-based access with specialty isolation
- Structured data with narrative support
- Audit-ready with immutable finalized records

---

## 🗃️ Database Schema Design

### Common Patterns (Matching Existing Architecture)

All specialty tables follow these conventions:
- Primary key: UUID with `uuid_generate_v4()`
- Mandatory columns: `patient_id`, `encounter_id`, `created_by`, `created_at`, `updated_at`
- Status tracking: Uses existing `request_status` enum
- Priority: Uses existing `priority` enum
- Soft delete via status change, not hard delete

---

## 🦷 DENTAL MODULE

### 1. Database Tables

```sql
-- =============================================================================
-- DENTAL MODULE TABLES
-- =============================================================================

-- Dental Examination Record (main encounter-linked record)
CREATE TABLE IF NOT EXISTS dental_exams (
    exam_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    
    -- Chief Complaint
    chief_complaint TEXT,
    complaint_duration VARCHAR(100),
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    pain_character VARCHAR(50), -- 'Sharp', 'Dull', 'Throbbing', 'Intermittent'
    
    -- Oral Examination
    extraoral_findings TEXT,
    intraoral_findings TEXT,
    soft_tissue_exam TEXT,
    hard_tissue_exam TEXT,
    occlusion_notes TEXT,
    tmj_assessment TEXT,
    
    -- Periodontal Assessment
    gingival_status VARCHAR(50), -- 'Healthy', 'Gingivitis', 'Periodontitis'
    bleeding_on_probing BOOLEAN DEFAULT FALSE,
    plaque_score INTEGER, -- 0-100
    calculus_present BOOLEAN DEFAULT FALSE,
    pocket_depth_notes TEXT,
    
    -- Radiographic Findings
    radiograph_type VARCHAR(50), -- 'Periapical', 'Bitewing', 'OPG', 'CBCT'
    radiograph_findings TEXT,
    
    -- Diagnosis
    provisional_diagnosis TEXT,
    final_diagnosis TEXT,
    icd_codes TEXT[], -- Array of ICD-10 codes
    
    -- Treatment Plan
    treatment_plan TEXT,
    urgency VARCHAR(20) DEFAULT 'Routine', -- 'Routine', 'Urgent', 'Emergency'
    estimated_sessions INTEGER,
    
    -- Follow-up
    follow_up_date TIMESTAMP WITH TIME ZONE,
    follow_up_notes TEXT,
    
    -- Audit
    status request_status DEFAULT 'Pending',
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES staff(id)
);

-- Dental Chart (Tooth-by-Tooth Documentation)
CREATE TABLE IF NOT EXISTS dental_chart (
    chart_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    exam_id UUID NOT NULL REFERENCES dental_exams(exam_id) ON DELETE CASCADE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    
    -- Tooth Identification (FDI/ISO System)
    tooth_number INTEGER NOT NULL CHECK (tooth_number >= 11 AND tooth_number <= 85),
    quadrant INTEGER GENERATED ALWAYS AS (tooth_number / 10) STORED,
    
    -- Condition
    tooth_status VARCHAR(50) NOT NULL DEFAULT 'Present',
    -- 'Present', 'Missing', 'Impacted', 'Deciduous', 'Unerupted'
    
    condition VARCHAR(50),
    -- 'Healthy', 'Caries', 'Filled', 'Crown', 'Bridge_Abutment', 
    -- 'Root_Canal_Treated', 'Fractured', 'Mobile', 'Extracted'
    
    caries_classification VARCHAR(20), -- 'Class_I' to 'Class_VI'
    mobility_grade INTEGER CHECK (mobility_grade >= 0 AND mobility_grade <= 3),
    
    -- Surface Involvement (MODBL)
    mesial BOOLEAN DEFAULT FALSE,
    occlusal BOOLEAN DEFAULT FALSE,
    distal BOOLEAN DEFAULT FALSE,
    buccal BOOLEAN DEFAULT FALSE,
    lingual BOOLEAN DEFAULT FALSE,
    
    -- Additional Findings
    periapical_status VARCHAR(50), -- 'Normal', 'Periapical_Abscess', 'Granuloma'
    restoration_material VARCHAR(50), -- 'Amalgam', 'Composite', 'GIC', 'Ceramic'
    notes TEXT,
    
    -- Audit
    recorded_by UUID REFERENCES staff(id),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(exam_id, tooth_number)
);

-- Dental Procedures
CREATE TABLE IF NOT EXISTS dental_procedures (
    procedure_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    exam_id UUID REFERENCES dental_exams(exam_id),
    
    -- Procedure Details
    procedure_type VARCHAR(100) NOT NULL,
    -- 'Extraction', 'Filling', 'Scaling_Polishing', 'Root_Canal', 
    -- 'Crown_Preparation', 'Bridge_Work', 'Denture_Impression', 'Splinting'
    
    tooth_numbers INTEGER[], -- Array of affected teeth
    procedure_description TEXT,
    
    -- Anesthesia
    anesthesia_type VARCHAR(50), -- 'Local', 'Block', 'Sedation', 'None'
    anesthesia_agent VARCHAR(100),
    anesthesia_quantity VARCHAR(50),
    
    -- Pre-Procedure
    consent_obtained BOOLEAN DEFAULT FALSE,
    pre_procedure_notes TEXT,
    
    -- Procedure Execution
    procedure_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    complications TEXT,
    
    -- Post-Procedure
    post_procedure_instructions TEXT,
    medications_prescribed TEXT,
    sutures_placed BOOLEAN DEFAULT FALSE,
    suture_removal_date DATE,
    
    -- Status & Audit
    status request_status DEFAULT 'Pending',
    priority priority DEFAULT 'Normal',
    performed_by UUID REFERENCES staff(id),
    assisted_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Dental Prescriptions (Specific to Dental)
CREATE TABLE IF NOT EXISTS dental_prescriptions (
    prescription_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    exam_id UUID REFERENCES dental_exams(exam_id),
    procedure_id UUID REFERENCES dental_procedures(procedure_id),
    
    -- Medication Details
    medication_name VARCHAR(255) NOT NULL,
    medication_type VARCHAR(50), -- 'Analgesic', 'Antibiotic', 'Antiseptic', 'Other'
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    route VARCHAR(50) DEFAULT 'Oral',
    quantity INTEGER,
    
    -- Instructions
    special_instructions TEXT,
    
    -- Audit
    prescribed_by UUID REFERENCES staff(id),
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Active'
);

-- Create indexes
CREATE INDEX idx_dental_exams_patient ON dental_exams(patient_id);
CREATE INDEX idx_dental_exams_encounter ON dental_exams(encounter_id);
CREATE INDEX idx_dental_chart_exam ON dental_chart(exam_id);
CREATE INDEX idx_dental_chart_tooth ON dental_chart(tooth_number);
CREATE INDEX idx_dental_procedures_patient ON dental_procedures(patient_id);
CREATE INDEX idx_dental_procedures_encounter ON dental_procedures(encounter_id);
```

### 2. Dental Module DTOs (TypeScript)

```typescript
// src/renderer/modules/dental/dtos/dental.dto.ts

export type ToothCondition = 
  | 'Healthy' | 'Caries' | 'Filled' | 'Crown' | 'Bridge_Abutment'
  | 'Root_Canal_Treated' | 'Fractured' | 'Mobile' | 'Extracted';

export type ToothStatus = 
  | 'Present' | 'Missing' | 'Impacted' | 'Deciduous' | 'Unerupted';

export type DentalProcedureType = 
  | 'Extraction' | 'Filling' | 'Scaling_Polishing' | 'Root_Canal'
  | 'Crown_Preparation' | 'Bridge_Work' | 'Denture_Impression' | 'Splinting';

export type GingivalStatus = 'Healthy' | 'Gingivitis' | 'Periodontitis';

export interface DentalExamDTO {
  exam_id: string;
  patient_id: string;
  encounter_id: string;
  consultation_id?: string;
  
  // Chief Complaint
  chief_complaint?: string;
  complaint_duration?: string;
  pain_level?: number;
  pain_character?: string;
  
  // Examination
  extraoral_findings?: string;
  intraoral_findings?: string;
  soft_tissue_exam?: string;
  hard_tissue_exam?: string;
  occlusion_notes?: string;
  tmj_assessment?: string;
  
  // Periodontal
  gingival_status?: GingivalStatus;
  bleeding_on_probing?: boolean;
  plaque_score?: number;
  calculus_present?: boolean;
  pocket_depth_notes?: string;
  
  // Diagnosis
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  icd_codes?: string[];
  
  // Treatment
  treatment_plan?: string;
  urgency?: 'Routine' | 'Urgent' | 'Emergency';
  
  // Follow-up
  follow_up_date?: string;
  follow_up_notes?: string;
  
  // Audit
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
}

export interface DentalChartEntryDTO {
  chart_id?: string;
  exam_id: string;
  patient_id: string;
  encounter_id: string;
  
  tooth_number: number;
  tooth_status: ToothStatus;
  condition?: ToothCondition;
  caries_classification?: string;
  mobility_grade?: number;
  
  // Surfaces (MODBL)
  mesial?: boolean;
  occlusal?: boolean;
  distal?: boolean;
  buccal?: boolean;
  lingual?: boolean;
  
  periapical_status?: string;
  restoration_material?: string;
  notes?: string;
}

export interface DentalProcedureDTO {
  procedure_id?: string;
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  
  procedure_type: DentalProcedureType;
  tooth_numbers?: number[];
  procedure_description?: string;
  
  anesthesia_type?: string;
  anesthesia_agent?: string;
  
  consent_obtained?: boolean;
  pre_procedure_notes?: string;
  
  procedure_date?: string;
  duration_minutes?: number;
  complications?: string;
  
  post_procedure_instructions?: string;
  sutures_placed?: boolean;
  suture_removal_date?: string;
  
  status: string;
  priority?: string;
  performed_by?: string;
}

export interface CreateDentalExamDTO {
  patient_id: string;
  encounter_id: string;
  chief_complaint?: string;
  pain_level?: number;
  extraoral_findings?: string;
  intraoral_findings?: string;
  gingival_status?: GingivalStatus;
  provisional_diagnosis?: string;
  treatment_plan?: string;
  urgency?: string;
}
```

### 3. Dental Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DENTAL ENCOUNTER WORKFLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PATIENT CHECK-IN (Registration/Encounter Module)             │
│     └── Creates visit → visit_id / encounter_id                  │
│                                                                  │
│  2. DENTAL TRIAGE (Dental Queue)                                 │
│     └── Patient routed to Dental Department queue                │
│                                                                  │
│  3. DENTAL EXAMINATION                                           │
│     ├── Chief Complaint Documentation                            │
│     ├── Oral Examination                                         │
│     ├── Dental Charting (32/20 teeth)                           │
│     ├── Periodontal Assessment                                   │
│     └── Radiograph Review (if ordered)                          │
│                                                                  │
│  4. DIAGNOSIS & PLANNING                                         │
│     ├── Provisional/Final Diagnosis                              │
│     ├── Treatment Plan                                           │
│     └── Procedure Scheduling                                     │
│                                                                  │
│  5. PROCEDURES (If same-day)                                     │
│     ├── Consent                                                  │
│     ├── Anesthesia (if required)                                │
│     ├── Procedure Execution                                      │
│     └── Post-Op Instructions                                     │
│                                                                  │
│  6. PRESCRIPTIONS                                                │
│     └── Analgesics, Antibiotics, Mouthwash                      │
│                                                                  │
│  7. BILLING                                                      │
│     └── Billing order created → Links to encounter_id            │
│                                                                  │
│  8. FOLLOW-UP                                                    │
│     └── Schedule return visit if needed                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👁️ OPHTHALMOLOGY MODULE

### 1. Database Tables

```sql
-- =============================================================================
-- OPHTHALMOLOGY MODULE TABLES
-- =============================================================================

-- Eye Examination Record
CREATE TABLE IF NOT EXISTS eye_exams (
    exam_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    
    -- Chief Complaint
    chief_complaint TEXT,
    complaint_duration VARCHAR(100),
    affected_eye VARCHAR(20), -- 'Right', 'Left', 'Both'
    
    -- History
    ocular_history TEXT,
    systemic_history TEXT, -- Diabetes, Hypertension relevant
    family_history TEXT,
    drug_allergy TEXT,
    current_medications TEXT,
    
    -- Visual Acuity
    va_right_unaided VARCHAR(20), -- e.g., '6/6', '6/12', 'CF', 'HM', 'PL', 'NPL'
    va_left_unaided VARCHAR(20),
    va_right_aided VARCHAR(20), -- With current glasses
    va_left_aided VARCHAR(20),
    va_right_pinhole VARCHAR(20),
    va_left_pinhole VARCHAR(20),
    va_right_near VARCHAR(20), -- Near vision (N5, N6, etc.)
    va_left_near VARCHAR(20),
    
    -- Auto-Refraction (if available)
    ar_right_sphere DECIMAL(5,2),
    ar_right_cylinder DECIMAL(5,2),
    ar_right_axis INTEGER,
    ar_left_sphere DECIMAL(5,2),
    ar_left_cylinder DECIMAL(5,2),
    ar_left_axis INTEGER,
    
    -- Subjective Refraction (Final Rx)
    rx_right_sphere DECIMAL(5,2),
    rx_right_cylinder DECIMAL(5,2),
    rx_right_axis INTEGER,
    rx_right_add DECIMAL(5,2), -- For presbyopia
    rx_left_sphere DECIMAL(5,2),
    rx_left_cylinder DECIMAL(5,2),
    rx_left_axis INTEGER,
    rx_left_add DECIMAL(5,2),
    rx_pd INTEGER, -- Pupillary distance
    
    -- Intraocular Pressure
    iop_right DECIMAL(4,1), -- mmHg
    iop_left DECIMAL(4,1),
    iop_method VARCHAR(50), -- 'NCT', 'Goldmann', 'iCare', 'Schiotz'
    iop_time TIME,
    
    -- Anterior Segment (Slit Lamp)
    anterior_right_lids TEXT,
    anterior_right_conjunctiva TEXT,
    anterior_right_cornea TEXT,
    anterior_right_ac TEXT, -- Anterior Chamber
    anterior_right_iris TEXT,
    anterior_right_pupil TEXT,
    anterior_right_lens TEXT,
    
    anterior_left_lids TEXT,
    anterior_left_conjunctiva TEXT,
    anterior_left_cornea TEXT,
    anterior_left_ac TEXT,
    anterior_left_iris TEXT,
    anterior_left_pupil TEXT,
    anterior_left_lens TEXT,
    
    -- Posterior Segment (Fundoscopy)
    posterior_right_media TEXT,
    posterior_right_disc TEXT,
    posterior_right_cdr DECIMAL(3,2), -- Cup-Disc Ratio e.g., 0.3
    posterior_right_macula TEXT,
    posterior_right_vessels TEXT,
    posterior_right_periphery TEXT,
    
    posterior_left_media TEXT,
    posterior_left_disc TEXT,
    posterior_left_cdr DECIMAL(3,2),
    posterior_left_macula TEXT,
    posterior_left_vessels TEXT,
    posterior_left_periphery TEXT,
    
    -- Additional Tests
    color_vision TEXT,
    contrast_sensitivity TEXT,
    visual_field_notes TEXT,
    
    -- Diagnosis
    provisional_diagnosis TEXT,
    final_diagnosis TEXT,
    icd_codes TEXT[],
    
    -- Treatment Plan
    treatment_plan TEXT,
    glasses_prescribed BOOLEAN DEFAULT FALSE,
    referral_needed BOOLEAN DEFAULT FALSE,
    referral_to VARCHAR(100), -- 'Retina Specialist', 'Glaucoma Specialist', etc.
    
    -- Follow-up
    follow_up_interval VARCHAR(50), -- '1 week', '1 month', '3 months'
    follow_up_date TIMESTAMP WITH TIME ZONE,
    follow_up_notes TEXT,
    
    -- Audit
    status request_status DEFAULT 'Pending',
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES staff(id)
);

-- Eye Procedures
CREATE TABLE IF NOT EXISTS eye_procedures (
    procedure_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    exam_id UUID REFERENCES eye_exams(exam_id),
    
    procedure_type VARCHAR(100) NOT NULL,
    -- 'Refraction', 'Tonometry', 'Fundoscopy', 'Slit_Lamp', 'Visual_Field',
    -- 'OCT', 'Fundus_Photo', 'Gonioscopy', 'Minor_Surgery', 'Injection'
    
    affected_eye VARCHAR(20), -- 'Right', 'Left', 'Both'
    procedure_notes TEXT,
    findings TEXT,
    
    -- For minor procedures
    anesthesia_used VARCHAR(100),
    complications TEXT,
    
    status request_status DEFAULT 'Pending',
    performed_by UUID REFERENCES staff(id),
    performed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Glasses/Lens Prescription
CREATE TABLE IF NOT EXISTS eye_prescriptions (
    prescription_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    exam_id UUID REFERENCES eye_exams(exam_id),
    
    prescription_type VARCHAR(50) NOT NULL, -- 'Glasses', 'Contact_Lens', 'Eye_Drops'
    
    -- For Glasses/Contact Lens
    right_sphere DECIMAL(5,2),
    right_cylinder DECIMAL(5,2),
    right_axis INTEGER,
    right_add DECIMAL(5,2),
    right_prism VARCHAR(50),
    
    left_sphere DECIMAL(5,2),
    left_cylinder DECIMAL(5,2),
    left_axis INTEGER,
    left_add DECIMAL(5,2),
    left_prism VARCHAR(50),
    
    pd INTEGER,
    lens_type VARCHAR(100), -- 'Single_Vision', 'Bifocal', 'Progressive', 'Photochromic'
    lens_material VARCHAR(100),
    coating VARCHAR(100), -- 'Anti_Reflective', 'Blue_Light_Filter'
    frame_recommendation TEXT,
    
    -- For Eye Drops/Medications
    medication_name VARCHAR(255),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    affected_eye VARCHAR(20),
    special_instructions TEXT,
    
    -- Audit
    prescribed_by UUID REFERENCES staff(id),
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'Active'
);

-- Create indexes
CREATE INDEX idx_eye_exams_patient ON eye_exams(patient_id);
CREATE INDEX idx_eye_exams_encounter ON eye_exams(encounter_id);
CREATE INDEX idx_eye_procedures_patient ON eye_procedures(patient_id);
CREATE INDEX idx_eye_prescriptions_patient ON eye_prescriptions(patient_id);
```

### 2. Ophthalmology DTOs (TypeScript)

```typescript
// src/renderer/modules/ophthalmology/dtos/ophthalmology.dto.ts

export type AffectedEye = 'Right' | 'Left' | 'Both';
export type VisualAcuity = '6/6' | '6/9' | '6/12' | '6/18' | '6/24' | '6/36' | '6/60' 
  | 'CF' | 'HM' | 'PL' | 'NPL'; // CF=Counting Fingers, HM=Hand Movement, PL=Perception of Light

export type IOPMethod = 'NCT' | 'Goldmann' | 'iCare' | 'Schiotz';
export type LensType = 'Single_Vision' | 'Bifocal' | 'Progressive' | 'Photochromic';

export interface EyeExamDTO {
  exam_id: string;
  patient_id: string;
  encounter_id: string;
  
  // Chief Complaint
  chief_complaint?: string;
  affected_eye?: AffectedEye;
  
  // Visual Acuity
  va_right_unaided?: string;
  va_left_unaided?: string;
  va_right_aided?: string;
  va_left_aided?: string;
  va_right_pinhole?: string;
  va_left_pinhole?: string;
  
  // Refraction
  rx_right_sphere?: number;
  rx_right_cylinder?: number;
  rx_right_axis?: number;
  rx_left_sphere?: number;
  rx_left_cylinder?: number;
  rx_left_axis?: number;
  rx_pd?: number;
  
  // IOP
  iop_right?: number;
  iop_left?: number;
  iop_method?: IOPMethod;
  
  // Anterior Segment
  anterior_right_lids?: string;
  anterior_right_conjunctiva?: string;
  anterior_right_cornea?: string;
  anterior_right_lens?: string;
  anterior_left_lids?: string;
  anterior_left_conjunctiva?: string;
  anterior_left_cornea?: string;
  anterior_left_lens?: string;
  
  // Posterior Segment
  posterior_right_disc?: string;
  posterior_right_cdr?: number;
  posterior_right_macula?: string;
  posterior_left_disc?: string;
  posterior_left_cdr?: number;
  posterior_left_macula?: string;
  
  // Diagnosis
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  icd_codes?: string[];
  
  // Plan
  treatment_plan?: string;
  glasses_prescribed?: boolean;
  referral_needed?: boolean;
  follow_up_date?: string;
  
  // Audit
  status: string;
  created_at: string;
}

export interface GlassesPrescriptionDTO {
  prescription_id?: string;
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  
  right_sphere?: number;
  right_cylinder?: number;
  right_axis?: number;
  right_add?: number;
  
  left_sphere?: number;
  left_cylinder?: number;
  left_axis?: number;
  left_add?: number;
  
  pd?: number;
  lens_type?: LensType;
  lens_material?: string;
  coating?: string;
  frame_recommendation?: string;
  
  valid_until?: string;
}

export interface EyeDropPrescriptionDTO {
  prescription_id?: string;
  patient_id: string;
  encounter_id: string;
  
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  affected_eye: AffectedEye;
  special_instructions?: string;
}
```

### 3. Ophthalmology Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  OPHTHALMOLOGY ENCOUNTER WORKFLOW                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PATIENT CHECK-IN → Encounter Created                         │
│                                                                  │
│  2. PRELIMINARY TESTS (Optometrist/Technician)                   │
│     ├── Visual Acuity (Distance & Near)                          │
│     ├── Auto-Refraction                                          │
│     ├── Non-Contact Tonometry                                    │
│     └── Color Vision (if indicated)                              │
│                                                                  │
│  3. OPHTHALMOLOGIST EXAMINATION                                  │
│     ├── History Review                                           │
│     ├── Subjective Refraction                                    │
│     ├── Slit Lamp Examination (Anterior Segment)                 │
│     ├── Fundoscopy (Posterior Segment)                           │
│     └── Additional Tests (Gonioscopy, Visual Field, OCT)        │
│                                                                  │
│  4. DIAGNOSIS                                                    │
│     ├── Refractive Error                                         │
│     ├── Cataract                                                 │
│     ├── Glaucoma                                                 │
│     ├── Diabetic Retinopathy                                     │
│     ├── Macular Degeneration                                     │
│     └── Infections/Inflammations                                 │
│                                                                  │
│  5. TREATMENT PLAN                                               │
│     ├── Glasses Prescription                                     │
│     ├── Eye Drop Prescription                                    │
│     ├── Referral (Surgery, Specialist)                          │
│     └── Imaging Orders (OCT, Visual Field, Fundus Photo)        │
│                                                                  │
│  6. BILLING → encounter_id linked                                │
│                                                                  │
│  7. FOLLOW-UP SCHEDULING                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤸 PHYSIOTHERAPY MODULE

### 1. Database Tables

```sql
-- =============================================================================
-- PHYSIOTHERAPY MODULE TABLES
-- =============================================================================

-- Physiotherapy Assessment
CREATE TABLE IF NOT EXISTS physio_assessments (
    assessment_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    referral_source VARCHAR(100), -- Doctor who referred
    
    -- Referral Details
    referral_diagnosis TEXT,
    referral_date DATE,
    
    -- Chief Complaint
    chief_complaint TEXT,
    complaint_duration VARCHAR(100),
    onset_type VARCHAR(50), -- 'Sudden', 'Gradual', 'Traumatic'
    mechanism_of_injury TEXT,
    
    -- Pain Assessment
    pain_location TEXT,
    pain_score INTEGER CHECK (pain_score >= 0 AND pain_score <= 10),
    pain_at_rest INTEGER CHECK (pain_at_rest >= 0 AND pain_at_rest <= 10),
    pain_on_activity INTEGER CHECK (pain_on_activity >= 0 AND pain_on_activity <= 10),
    pain_character VARCHAR(100), -- 'Sharp', 'Dull', 'Burning', 'Aching'
    aggravating_factors TEXT,
    relieving_factors TEXT,
    
    -- Functional Assessment
    functional_status TEXT, -- Current functional limitations
    mobility_status VARCHAR(50), -- 'Independent', 'Assisted', 'Dependent'
    gait_pattern VARCHAR(100),
    balance_assessment TEXT,
    
    -- Range of Motion (Affected Area)
    rom_notes TEXT, -- Detailed ROM findings
    rom_flexion_active INTEGER,
    rom_flexion_passive INTEGER,
    rom_extension_active INTEGER,
    rom_extension_passive INTEGER,
    rom_other_movements TEXT, -- Rotation, abduction, etc.
    
    -- Muscle Strength (MRC Scale 0-5)
    muscle_strength_grade INTEGER CHECK (muscle_strength_grade >= 0 AND muscle_strength_grade <= 5),
    muscle_strength_notes TEXT,
    
    -- Special Tests
    special_tests_performed TEXT[], -- Array of test names
    special_tests_findings TEXT,
    
    -- Neurological Screen
    sensation_intact BOOLEAN,
    reflexes_normal BOOLEAN,
    neurological_notes TEXT,
    
    -- Posture Assessment
    posture_findings TEXT,
    
    -- Previous Treatment
    previous_physio_treatment BOOLEAN DEFAULT FALSE,
    previous_treatment_details TEXT,
    
    -- Diagnosis
    physio_diagnosis TEXT,
    icd_codes TEXT[],
    problem_list TEXT[],
    
    -- Goals
    short_term_goals TEXT,
    long_term_goals TEXT,
    expected_outcomes TEXT,
    estimated_sessions INTEGER,
    
    -- Precautions/Contraindications
    red_flags TEXT,
    precautions TEXT,
    contraindications TEXT,
    
    -- Audit
    status request_status DEFAULT 'Pending',
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES staff(id)
);

-- Physiotherapy Treatment Plan
CREATE TABLE IF NOT EXISTS physio_plans (
    plan_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES physio_assessments(assessment_id),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    
    -- Treatment Modalities
    manual_therapy BOOLEAN DEFAULT FALSE,
    manual_therapy_techniques TEXT[], -- 'Mobilization', 'Manipulation', 'Massage', 'MFR'
    
    therapeutic_exercise BOOLEAN DEFAULT FALSE,
    exercises_prescribed TEXT, -- Detailed exercise program
    
    electrotherapy BOOLEAN DEFAULT FALSE,
    electro_modalities TEXT[], -- 'TENS', 'IFT', 'Ultrasound', 'SWD', 'MWD', 'Laser'
    
    heat_therapy BOOLEAN DEFAULT FALSE,
    cold_therapy BOOLEAN DEFAULT FALSE,
    hydrotherapy BOOLEAN DEFAULT FALSE,
    
    traction BOOLEAN DEFAULT FALSE,
    traction_type VARCHAR(50),
    
    -- Assistive Devices
    assistive_devices TEXT[], -- 'Walker', 'Crutches', 'Wheelchair', 'Splint'
    
    -- Session Frequency
    frequency VARCHAR(50), -- '3x/week', 'Daily', 'Alternate days'
    session_duration_minutes INTEGER,
    total_sessions_planned INTEGER,
    
    -- Home Exercise Program
    home_exercises TEXT,
    patient_education TEXT,
    
    -- Precautions
    treatment_precautions TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'On_Hold', 'Completed', 'Discharged'
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physiotherapy Session Notes (Per Visit)
CREATE TABLE IF NOT EXISTS physio_sessions (
    session_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES physio_plans(plan_id),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    
    session_number INTEGER NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pre-Session Assessment
    pain_score_before INTEGER CHECK (pain_score_before >= 0 AND pain_score_before <= 10),
    subjective_report TEXT, -- Patient's feedback
    
    -- Treatment Provided
    treatment_provided TEXT NOT NULL,
    modalities_used TEXT[],
    exercises_performed TEXT,
    manual_techniques_used TEXT,
    
    -- Parameters (for electrotherapy)
    parameters_used TEXT, -- Intensity, duration, etc.
    
    -- Response
    patient_response TEXT,
    pain_score_after INTEGER CHECK (pain_score_after >= 0 AND pain_score_after <= 10),
    adverse_reactions TEXT,
    
    -- Progress Notes
    progress_notes TEXT,
    objective_findings TEXT, -- ROM changes, strength changes
    
    -- Plan for Next Session
    next_session_plan TEXT,
    home_program_modified BOOLEAN DEFAULT FALSE,
    home_program_changes TEXT,
    
    -- Attendance
    attendance_status VARCHAR(50) DEFAULT 'Attended', -- 'Attended', 'Missed', 'Cancelled'
    missed_reason TEXT,
    
    -- Audit
    treated_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physiotherapy Progress/Outcome Tracking
CREATE TABLE IF NOT EXISTS physio_progress (
    progress_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES physio_assessments(assessment_id),
    plan_id UUID REFERENCES physio_plans(plan_id),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    
    evaluation_date DATE NOT NULL,
    evaluation_type VARCHAR(50), -- 'Initial', 'Progress', 'Discharge'
    
    -- Outcome Measures
    pain_score INTEGER,
    rom_improvement_percent INTEGER,
    strength_grade INTEGER,
    functional_score INTEGER, -- e.g., Barthel Index, FIM score
    
    -- Comparison to Initial
    goals_achieved TEXT[],
    goals_pending TEXT[],
    
    -- Clinical Notes
    progress_summary TEXT,
    complications TEXT,
    
    -- Recommendations
    continue_therapy BOOLEAN,
    modify_plan BOOLEAN,
    ready_for_discharge BOOLEAN,
    discharge_recommendations TEXT,
    
    -- Audit
    evaluated_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_physio_assessments_patient ON physio_assessments(patient_id);
CREATE INDEX idx_physio_assessments_encounter ON physio_assessments(encounter_id);
CREATE INDEX idx_physio_plans_assessment ON physio_plans(assessment_id);
CREATE INDEX idx_physio_sessions_plan ON physio_sessions(plan_id);
CREATE INDEX idx_physio_sessions_date ON physio_sessions(session_date);
CREATE INDEX idx_physio_progress_patient ON physio_progress(patient_id);
```

### 2. Physiotherapy DTOs (TypeScript)

```typescript
// src/renderer/modules/physiotherapy/dtos/physiotherapy.dto.ts

export type OnsetType = 'Sudden' | 'Gradual' | 'Traumatic';
export type MobilityStatus = 'Independent' | 'Assisted' | 'Dependent';
export type MuscleStrengthGrade = 0 | 1 | 2 | 3 | 4 | 5; // MRC Scale

export type ManualTherapyTechnique = 
  | 'Mobilization' | 'Manipulation' | 'Massage' | 'MFR' 
  | 'Stretching' | 'Trigger_Point_Release';

export type ElectrotherapyModality = 
  | 'TENS' | 'IFT' | 'Ultrasound' | 'SWD' | 'MWD' | 'Laser' | 'EMS';

export type AssistiveDevice = 
  | 'Walker' | 'Crutches' | 'Wheelchair' | 'Splint' | 'Brace' | 'Orthotics';

export interface PhysioAssessmentDTO {
  assessment_id: string;
  patient_id: string;
  encounter_id: string;
  referral_source?: string;
  referral_diagnosis?: string;
  
  // Chief Complaint
  chief_complaint?: string;
  complaint_duration?: string;
  onset_type?: OnsetType;
  mechanism_of_injury?: string;
  
  // Pain
  pain_location?: string;
  pain_score?: number;
  pain_at_rest?: number;
  pain_on_activity?: number;
  pain_character?: string;
  aggravating_factors?: string;
  relieving_factors?: string;
  
  // Functional
  functional_status?: string;
  mobility_status?: MobilityStatus;
  gait_pattern?: string;
  balance_assessment?: string;
  
  // ROM
  rom_notes?: string;
  rom_flexion_active?: number;
  rom_flexion_passive?: number;
  rom_extension_active?: number;
  rom_extension_passive?: number;
  
  // Strength
  muscle_strength_grade?: MuscleStrengthGrade;
  muscle_strength_notes?: string;
  
  // Special Tests
  special_tests_performed?: string[];
  special_tests_findings?: string;
  
  // Diagnosis
  physio_diagnosis?: string;
  icd_codes?: string[];
  problem_list?: string[];
  
  // Goals
  short_term_goals?: string;
  long_term_goals?: string;
  estimated_sessions?: number;
  
  // Audit
  status: string;
  created_at: string;
}

export interface PhysioPlanDTO {
  plan_id: string;
  assessment_id: string;
  patient_id: string;
  encounter_id: string;
  
  manual_therapy?: boolean;
  manual_therapy_techniques?: ManualTherapyTechnique[];
  
  therapeutic_exercise?: boolean;
  exercises_prescribed?: string;
  
  electrotherapy?: boolean;
  electro_modalities?: ElectrotherapyModality[];
  
  heat_therapy?: boolean;
  cold_therapy?: boolean;
  hydrotherapy?: boolean;
  traction?: boolean;
  
  assistive_devices?: AssistiveDevice[];
  
  frequency?: string;
  session_duration_minutes?: number;
  total_sessions_planned?: number;
  
  home_exercises?: string;
  patient_education?: string;
  
  status: string;
}

export interface PhysioSessionDTO {
  session_id?: string;
  plan_id: string;
  patient_id: string;
  encounter_id: string;
  
  session_number: number;
  session_date: string;
  
  pain_score_before?: number;
  subjective_report?: string;
  
  treatment_provided: string;
  modalities_used?: string[];
  exercises_performed?: string;
  
  patient_response?: string;
  pain_score_after?: number;
  
  progress_notes?: string;
  next_session_plan?: string;
  
  attendance_status?: string;
  treated_by?: string;
}

export interface PhysioProgressDTO {
  progress_id?: string;
  assessment_id: string;
  patient_id: string;
  
  evaluation_date: string;
  evaluation_type: 'Initial' | 'Progress' | 'Discharge';
  
  pain_score?: number;
  rom_improvement_percent?: number;
  strength_grade?: MuscleStrengthGrade;
  functional_score?: number;
  
  goals_achieved?: string[];
  goals_pending?: string[];
  
  progress_summary?: string;
  ready_for_discharge?: boolean;
  discharge_recommendations?: string;
}
```

### 3. Physiotherapy Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  PHYSIOTHERAPY ENCOUNTER WORKFLOW                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. REFERRAL RECEIVED (From Doctor/Consultation)                 │
│     └── Patient routed to Physiotherapy queue                    │
│                                                                  │
│  2. INITIAL ASSESSMENT (First Visit)                             │
│     ├── History Taking                                           │
│     ├── Pain Assessment (VAS/NRS)                               │
│     ├── Range of Motion Testing                                  │
│     ├── Muscle Strength Testing (MRC Scale)                     │
│     ├── Special Tests (Specific to condition)                   │
│     ├── Functional Assessment                                    │
│     └── Posture/Gait Analysis                                   │
│                                                                  │
│  3. TREATMENT PLANNING                                           │
│     ├── Problem List                                             │
│     ├── Goals (SMART Goals)                                      │
│     ├── Modality Selection                                       │
│     ├── Exercise Program Design                                  │
│     └── Session Frequency/Duration                              │
│                                                                  │
│  4. TREATMENT SESSIONS (Ongoing)                                 │
│     ├── Pre-Session Assessment                                   │
│     ├── Treatment Delivery                                       │
│     │   ├── Manual Therapy                                       │
│     │   ├── Electrotherapy                                       │
│     │   ├── Therapeutic Exercises                               │
│     │   └── Education                                           │
│     ├── Response Documentation                                   │
│     └── Session Notes                                           │
│                                                                  │
│  5. PROGRESS EVALUATION (Periodic)                               │
│     ├── Re-assessment                                            │
│     ├── Goal Review                                              │
│     ├── Plan Modification                                        │
│     └── Outcome Measures                                         │
│                                                                  │
│  6. DISCHARGE (When Goals Met)                                   │
│     ├── Final Assessment                                         │
│     ├── Home Exercise Program                                    │
│     ├── Recommendations                                          │
│     └── Follow-up Plan                                          │
│                                                                  │
│  7. BILLING (Per Session) → encounter_id linked                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Role-Based Access Control Matrix

```
┌──────────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│      Action          │ Dentist │  Ophth  │ Physio  │ Doctor  │  Nurse  │  Admin  │
├──────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ DENTAL MODULE        │         │         │         │         │         │         │
│  View Records        │   ✓     │   ✗     │   ✗     │   R     │   R     │   ✓     │
│  Create Records      │   ✓     │   ✗     │   ✗     │   ✗     │   ✗     │   ✓     │
│  Edit (Unfin.)       │   ✓     │   ✗     │   ✗     │   ✗     │   ✗     │   ✓     │
│  Finalize            │   ✓     │   ✗     │   ✗     │   ✗     │   ✗     │   ✓     │
│  Dental Chart        │   ✓     │   ✗     │   ✗     │   R     │   ✗     │   ✓     │
│  Procedures          │   ✓     │   ✗     │   ✗     │   ✗     │   ✗     │   ✓     │
├──────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ OPHTHALMOLOGY        │         │         │         │         │         │         │
│  View Records        │   ✗     │   ✓     │   ✗     │   R     │   R     │   ✓     │
│  Create Records      │   ✗     │   ✓     │   ✗     │   ✗     │   ✗     │   ✓     │
│  Edit (Unfin.)       │   ✗     │   ✓     │   ✗     │   ✗     │   ✗     │   ✓     │
│  Finalize            │   ✗     │   ✓     │   ✗     │   ✗     │   ✗     │   ✓     │
│  Prescribe Glasses   │   ✗     │   ✓     │   ✗     │   ✗     │   ✗     │   ✓     │
│  Eye Procedures      │   ✗     │   ✓     │   ✗     │   ✗     │   ✗     │   ✓     │
├──────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ PHYSIOTHERAPY        │         │         │         │         │         │         │
│  View Records        │   ✗     │   ✗     │   ✓     │   R     │   R     │   ✓     │
│  Create Assessment   │   ✗     │   ✗     │   ✓     │   ✗     │   ✗     │   ✓     │
│  Create Plan         │   ✗     │   ✗     │   ✓     │   ✗     │   ✗     │   ✓     │
│  Log Sessions        │   ✗     │   ✗     │   ✓     │   ✗     │   T     │   ✓     │
│  Progress Eval       │   ✗     │   ✗     │   ✓     │   ✗     │   ✗     │   ✓     │
│  Discharge           │   ✗     │   ✗     │   ✓     │   ✗     │   ✗     │   ✓     │
├──────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ CROSS-MODULE         │         │         │         │         │         │         │
│  View Patient Info   │   ✓     │   ✓     │   ✓     │   ✓     │   ✓     │   ✓     │
│  View Encounter      │   ✓     │   ✓     │   ✓     │   ✓     │   ✓     │   ✓     │
│  View Vitals         │   ✓     │   ✓     │   ✓     │   ✓     │   ✓     │   ✓     │
│  View Allergies      │   ✓     │   ✓     │   ✓     │   ✓     │   ✓     │   ✓     │
│  Order Labs          │   ✓     │   ✓     │   ✗     │   ✓     │   ✗     │   ✓     │
│  Order Imaging       │   ✓     │   ✓     │   ✗     │   ✓     │   ✗     │   ✓     │
│  Refer Patient       │   ✓     │   ✓     │   ✓     │   ✓     │   ✗     │   ✓     │
└──────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

Legend: ✓ = Full Access, R = Read-Only, T = Task-Based (Limited), ✗ = No Access
```

---

## 🎨 UI Component Structure

### Common Patient Context Panel (All Modules)

```typescript
// src/renderer/components/specialty/PatientContextPanel.tsx

interface PatientContextPanelProps {
  patient: PatientDTO;
  encounter: EncounterDTO;
  showVitals?: boolean;
  showAllergies?: boolean;
  showDiagnoses?: boolean;
}

// Displays:
// - Patient Name, Age, Gender
// - EMR Number
// - Encounter ID & Date
// - Visit Type (OPD/Emergency)
// - Allergies (highlighted if present)
// - Active Diagnoses
// - Latest Vitals (BP, Pulse, etc.)
```

### Module Tab Structure

```
┌────────────────────────────────────────────────────────────────┐
│  [Patient Context Panel - Sticky Header]                       │
├────────────────────────────────────────────────────────────────┤
│  Tabs: [Assessment] [Chart/Exam] [Procedures] [Prescriptions]  │
│        [Progress] [History] [Orders]                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Tab Content Area]                                            │
│                                                                │
│  - Structured forms with smart defaults                        │
│  - Collapsible sections                                        │
│  - Real-time validation                                        │
│  - Auto-save drafts                                           │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  [Action Bar: Save Draft | Save & Finalize | Print | Cancel]   │
└────────────────────────────────────────────────────────────────┘
```

---

## ✅ Validation Rules

### All Modules

1. **Encounter Validation**
   - Record cannot be saved without valid `encounter_id`
   - Encounter must be in 'Active' status
   - Patient must match encounter's patient

2. **Finalization Rules**
   - Once finalized, record becomes read-only
   - Finalization requires provider signature (logged user)
   - Timestamp is immutable

3. **Required Fields**
   - `patient_id` - Always required
   - `encounter_id` - Always required
   - `created_by` - Auto-populated from logged user
   - At least one clinical finding must be documented

### Module-Specific

**Dental:**
- Tooth number must be valid (FDI: 11-48, 51-85)
- Procedure requires consent flag for invasive procedures
- Extraction requires tooth to exist in chart

**Ophthalmology:**
- Visual acuity required for both eyes
- IOP required if glaucoma suspected
- Glasses prescription requires refraction data

**Physiotherapy:**
- Initial assessment required before treatment plan
- Session number must be sequential
- Pain scores must be 0-10 scale
- Progress evaluation required every 6 sessions

---

## 🔗 Integration Points

### With Existing Modules

| Module | Integration | Direction |
|--------|-------------|-----------|
| Encounter | Creates visit → specialty uses encounter_id | Inbound |
| Consultation | Receives referrals | Inbound |
| Lab | Orders tests (Dental: infection markers) | Outbound |
| Radiology | Orders imaging (OPG, CT, OCT) | Outbound |
| Pharmacy | Prescriptions (medications, eye drops) | Outbound |
| Billing | Sends billing items | Outbound |
| Queue | Patients routed to specialty | Bidirectional |
| Nursing | Vitals visible | Inbound |

### API Endpoints Pattern

```typescript
// Follow existing pattern from consultation module
// src/renderer/modules/{specialty}/api/{specialty}.api.ts

// CREATE
export async function createDentalExam(dto: CreateDentalExamDTO): Promise<DentalExamDTO>
export async function createEyeExam(dto: CreateEyeExamDTO): Promise<EyeExamDTO>
export async function createPhysioAssessment(dto: CreatePhysioAssessmentDTO): Promise<PhysioAssessmentDTO>

// READ
export async function getDentalExam(examId: string): Promise<DentalExamDTO>
export async function getPatientDentalHistory(patientId: string): Promise<DentalExamDTO[]>

// UPDATE
export async function updateDentalExam(examId: string, dto: UpdateDentalExamDTO): Promise<DentalExamDTO>

// FINALIZE
export async function finalizeDentalExam(examId: string): Promise<DentalExamDTO>

// DELETE (soft)
export async function cancelDentalExam(examId: string, reason: string): Promise<void>
```

---

## 📦 Deliverables Checklist

### Phase 1: Database & Types
- [ ] Migration files for all 3 modules
- [ ] TypeScript DTOs
- [ ] Validation schemas (Zod)

### Phase 2: API Layer
- [ ] Supabase API functions
- [ ] React Query hooks
- [ ] Error handling

### Phase 3: UI Components
- [ ] Patient Context Panel
- [ ] Module-specific forms
- [ ] Specialty charts (Dental chart, Eye diagram)
- [ ] Print templates

### Phase 4: Integration
- [ ] Billing integration
- [ ] Lab/Radiology orders
- [ ] Queue management
- [ ] Role-based access

### Phase 5: Testing & Documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] User documentation
- [ ] Training materials

---

## 📝 Notes for Implementation

1. **Reuse existing components** from consultation module (form inputs, patient search, etc.)

2. **Follow encounter-centric pattern** - every record must have encounter_id

3. **Use existing enums** (priority, request_status) where applicable

4. **Billing integration** - create billing items using existing billing_orders pattern

5. **Queue integration** - add specialty departments to queue location options

6. **Print templates** - follow existing consultation report pattern

---

*Document Version: 1.0*
*Last Updated: January 15, 2026*
*Author: EMR Development Team*
