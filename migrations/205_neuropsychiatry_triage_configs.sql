-- =============================================================================
-- Migration 205: Neuropsychiatry Clinic Triage Configuration
-- =============================================================================
-- Seeds pre-consultation triage tests for the Neuropsychiatry specialty clinic.
-- Tests performed by nursing staff / clinic assistant before patient sees doctor:
--   1. Blood Pressure (Systolic & Diastolic) — standard vital signs
--   2. Weight — BMI tracking, medication dose reference, metabolic monitoring
--   3. PHQ-9 Self-Report — patient completes questionnaire in waiting room
-- =============================================================================

INSERT INTO clinic_triage_configs (
    specialty_code, test_name, test_code, input_type,
    unit, normal_min, normal_max, is_required, display_order
)
VALUES
    -- Vital Signs
    ('NEUROPSYCHIATRY', 'Blood Pressure (Systolic)',  'bp_systolic',  'number', 'mmHg', 90,  140, true,  1),
    ('NEUROPSYCHIATRY', 'Blood Pressure (Diastolic)', 'bp_diastolic', 'number', 'mmHg', 60,  90,  true,  2),
    ('NEUROPSYCHIATRY', 'Heart Rate',                 'heart_rate',   'number', 'bpm',  60,  100, false, 3),
    ('NEUROPSYCHIATRY', 'Weight',                     'weight',       'number', 'kg',   NULL, NULL, true, 4),

    -- PHQ-9 Pre-consultation Self-Report (patient fills in waiting room)
    ('NEUROPSYCHIATRY', 'PHQ-9 Total Score (Self-Report)', 'phq9_self_report', 'number', NULL, 0, 27, false, 5),

    -- Nurse-administered cognitive screen (highly symptomatic patients)
    ('NEUROPSYCHIATRY', 'Nurse Cognitive Screen Note',  'cognitive_screen_note', 'text', NULL, NULL, NULL, false, 6)

ON CONFLICT (specialty_code, test_code) DO NOTHING;
