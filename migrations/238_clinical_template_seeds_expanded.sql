-- =============================================================================
-- 238. EXPANDED SPECIALTY AND CLINIC SPECIFIC SHARED CLINICAL TEMPLATES
--
-- IMPORTANT:
-- Seed categories in this migration are aligned to the exact form-level
-- TemplateSearchPopover category values used by the current UI. This keeps the
-- new templates discoverable without additional frontend changes.
-- =============================================================================

-- ── Consultation: Specialty full-note templates ──────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('consult_cardio_chest_pain_specialty', 'consultation', 'consultation', true,
 'Cardiology - Chest Pain Evaluation',
 'Exertional chest pain review with cardiovascular risk assessment',
 ARRAY['cardiology','chest pain','angina','ecg','troponin'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with intermittent central chest pain of 2 days duration. Pain is described as pressure like, worse with exertion, and partially relieved by rest. No history of trauma. No syncopal episode.","review_of_systems":"Occasional shortness of breath on exertion. No fever, cough, or pleuritic pain. No leg swelling reported today.","examination_findings":"Patient is alert and not in obvious distress. Blood pressure is elevated. Pulse is regular. Heart sounds are normal with no obvious murmur. Chest is clear. No pedal oedema.","assessment":"Chest pain for cardiac cause evaluation. Acute coronary syndrome and uncontrolled hypertension to be excluded.","plan":"Obtain ECG and serial troponin. Check full blood count, renal function, and fasting lipid profile. Give aspirin if not contraindicated. Optimise blood pressure control and arrange cardiology review.","recommendations":"Return urgently for worsening chest pain, shortness of breath, palpitations, or syncope. Reduce salt intake and avoid strenuous activity until review."}'::jsonb),

('consult_cardio_heart_failure_review', 'consultation', 'consultation', true,
 'Cardiology - Heart Failure Review',
 'Dyspnoea, orthopnoea, and pedal oedema follow-up note',
 ARRAY['cardiology','heart failure','dyspnoea','orthopnoea','oedema'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with progressive shortness of breath, orthopnoea, and bilateral leg swelling. Symptoms have worsened over the last 1 week with reduced exercise tolerance.","review_of_systems":"No fever or productive cough. Reports paroxysmal nocturnal dyspnoea. No current chest pain.","examination_findings":"Patient appears mildly dyspnoeic at rest. Raised jugular venous pressure noted. Bibasal crackles present. Bilateral pitting pedal oedema present. Heart sounds heard with possible gallop rhythm.","assessment":"Known or suspected congestive heart failure with evidence of fluid overload.","plan":"Check oxygen saturation, ECG, chest radiograph, urea and electrolytes, and echocardiography. Commence or optimise diuretics and fluid balance monitoring. Review antihypertensive and heart failure medications.","recommendations":"Advise salt restriction, daily weight monitoring, medication adherence, and urgent review if orthopnoea worsens or urine output reduces."}'::jsonb),

('consult_ortho_low_back_pain_specialty', 'consultation', 'consultation', true,
 'Orthopaedics - Low Back Pain',
 'Mechanical low back pain without red flag symptoms',
 ARRAY['orthopaedics','low back pain','lumbar','mechanical pain','physiotherapy'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with low back pain after lifting a heavy object. Pain is worse with bending and prolonged standing. No history of high energy trauma.","review_of_systems":"No lower limb weakness. No saddle numbness. No urinary or faecal incontinence. No weight loss or night sweats.","examination_findings":"Mild lumbar paraspinal tenderness noted. Reduced lumbar flexion due to pain. Straight leg raise is negative bilaterally. Lower limb power and sensation are preserved.","assessment":"Mechanical low back pain with no current red flag features.","plan":"Provide analgesia and muscle relaxant if required. Encourage early mobilisation, posture advice, and physiotherapy referral. Imaging only if persistent pain or red flags develop.","recommendations":"Return urgently for weakness, numbness, fever, bladder dysfunction, or inability to walk."}'::jsonb),

('consult_ortho_knee_oa_specialty', 'consultation', 'consultation', true,
 'Orthopaedics - Knee Osteoarthritis Review',
 'Chronic knee pain with degenerative symptoms',
 ARRAY['orthopaedics','knee pain','osteoarthritis','degenerative joint disease'],
 9,
 '{"history_of_presenting_complaint":"Patient reports chronic knee pain worse on walking and climbing stairs. There is associated stiffness after rest and occasional swelling. No recent injury.","review_of_systems":"No fever. No multiple joint swelling. No red hot joint. No constitutional symptoms.","examination_findings":"Knee shows mild bony enlargement with crepitus on movement. Tenderness is maximal along the joint line. Range of motion is mildly reduced. No gross instability.","assessment":"Likely knee osteoarthritis with chronic mechanical symptoms.","plan":"Start analgesia, weight reduction advice, activity modification, and physiotherapy. Request knee radiograph if not previously done. Consider orthopaedic review for persistent limitation.","recommendations":"Avoid prolonged kneeling and heavy impact activity. Return earlier if joint becomes acutely swollen, hot, or unable to bear weight."}'::jsonb),

('consult_ent_tonsillitis_specialty', 'consultation', 'consultation', true,
 'ENT - Tonsillitis Review',
 'Sore throat with odynophagia and inflamed tonsils',
 ARRAY['ent','tonsillitis','sore throat','odynophagia','tonsils'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with sore throat, painful swallowing, and fever for 3 days. There is no breathing difficulty or muffled voice.","review_of_systems":"No cough. No chest pain. Mild headache and reduced appetite are reported.","examination_findings":"Patient is febrile but not toxic. Tonsils are enlarged and erythematous with exudates. Tender anterior cervical lymph nodes are palpable. No trismus or uvular deviation.","assessment":"Acute tonsillitis. Peritonsillar abscess not evident at present.","plan":"Provide analgesia, hydration advice, and antibiotics if bacterial infection is clinically likely. Perform throat swab only if indicated. Monitor for airway compromise.","recommendations":"Return urgently for worsening swelling, drooling, breathing difficulty, or inability to swallow fluids."}'::jsonb),

('consult_derm_pruritic_rash_specialty', 'consultation', 'consultation', true,
 'Dermatology - Pruritic Rash Evaluation',
 'Itchy rash note for eczema or allergic dermatitis pattern',
 ARRAY['dermatology','rash','itching','eczema','dermatitis'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with itchy rash involving the flexural surfaces and trunk. Rash has been recurrent and worsens with heat and soap exposure. No new drug exposure reported.","review_of_systems":"No fever. No oral ulcers. No joint pains. Sleep is disturbed by itching.","examination_findings":"Dry erythematous patches with excoriation marks are seen over affected areas. No pustules or extensive skin peeling. No mucosal involvement noted.","assessment":"Pruritic dermatitis pattern, likely eczema or allergic contact dermatitis.","plan":"Advise emollients, trigger avoidance, and topical steroid for inflamed areas as appropriate. Consider antihistamine for itch and dermatology review if severe or recurrent.","recommendations":"Avoid harsh soaps, scratching, and unverified skin mixtures. Return if rash becomes widespread, infected, or associated with facial swelling."}'::jsonb),

('consult_urology_luts_bph_specialty', 'consultation', 'consultation', true,
 'Urology - Lower Urinary Tract Symptoms',
 'Frequency, nocturia, and weak stream review',
 ARRAY['urology','bph','luts','nocturia','weak stream'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with urinary frequency, nocturia, hesitancy, and poor urinary stream. Symptoms have been progressive over several months. No frank haematuria reported.","review_of_systems":"No fever or flank pain. No dysuria today. No weight loss.","examination_findings":"Patient is not in distress. Abdomen is soft with no palpable bladder. Digital rectal examination shows enlarged smooth prostate where examined. No costovertebral angle tenderness.","assessment":"Lower urinary tract symptoms likely related to benign prostatic enlargement. Infection and obstruction to be excluded.","plan":"Request urinalysis, renal function, and prostate assessment as indicated. Commence alpha blocker if appropriate and counsel on fluid timing. Refer to urology for persistent or complicated symptoms.","recommendations":"Return urgently for acute urinary retention, fever, severe pain, or haematuria."}'::jsonb),

('consult_paed_gastroenteritis_specialty', 'consultation', 'consultation', true,
 'Paediatrics - Acute Gastroenteritis',
 'Vomiting and diarrhoea note with dehydration assessment',
 ARRAY['paediatrics','gastroenteritis','diarrhoea','vomiting','dehydration'],
 10,
 '{"history_of_presenting_complaint":"Child presents with loose stools and vomiting for 2 days. There is reduced oral intake and caregiver reports fewer wet nappies or reduced urine output.","review_of_systems":"No convulsion. No persistent cough. Fever may be low grade. No blood in stool reported at present.","examination_findings":"Child is alert but mildly irritable. Mucous membranes are slightly dry. Eyes are not sunken or mildly sunken. Abdomen is soft with no guarding. Capillary refill is preserved.","assessment":"Acute gastroenteritis with mild to moderate dehydration.","plan":"Start oral rehydration solution and zinc as appropriate. Continue feeding in small frequent amounts. Check malaria or stool studies only if clinically indicated. Admit if unable to tolerate fluids or severe dehydration is present.","recommendations":"Return urgently for lethargy, persistent vomiting, blood in stool, inability to drink, or worsening dehydration."}'::jsonb),

('consult_gynae_pelvic_pain_specialty', 'consultation', 'consultation', true,
 'Gynaecology - Pelvic Pain Review',
 'Lower abdominal or pelvic pain with gynaecologic differential',
 ARRAY['gynaecology','pelvic pain','lower abdominal pain','vaginal discharge'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with lower abdominal and pelvic pain of several days duration. Pain may be associated with vaginal discharge or dysmenorrhoea. Last menstrual period and pregnancy risk assessed.","review_of_systems":"No syncope. No heavy vaginal bleeding today. No dysuria or bowel obstruction symptoms reported.","examination_findings":"Patient is haemodynamically stable. Mild suprapubic or lower abdominal tenderness is present. No abdominal rigidity. Pelvic examination to be done when appropriate and consented.","assessment":"Pelvic pain for gynaecologic evaluation. Differential includes pelvic infection, ovarian pathology, dysmenorrhoea, and ectopic pregnancy where relevant.","plan":"Perform pregnancy test, urinalysis, and pelvic ultrasound as indicated. Give analgesia. Treat likely infection if clinically supported and refer urgently if ectopic pregnancy is suspected.","recommendations":"Return urgently for dizziness, collapse, severe bleeding, fever, or worsening abdominal pain."}'::jsonb),

('consult_ophtho_red_eye_specialty', 'consultation', 'consultation', true,
 'Ophthalmology - Red Eye Evaluation',
 'Painful or itchy red eye note with visual review',
 ARRAY['ophthalmology','red eye','conjunctivitis','visual pain','eye'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with red eye, tearing, and discomfort. Symptom onset was acute. Ask about discharge, trauma, photophobia, and change in vision.","review_of_systems":"No severe headache or vomiting. No facial weakness. No systemic rash reported.","examination_findings":"Conjunctival injection is present. Cornea appears clear on gross inspection. No obvious lid swelling or foreign body is seen externally. Visual acuity should be checked and documented.","assessment":"Red eye for ophthalmic evaluation. Conjunctivitis is possible, but corneal injury and acute glaucoma must be considered if pain or reduced vision is present.","plan":"Check visual acuity and inspect for corneal involvement. Give lubricants or topical treatment as indicated after examination. Refer urgently if severe pain, photophobia, or reduced vision is present.","recommendations":"Avoid self medication with steroid drops. Return urgently for worsening pain, blurred vision, or trauma history."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Consultation: Specialty exam summaries ───────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('specialty_exam_cardiology_heart_failure', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Cardiology Heart Failure',
 'Focused cardiac and fluid overload examination summary',
 ARRAY['specialty exam','cardiology','heart failure','oedema','jvp'],
 9,
 '{"examination_findings":"Raised jugular venous pressure noted. Bibasal crepitations present. Heart sounds heard with possible gallop rhythm. Bilateral pitting pedal oedema present.","plan":"Check ECG, chest radiograph, and echocardiography. Commence or optimise diuretics and monitor fluid balance closely."}'::jsonb),

('specialty_exam_orthopaedics_knee', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Orthopaedic Knee',
 'Focused knee joint examination summary',
 ARRAY['specialty exam','orthopaedics','knee','crepitus','joint line'],
 8,
 '{"examination_findings":"Mild knee swelling with medial joint line tenderness. Crepitus is elicited on flexion and extension. Range of motion is mildly reduced. No gross ligamentous laxity is detected.","plan":"Continue analgesia, request knee radiograph if needed, and refer for physiotherapy or orthopaedic review."}'::jsonb),

('specialty_exam_ent_tonsillitis', 'consultation', 'specialty_exam', true,
 'Specialty Exam - ENT Throat',
 'Focused throat examination summary',
 ARRAY['specialty exam','ent','tonsils','throat','lymph nodes'],
 8,
 '{"examination_findings":"Tonsils are enlarged and erythematous with patchy exudates. Tender anterior cervical nodes are palpable. No trismus or uvular deviation is seen.","plan":"Provide analgesia, hydration advice, and antibiotics when clinically appropriate. Escalate urgently if airway compromise is suspected."}'::jsonb),

('specialty_exam_ophthalmology_red_eye', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Ophthalmology Red Eye',
 'Focused anterior eye examination summary',
 ARRAY['specialty exam','ophthalmology','red eye','visual acuity'],
 8,
 '{"examination_findings":"Conjunctival injection is present with tearing. No obvious external foreign body is seen. Gross corneal clarity is preserved and pupils appear reactive.","plan":"Document visual acuity, assess for corneal injury, and refer urgently if pain, photophobia, or reduced vision is present."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Consultation: SOAP style progress notes ──────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('progress_note_hypertension_followup', 'consultation', 'progress_note', true,
 'Progress Note - Hypertension Follow-up',
 'SOAP note for blood pressure review',
 ARRAY['progress note','hypertension','blood pressure','follow up'],
 9,
 '{"subjective":"Patient presents for routine blood pressure review and reports no headache, chest pain, or visual disturbance.","objective":"Blood pressure reviewed today. Patient is not in distress. No pedal oedema. Cardiovascular and respiratory examination show no acute abnormality.","assessment":"Hypertension on follow-up, currently stable or requiring minor medication adjustment based on blood pressure trend.","plan":"Continue or adjust antihypertensive therapy as indicated. Reinforce salt restriction, exercise, and medication adherence. Repeat blood pressure at next scheduled review.","notes":"Counselling given on lifestyle modification and danger symptoms.","follow_up_notes":"Review in clinic in 2 to 4 weeks with blood pressure chart."}'::jsonb),

('progress_note_diabetes_followup', 'consultation', 'progress_note', true,
 'Progress Note - Diabetes Follow-up',
 'SOAP note for glycaemic control review',
 ARRAY['progress note','diabetes','blood sugar','hba1c'],
 9,
 '{"subjective":"Patient attends for diabetes follow-up and denies hypoglycaemic symptoms, polyuria, or new foot wound.","objective":"General condition is stable. Random or fasting glucose reviewed. Feet show no active ulcer. No acute respiratory or cardiovascular finding.","assessment":"Diabetes mellitus on follow-up with ongoing monitoring of glycaemic control.","plan":"Continue current medication, reinforce dietary control, and schedule HbA1c and renal assessment if due. Continue daily foot care.","notes":"Medication adherence and diet reviewed.","follow_up_notes":"Return earlier for foot wound, persistent hyperglycaemia, or recurrent hypoglycaemia."}'::jsonb),

('progress_note_asthma_followup', 'consultation', 'progress_note', true,
 'Progress Note - Asthma Follow-up',
 'SOAP note for stable asthma review',
 ARRAY['progress note','asthma','wheeze','inhaler'],
 8,
 '{"subjective":"Patient reports intermittent wheeze but no current shortness of breath, nocturnal symptoms, or emergency visit since last review.","objective":"Patient is comfortable at rest. Respiratory rate is stable. No wheeze is heard on auscultation today. Oxygen saturation is satisfactory.","assessment":"Bronchial asthma on follow-up, currently stable.","plan":"Continue controller inhaler, reinforce inhaler technique, and review trigger avoidance. Escalate therapy if symptoms increase.","notes":"Inhaler technique demonstrated and corrected where needed.","follow_up_notes":"Return urgently for severe breathlessness, persistent wheeze, or poor response to reliever inhaler."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Radiology ────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('radiology_cxr_cardiomegaly', 'radiology', 'findings', true,
 'Chest X-ray - Cardiomegaly',
 'Enlarged cardiac silhouette without focal consolidation',
 ARRAY['radiology','chest xray','cardiomegaly','heart enlargement'],
 9,
 '{"technique":"PA chest radiograph obtained.","findings":"Cardiomediastinal silhouette is enlarged. No focal airspace consolidation. No pleural effusion or pneumothorax. Bony thorax shows no acute abnormality on this study.","impression":"Cardiomegaly with no acute focal pulmonary infiltrate.","notes":"Correlate with blood pressure status and echocardiography where indicated."}'::jsonb),

('radiology_mri_brain_infarct', 'radiology', 'findings', true,
 'MRI Brain - Acute Infarct',
 'Restricted diffusion in acute ischaemic stroke pattern',
 ARRAY['radiology','mri brain','infarct','stroke','diffusion'],
 10,
 '{"technique":"MRI of the brain performed with diffusion weighted imaging and standard sequences.","findings":"Area of diffusion restriction with corresponding signal change is seen in the affected vascular territory, consistent with acute infarction. No acute intracranial haemorrhage is identified. Mild surrounding oedema may be present.","impression":"Acute ischaemic infarct in the described territory. No evidence of acute intracranial haemorrhage.","notes":"Urgent clinical correlation and stroke pathway management advised."}'::jsonb),

('radiology_ct_abdomen_appendicitis', 'radiology', 'findings', true,
 'CT Abdomen - Appendicitis',
 'Dilated inflamed appendix with periappendiceal stranding',
 ARRAY['radiology','ct abdomen','appendicitis','appendix','right iliac fossa'],
 10,
 '{"technique":"Contrast enhanced CT scan of the abdomen and pelvis performed.","findings":"Appendix is dilated with wall thickening and surrounding periappendiceal fat stranding. No free intraperitoneal air is identified. Small volume local free fluid may be present. No drainable abscess is seen on this study.","impression":"CT features are consistent with acute appendicitis.","notes":"Urgent surgical review recommended."}'::jsonb),

('radiology_ct_abdomen_bowel_obstruction', 'radiology', 'findings', true,
 'CT Abdomen - Bowel Obstruction',
 'Dilated bowel loops with transition point',
 ARRAY['radiology','ct abdomen','bowel obstruction','transition point'],
 9,
 '{"technique":"Contrast enhanced CT scan of the abdomen and pelvis performed.","findings":"Multiple dilated bowel loops are seen with air fluid levels and a transition point identified. Distal bowel is collapsed. No pneumoperitoneum is seen. Associated free fluid may be minimal.","impression":"Findings are in keeping with mechanical bowel obstruction.","notes":"Urgent surgical correlation advised."}'::jsonb),

('radiology_obstetric_us_first_trimester_viable', 'radiology', 'findings', true,
 'Obstetric Ultrasound - Viable First Trimester Pregnancy',
 'Single live intrauterine gestation in first trimester',
 ARRAY['radiology','ultrasound','pregnancy','first trimester','viable'],
 9,
 '{"technique":"Transabdominal pelvic ultrasound performed.","findings":"Single intrauterine gestational sac is seen containing a fetal pole with cardiac activity. Crown rump length corresponds to stated gestational age. No significant peri gestational collection is seen. Adnexae are grossly unremarkable.","impression":"Single live intrauterine pregnancy consistent with first trimester gestation.","notes":"Routine antenatal follow-up recommended."}'::jsonb),

('radiology_echo_lv_dysfunction', 'radiology', 'findings', true,
 'Echocardiogram - Left Ventricular Dysfunction',
 'Reduced left ventricular systolic function',
 ARRAY['radiology','echocardiogram','lv dysfunction','heart failure','echo'],
 9,
 '{"technique":"Transthoracic echocardiography performed using standard views.","findings":"Left ventricle is mildly dilated with globally reduced systolic function. Estimated ejection fraction is reduced. No large pericardial effusion. Mild functional valvular regurgitation may be present.","impression":"Reduced left ventricular systolic function.","notes":"Correlate with clinical heart failure symptoms and optimise medical therapy."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── A&E: Consultation style notes ────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('ae_clinical_sepsis_suspected', 'ae', 'clinical_notes', true,
 'A&E - Suspected Sepsis',
 'Emergency assessment note for fever with systemic compromise',
 ARRAY['ae','sepsis','fever','tachycardia','infection'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with fever, weakness, poor appetite, and reduced urine output. There is concern for systemic infection with worsening lethargy over the last 24 to 48 hours.","assessment":"Suspected sepsis likely secondary to underlying infection. Patient requires urgent sepsis bundle and source evaluation.","plan":"Secure airway and circulation as needed. Obtain blood cultures, full blood count, renal function, lactate, and urine testing. Start broad spectrum antibiotics after cultures where possible. Give intravenous fluids and monitor urine output closely."}'::jsonb),

('ae_clinical_stroke_assessment', 'ae', 'clinical_notes', true,
 'A&E - Stroke Assessment',
 'Acute focal neurologic deficit note',
 ARRAY['ae','stroke','weakness','speech','ct brain'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with sudden onset weakness of one side of the body with slurred speech beginning within the last few hours. Time last known well documented.","assessment":"Acute focal neurologic deficit suspicious for stroke. Differential includes intracranial haemorrhage and stroke mimic.","plan":"Check glucose immediately. Arrange urgent CT brain, ECG, full blood count, and electrolytes. Maintain airway and blood pressure targets per stroke protocol. Neurology or medical review urgently."}'::jsonb),

('ae_clinical_paed_acute_asthma', 'ae', 'clinical_notes', true,
 'A&E - Paediatric Acute Asthma',
 'Wheeze and respiratory distress emergency note',
 ARRAY['ae','paediatric','asthma','wheeze','nebuliser'],
 9,
 '{"history_of_presenting_complaint":"Child presents with cough, wheeze, and increased work of breathing over several hours. There is history of prior wheeze or asthma medication use.","assessment":"Acute exacerbation of asthma with respiratory distress. Severity to be graded by work of breathing and oxygen saturation.","plan":"Give oxygen if hypoxic. Start bronchodilator nebulisation and systemic steroid as indicated. Monitor response, pulse, respiratory rate, and oxygen saturation. Escalate to senior review if poor response or exhaustion develops."}'::jsonb),

('ae_clinical_acute_abdomen', 'ae', 'clinical_notes', true,
 'A&E - Acute Abdomen',
 'Emergency abdominal pain note for surgical evaluation',
 ARRAY['ae','acute abdomen','abdominal pain','vomiting','surgery'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with severe abdominal pain with vomiting and inability to tolerate oral intake. Pain has worsened over time and may be localised or generalized.","assessment":"Acute abdomen requiring urgent surgical evaluation. Differential includes appendicitis, bowel obstruction, perforation, and ectopic pregnancy where relevant.","plan":"Keep nil by mouth. Secure intravenous access and start fluids. Request full blood count, electrolytes, urinalysis, pregnancy test where indicated, and urgent imaging. Provide analgesia and review by surgery team."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── A&E: Triage templates ────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('ae_triage_red_resuscitation', 'ae', 'ae_triage', true,
 'A&E Triage - Red Resuscitation',
 'Immediate life threatening presentation',
 ARRAY['ae','triage','red','resuscitation','critical'],
 10,
 '{"triage_notes":"Patient triaged RED due to compromised airway, breathing, circulation, altered level of consciousness, or other immediately life threatening presentation. Immediate transfer to resuscitation area initiated. Senior clinician notified at once."}'::jsonb),

('ae_triage_green_minor', 'ae', 'ae_triage', true,
 'A&E Triage - Green Minor Illness',
 'Stable non urgent triage note',
 ARRAY['ae','triage','green','minor illness','stable'],
 8,
 '{"triage_notes":"Patient triaged GREEN. Vital signs are stable and no immediate life threatening feature is identified. Patient is suitable for routine clinical review in the minor treatment area."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── A&E: Procedure notes ─────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('ae_procedure_laceration_repair', 'ae', 'ae_notes', true,
 'A&E Procedure - Laceration Repair',
 'Soft tissue wound closure note',
 ARRAY['ae','procedure','laceration','suturing','wound'],
 9,
 '{"findings":"Linear laceration noted with clean edges. No active arterial bleeding. No exposed tendon or neurovascular compromise identified on examination.","notes":"Wound irrigated thoroughly and cleaned under aseptic technique. Local anaesthetic infiltrated and laceration repaired with interrupted sutures. Sterile dressing applied.","complications":"No immediate procedural complication. Haemostasis achieved and patient tolerated procedure well."}'::jsonb),

('ae_procedure_abscess_drainage', 'ae', 'ae_notes', true,
 'A&E Procedure - Abscess Drainage',
 'Incision and drainage note',
 ARRAY['ae','procedure','abscess','drainage','pus'],
 9,
 '{"findings":"Localized fluctuant swelling with surrounding erythema noted, consistent with abscess collection. No gross necrosis seen.","notes":"Area cleaned and infiltrated with local anaesthetic. Incision and drainage performed with evacuation of purulent material. Cavity irrigated and dressed. Specimen sent if indicated.","complications":"No immediate complication noted during or after the procedure."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Inpatient: Ward rounds ───────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('inpatient_ward_round_severe_malaria', 'inpatient', 'ward_round', true,
 'Ward Round - Severe Malaria Review',
 'Daily review for admitted malaria patient',
 ARRAY['ward round','malaria','fever','inpatient','artesunate'],
 10,
 '{"subjective":"Patient reports improved fever pattern but still feels weak with poor appetite. No seizure activity reported overnight.","objective":"Temperature trend reviewed. Patient is conscious and oriented. Hydration status improving. Urine output monitored. No focal neurologic deficit seen on review.","assessment":"Severe malaria improving on treatment with ongoing inpatient monitoring required.","plan":"Continue antimalarial therapy per protocol, monitor glucose and urine output, maintain fluids, and repeat relevant laboratory tests. Escalate if consciousness worsens or anaemia becomes severe."}'::jsonb),

('inpatient_ward_round_postop_day1', 'inpatient', 'ward_round', true,
 'Ward Round - Post-op Day 1 Stable',
 'Routine first postoperative review',
 ARRAY['ward round','post op','day 1','surgery','wound'],
 10,
 '{"subjective":"Patient reports expected surgical site pain but no vomiting, chest pain, or shortness of breath.","objective":"Vital signs are stable. Wound dressing is dry and intact. Abdomen is soft where appropriate. Urine output is adequate. No active bleeding noted.","assessment":"Postoperative day 1 review. Patient stable with no immediate complication identified.","plan":"Continue analgesia, encourage mobilisation as tolerated, maintain fluids, and advance diet as permitted. Review wound and repeat labs if indicated."}'::jsonb),

('inpatient_ward_round_pneumonia', 'inpatient', 'ward_round', true,
 'Ward Round - Pneumonia Review',
 'Daily inpatient chest infection review',
 ARRAY['ward round','pneumonia','cough','antibiotics','oxygen'],
 9,
 '{"subjective":"Patient reports persistent cough but improved breathing compared with admission. Appetite remains reduced.","objective":"Temperature chart reviewed. Respiratory rate improved. Oxygen requirement documented. Crackles remain over the affected lung zone. No new confusion or cyanosis.","assessment":"Community acquired pneumonia on treatment with gradual clinical improvement.","plan":"Continue antibiotics, chest physiotherapy, and oxygen as required. Encourage oral intake and monitor oxygen saturation and inflammatory markers."}'::jsonb),

('inpatient_ward_round_heart_failure', 'inpatient', 'ward_round', true,
 'Ward Round - Heart Failure Review',
 'Daily review for fluid overload admission',
 ARRAY['ward round','heart failure','oedema','diuretic','fluid balance'],
 9,
 '{"subjective":"Patient reports reduced breathlessness and improved sleep overnight. Leg swelling is still present but less marked.","objective":"Fluid balance reviewed. Oxygen saturation stable. Bibasal crepitations reduced. Pedal oedema persists mildly. Blood pressure and urine output documented.","assessment":"Decompensated heart failure improving with diuresis.","plan":"Continue diuretics, monitor electrolytes and renal function, restrict salt, and titrate long term heart failure therapy as tolerated."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Inpatient: Discharge summaries ───────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('inpatient_discharge_medical_stable', 'inpatient', 'discharge_summary', true,
 'Discharge Summary - Medical Admission Stable',
 'General medical discharge structure',
 ARRAY['discharge','medical','stable','follow up'],
 9,
 '{"hospital_course":"Patient was admitted for medical management and responded well to treatment. Vital signs stabilised, key investigations were reviewed, and symptoms improved satisfactorily during admission.","discharge_condition":"Patient is being discharged in stable clinical condition.","discharge_medications":"Continue prescribed medications as documented on discharge medication chart.","follow_up_instructions":"Follow up in outpatient clinic as scheduled. Maintain medication adherence and return earlier if symptoms recur or worsen.","discharge_notes":"Patient and caregiver have been counselled on diagnosis, medication use, warning symptoms, and follow-up plan."}'::jsonb),

('inpatient_discharge_postop_uncomplicated', 'inpatient', 'discharge_summary', true,
 'Discharge Summary - Post-op Uncomplicated',
 'General postoperative discharge structure',
 ARRAY['discharge','post op','surgery','wound care'],
 9,
 '{"hospital_course":"Patient underwent procedure and had satisfactory postoperative recovery with stable observations and no major in-hospital complication.","discharge_condition":"Patient is ambulant or clinically stable for discharge.","discharge_medications":"Discharge medications include analgesics, antibiotics if prescribed, and any regular home medications.","follow_up_instructions":"Attend surgical clinic for wound review. Keep wound clean and dry, avoid heavy lifting where relevant, and return for fever, vomiting, bleeding, or wound discharge.","discharge_notes":"Postoperative home care instructions explained and understood by patient and caregiver."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Inpatient: Admission and procedure scheduling notes ─────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('inpatient_admission_chest_pain_workup', 'inpatient', 'admission_notes', true,
 'Admission Note - Chest Pain Workup',
 'Admission structure for monitored chest pain',
 ARRAY['admission','chest pain','ecg','troponin','monitoring'],
 9,
 '{"admitting_diagnosis":"Chest pain for cardiac evaluation.","reason_for_admission":"Requires serial ECG and troponin monitoring, blood pressure control, pain management, and inpatient observation while acute coronary syndrome is excluded.","notes":"Admit to monitored bed, keep under medical review, and document cardiovascular risk factors and response to treatment."}'::jsonb),

('inpatient_admission_stroke_observation', 'inpatient', 'admission_notes', true,
 'Admission Note - Stroke Observation',
 'Admission structure for acute neurologic deficit',
 ARRAY['admission','stroke','weakness','ct brain','observation'],
 9,
 '{"admitting_diagnosis":"Acute stroke or transient ischaemic neurologic event.","reason_for_admission":"Requires neuro observation, urgent imaging review, swallow assessment, blood pressure monitoring, and multidisciplinary inpatient care.","notes":"Institute stroke care measures, document time of onset, and monitor consciousness, airway safety, and neurologic status closely."}'::jsonb),

('inpatient_procedure_endoscopy_prep', 'inpatient', 'procedure_notes', true,
 'Procedure Note - Endoscopy Preparation',
 'Pre procedure instruction note for endoscopy',
 ARRAY['procedure','endoscopy','pre op','fasting'],
 8,
 '{"pre_op_instructions":"Keep nil by mouth for at least 6 hours before procedure unless otherwise directed. Confirm consent, review bleeding risk, ensure intravenous access, and arrange escort or recovery plan after sedation.","procedure_notes":"Indication for endoscopy reviewed and documented. Baseline vital signs recorded. Relevant laboratory results and anticoagulant history checked before scheduling."}'::jsonb),

('inpatient_procedure_biopsy_prep', 'inpatient', 'procedure_notes', true,
 'Procedure Note - Biopsy Preparation',
 'Pre procedure instruction note for biopsy scheduling',
 ARRAY['procedure','biopsy','pre op','consent'],
 8,
 '{"pre_op_instructions":"Explain procedure and obtain informed consent. Review coagulation profile where indicated. Hold anticoagulant medication according to protocol and confirm fasting requirement if sedation is planned.","procedure_notes":"Procedure indication and target site reviewed. Required imaging and laboratory work have been checked before booking."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Surgery ──────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('surgery_preop_low_risk_elective', 'surgery', 'surgery_preop', true,
 'Surgery Pre-op - Low Risk Elective',
 'Risk assessment note for low risk elective surgery',
 ARRAY['surgery','pre op','elective','low risk'],
 9,
 '{"cardiac_risk":"No active cardiac symptoms reported. Functional capacity is acceptable and there is no history suggesting unstable cardiac disease.","pulmonary_risk":"No chronic cough, wheeze, or active respiratory infection. Chest examination is clear and pulmonary risk appears low.","bleeding_risk":"No known bleeding disorder, anticoagulant use, or prior excessive bleeding history. Baseline blood count is acceptable where reviewed.","notes":"Patient appears fit for planned elective procedure with routine perioperative monitoring."}'::jsonb),

('surgery_preop_high_risk_comorbid', 'surgery', 'surgery_preop', true,
 'Surgery Pre-op - Comorbid High Risk',
 'Risk assessment note for older or comorbid patient',
 ARRAY['surgery','pre op','high risk','comorbidity','optimization'],
 9,
 '{"cardiac_risk":"Patient has cardiovascular risk factors or reduced exercise tolerance. Further ECG review and medical or cardiology optimisation should be considered before surgery.","pulmonary_risk":"Pulmonary risk is increased by age, obesity, smoking history, or chronic respiratory symptoms. Optimise chest status and encourage breathing exercises.","bleeding_risk":"Review antiplatelet or anticoagulant exposure and correct anaemia or coagulation abnormality before surgery where possible.","notes":"Procedure may proceed after optimisation and senior anaesthetic review based on urgency and overall risk."}'::jsonb),

('surgery_note_appendicitis_indication', 'surgery', 'surgery_notes', true,
 'Surgery Note - Appendicitis Indication',
 'Reason for surgery template for acute appendicitis',
 ARRAY['surgery','appendicitis','right iliac fossa','indication'],
 9,
 '{"indication":"Acute right iliac fossa pain with localized tenderness and supporting laboratory or imaging findings, consistent with acute appendicitis requiring operative management."}'::jsonb),

('surgery_note_inguinal_hernia_indication', 'surgery', 'surgery_notes', true,
 'Surgery Note - Inguinal Hernia Indication',
 'Reason for surgery template for symptomatic inguinal hernia',
 ARRAY['surgery','hernia','inguinal','indication'],
 8,
 '{"indication":"Symptomatic inguinal swelling with pain or limitation in activity, consistent with inguinal hernia requiring elective or urgent repair depending on reducibility and symptoms."}'::jsonb),

('surgery_intraop_appendicectomy', 'surgery', 'surgery_intraop', true,
 'Surgery Intra-op - Appendicectomy',
 'Operative note for inflamed appendix',
 ARRAY['surgery','intra op','appendicectomy','appendix'],
 9,
 '{"intraop_findings":"Inflamed oedematous appendix identified with surrounding mild serous fluid. No gross perforation seen on this note unless otherwise documented.","procedure_details":"Standard appendicectomy performed. Appendix mobilised, mesoappendix secured, base ligated, and specimen removed. Peritoneal toilet performed as needed and wound closed in layers.","intraop_complications":"No significant intraoperative complication documented."}'::jsonb),

('surgery_intraop_hernia_repair', 'surgery', 'surgery_intraop', true,
 'Surgery Intra-op - Hernia Repair',
 'Operative note for uncomplicated hernia repair',
 ARRAY['surgery','intra op','hernia repair','mesh'],
 8,
 '{"intraop_findings":"Inguinal hernia sac identified without bowel compromise on this template. Local tissues otherwise viable.","procedure_details":"Hernia sac dissected and managed appropriately. Posterior wall repaired with standard technique and mesh used where planned. Haemostasis secured and wound closed in layers.","intraop_complications":"No intraoperative complication recorded in this template."}'::jsonb),

('surgery_postop_appendicectomy', 'surgery', 'surgery_postop', true,
 'Surgery Post-op - Appendicectomy',
 'Postoperative instruction note after appendicectomy',
 ARRAY['surgery','post op','appendicectomy','discharge'],
 9,
 '{"post_op_complications":"No immediate postoperative complication identified. Pain is controlled and wound appears satisfactory.","discharge_instructions":"Keep wound clean and dry. Take prescribed medications. Avoid heavy lifting until reviewed. Return for fever, worsening pain, vomiting, wound discharge, or abdominal distension."}'::jsonb),

('surgery_postop_cesarean', 'surgery', 'surgery_postop', true,
 'Surgery Post-op - Caesarean Section',
 'Postoperative instruction note after caesarean delivery',
 ARRAY['surgery','post op','caesarean','wound care'],
 8,
 '{"post_op_complications":"Mother is stable postoperatively with no immediate anaesthetic or surgical complication documented in this template.","discharge_instructions":"Encourage early ambulation, wound hygiene, adequate analgesia, and exclusive breastfeeding support. Return urgently for fever, heavy bleeding, wound discharge, chest pain, or calf swelling."}'::jsonb),

('surgery_anesthesia_easy_airway', 'surgery', 'surgery_anesthesia', true,
 'Anaesthesia - Routine Easy Airway',
 'Standard airway management note for straightforward intubation',
 ARRAY['surgery','anaesthesia','airway','intubation'],
 8,
 '{"airway_management":"Airway assessment is favourable. Patient preoxygenated adequately. Endotracheal intubation performed successfully on first attempt with confirmation of bilateral air entry and capnography where available."}'::jsonb),

('surgery_anesthesia_difficult_airway_plan', 'surgery', 'surgery_anesthesia', true,
 'Anaesthesia - Difficult Airway Plan',
 'Airway management note when advanced preparation is needed',
 ARRAY['surgery','anaesthesia','difficult airway','video laryngoscope'],
 8,
 '{"airway_management":"Anticipated difficult airway. Difficult airway equipment prepared including video laryngoscope and backup supraglottic device. Experienced anaesthesia support available and rescue plan discussed before induction."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── ANC ──────────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('anc_doctor_routine_review_soap', 'anc', 'anc_notes', true,
 'ANC Doctor Review - Routine Stable Visit',
 'SOAP note for routine antenatal doctor review',
 ARRAY['anc','routine review','soap','antenatal'],
 9,
 '{"subjective":"Patient presents for routine antenatal review. Fetal movements are felt. No headache, vaginal bleeding, reduced fetal movement, or liquor loss reported.","objective":"Vital signs are stable. Fundal height is appropriate for gestational age. Fetal heart rate is heard and regular. No significant pedal oedema noted.","assessment":"Pregnancy progressing satisfactorily with no acute maternal or fetal concern identified today.","plan":"Continue haematinics and routine antenatal medications. Reinforce danger signs, birth preparedness, and scheduled follow-up attendance."}'::jsonb),

('anc_doctor_preeclampsia_review_soap', 'anc', 'anc_notes', true,
 'ANC Doctor Review - Preeclampsia Surveillance',
 'SOAP note for elevated blood pressure in pregnancy',
 ARRAY['anc','preeclampsia','hypertension','proteinuria'],
 10,
 '{"subjective":"Patient reports headache, facial puffiness, or reduced wellbeing in pregnancy. No seizure activity reported. Fetal movement enquiry performed.","objective":"Blood pressure is elevated on review. Urine dip may show protein. Mild oedema may be present. Fetal assessment to be documented.","assessment":"Hypertensive disorder of pregnancy with concern for preeclampsia requiring close monitoring or escalation.","plan":"Repeat blood pressure, check urine protein and laboratory evaluation, assess fetal wellbeing, and admit or escalate care if severe features are present."}'::jsonb),

('anc_doctor_anaemia_review_soap', 'anc', 'anc_notes', true,
 'ANC Doctor Review - Anaemia in Pregnancy',
 'SOAP note for pallor and low haemoglobin review',
 ARRAY['anc','anaemia','haemoglobin','pregnancy'],
 9,
 '{"subjective":"Patient reports easy fatigability, dizziness, or reduced exercise tolerance in pregnancy. No active bleeding reported.","objective":"Patient may be pale on examination. Vital signs reviewed. Latest haemoglobin result documented. Fetal heart rate checked.","assessment":"Anaemia in pregnancy for classification and treatment optimisation.","plan":"Continue or intensify haematinics, review diet and malaria prevention, investigate cause where indicated, and arrange repeat haemoglobin assessment."}'::jsonb),

('anc_booking_history_medical_family', 'anc', 'anc_notes', true,
 'ANC Booking - Medical and Family History',
 'Historical template for first ANC booking visit',
 ARRAY['anc','booking','medical history','family history'],
 9,
 '{"medical_history":"No history of chronic hypertension, diabetes, asthma, epilepsy, renal disease, or previous major surgery unless otherwise stated. Current medications and allergy status reviewed.","family_history":"Family history reviewed for hypertension, diabetes, multiple gestation, hereditary disorders, or adverse pregnancy outcomes."}'::jsonb),

('anc_nursing_maternal_complaints_review', 'anc', 'anc_notes', true,
 'ANC Nursing - Maternal Complaints Review',
 'Nursing note for routine ANC complaints and interventions',
 ARRAY['anc','nursing','maternal complaints','interventions'],
 8,
 '{"maternal_complaints":"Patient reports mild lower abdominal discomfort or back pain but denies vaginal bleeding, liquor loss, or absent fetal movement.","interventions":"Vital signs checked and documented. Urine specimen obtained where indicated. Fetal heart assessed. Patient counselled on hydration, rest, and danger signs in pregnancy."}'::jsonb),

('anc_delivery_normal_svd_note', 'anc', 'anc_notes', true,
 'ANC Delivery - Normal SVD Note',
 'Delivery outcome note for uncomplicated vaginal delivery',
 ARRAY['anc','delivery','svd','post delivery'],
 8,
 '{"notes":"Spontaneous vaginal delivery of a live infant achieved. Placenta delivered complete. Estimated blood loss acceptable. Mother remains stable post delivery and routine postpartum monitoring continues."}'::jsonb),

('anc_riskflag_counselling_note', 'anc', 'anc_notes', true,
 'ANC Risk Flag - Danger Sign Counselling',
 'Counselling note for obstetric warning symptoms',
 ARRAY['anc','risk flag','danger signs','counselling'],
 8,
 '{"notes":"Patient counselled to report urgently for headache, blurred vision, vaginal bleeding, reduced fetal movement, liquor loss, labour pains, fever, or difficulty breathing."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Dental ───────────────────────────────────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('dental_periapical_abscess_note', 'dental', 'dental_notes', true,
 'Dental - Periapical Abscess',
 'Painful infected tooth note with treatment plan',
 ARRAY['dental','abscess','toothache','swelling'],
 9,
 '{"chief_complaint":"Patient complains of severe toothache with facial swelling for several days.","dental_history":"History of recurrent tooth pain and delayed presentation for definitive dental care.","medical_history":"Relevant medical history and allergy status reviewed before treatment planning.","extraoral_findings":"Mild facial swelling and tenderness over the affected jaw region may be present.","intraoral_findings":"Grossly carious tooth identified with surrounding gingival swelling and localized tenderness. Pus point may be seen adjacent to the offending tooth.","treatment_plan":"Provide pain control, drainage where appropriate, and antibiotics if clinically indicated. Plan extraction or root canal treatment after acute infection is controlled."}'::jsonb),

('dental_simple_extraction_note', 'dental', 'dental_notes', true,
 'Dental - Simple Extraction',
 'Template for mobile or non restorable tooth extraction case',
 ARRAY['dental','extraction','mobile tooth','caries'],
 8,
 '{"chief_complaint":"Patient presents with painful or mobile tooth requiring removal.","dental_history":"Pain has been recurrent and worsens on chewing. Previous temporary relief only.","medical_history":"Medical history, bleeding history, and medication use reviewed.","extraoral_findings":"No significant facial swelling or cellulitis seen on this template unless separately documented.","intraoral_findings":"Offending tooth is grossly carious or mobile and not suitable for restoration. Surrounding mucosa mildly inflamed.","treatment_plan":"Proceed with extraction after consent and appropriate local anaesthesia. Give postoperative instructions and analgesia."}'::jsonb),

('dental_scaling_periodontal_note', 'dental', 'dental_notes', true,
 'Dental - Scaling and Periodontal Care',
 'Template for gingivitis or calculus review',
 ARRAY['dental','scaling','calculus','gingivitis','periodontal'],
 8,
 '{"chief_complaint":"Patient presents for gum care, bleeding gums, or routine cleaning.","dental_history":"Oral hygiene practices reviewed with history of plaque accumulation or occasional gum bleeding.","medical_history":"Medical history reviewed including diabetes status and smoking history where relevant.","extraoral_findings":"No facial swelling or lymph node enlargement noted.","intraoral_findings":"Generalised calculus deposits with gingival inflammation and bleeding on probing pattern. No acute odontogenic abscess seen.","treatment_plan":"Recommend scaling and polishing, oral hygiene instruction, and follow-up periodontal review as indicated."}'::jsonb),

('dental_caries_restoration_note', 'dental', 'dental_notes', true,
 'Dental - Caries and Restoration Plan',
 'Template for tooth decay assessment and restoration planning',
 ARRAY['dental','caries','filling','restoration'],
 8,
 '{"chief_complaint":"Patient reports localized tooth pain or sensitivity especially with sweet or cold stimulus.","dental_history":"Symptoms are intermittent but worsening over time. No significant swelling reported.","medical_history":"Relevant medical history reviewed before treatment planning.","extraoral_findings":"No facial asymmetry or swelling seen.","intraoral_findings":"Carious lesion identified on affected tooth with tenderness but no obvious spreading infection. Remaining dentition reviewed.","treatment_plan":"Plan restoration if tooth is restorable. Provide preventive advice and consider radiograph where clinically indicated."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Nursing: Hygiene and infection notes ─────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('nursing_hygiene_wound_care_note', 'nursing', 'hygiene_notes', true,
 'Nursing Hygiene - Wound Care',
 'Hygiene care note for routine wound dressing',
 ARRAY['nursing','hygiene','wound care','dressing'],
 8,
 '{"findings":"Wound edges are approximated with mild expected tenderness. No active bleeding or purulent discharge noted on this review.","notes":"Wound cleaned using aseptic technique and dressing changed. Patient educated on keeping dressing dry and reporting fever, worsening pain, or discharge."}'::jsonb),

('nursing_hygiene_catheter_care_note', 'nursing', 'hygiene_notes', true,
 'Nursing Hygiene - Catheter Care',
 'Hygiene care note for urinary catheter review',
 ARRAY['nursing','hygiene','catheter','urine output'],
 8,
 '{"findings":"Urinary catheter remains in situ and is draining urine. Catheter site appears clean with no obvious leak or blockage.","notes":"Perineal care performed. Drainage bag kept below bladder level. Urine output and catheter patency to be monitored and documented."}'::jsonb),

('nursing_infection_surgical_site_note', 'nursing', 'infection_notes', true,
 'Nursing Infection - Surgical Site Concern',
 'Infection report note for inflamed postoperative wound',
 ARRAY['nursing','infection','surgical site','wound'],
 8,
 '{"symptoms":"Patient has fever, increasing wound pain, surrounding redness, and possible purulent wound discharge.","treatment_notes":"Wound reviewed and cleaned. Swab obtained where ordered. Prescribed antibiotics administered and surgical team notified for further assessment."}'::jsonb),

('nursing_infection_uti_note', 'nursing', 'infection_notes', true,
 'Nursing Infection - Urinary Tract Infection',
 'Infection report note for urinary symptoms',
 ARRAY['nursing','infection','uti','dysuria','catheter'],
 8,
 '{"symptoms":"Patient reports dysuria, urinary frequency, suprapubic discomfort, or cloudy urine. Fever may be present.","treatment_notes":"Urine sample obtained where ordered. Fluids encouraged as appropriate. Prescribed medications given and response to treatment monitored."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Lab result interpretation templates ──────────────────────────────────────
INSERT INTO public.clinical_text_templates (
    template_key,
    module,
    category,
    is_shared,
    display_name,
    description,
    search_keywords,
    priority,
    template_data
) VALUES

('lab_malaria_positive_interpretation', 'lab', 'result_notes', true,
 'Lab Result - Malaria Positive',
 'Interpretation for positive malaria test',
 ARRAY['lab','malaria','positive','parasite'],
 8,
 '{"interpretation":"Malaria test is positive and supports current or recent malarial infection in the appropriate clinical setting.","additional_comments":"Correlate with fever pattern, haemoglobin status, and severity markers. Severe disease should be assessed clinically.","recommendations":"Commence or continue antimalarial treatment according to local protocol and monitor response clinically."}'::jsonb),

('lab_typhoid_positive_interpretation', 'lab', 'result_notes', true,
 'Lab Result - Typhoid Pattern',
 'Interpretation for typhoid supportive result pattern',
 ARRAY['lab','typhoid','widal','culture'],
 7,
 '{"interpretation":"Result pattern may support enteric fever when interpreted with compatible clinical history and epidemiologic context.","additional_comments":"Serology alone should be interpreted cautiously. Culture based confirmation is preferred where available.","recommendations":"Correlate with fever duration, abdominal findings, and microbiology results before final treatment decision."}'::jsonb),

('lab_hiv_reactive_interpretation', 'lab', 'result_notes', true,
 'Lab Result - HIV Reactive Screening Test',
 'Interpretation for reactive HIV screen',
 ARRAY['lab','hiv','reactive','screening','confirmatory'],
 8,
 '{"interpretation":"HIV screening result is reactive and requires confirmation according to the approved testing algorithm.","additional_comments":"Result should be communicated with counselling and confirmatory testing pathway. Confidential handling is essential.","recommendations":"Proceed with confirmatory testing, linkage to counselling services, and specialist HIV care as indicated."}'::jsonb),

('lab_abnormal_lft_interpretation', 'lab', 'result_notes', true,
 'Lab Result - Abnormal Liver Function Tests',
 'Interpretation for transaminitis or cholestatic pattern',
 ARRAY['lab','lft','liver enzymes','bilirubin'],
 7,
 '{"interpretation":"Liver function tests are abnormal and may reflect hepatocellular injury, cholestasis, or mixed hepatic pattern depending on the enzyme profile.","additional_comments":"Correlate with jaundice, alcohol or drug exposure, viral hepatitis risk, and ultrasound findings where necessary.","recommendations":"Repeat liver panel as indicated and investigate underlying cause with hepatitis screen or imaging based on clinical suspicion."}'::jsonb),

('lab_renal_impairment_interpretation', 'lab', 'result_notes', true,
 'Lab Result - Renal Impairment Pattern',
 'Interpretation for elevated urea or creatinine',
 ARRAY['lab','creatinine','renal impairment','urea'],
 7,
 '{"interpretation":"Renal indices are elevated, suggesting impaired kidney function or acute kidney injury depending on the clinical setting.","additional_comments":"Interpret alongside urine output, fluid status, medication exposure, and baseline renal function if known.","recommendations":"Review nephrotoxic medications, optimise hydration where appropriate, and arrange repeat renal profile or nephrology input if clinically required."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;