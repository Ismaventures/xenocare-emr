-- Migration: Hybrid Search RPC Functions for AI Clinical Assistant
-- Uses websearch_to_tsquery for natural doctor queries
-- Inline to_tsvector() — no pre-computed search_document columns required.

-- ============================================================
-- ACCESS CHECK HELPER
-- Single-facility deployment: verify the caller is an active
-- staff member and the patient exists.
-- ============================================================
CREATE OR REPLACE FUNCTION verify_patient_access(p_patient_id uuid)
RETURNS void AS $$
BEGIN
  -- In this Electron desktop app, API calls use the service_role key
  -- (auth.uid() is NULL), so we only verify the patient exists.
  -- Application-layer auth is enforced by the Electron main process.
  -- Check both patients.id (uuid PK) and patients.patient_id (varchar)
  -- because different parts of the app may pass either value.
  IF NOT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = p_patient_id
       OR p.patient_id = p_patient_id::text
  ) THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- FULL-TEXT SEARCH (websearch_to_tsquery for natural queries)
-- Uses inline to_tsvector() — works without pre-computed columns
-- ============================================================
CREATE OR REPLACE FUNCTION search_patient_records_fulltext(
  p_patient_id uuid,
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  encounter_id uuid,
  record_date timestamptz,
  snippet text,
  rank real
) AS $$
DECLARE
  v_tsq tsquery;
