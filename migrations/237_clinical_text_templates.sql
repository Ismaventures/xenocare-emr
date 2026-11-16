-- =============================================================================
-- CLINICAL TEXT TEMPLATES (Unified)
-- Replaces the module-specific migrations 235 and 236.
--
-- Supports:
--   • Shared templates  — created by admin/medical director, visible to all staff
--   • Personal templates — created by any clinician, visible only to themselves
--   • Any module        — radiology, consultation, nursing, ae, surgery, inpatient,
--                         lab, anc, dental, and any future modules
--   • Keyword search    — full-text + keyword array for fast typeahead
--   • Usage tracking    — most-used floats to top per user
-- =============================================================================

-- 1. Main table
CREATE TABLE IF NOT EXISTS public.clinical_text_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scoping
    module          VARCHAR(50)  NOT NULL,   -- 'radiology'|'consultation'|'nursing'|'ae'|'surgery'|'inpatient'|'lab'|'anc'|'dental'|...
    category        VARCHAR(100),            -- optional sub-scope within module e.g. 'findings','nursing_assessment','discharge_summary'
    is_shared       BOOLEAN NOT NULL DEFAULT false,  -- true = admin-created shared; false = personal

    -- Identity
    template_key    VARCHAR(150) NOT NULL,
    display_name    VARCHAR(250) NOT NULL,
    description     TEXT,

    -- Content: maps form field names → prefill text
    template_data   JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Search
    search_keywords TEXT[],
    -- Maintained by trigger; generated column rejected because expression must be immutable.
    tsv             TSVECTOR,

    -- Ownership
    created_by      UUID REFERENCES public.staff(id) ON DELETE SET NULL,  -- NULL = system seed

    -- Usage (per-template global counter; per-user tracking in separate table)
    usage_count     INTEGER NOT NULL DEFAULT 0,
    last_used_at    TIMESTAMPTZ,

    -- Metadata
    priority        INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Uniqueness per owner: shared templates unique globally; personal unique per user
    CONSTRAINT uq_shared_template_key UNIQUE NULLS NOT DISTINCT (template_key, created_by)
);

