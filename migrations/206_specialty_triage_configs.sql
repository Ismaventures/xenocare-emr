-- =============================================================================
-- Migration 206: Specialty Triage Configurations (All Remaining Specialties)
-- =============================================================================
-- Seeds pre-consultation triage observations for all specialty clinics except
-- Neuropsychiatry (already done in migration 205).
-- Tests are performed by nursing staff before the patient sees the doctor.
-- =============================================================================

INSERT INTO clinic_triage_configs (
    specialty_code, test_name, test_code, input_type,
    unit, normal_min, normal_max, is_required, display_order
)
VALUES

-- =============================================================================
-- CARDIOLOGY
-- =============================================================================
('CARDIOLOGY', 'Blood Pressure (Systolic)',        'bp_systolic',   'number', 'mmHg', 90,  140,  true,  1),
('CARDIOLOGY', 'Blood Pressure (Diastolic)',       'bp_diastolic',  'number', 'mmHg', 60,  90,   true,  2),
('CARDIOLOGY', 'Heart Rate',                       'heart_rate',    'number', 'bpm',  60,  100,  true,  3),
('CARDIOLOGY', 'SpO₂ (Oxygen Saturation)',         'spo2',          'number', '%',    95,  100,  true,  4),
('CARDIOLOGY', 'Weight',                           'weight',        'number', 'kg',   NULL, NULL, false, 5),
('CARDIOLOGY', 'ECG Rhythm (Nurse Strip)',         'ecg_rhythm',    'text',   NULL,   NULL, NULL, false, 6),

-- =============================================================================
-- OPHTHALMOLOGY
-- =============================================================================
('OPHTHALMOLOGY', 'Visual Acuity — Right Eye (Unaided)',      'va_right_unaided',  'text', NULL, NULL, NULL, true,  1),
('OPHTHALMOLOGY', 'Visual Acuity — Left Eye (Unaided)',       'va_left_unaided',   'text', NULL, NULL, NULL, true,  2),
('OPHTHALMOLOGY', 'Visual Acuity — Right Eye (Corrected)',    'va_right_corrected','text', NULL, NULL, NULL, false, 3),
('OPHTHALMOLOGY', 'Visual Acuity — Left Eye (Corrected)',     'va_left_corrected', 'text', NULL, NULL, NULL, false, 4),
('OPHTHALMOLOGY', 'Intraocular Pressure — Right (mmHg)',      'iop_right',         'number','mmHg', 10, 21, false, 5),
('OPHTHALMOLOGY', 'Intraocular Pressure — Left (mmHg)',       'iop_left',          'number','mmHg', 10, 21, false, 6),

-- =============================================================================
-- NEPHROLOGY
-- =============================================================================
('NEPHROLOGY', 'Blood Pressure (Systolic)',        'bp_systolic',   'number', 'mmHg', 90,  140, true,  1),
('NEPHROLOGY', 'Blood Pressure (Diastolic)',       'bp_diastolic',  'number', 'mmHg', 60,  90,  true,  2),
('NEPHROLOGY', 'Weight',                           'weight',        'number', 'kg',   NULL, NULL, true, 3),
('NEPHROLOGY', 'Urine Dipstick — Protein',         'urine_protein', 'text',   NULL,   NULL, NULL, true,  4),
('NEPHROLOGY', 'Urine Dipstick — Blood',           'urine_blood',   'text',   NULL,   NULL, NULL, false, 5),
('NEPHROLOGY', 'Urine Dipstick — Glucose',         'urine_glucose', 'text',   NULL,   NULL, NULL, false, 6),

-- =============================================================================
-- GYNAECOLOGY
-- =============================================================================
('GYNAECOLOGY', 'Blood Pressure (Systolic)',       'bp_systolic',   'number', 'mmHg', 90,  140, true,  1),
('GYNAECOLOGY', 'Blood Pressure (Diastolic)',      'bp_diastolic',  'number', 'mmHg', 60,  90,  true,  2),
('GYNAECOLOGY', 'Weight',                          'weight',        'number', 'kg',   NULL, NULL, true, 3),
('GYNAECOLOGY', 'Urine Dipstick (Pregnancy Test)', 'urine_preg',    'text',   NULL,   NULL, NULL, false, 4),
('GYNAECOLOGY', 'Height',                          'height',        'number', 'cm',   NULL, NULL, false, 5),