BEGIN
  -- Access control
  PERFORM verify_patient_access(p_patient_id);

  v_tsq := websearch_to_tsquery('english', p_query);

  RETURN QUERY
  SELECT r.src_table, r.src_id, r.enc_id, r.rec_date, r.snip, r.rnk
  FROM (

    -- Consultations (patient_id is varchar, so join via visits)
    SELECT
      'consultations'::text AS src_table,
      c.consultation_id AS src_id,
      c.encounter_id AS enc_id,
      c.consultation_date AS rec_date,
      ts_headline('english',
        coalesce(c.complaints,'') || ' ' || coalesce(c.history_of_present_illness,'') || ' ' ||
        coalesce(c.examination_findings,'') || ' ' || coalesce(c.assessment,'') || ' ' ||
        coalesce(c.plan,'') || ' ' || coalesce(c.diagnosis_text,'') || ' ' ||
        coalesce(c.clinical_notes,''),
        v_tsq, 'MaxWords=60, MinWords=20'
      ) AS snip,
      ts_rank(
        to_tsvector('english',
          coalesce(c.complaints,'') || ' ' || coalesce(c.history_of_present_illness,'') || ' ' ||
          coalesce(c.examination_findings,'') || ' ' || coalesce(c.assessment,'') || ' ' ||
          coalesce(c.plan,'') || ' ' || coalesce(c.diagnosis_text,'') || ' ' ||
          coalesce(c.clinical_notes,'')
        ), v_tsq
      ) AS rnk
    FROM consultations c
    JOIN visits v ON c.encounter_id = v.id
    WHERE v.patient_id = p_patient_id
      AND to_tsvector('english',
            coalesce(c.complaints,'') || ' ' || coalesce(c.history_of_present_illness,'') || ' ' ||
            coalesce(c.examination_findings,'') || ' ' || coalesce(c.assessment,'') || ' ' ||
            coalesce(c.plan,'') || ' ' || coalesce(c.diagnosis_text,'') || ' ' ||
            coalesce(c.clinical_notes,'')
          ) @@ v_tsq

    UNION ALL

    -- Nursing notes (patient_id is uuid)
    SELECT
      'nursing_notes'::text,
      n.id,
      n.encounter_id,
      n.created_at,
      ts_headline('english',
        coalesce(n.title,'') || ' ' || coalesce(n.content,'') || ' ' ||
        coalesce(n.interventions_performed,'') || ' ' || coalesce(n.patient_response,''),
        v_tsq, 'MaxWords=60, MinWords=20'
      ),
      ts_rank(
        to_tsvector('english',
          coalesce(n.title,'') || ' ' || coalesce(n.content,'') || ' ' ||
          coalesce(n.interventions_performed,'') || ' ' || coalesce(n.patient_response,'')
        ), v_tsq
      )
    FROM nursing_notes n
    WHERE n.patient_id = p_patient_id
      AND to_tsvector('english',
            coalesce(n.title,'') || ' ' || coalesce(n.content,'') || ' ' ||
            coalesce(n.interventions_performed,'') || ' ' || coalesce(n.patient_response,'')
          ) @@ v_tsq

    UNION ALL

    -- Lab requests (patient_id is varchar, join via encounter → visits)
    SELECT
      'lab_requests'::text,
      lr.request_id,
      lr.encounter_id,
      lr.created_at,
      ts_headline('english',
        coalesce(lr.clinical_notes,'') || ' ' || coalesce(lr.interpretation,'') || ' ' ||
        coalesce(lr.result_notes,''),
        v_tsq, 'MaxWords=60, MinWords=20'
      ),
      ts_rank(
        to_tsvector('english',
          coalesce(lr.clinical_notes,'') || ' ' || coalesce(lr.interpretation,'') || ' ' ||
          coalesce(lr.result_notes,'')
        ), v_tsq
      )
    FROM lab_requests lr
    JOIN visits v ON lr.encounter_id = v.id
    WHERE v.patient_id = p_patient_id
      AND to_tsvector('english',
            coalesce(lr.clinical_notes,'') || ' ' || coalesce(lr.interpretation,'') || ' ' ||
            coalesce(lr.result_notes,'')
          ) @@ v_tsq

    UNION ALL

    -- Daily progress notes (patient_id is varchar, join via encounter → visits)
    SELECT
      'daily_progress_notes'::text,
      dpn.progress_id,
      dpn.encounter_id::uuid,
      dpn.recorded_at,
      ts_headline('english',
        coalesce(dpn.subjective,'') || ' ' || coalesce(dpn.objective,'') || ' ' ||
        coalesce(dpn.assessment,'') || ' ' || coalesce(dpn.plan,'') || ' ' ||
        coalesce(dpn.nursing_summary,''),
        v_tsq, 'MaxWords=60, MinWords=20'
      ),
      ts_rank(
        to_tsvector('english',
          coalesce(dpn.subjective,'') || ' ' || coalesce(dpn.objective,'') || ' ' ||
          coalesce(dpn.assessment,'') || ' ' || coalesce(dpn.plan,'') || ' ' ||
          coalesce(dpn.nursing_summary,'')
        ), v_tsq
      )
    FROM daily_progress_notes dpn
    JOIN visits v ON dpn.encounter_id::uuid = v.id
    WHERE v.patient_id = p_patient_id
      AND to_tsvector('english',
            coalesce(dpn.subjective,'') || ' ' || coalesce(dpn.objective,'') || ' ' ||
            coalesce(dpn.assessment,'') || ' ' || coalesce(dpn.plan,'') || ' ' ||
            coalesce(dpn.nursing_summary,'')
          ) @@ v_tsq

    UNION ALL

    -- Ward round notes (no patient_id, join via encounter → visits)
    SELECT
      'ward_round_notes'::text,
      wrn.id,
      wrn.encounter_id,
      wrn.created_at,
      ts_headline('english',
        coalesce(wrn.subjective_notes,'') || ' ' || coalesce(wrn.objective_findings,'') || ' ' ||
        coalesce(wrn.assessment,'') || ' ' || coalesce(wrn.plan,'') || ' ' ||
        coalesce(wrn.nursing_instructions,''),
        v_tsq, 'MaxWords=60, MinWords=20'
      ),
      ts_rank(
        to_tsvector('english',
          coalesce(wrn.subjective_notes,'') || ' ' || coalesce(wrn.objective_findings,'') || ' ' ||
          coalesce(wrn.assessment,'') || ' ' || coalesce(wrn.plan,'') || ' ' ||
          coalesce(wrn.nursing_instructions,'')
        ), v_tsq
      )
    FROM ward_round_notes wrn
    WHERE wrn.encounter_id IN (SELECT id FROM visits WHERE patient_id = p_patient_id)
      AND to_tsvector('english',
            coalesce(wrn.subjective_notes,'') || ' ' || coalesce(wrn.objective_findings,'') || ' ' ||
            coalesce(wrn.assessment,'') || ' ' || coalesce(wrn.plan,'') || ' ' ||
            coalesce(wrn.nursing_instructions,'')
          ) @@ v_tsq

    UNION ALL

    -- Referrals (patient_id is uuid)
    SELECT
      'referrals'::text,
      r.id,
      NULL::uuid,
      r.created_at,
      ts_headline('english',
        coalesce(r.reason_for_referral,'') || ' ' || coalesce(r.clinical_summary,''),
        v_tsq, 'MaxWords=60, MinWords=20'
      ),
      ts_rank(
        to_tsvector('english',
          coalesce(r.reason_for_referral,'') || ' ' || coalesce(r.clinical_summary,'')
        ), v_tsq
      )
    FROM referrals r
    WHERE r.patient_id = p_patient_id
      AND to_tsvector('english',
            coalesce(r.reason_for_referral,'') || ' ' || coalesce(r.clinical_summary,'')
          ) @@ v_tsq

    UNION ALL

    -- Admissions (patient_id is uuid)
    SELECT
      'admissions'::text,
      a.id,
      a.encounter_id,
      a.admission_date,
      ts_headline('english',
        coalesce(a.admitting_diagnosis,'') || ' ' || coalesce(a.discharge_diagnosis,'') || ' ' ||
        coalesce(a.discharge_summary,'') || ' ' || coalesce(a.chief_complaint,'') || ' ' ||
        coalesce(a.reason_for_admission,'') || ' ' || coalesce(a.notes,''),
        v_tsq, 'MaxWords=60, MinWords=20'
      ),
      ts_rank(
        to_tsvector('english',
          coalesce(a.admitting_diagnosis,'') || ' ' || coalesce(a.discharge_diagnosis,'') || ' ' ||
          coalesce(a.discharge_summary,'') || ' ' || coalesce(a.chief_complaint,'') || ' ' ||
          coalesce(a.reason_for_admission,'') || ' ' || coalesce(a.notes,'')
        ), v_tsq
      )
    FROM admissions a
    WHERE a.patient_id = p_patient_id
      AND to_tsvector('english',
            coalesce(a.admitting_diagnosis,'') || ' ' || coalesce(a.discharge_diagnosis,'') || ' ' ||
            coalesce(a.discharge_summary,'') || ' ' || coalesce(a.chief_complaint,'') || ' ' ||
            coalesce(a.reason_for_admission,'') || ' ' || coalesce(a.notes,'')
          ) @@ v_tsq

    UNION ALL

    -- Radiology requests (patient_id is varchar, join via encounter → visits)
    SELECT
      'radiology_requests'::text,
      rx.request_id,
      rx.encounter_id,
      rx.created_at,
      ts_headline('english',
        coalesce(rx.clinical_indication,'') || ' ' || coalesce(rx.clinical_history,'') || ' ' ||
        coalesce(rx.findings,'') || ' ' || coalesce(rx.impression,'') || ' ' ||
        coalesce(rx.report,''),
        v_tsq, 'MaxWords=60, MinWords=20'
      ),
      ts_rank(
        to_tsvector('english',
          coalesce(rx.clinical_indication,'') || ' ' || coalesce(rx.clinical_history,'') || ' ' ||
          coalesce(rx.findings,'') || ' ' || coalesce(rx.impression,'') || ' ' ||
          coalesce(rx.report,'')
        ), v_tsq
      )
    FROM radiology_requests rx
    JOIN visits v ON rx.encounter_id = v.id
    WHERE v.patient_id = p_patient_id
      AND to_tsvector('english',
            coalesce(rx.clinical_indication,'') || ' ' || coalesce(rx.clinical_history,'') || ' ' ||
            coalesce(rx.findings,'') || ' ' || coalesce(rx.impression,'') || ' ' ||
            coalesce(rx.report,'')
          ) @@ v_tsq

  ) r
  ORDER BY r.rnk DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- VECTOR SIMILARITY SEARCH
