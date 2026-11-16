-- =============================================================================
-- Migration 199: Add missing eye_exams columns & widen tight VARCHAR constraints
-- =============================================================================
-- Adds columns referenced in the ophthalmology form but absent from the DB:
--   • Cycloplegic refraction fields (cyclo_*)
--   • visual_fields_confrontation
--   • refractive_error_classification
--   • spectacle_recommendation
-- Widens VARCHAR columns that are too short for free-text clinical input:
--   • npc VARCHAR(50) → TEXT
--   • follow_up_interval VARCHAR(50) → TEXT
--   • color_vision_method VARCHAR(50) → VARCHAR(100)
-- =============================================================================

-- Cycloplegic Refraction (Wet Refraction) ---------------------------------
ALTER TABLE eye_exams
    ADD COLUMN IF NOT EXISTS cyclo_agent            VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cyclo_instillation_time TIME,
    ADD COLUMN IF NOT EXISTS cyclo_right_sphere     DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS cyclo_right_cylinder   DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS cyclo_right_axis       INTEGER
        CHECK (cyclo_right_axis IS NULL OR (cyclo_right_axis >= 0 AND cyclo_right_axis <= 180)),
    ADD COLUMN IF NOT EXISTS cyclo_left_sphere      DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS cyclo_left_cylinder    DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS cyclo_left_axis        INTEGER
        CHECK (cyclo_left_axis IS NULL OR (cyclo_left_axis >= 0 AND cyclo_left_axis <= 180));

-- Additional Assessment Fields --------------------------------------------
ALTER TABLE eye_exams
    ADD COLUMN IF NOT EXISTS visual_fields_confrontation     TEXT,
    ADD COLUMN IF NOT EXISTS refractive_error_classification TEXT,
    ADD COLUMN IF NOT EXISTS spectacle_recommendation        VARCHAR(100);

-- Widen tight VARCHAR columns to prevent truncation errors ----------------
-- npc (Near Point of Convergence): free text, e.g. "Break: 8cm, Recovery: 10cm"
ALTER TABLE eye_exams
    ALTER COLUMN npc TYPE TEXT;

-- follow_up_interval: free text, e.g. "Return in 3 months for IOP & visual fields review"
ALTER TABLE eye_exams
    ALTER COLUMN follow_up_interval TYPE TEXT;

-- color_vision_method: allow longer custom entry beyond preset options
ALTER TABLE eye_exams
    ALTER COLUMN color_vision_method TYPE VARCHAR(100);

COMMENT ON COLUMN eye_exams.cyclo_agent IS 'Cycloplegic agent used (e.g. Cyclopentolate 1%, Atropine 1%)';
COMMENT ON COLUMN eye_exams.cyclo_instillation_time IS 'Time cycloplegic drops were instilled';
COMMENT ON COLUMN eye_exams.visual_fields_confrontation IS 'Visual fields by confrontation test result';
COMMENT ON COLUMN eye_exams.refractive_error_classification IS 'Comma-separated refractive error diagnoses (e.g. Myopia (OD), Astigmatism (OS))';
COMMENT ON COLUMN eye_exams.spectacle_recommendation IS 'Spectacle/lens prescription recommendation';