-- =============================================================================
-- PAEDIATRICS
-- =============================================================================
('PAEDIATRICS', 'Weight',                          'weight',        'number', 'kg',   NULL, NULL, true,  1),
('PAEDIATRICS', 'Height',                          'height',        'number', 'cm',   NULL, NULL, true,  2),
('PAEDIATRICS', 'Temperature',                     'temperature',   'number', '°C',   36.1, 37.2, true,  3),
('PAEDIATRICS', 'Heart Rate',                      'heart_rate',    'number', 'bpm',  NULL, NULL,  true,  4),
('PAEDIATRICS', 'Respiratory Rate',                'resp_rate',     'number', '/min', NULL, NULL, false, 5),
('PAEDIATRICS', 'SpO₂',                            'spo2',          'number', '%',    95,  100,  false, 6),
('PAEDIATRICS', 'Head Circumference (if <5 yrs)',  'head_circ',     'number', 'cm',   NULL, NULL, false, 7),
('PAEDIATRICS', 'MUAC (if malnutrition screen)',   'muac',          'number', 'cm',   NULL, NULL, false, 8),

-- =============================================================================
-- ORTHOPAEDICS
-- =============================================================================
('ORTHOPAEDICS', 'Blood Pressure (Systolic)',      'bp_systolic',   'number', 'mmHg', 90,  140, false, 1),
('ORTHOPAEDICS', 'Blood Pressure (Diastolic)',     'bp_diastolic',  'number', 'mmHg', 60,  90,  false, 2),
('ORTHOPAEDICS', 'Weight',                         'weight',        'number', 'kg',   NULL, NULL, false, 3),
('ORTHOPAEDICS', 'Pain Score (VAS 0–10)',          'pain_score',    'number', '/10',  NULL, 3,   true,  4),
('ORTHOPAEDICS', 'Affected Limb / Region',         'affected_limb', 'text',   NULL,   NULL, NULL, true,  5),

-- =============================================================================
-- NEUROLOGY
-- =============================================================================
('NEUROLOGY', 'Blood Pressure (Systolic)',         'bp_systolic',   'number', 'mmHg', 90,  140, true,  1),
('NEUROLOGY', 'Blood Pressure (Diastolic)',        'bp_diastolic',  'number', 'mmHg', 60,  90,  true,  2),
('NEUROLOGY', 'Heart Rate',                        'heart_rate',    'number', 'bpm',  60,  100, false, 3),
('NEUROLOGY', 'Blood Glucose (Random)',            'blood_glucose', 'number', 'mmol/L', 3.9, 7.8, false, 4),
('NEUROLOGY', 'GCS — Eye Opening (1–4)',           'gcs_eye',       'number', NULL,   1,   4,   false, 5),
('NEUROLOGY', 'GCS — Verbal (1–5)',                'gcs_verbal',    'number', NULL,   1,   5,   false, 6),
('NEUROLOGY', 'GCS — Motor (1–6)',                 'gcs_motor',     'number', NULL,   1,   6,   false, 7),

-- =============================================================================
-- ENT
-- =============================================================================
('ENT', 'Blood Pressure (Systolic)',               'bp_systolic',   'number', 'mmHg', 90,  140, false, 1),
('ENT', 'Blood Pressure (Diastolic)',              'bp_diastolic',  'number', 'mmHg', 60,  90,  false, 2),
('ENT', 'Temperature',                             'temperature',   'number', '°C',   36.1, 37.2, false, 3),
('ENT', 'Audiometry Result (if available)',        'audio_result',  'text',   NULL,   NULL, NULL, false, 4),