-- ============================================================
CREATE OR REPLACE FUNCTION search_patient_records_vector(
  p_patient_id uuid,
  p_query_embedding vector(768),
  p_limit int DEFAULT 20,
  p_similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  encounter_id uuid,
  record_date timestamptz,
  chunk_text text,
  chunk_type text,
  similarity float
) AS $$
BEGIN
  PERFORM verify_patient_access(p_patient_id);

  RETURN QUERY
  SELECT
    pre.source_table::text,
    pre.source_id,
    pre.encounter_id,
    pre.record_date,
    pre.chunk_text,
    pre.chunk_type::text,
    (1 - (pre.embedding <=> p_query_embedding))::float AS similarity
  FROM patient_record_embeddings pre
  WHERE pre.patient_id = p_patient_id
    AND 1 - (pre.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY pre.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- COMBINED HYBRID SEARCH: full-text + vector re-ranking
-- ============================================================
CREATE OR REPLACE FUNCTION search_patient_records_hybrid(
  p_patient_id uuid,
  p_query text,
  p_query_embedding vector(768),
  p_limit int DEFAULT 15,
  p_fulltext_weight float DEFAULT 0.4,
  p_vector_weight float DEFAULT 0.6
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  encounter_id uuid,
  record_date timestamptz,
  content_snippet text,
  combined_score float
) AS $$
BEGIN
  PERFORM verify_patient_access(p_patient_id);

  RETURN QUERY
  WITH fulltext_hits AS (
    SELECT ft.source_table, ft.source_id, ft.encounter_id, ft.record_date,
           ft.snippet, ft."rank"::float AS ft_score
    FROM search_patient_records_fulltext(p_patient_id, p_query, 50) ft
  ),
  vector_hits AS (
    SELECT vs.source_table, vs.source_id, vs.encounter_id, vs.record_date,
           vs.chunk_text, vs.similarity AS vec_score
    FROM search_patient_records_vector(p_patient_id, p_query_embedding, 50, 0.5) vs
  ),
  combined AS (
    SELECT
      COALESCE(f.source_table, v.source_table) AS source_table,
      COALESCE(f.source_id, v.source_id) AS source_id,
      COALESCE(f.encounter_id, v.encounter_id) AS encounter_id,
      COALESCE(f.record_date, v.record_date) AS record_date,
      COALESCE(f.snippet, v.chunk_text) AS content_snippet,
      (COALESCE(f.ft_score, 0) * p_fulltext_weight + COALESCE(v.vec_score, 0) * p_vector_weight) AS combined_score
    FROM fulltext_hits f
    FULL OUTER JOIN vector_hits v
      ON f.source_table = v.source_table AND f.source_id = v.source_id
  )
  SELECT c.source_table, c.source_id, c.encounter_id, c.record_date,
         c.content_snippet, c.combined_score
  FROM combined c
  ORDER BY c.combined_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
