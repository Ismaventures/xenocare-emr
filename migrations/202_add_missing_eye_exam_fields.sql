-- =============================================================================
-- Migration 202: Add missing eye_exams columns for form fields
-- =============================================================================
-- Adds columns that the ophthalmology consultation form captures but that
-- do not yet exist in the eye_exams table:
--   • iop_classification   — IOP clinical classification (Normal, Borderline, etc.)
--   • posterior_right_dr_grading — Diabetic retinopathy grading for right eye
--   • posterior_left_dr_grading  — Diabetic retinopathy grading for left eye
--
-- NOTE: The form uses "colour_vision" (British spelling) but the DB column
--       is "color_vision" (American). The API maps between them — no DB change needed.
-- =============================================================================

-- IOP Classification (Normal / Borderline High / High / Ocular Hypertension / Hypotony)
ALTER TABLE eye_exams
    ADD COLUMN IF NOT EXISTS iop_classification VARCHAR(100);

-- Diabetic Retinopathy Grading per eye
ALTER TABLE eye_exams
    ADD COLUMN IF NOT EXISTS posterior_right_dr_grading VARCHAR(100);

ALTER TABLE eye_exams
    ADD COLUMN IF NOT EXISTS posterior_left_dr_grading VARCHAR(100);

COMMENT ON COLUMN eye_exams.iop_classification IS 'IOP clinical classification: Normal, Borderline High, High, Ocular Hypertension, Hypotony';
COMMENT ON COLUMN eye_exams.posterior_right_dr_grading IS 'Diabetic retinopathy grading for right eye: No DR, Mild NPDR, Moderate NPDR, Severe NPDR, PDR';
COMMENT ON COLUMN eye_exams.posterior_left_dr_grading IS 'Diabetic retinopathy grading for left eye: No DR, Mild NPDR, Moderate NPDR, Severe NPDR, PDR';