-- =============================================================================
-- GASTROENTEROLOGY
-- =============================================================================
('GASTROENTEROLOGY', 'Blood Pressure (Systolic)',  'bp_systolic',   'number', 'mmHg', 90,  140, true,  1),
('GASTROENTEROLOGY', 'Blood Pressure (Diastolic)', 'bp_diastolic',  'number', 'mmHg', 60,  90,  true,  2),
('GASTROENTEROLOGY', 'Weight',                     'weight',        'number', 'kg',   NULL, NULL, true, 3),
('GASTROENTEROLOGY', 'Temperature',                'temperature',   'number', '°C',   36.1, 37.2, false, 4),
('GASTROENTEROLOGY', 'Pain Score (VAS 0–10)',      'pain_score',    'number', '/10',  NULL, 3,   false, 5),

-- =============================================================================
-- GENERAL SURGERY
-- =============================================================================
('GENERAL_SURGERY', 'Blood Pressure (Systolic)',   'bp_systolic',   'number', 'mmHg', 90,  140, true,  1),
('GENERAL_SURGERY', 'Blood Pressure (Diastolic)',  'bp_diastolic',  'number', 'mmHg', 60,  90,  true,  2),
('GENERAL_SURGERY', 'Heart Rate',                  'heart_rate',    'number', 'bpm',  60,  100, true,  3),
('GENERAL_SURGERY', 'Temperature',                 'temperature',   'number', '°C',   36.1, 37.2, true,  4),
('GENERAL_SURGERY', 'Respiratory Rate',            'resp_rate',     'number', '/min', 12,  20,  false, 5),
('GENERAL_SURGERY', 'Pain Score (VAS 0–10)',       'pain_score',    'number', '/10',  NULL, 3,   true,  6),

-- =============================================================================
-- ENDOCRINOLOGY
-- =============================================================================
('ENDOCRINOLOGY', 'Blood Pressure (Systolic)',     'bp_systolic',   'number', 'mmHg', 90,  130, true,  1),
('ENDOCRINOLOGY', 'Blood Pressure (Diastolic)',    'bp_diastolic',  'number', 'mmHg', 60,  80,  true,  2),
('ENDOCRINOLOGY', 'Fasting Blood Glucose',         'fasting_glucose','number','mmol/L',3.9, 5.5, true, 3),
('ENDOCRINOLOGY', 'Weight',                        'weight',        'number', 'kg',   NULL, NULL, true, 4),
('ENDOCRINOLOGY', 'Height',                        'height',        'number', 'cm',   NULL, NULL, false, 5),

-- =============================================================================
-- NEUROSURGERY
-- =============================================================================
('NEUROSURGERY', 'Blood Pressure (Systolic)',      'bp_systolic',   'number', 'mmHg', 90,  140, true,  1),
('NEUROSURGERY', 'Blood Pressure (Diastolic)',     'bp_diastolic',  'number', 'mmHg', 60,  90,  true,  2),
('NEUROSURGERY', 'Heart Rate',                     'heart_rate',    'number', 'bpm',  60,  100, true,  3),
('NEUROSURGERY', 'GCS — Eye Opening (1–4)',        'gcs_eye',       'number', NULL,   1,   4,   true,  4),
('NEUROSURGERY', 'GCS — Verbal (1–5)',             'gcs_verbal',    'number', NULL,   1,   5,   true,  5),
('NEUROSURGERY', 'GCS — Motor (1–6)',              'gcs_motor',     'number', NULL,   1,   6,   true,  6),

-- =============================================================================
-- ORAL AND MAXILLOFACIAL SURGERY
-- =============================================================================
('ORAL_AND_MAXILLOFACIAL_SURGERY', 'Blood Pressure (Systolic)',  'bp_systolic',  'number', 'mmHg', 90, 140, true,  1),
('ORAL_AND_MAXILLOFACIAL_SURGERY', 'Blood Pressure (Diastolic)', 'bp_diastolic', 'number', 'mmHg', 60, 90,  true,  2),
('ORAL_AND_MAXILLOFACIAL_SURGERY', 'Pain Score (VAS 0–10)',      'pain_score',   'number', '/10',  NULL, 3,  true,  3),
('ORAL_AND_MAXILLOFACIAL_SURGERY', 'Mouth Opening (mm)',         'mouth_opening','number', 'mm',   35, NULL,false,  4),