-- 2. Per-user usage tracking (so personal most-used can float up per doctor)
CREATE TABLE IF NOT EXISTS public.clinical_text_template_usage (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.clinical_text_templates(id) ON DELETE CASCADE,
    staff_id    UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (template_id, staff_id)   -- one row per (template, user); updated on each use
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_ctt_module_category  ON public.clinical_text_templates(module, category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ctt_created_by       ON public.clinical_text_templates(created_by)        WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ctt_is_shared        ON public.clinical_text_templates(is_shared)         WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ctt_keywords_gin     ON public.clinical_text_templates USING gin(search_keywords);
CREATE INDEX IF NOT EXISTS idx_ctt_tsv              ON public.clinical_text_templates USING gin(tsv);
CREATE INDEX IF NOT EXISTS idx_ctt_usage_staff      ON public.clinical_text_template_usage(staff_id, template_id);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION public.ctt_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- Keep full-text vector in sync on insert/update.
CREATE OR REPLACE FUNCTION public.ctt_set_tsv()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.tsv := to_tsvector(
        'english'::regconfig,
        coalesce(NEW.display_name, '') || ' ' ||
        coalesce(NEW.description, '') || ' ' ||
        coalesce(array_to_string(NEW.search_keywords, ' '), '')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctt_updated_at ON public.clinical_text_templates;
CREATE TRIGGER trg_ctt_updated_at
    BEFORE UPDATE ON public.clinical_text_templates
    FOR EACH ROW EXECUTE FUNCTION public.ctt_set_updated_at();

DROP TRIGGER IF EXISTS trg_ctt_set_tsv ON public.clinical_text_templates;
CREATE TRIGGER trg_ctt_set_tsv
    BEFORE INSERT OR UPDATE OF display_name, description, search_keywords
    ON public.clinical_text_templates
    FOR EACH ROW EXECUTE FUNCTION public.ctt_set_tsv();

-- Backfill/search-index existing rows when migration runs on non-empty data.
UPDATE public.clinical_text_tem                                  plates
SET tsv = to_tsvector(
    'english'::regconfig,
    coalesce(display_name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(array_to_string(search_keywords, ' '), '')
)
WHERE tsv IS NULL;

-- =============================================================================
-- 5. Search function
--    Returns shared templates + the calling user's personal templates,
--    merged and ordered by: personal usage count DESC, global usage DESC, priority DESC
-- =============================================================================
CREATE OR REPLACE FUNCTION public.search_clinical_text_templates(
    p_module        TEXT,
    p_staff_id      UUID,
    p_query         TEXT    DEFAULT '',
    p_category      TEXT    DEFAULT NULL,
    p_limit         INTEGER DEFAULT 30
)
RETURNS TABLE (
    id              UUID,
    template_key    VARCHAR(150),
    display_name    VARCHAR(250),
    description     TEXT,
    module          VARCHAR(50),
    category        VARCHAR(100),
    template_data   JSONB,
    search_keywords TEXT[],
    is_shared       BOOLEAN,
    is_mine         BOOLEAN,  -- true when this is the caller's own personal template
    usage_count     INTEGER,
    my_usage_count  INTEGER,  -- how many times this specific user has used it
    priority        INTEGER
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.template_key,
        t.display_name,
        t.description,
        t.module,
        t.category,
        t.template_data,
        t.search_keywords,
        t.is_shared,
        (t.created_by = p_staff_id)                 AS is_mine,
        t.usage_count,
        COALESCE(u.used_count, 0)                   AS my_usage_count,
        t.priority
    FROM public.clinical_text_templates t
    LEFT JOIN (
        SELECT template_id, COUNT(*)::INTEGER AS used_count
        FROM public.clinical_text_template_usage
        WHERE staff_id = p_staff_id
        GROUP BY template_id
    ) u ON u.template_id = t.id
    WHERE
        t.is_active = true
        AND t.module = p_module
        AND (
            t.is_shared = true                          -- shared → visible to all
            OR t.created_by = p_staff_id                -- personal → own only
        )
        AND (p_category IS NULL OR t.category = p_category OR t.category IS NULL)
        AND (
            p_query = ''
            OR t.tsv @@ plainto_tsquery('english', p_query)
            OR t.display_name ILIKE '%' || p_query || '%'
        )
    ORDER BY
        COALESCE(u.used_count, 0) DESC,   -- user's personal usage first
        t.usage_count DESC,               -- then global usage
        t.priority DESC,
        t.display_name
    LIMIT p_limit;
END;
$$;

-- 6. Record usage (upsert per-user, increment global)
CREATE OR REPLACE FUNCTION public.record_clinical_template_usage(
    p_template_id UUID,
    p_staff_id    UUID
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    -- Global counter
    UPDATE public.clinical_text_templates
    SET usage_count  = usage_count + 1,
        last_used_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_template_id;

    -- Per-user upsert
    INSERT INTO public.clinical_text_template_usage (template_id, staff_id, used_at)
    VALUES (p_template_id, p_staff_id, NOW())
    ON CONFLICT (template_id, staff_id) DO UPDATE
        SET used_at = NOW();
END;
$$;

-- =============================================================================
-- 7. RLS
-- =============================================================================
ALTER TABLE public.clinical_text_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_text_template_usage  ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read shared templates or their own personal ones
DROP POLICY IF EXISTS ctt_select ON public.clinical_text_templates;
CREATE POLICY ctt_select ON public.clinical_text_templates
    FOR SELECT USING (
        is_shared = true
        OR (
            created_by IN (
                SELECT id FROM public.staff WHERE user_id = auth.uid()
            )
        )
    );

-- Staff can insert their own personal templates; admin/director can insert shared ones
DROP POLICY IF EXISTS ctt_insert ON public.clinical_text_templates;
CREATE POLICY ctt_insert ON public.clinical_text_templates
    FOR INSERT WITH CHECK (
        (
            is_shared = false
            AND created_by IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
        )
        OR (
            is_shared = true
            AND EXISTS (
                SELECT 1 FROM public.staff
                WHERE user_id = auth.uid()
                AND role IN ('admin', 'super_admin', 'medical_director')
            )
        )
    );

-- Staff can update/delete only their own; admin can update/delete shared
DROP POLICY IF EXISTS ctt_modify ON public.clinical_text_templates;
CREATE POLICY ctt_modify ON public.clinical_text_templates
    FOR ALL USING (
        created_by IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.staff
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin', 'medical_director')
        )
    );

-- Usage: staff can manage their own rows
DROP POLICY IF EXISTS cttu_select ON public.clinical_text_template_usage;
CREATE POLICY cttu_select ON public.clinical_text_template_usage
    FOR SELECT USING (
        staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS cttu_modify ON public.clinical_text_template_usage;
CREATE POLICY cttu_modify ON public.clinical_text_template_usage
    FOR ALL USING (
        staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
    );

-- =============================================================================
-- 8. Seed: Shared starter templates
--    template_data keys match actual form field names used in each form component
-- =============================================================================

-- ── Radiology ────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('radiology_chest_xray_normal', 'radiology', 'findings', true,
 'Normal Chest X-ray',
 'PA and lateral — all normal, no acute cardiopulmonary finding',
 ARRAY['normal','chest','x-ray','clear','lungs'],
 10,
 '{"technique":"Standard PA and lateral chest X-ray performed with patient in upright position.",
   "findings":"Normal cardiomediastinal silhouette. Lungs are clear bilaterally without focal consolidation, pleural effusion, or pneumothorax. Bony thorax intact. No acute osseous abnormality.",
   "impression":"No acute cardiopulmonary abnormality.",
   "notes":"Clinical correlation recommended."}'::jsonb),

('radiology_chest_xray_pneumonia', 'radiology', 'findings', true,
 'Chest X-ray — Pneumonia',
 'Right/left lower zone consolidation consistent with pneumonia',
 ARRAY['pneumonia','consolidation','infection','chest','xray'],
 9,
 '{"technique":"Portable AP chest X-ray.",
   "findings":"Patchy airspace opacity in the right lower zone consistent with consolidation. No pleural effusion. Heart size normal. No pneumothorax.",
   "impression":"Right lower zone consolidation. Findings are consistent with pneumonia. Clinical correlation recommended.",
   "notes":"Recommend follow-up chest X-ray after completion of antibiotic therapy to confirm resolution."}'::jsonb),

('radiology_ct_brain_normal', 'radiology', 'findings', true,
 'Normal CT Brain (Non-contrast)',
 'No hemorrhage, no mass, no acute intracranial pathology',
 ARRAY['ct','brain','normal','head','no hemorrhage'],
 10,
 '{"technique":"Non-contrast CT scan of the brain was performed using standard protocol.",
   "findings":"No acute intracranial hemorrhage. No mass or mass lesion identified. No midline shift. Ventricular system is normal in size and configuration. Grey-white matter differentiation is preserved. No acute territorial infarct. Visualised bony calvarium is intact.",
   "impression":"Normal non-contrast CT brain. No acute intracranial pathology identified.",
   "notes":"Clinical correlation recommended."}'::jsonb),

('radiology_ct_brain_hemorrhage', 'radiology', 'findings', true,
 'CT Brain — Intracranial Hemorrhage',
 'Hyperdense lesion indicating acute hemorrhage',
 ARRAY['ct','brain','hemorrhage','bleed','head','urgent'],
 9,
 '{"technique":"Non-contrast CT scan of the brain performed urgently.",
   "findings":"Hyperdense lesion identified consistent with acute hemorrhage. Surrounding vasogenic oedema noted. Mass effect with midline shift present.",
   "impression":"Acute intracranial hemorrhage. Urgent neurosurgical review recommended.",
   "notes":"URGENT: Findings communicated to referring clinician at time of reporting."}'::jsonb),

('radiology_abdomen_us_normal', 'radiology', 'findings', true,
 'Normal Abdominopelvic Ultrasound',
 'Liver, gallbladder, kidneys, spleen, pancreas — all normal',
 ARRAY['ultrasound','abdomen','normal','liver','kidney','gallbladder'],
 10,
 '{"technique":"Real-time B-mode ultrasound of the abdomen and pelvis performed.",
   "findings":"Liver: Normal size and echogenicity. No focal lesion. No intrahepatic biliary dilatation.\nGallbladder: Normal size and wall thickness. No gallstones or sludge.\nCommon bile duct: Not dilated.\nPancreas: Visualised portions appear normal.\nSpleen: Normal size and echotexture.\nKidneys: Both kidneys are normal in size, cortical thickness, and echogenicity. No hydronephrosis or calculi.\nBladder: Adequately distended. No focal lesion.\nPelvic organs: Within normal limits.",
   "impression":"Normal abdominopelvic ultrasound.",
   "notes":"Clinical correlation recommended."}'::jsonb),

('radiology_msk_fracture_xray', 'radiology', 'findings', true,
 'X-ray — Fracture (No Displacement)',
 'Undisplaced fracture, soft tissues unremarkable',
 ARRAY['fracture','xray','bone','undisplaced','injury'],
 8,
 '{"technique":"Two orthogonal plain radiographic views obtained.",
   "findings":"Undisplaced fracture line identified. No significant angulation or displacement. Surrounding soft tissues show localised swelling. Joint spaces are preserved. No associated dislocation.",
   "impression":"Undisplaced fracture. Orthopaedic review recommended.",
   "notes":"Repeat X-ray after immobilisation recommended."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Consultation (GOPD) ───────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('consult_adult_upper_respiratory', 'consultation', 'consultation', true,
 'Adult — Upper Respiratory Tract Infection',
 'Sore throat, cough, rhinorrhoea — viral URTI',
 ARRAY['urti','cold','cough','sore throat','rhinorrhoea','viral'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with a 3-day history of sore throat, nasal congestion, rhinorrhoea, and dry cough. No significant breathlessness. No chest pain.",
   "review_of_systems":"Mild headache. No fever documented at home. No ear pain. No vomiting or diarrhoea.",
   "examination_findings":"Alert and oriented. Afebrile. No respiratory distress. Throat mildly erythematous. No tonsillar exudate. Cervical lymph nodes not enlarged. Chest clear to auscultation bilaterally.",
   "assessment":"Viral upper respiratory tract infection.",
   "plan":"Supportive management — adequate hydration, rest, analgesics/antipyretics as needed. No antibiotics indicated at this time.",
   "recommendations":"Return if symptoms worsen, fever develops, or breathlessness occurs. Follow up in 1 week if not improving."}'::jsonb),

('consult_adult_malaria_uncomplicated', 'consultation', 'consultation', true,
 'Adult — Uncomplicated Malaria',
 'Fever, chills, headache — malaria confirmed or suspected',
 ARRAY['malaria','fever','chills','headache','RDT','parasite'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with a 2-day history of fever, chills, rigors, and headache. No altered consciousness. No vomiting.",
   "review_of_systems":"Generalised body aches and weakness. Decreased appetite. No jaundice reported.",
   "examination_findings":"Febrile. Mild pallor. No jaundice. No neck stiffness. Abdomen soft — mild splenomegaly. No hepatomegaly.",
   "assessment":"Uncomplicated malaria. RDT/blood film pending/positive.",
   "plan":"Commence artemisinin-based combination therapy (ACT) per national guidelines. Monitor temperature. Ensure adequate oral intake.",
   "recommendations":"Return immediately if vomiting medication, seizures, altered consciousness, or inability to stand. Review in 3 days."}'::jsonb),

('consult_adult_hypertension_review', 'consultation', 'consultation', true,
 'Adult — Hypertension Review',
 'Routine hypertension follow-up, BP assessment',
 ARRAY['hypertension','bp','blood pressure','follow up','review'],
 9,
 '{"history_of_presenting_complaint":"Patient presents for routine hypertension review. Currently on antihypertensive medication. No complaints of headache, chest pain, visual disturbance, or ankle swelling today.",
   "review_of_systems":"No shortness of breath. No palpitations. Compliant with medications.",
   "examination_findings":"Alert and well-looking. BP recorded. No peripheral oedema. Heart sounds dual, no murmur. Chest clear.",
   "assessment":"Hypertension — currently controlled/uncontrolled on medication.",
   "plan":"Continue current antihypertensive regimen. Reinforce dietary sodium restriction and weight management. Repeat BP monitoring.",
   "recommendations":"Review in 1 month. Fasting lipid profile and renal function test if not done recently."}'::jsonb),

('consult_paediatric_fever', 'consultation', 'consultation', true,
 'Paediatric — Fever Evaluation',
 'Child with fever, no obvious focus',
 ARRAY['paediatric','child','fever','pyrexia','infant'],
 10,
 '{"history_of_presenting_complaint":"Child brought in with fever for 2 days. No localising symptoms identified by carer. Child active and feeding.",
   "review_of_systems":"No cough, ear pulling, vomiting, diarrhoea, rash, or neck stiffness reported by carer.",
   "examination_findings":"Child alert and active. Febrile. No neck stiffness. Anterior fontanelle flat (if infant). Throat not injected. Ears normal. Chest clear. Abdomen soft, no organomegaly. No rash.",
   "assessment":"Pyrexia of uncertain origin. Malaria RDT/blood film ordered.",
   "plan":"Antipyretics. Malaria test. Ensure adequate oral hydration.",
   "recommendations":"Return urgently if child becomes drowsy, has seizures, stops feeding, or develops rash. Review in 24 hours."}'::jsonb),

('consult_diabetes_review', 'consultation', 'consultation', true,
 'Adult — Diabetes Mellitus Review',
 'Routine DM follow-up, glycaemic control check',
 ARRAY['diabetes','dm','blood sugar','glycaemia','follow up','hba1c'],
 9,
 '{"history_of_presenting_complaint":"Patient presents for routine diabetes follow-up. No complaints of hypoglycaemic episodes. No polyuria, polydipsia, or visual changes reported today.",
   "review_of_systems":"No chest pain, shortness of breath, or foot wounds.",
   "examination_findings":"Alert and oriented. No pallor. BP recorded. Foot examination — intact skin, no ulcers. Peripheral pulses palpable. Vision grossly intact.",
   "assessment":"Type 2 Diabetes Mellitus — under review.",
   "plan":"Continue current antidiabetic regimen. Reinforce dietary advice. Review medication compliance.",
   "recommendations":"Repeat HbA1c and fasting blood glucose. Urine ACR. Review in 1 month."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Nursing ───────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('nursing_admission_assessment_general', 'nursing', 'nursing_notes', true,
 'General Admission Assessment',
 'Standard nursing admission assessment for adult inpatient',
 ARRAY['admission','nursing','assessment','inpatient'],
 10,
 '{"nursing_assessment":"Patient admitted to ward. Alert and oriented x3. Vital signs recorded and documented. Patient comfortable in bed. IV access established. Allergy status confirmed — NKDA. Admission history obtained.",
   "care_plan":"Hourly vital signs monitoring for first 4 hours, then 4-hourly if stable. IV fluids as prescribed. Medication administered as per prescription chart. Nil by mouth status reviewed with medical team. Fall risk assessment completed.",
   "nursing_notes":"Patient settled on admission. Family informed of admission. Patient educated on call bell use. Orientation to ward environment completed."}'::jsonb),

('nursing_postop_care', 'nursing', 'nursing_notes', true,
 'Post-Operative Nursing Care',
 'Immediate post-op recovery assessment and plan',
 ARRAY['post-op','surgery','recovery','nursing','theatre'],
 10,
 '{"nursing_assessment":"Patient returned from theatre. Conscious and maintaining airway independently. GCS 15/15. Vital signs stable. Surgical site checked — wound dry and intact. Drainage noted.",
   "care_plan":"Vital signs Q15min x1hr, then Q30min x2hrs, then hourly when stable. Wound site inspection 4-hourly. Pain assessment using numeric scale 2-hourly. IV fluids and post-op analgesia as prescribed. NBM until bowel sounds return.",
   "nursing_notes":"Patient comfortable. Pain score acceptable with prescribed analgesia. IV site patent. Patient aware of expected post-operative course."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Accident & Emergency ──────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('ae_triage_yellow', 'ae', 'triage_notes', true,
 'A&E Triage — Urgent (Yellow)',
 'Urgent but not immediately life-threatening',
 ARRAY['triage','urgent','ae','yellow','emergency'],
 9,
 '{"triage_notes":"Patient triaged as URGENT. Presenting complaint assessed. Vital signs recorded — within acceptable limits. Patient ambulatory and co-operative. Airway patent. No immediate life threat identified.",
   "clinical_notes":"Patient assessed at triage. History obtained from patient/carer. Relevant allergies noted. Assigned to urgent treatment area."}'::jsonb),

('ae_trauma_minor', 'ae', 'clinical_notes', true,
 'A&E — Minor Trauma',
 'Limb injury, laceration, or minor trauma without neurovascular compromise',
 ARRAY['trauma','injury','laceration','fracture','ae','minor'],
 9,
 '{"clinical_notes":"Patient presents following injury. Mechanism of injury documented. Neurovascular status of affected limb intact — sensation, movement, capillary refill normal. No open fracture or joint involvement.",
   "examination_findings":"Localised swelling and tenderness over injury site. Skin intact/laceration noted. Neurovascular examination satisfactory.",
   "plan":"X-ray ordered. Wound cleaned and dressed. Analgesia administered.",
   "disposition_notes":"Discharged with wound care instructions and analgesics. Advised to return if neurovascular changes occur."}'::jsonb),

('ae_chest_pain_low_risk', 'ae', 'clinical_notes', true,
 'A&E — Chest Pain (Low Risk)',
 'Atypical chest pain, ECG normal, low TIMI/HEART score',
 ARRAY['chest pain','ae','low risk','ecg','troponin'],
 9,
 '{"clinical_notes":"Patient presents with chest pain. Pain is atypical in character — not exertional, reproducible on palpation. No radiation. No diaphoresis or dyspnoea.",
   "examination_findings":"Haemodynamically stable. Heart sounds dual and normal. Chest clear. No chest wall crepitus. ECG performed — normal sinus rhythm, no acute ST changes.",
   "assessment":"Atypical chest pain. Low-risk features. Musculoskeletal aetiology considered.",
   "plan":"Troponin at 0 and 3 hours. Monitor. Analgesia as required.",
   "disposition_notes":"For discharge if second troponin negative and patient symptom-free. Clear return precautions given."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Inpatient / Ward Rounds ───────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('inpatient_ward_round_stable', 'inpatient', 'ward_round', true,
 'Ward Round — Patient Stable',
 'Patient progressing well, no change in management',
 ARRAY['ward round','stable','inpatient','review','daily'],
 10,
 '{"subjective":"Patient comfortable. No new complaints. Sleeping and feeding well.",
   "objective":"Vital signs stable. Afebrile. Wound site clean and healing well. No new signs.",
   "assessment":"Patient progressing well. No complications identified.",
   "plan":"Continue current management. Maintain IV access. Continue prescribed medications.",
   "follow_up_notes":"Review tomorrow morning. Discharge planning initiated if progress continues."}'::jsonb),

('inpatient_discharge_summary_template', 'inpatient', 'discharge_summary', true,
 'Discharge Summary',
 'Standard discharge summary structure',
 ARRAY['discharge','summary','inpatient','leave','home'],
 10,
 '{"admission_reason":"Patient admitted with the above-stated diagnosis.",
   "hospital_course":"Patient was managed conservatively/surgically. Clinical progress was satisfactory. Investigations reviewed.",
   "discharge_condition":"Patient discharged in stable and satisfactory condition.",
   "discharge_medications":"Medications prescribed on discharge as per prescription chart.",
   "follow_up_instructions":"Review in outpatient clinic in 2 weeks. Wound review as scheduled. Return to A&E immediately if symptoms worsen.",
   "discharge_notes":"Patient and carer educated on medications, wound care, and return precautions. Written discharge instructions provided."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── ANC ───────────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('anc_routine_visit_normal', 'anc', 'anc_visit', true,
 'ANC Routine Visit — Normal',
 'Uncomplicated pregnancy, routine antenatal review',
 ARRAY['anc','antenatal','routine','normal','pregnancy'],
 10,
 '{"antenatal_history":"Patient presents for routine antenatal visit. Pregnancy progressing normally. Fetal movements felt regularly.",
   "examination_findings":"Vitals stable. BP within normal limits. Fundal height appropriate for gestational age. Fetal heart tones heard.",
   "assessment":"Uncomplicated pregnancy. Normal antenatal progress.",
   "plan":"Haematinics and micronutrients continued. Malaria prophylaxis reviewed. Next scan/review scheduled.",
   "nursing_notes":"Patient counselled on danger signs in pregnancy, birth preparedness, and importance of continued ANC attendance."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Surgery ───────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('surgery_preop_assessment_elective', 'surgery', 'preop', true,
 'Pre-op Assessment — Elective Surgery',
 'Standard elective pre-operative assessment, ASA I-II',
 ARRAY['preop','surgery','elective','anaesthesia','assessment'],
 10,
 '{"preop_history":"Patient scheduled for elective procedure. No significant cardiorespiratory, renal, or hepatic comorbidities. No prior anaesthetic complications. NKDA.",
   "preop_examination":"Airway: Mallampati I. Neck mobility normal. Mouth opening adequate. Dentition intact. Cardiorespiratory examination unremarkable.",
   "preop_assessment":"ASA physical status I/II. Fit for general anaesthesia.",
   "preop_plan":"Informed consent obtained. NBM from midnight. IV access to be established on day of surgery. Preoperative medications reviewed."}'::jsonb),

('surgery_postop_notes_uncomplicated', 'surgery', 'postop', true,
 'Post-op Notes — Uncomplicated',
 'Procedure completed, no intraoperative complications',
 ARRAY['postop','surgery','recovery','uncomplicated','intraoperative'],
 10,
 '{"intraop_notes":"Procedure performed under general/spinal/local anaesthesia. Operative findings as expected. No significant intraoperative complications. Haemostasis achieved. Wound closed in layers.",
   "postop_notes":"Patient transferred to recovery in stable condition. Vital signs stable post-operatively. Estimated blood loss minimal.",
   "postop_plan":"IV fluids post-operatively. Analgesics as prescribed. NBM until bowel sounds return. Wound check tomorrow."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Lab ───────────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('lab_result_normal_interpretation', 'lab', 'result_notes', true,
 'Lab Result — All Values Normal',
 'All test values within normal reference range',
 ARRAY['lab','normal','results','interpretation'],
 10,
 '{"interpretation":"All results are within normal reference limits.",
   "additional_comments":"No immediate action required based on these results. Clinical correlation recommended.",
   "recommendations":"Repeat as clinically indicated."}'::jsonb),

('lab_result_anaemia', 'lab', 'result_notes', true,
 'Lab Result — Anaemia Pattern',
 'Low haemoglobin, iron deficiency or normocytic pattern',
 ARRAY['anaemia','low haemoglobin','iron','lab'],
 9,
 '{"interpretation":"Haemoglobin below normal reference range consistent with anaemia. Iron studies/peripheral film may assist in classification.",
   "additional_comments":"Anaemia detected. Severity and aetiology should guide management.",
   "recommendations":"Recommend peripheral blood film, iron studies, reticulocyte count. Clinical correlation required."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Dental ────────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (template_key, module, category, is_shared, display_name, description, search_keywords, priority, template_data) VALUES

('dental_exam_normal', 'dental', 'examination', true,
 'Dental Examination — Normal',
 'No caries, no periodontal disease, routine oral examination',
 ARRAY['dental','normal','oral','examination','teeth'],
 10,
 '{"chief_complaint":"Routine dental review.",
   "examination_findings":"32 teeth present. No caries detected. Gingival health satisfactory — no bleeding on probing. Periodontal attachment intact. Occlusion normal. Soft tissues — tongue, palate, and buccal mucosa all normal. No lymphadenopathy.",
   "assessment":"Good oral health. No active dental disease.",
   "treatment_notes":"Oral hygiene instructions reinforced. Dietary advice given.",
   "recommendations":"Routine review in 6 months."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;
