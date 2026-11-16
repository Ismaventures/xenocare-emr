-- Migration: Add full-text search (tsvector) columns to clinical tables
-- Uses GIN indexes for fast full-text search across patient records

-- ============================================================
-- 1. Consultations
-- ============================================================
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE consultations SET search_document = to_tsvector('english',
  coalesce(subjective, '') || ' ' ||
  coalesce(objective, '') || ' ' ||
  coalesce(assessment, '') || ' ' ||
  coalesce(plan, '') || ' ' ||
  coalesce(complaints, '') || ' ' ||
  coalesce(history_of_present_illness, '') || ' ' ||
  coalesce(past_medical_history, '') || ' ' ||
  coalesce(examination_findings, '') || ' ' ||
  coalesce(clinical_notes, '') || ' ' ||
  coalesce(diagnosis_text, '') || ' ' ||
  coalesce(array_to_string(diagnosis, ' '), '') || ' ' ||
  coalesce(array_to_string(differential_diagnosis, ' '), '')
);

CREATE INDEX IF NOT EXISTS idx_consultations_fts ON consultations USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_consultation_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.subjective, '') || ' ' ||
    coalesce(NEW.objective, '') || ' ' ||
    coalesce(NEW.assessment, '') || ' ' ||
    coalesce(NEW.plan, '') || ' ' ||
    coalesce(NEW.complaints, '') || ' ' ||
    coalesce(NEW.history_of_present_illness, '') || ' ' ||
    coalesce(NEW.past_medical_history, '') || ' ' ||
    coalesce(NEW.examination_findings, '') || ' ' ||
    coalesce(NEW.clinical_notes, '') || ' ' ||
    coalesce(NEW.diagnosis_text, '') || ' ' ||
    coalesce(array_to_string(NEW.diagnosis, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.differential_diagnosis, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultation_fts ON consultations;
CREATE TRIGGER trg_consultation_fts
  BEFORE INSERT OR UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_consultation_search_doc();

-- ============================================================
-- 2. Nursing Notes
-- ============================================================
ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE nursing_notes SET search_document = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(content, '') || ' ' ||
  coalesce(interventions_performed, '') || ' ' ||
  coalesce(patient_response, '') || ' ' ||
  coalesce(follow_up_notes, '')
);

CREATE INDEX IF NOT EXISTS idx_nursing_notes_fts ON nursing_notes USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_nursing_note_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.content, '') || ' ' ||
    coalesce(NEW.interventions_performed, '') || ' ' ||
    coalesce(NEW.patient_response, '') || ' ' ||
    coalesce(NEW.follow_up_notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nursing_note_fts ON nursing_notes;
CREATE TRIGGER trg_nursing_note_fts
  BEFORE INSERT OR UPDATE ON nursing_notes
  FOR EACH ROW EXECUTE FUNCTION update_nursing_note_search_doc();

-- ============================================================
-- 3. Lab Requests
-- ============================================================
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE lab_requests SET search_document = to_tsvector('english',
  coalesce(clinical_notes, '') || ' ' ||
  coalesce(result_notes, '') || ' ' ||
  coalesce(interpretation, '') || ' ' ||
  coalesce(methodology, '')
);

CREATE INDEX IF NOT EXISTS idx_lab_requests_fts ON lab_requests USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_lab_request_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.clinical_notes, '') || ' ' ||
    coalesce(NEW.result_notes, '') || ' ' ||
    coalesce(NEW.interpretation, '') || ' ' ||
    coalesce(NEW.methodology, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lab_request_fts ON lab_requests;
CREATE TRIGGER trg_lab_request_fts
  BEFORE INSERT OR UPDATE ON lab_requests
  FOR EACH ROW EXECUTE FUNCTION update_lab_request_search_doc();

-- ============================================================
-- 4. Daily Progress Notes
-- ============================================================
ALTER TABLE daily_progress_notes ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE daily_progress_notes SET search_document = to_tsvector('english',
  coalesce(subjective, '') || ' ' ||
  coalesce(objective, '') || ' ' ||
  coalesce(assessment, '') || ' ' ||
  coalesce(plan, '') || ' ' ||
  coalesce(nursing_summary, '') || ' ' ||
  coalesce(io_notes, '')
);

CREATE INDEX IF NOT EXISTS idx_progress_notes_fts ON daily_progress_notes USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_progress_note_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.subjective, '') || ' ' ||
    coalesce(NEW.objective, '') || ' ' ||
    coalesce(NEW.assessment, '') || ' ' ||
    coalesce(NEW.plan, '') || ' ' ||
    coalesce(NEW.nursing_summary, '') || ' ' ||
    coalesce(NEW.io_notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_progress_note_fts ON daily_progress_notes;
CREATE TRIGGER trg_progress_note_fts
  BEFORE INSERT OR UPDATE ON daily_progress_notes
  FOR EACH ROW EXECUTE FUNCTION update_progress_note_search_doc();

-- ============================================================
-- 5. Ward Round Notes
-- ============================================================
ALTER TABLE ward_round_notes ADD COLUMN IF NOT EXISTS search_document tsvector;

UPDATE ward_round_notes SET search_document = to_tsvector('english',
  coalesce(subjective_notes, '') || ' ' ||
  coalesce(objective_findings, '') || ' ' ||
  coalesce(assessment, '') || ' ' ||
  coalesce(plan, '') || ' ' ||
  coalesce(nursing_instructions, '') || ' ' ||
  coalesce(discharge_planning_notes, '')
);

CREATE INDEX IF NOT EXISTS idx_ward_round_fts ON ward_round_notes USING GIN(search_document);

CREATE OR REPLACE FUNCTION update_ward_round_search_doc()
RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english',
    coalesce(NEW.subjective_notes, '') || ' ' ||
    coalesce(NEW.objective_findings, '') || ' ' ||
    coalesce(NEW.assessment, '') || ' ' ||
    coalesce(NEW.plan, '') || ' ' ||
    coalesce(NEW.nursing_instructions, '') || ' ' ||
    coalesce(NEW.discharge_planning_notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ward_round_fts ON ward_round_notes;
CREATE TRIGGER trg_ward_round_fts
  BEFORE INSERT OR UPDATE ON ward_round_notes
  FOR EACH ROW EXECUTE FUNCTION update_ward_round_search_doc();