-- =============================================================================
-- PLASTIC SURGERY
-- =============================================================================
('PLASTIC_SURGERY', 'Blood Pressure (Systolic)',   'bp_systolic',   'number', 'mmHg', 90,  140, false, 1),
('PLASTIC_SURGERY', 'Blood Pressure (Diastolic)',  'bp_diastolic',  'number', 'mmHg', 60,  90,  false, 2),
('PLASTIC_SURGERY', 'Pain Score (VAS 0–10)',       'pain_score',    'number', '/10',  NULL, 3,  false, 3),
('PLASTIC_SURGERY', 'Wound Size (cm)',             'wound_size',    'text',   'cm',   NULL, NULL, false, 4),

-- =============================================================================
-- PULMONOLOGY
-- =============================================================================
('PULMONOLOGY', 'Blood Pressure (Systolic)',       'bp_systolic',   'number', 'mmHg', 90,  140, true,  1),
('PULMONOLOGY', 'Blood Pressure (Diastolic)',      'bp_diastolic',  'number', 'mmHg', 60,  90,  true,  2),
('PULMONOLOGY', 'Heart Rate',                      'heart_rate',    'number', 'bpm',  60,  100, true,  3),
('PULMONOLOGY', 'SpO₂ (Resting)',                  'spo2',          'number', '%',    95,  100, true,  4),
('PULMONOLOGY', 'Respiratory Rate',                'resp_rate',     'number', '/min', 12,  20,  true,  5),
('PULMONOLOGY', 'Peak Flow (L/min)',               'peak_flow',     'number', 'L/min',NULL, NULL, false, 6),
('PULMONOLOGY', 'Weight',                          'weight',        'number', 'kg',   NULL, NULL, false, 7),

-- =============================================================================
-- UROLOGY
-- =============================================================================
('UROLOGY', 'Blood Pressure (Systolic)',           'bp_systolic',   'number', 'mmHg', 90,  140, true,  1),
('UROLOGY', 'Blood Pressure (Diastolic)',          'bp_diastolic',  'number', 'mmHg', 60,  90,  true,  2),
('UROLOGY', 'Urine Dipstick — Blood',              'urine_blood',   'text',   NULL,   NULL, NULL, true, 3),
('UROLOGY', 'Urine Dipstick — Protein',            'urine_protein', 'text',   NULL,   NULL, NULL, false, 4),
('UROLOGY', 'Pain Score (VAS 0–10)',               'pain_score',    'number', '/10',  NULL, 3,  false, 5),

-- =============================================================================
-- DERMATOLOGY
-- =============================================================================
('DERMATOLOGY', 'Blood Pressure (Systolic)',       'bp_systolic',   'number', 'mmHg', 90,  140, false, 1),
('DERMATOLOGY', 'Blood Pressure (Diastolic)',      'bp_diastolic',  'number', 'mmHg', 60,  90,  false, 2),
('DERMATOLOGY', 'Itch Score (VAS 0–10)',           'itch_score',    'number', '/10',  NULL, NULL, false, 3),
('DERMATOLOGY', 'Lesion Distribution Note',        'lesion_note',   'text',   NULL,   NULL, NULL, false, 4),

-- =============================================================================
-- DENTAL
-- =============================================================================
('DENTAL', 'Blood Pressure (Systolic)',            'bp_systolic',   'number', 'mmHg', 90,  140, false, 1),
('DENTAL', 'Blood Pressure (Diastolic)',           'bp_diastolic',  'number', 'mmHg', 60,  90,  false, 2),
('DENTAL', 'Pain Score (VAS 0–10)',                'pain_score',    'number', '/10',  NULL, 3,  true,  3),
('DENTAL', 'Teeth Being Treated (Tooth Numbers)',  'tooth_numbers', 'text',   NULL,   NULL, NULL, false, 4)

ON CONFLICT (specialty_code, test_code) DO NOTHING;
