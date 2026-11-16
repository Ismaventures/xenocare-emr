-- =============================================================================
-- MIGRATION 209: DENTAL EXAM ENHANCED FIELDS
-- =============================================================================
-- Adds structured clinical fields to dental_exams to support:
--   - Consultation type classification (new patient, recall, emergency)
--   - Rapid chief complaint categorisation (faster clerking)
--   - Affected area / tooth specification
--   - Structured systemic conditions checklist (affects treatment planning)
--   - Social history (tobacco/alcohol — oral cancer & perio risk factors)
-- =============================================================================

ALTER TABLE dental_exams
  ADD COLUMN IF NOT EXISTS consultation_type   VARCHAR(50),      -- New Patient / Recall / Emergency / Follow-up / Referral
  ADD COLUMN IF NOT EXISTS complaint_type      VARCHAR(100),     -- Toothache / Swelling / Sensitivity / Broken Tooth / etc.
  ADD COLUMN IF NOT EXISTS affected_area       VARCHAR(200),     -- e.g. "Upper right molar (17), lower anterior"
  ADD COLUMN IF NOT EXISTS systemic_conditions JSONB DEFAULT '{}', -- { "Diabetes": true, "Hypertension": false, ... }
  ADD COLUMN IF NOT EXISTS tobacco_use         VARCHAR(30),      -- Never / Former / Current / Smokeless
  ADD COLUMN IF NOT EXISTS alcohol_use         VARCHAR(30);      -- Never / Occasional / Regular

-- Index for common reporting (oral cancer risk profiling)
CREATE INDEX IF NOT EXISTS idx_dental_exams_tobacco ON dental_exams(tobacco_use)
  WHERE tobacco_use IS NOT NULL;

COMMENT ON COLUMN dental_exams.consultation_type   IS 'Visit classification: New Patient, Recall/Checkup, Emergency, Follow-up, Specialist Referral';
COMMENT ON COLUMN dental_exams.complaint_type      IS 'Structured chief complaint category for rapid clerking — complements the free-text chief_complaint';
COMMENT ON COLUMN dental_exams.affected_area       IS 'Specific tooth or oral region affected, using FDI numbering where applicable';
COMMENT ON COLUMN dental_exams.systemic_conditions IS 'Boolean map of relevant systemic conditions: Diabetes, Hypertension, Heart Disease, Anticoagulants, Bisphosphonates, Pregnancy, HIV, Bleeding Disorder, Epilepsy, Asthma, Renal Disease, Liver Disease';
COMMENT ON COLUMN dental_exams.tobacco_use         IS 'Tobacco use status — significant risk factor for periodontal disease and oral cancer';
COMMENT ON COLUMN dental_exams.alcohol_use         IS 'Alcohol use status — risk factor for oral cancer and delayed healing';
