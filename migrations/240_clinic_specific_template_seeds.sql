-- =============================================================================
-- 240. CLINIC SPECIFIC TEMPLATE SEEDS FOR GOPD + REMAINING SPECIALTY CLINICS
--
-- Adds clinic-oriented shared templates for:
--   - GOPD consultation workflows
--   - Remaining specialty clinic consultation and examination summaries
--   - Dedicated dental, ophthalmology, and physiotherapy wizard categories
--
-- IMPORTANT:
-- Category values here must continue matching the live TemplateSearchPopover
-- call sites. Dedicated module categories added in this migration are:
--   - dental_exam
--   - ophthalmology_exam
--   - physio_assessment
-- =============================================================================

-- ── GOPD consultation templates ───────────────────────────────────────────────
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

('consult_gopd_uncomplicated_malaria', 'consultation', 'consultation', true,
 'GOPD - Uncomplicated Malaria Review',
 'Fever, headache, body aches, and malaria assessment for GOPD',
 ARRAY['gopd','general medicine','malaria','fever','headache'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with fever, chills, headache, and generalized body pain of 2 days duration. There is associated weakness and reduced appetite. No altered consciousness or convulsion reported.","review_of_systems":"Mild nausea may be present. No persistent cough, severe diarrhoea, neck stiffness, or focal weakness reported today.","examination_findings":"Patient is alert and mildly febrile. Mild dehydration may be present. No jaundice or respiratory distress. Chest is clear and abdomen is soft with no guarding.","assessment":"Febrile illness with suspicion of uncomplicated malaria. Severe malaria features are not evident at present.","plan":"Check malaria parasitaemia or rapid test, full blood count, and hydration status. Start antimalarial treatment according to protocol if confirmed or strongly suspected. Give antipyretic and oral fluids.","recommendations":"Return urgently for persistent vomiting, inability to drink, confusion, jaundice, severe weakness, or worsening fever."}'::jsonb),

('consult_gopd_hypertension_follow_up', 'consultation', 'consultation', true,
 'GOPD - Hypertension Follow-up',
 'Routine blood pressure review template for GOPD clinics',
 ARRAY['gopd','hypertension','blood pressure','follow-up','general medicine'],
 9,
 '{"history_of_presenting_complaint":"Patient presents for blood pressure follow-up and medication review. No current chest pain, focal weakness, or visual loss is reported. Adherence to medication and salt restriction is reviewed.","review_of_systems":"No severe headache, shortness of breath at rest, or reduced urine output today. No new leg swelling is reported.","examination_findings":"Patient is calm and not in distress. Blood pressure is reviewed today. Pulse is regular. Cardiovascular and respiratory examination show no acute abnormality. No pedal oedema is noted.","assessment":"Known hypertension on follow-up with need to assess current blood pressure control and medication adherence.","plan":"Repeat blood pressure, review drug adherence, and assess for secondary contributors or end organ symptoms where indicated. Check renal function and fasting lipid profile if due. Continue or adjust antihypertensive medication based on trend.","recommendations":"Maintain salt restriction, regular exercise, and clinic follow-up. Return urgently for chest pain, focal weakness, severe headache, or breathlessness."}'::jsonb),

('consult_gopd_type2_diabetes_follow_up', 'consultation', 'consultation', true,
 'GOPD - Type 2 Diabetes Follow-up',
 'Routine diabetes review with glycaemic control and foot risk check',
 ARRAY['gopd','diabetes','follow-up','glucose','general medicine'],
 9,
 '{"history_of_presenting_complaint":"Patient presents for diabetes follow-up and medication review. No recent severe hypoglycaemia is reported. Dietary adherence, home glucose trend, and medication use are reviewed.","review_of_systems":"No vomiting, chest pain, or new foot wound reported today. Polyuria or excessive thirst may be improving or stable.","examination_findings":"Patient is not acutely ill. Random or fasting glucose is reviewed. Foot inspection shows no active ulcer or gangrene. Peripheral pulses and hydration status are assessed as indicated.","assessment":"Type 2 diabetes mellitus on follow-up with ongoing monitoring of glycaemic control and complications.","plan":"Review glucose pattern, HbA1c timing, renal profile, and eye follow-up status. Continue or adjust medication as indicated. Reinforce foot care, diet, and exercise plan.","recommendations":"Return urgently for recurrent hypoglycaemia, vomiting, confusion, foot wound, or persistent marked hyperglycaemia."}'::jsonb),

('consult_gopd_dyspepsia_review', 'consultation', 'consultation', true,
 'GOPD - Dyspepsia Review',
 'Upper abdominal burning and bloating template for GOPD use',
 ARRAY['gopd','dyspepsia','epigastric pain','bloating','general medicine'],
 8,
 '{"history_of_presenting_complaint":"Patient presents with upper abdominal burning pain and post meal bloating for several weeks. Symptoms may worsen with spicy meals or prolonged fasting. No history of abdominal trauma.","review_of_systems":"No haematemesis, melaena, persistent vomiting, or progressive dysphagia reported. Appetite may be mildly reduced.","examination_findings":"Patient is haemodynamically stable. Mild epigastric tenderness may be present without guarding or rebound tenderness. No abdominal mass is palpated.","assessment":"Dyspepsia or gastritis pattern. Peptic ulcer disease and alarm symptoms should be excluded where clinically indicated.","plan":"Review use of NSAIDs, alcohol, and irritant meals. Start acid suppression where appropriate and request Helicobacter pylori testing or other workup if indicated. Escalate for endoscopy if alarm features or persistent symptoms are present.","recommendations":"Return urgently for vomiting blood, black stool, severe persistent pain, progressive swallowing difficulty, or weight loss."}'::jsonb),

('consult_gopd_urti_review', 'consultation', 'consultation', true,
 'GOPD - Upper Respiratory Tract Infection',
 'Sore throat, nasal congestion, and cough review for GOPD clinics',
 ARRAY['gopd','urti','cough','sore throat','general medicine'],
 8,
 '{"history_of_presenting_complaint":"Patient presents with sore throat, nasal congestion, sneezing, and non severe cough of a few days duration. There is no history of chest trauma or aspiration.","review_of_systems":"Low grade fever may be present. No pleuritic chest pain, severe shortness of breath, or confusion reported today.","examination_findings":"Patient is comfortable at rest. Oropharynx may show mild erythema. Nasal passages are congested. Chest examination is clear or shows no focal crepitations.","assessment":"Upper respiratory tract infection, likely viral in pattern, without current evidence of lower respiratory complication.","plan":"Provide symptomatic care with fluids, analgesia, and decongestant measures as appropriate. Check for bacterial red flags and treat accordingly only when clinically supported. Review if cough persists or lower respiratory signs develop.","recommendations":"Return urgently for worsening breathlessness, chest pain, persistent high fever, hemoptysis, or inability to maintain oral intake."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Remaining specialty clinic consultation templates ────────────────────────
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

('consult_gastro_dyspepsia_specialty', 'consultation', 'consultation', true,
 'Gastroenterology - Dyspepsia Review',
 'Epigastric pain, reflux, or early satiety review for gastro clinic',
 ARRAY['gastroenterology','dyspepsia','epigastric pain','reflux','gastro'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with upper abdominal burning pain, bloating, and early satiety. Symptoms may worsen after meals or when lying flat. No history of abdominal trauma.","review_of_systems":"No haematemesis, melaena, persistent vomiting, or progressive dysphagia reported today. Appetite may be reduced.","examination_findings":"Patient is stable. Mild epigastric tenderness may be present without guarding or rebound tenderness. No abdominal mass is palpated.","assessment":"Dyspepsia pattern for gastroenterology review. Peptic disease, reflux, and other upper gastrointestinal pathology remain possible.","plan":"Review drug triggers such as NSAIDs, request Helicobacter pylori testing or upper gastrointestinal workup as indicated, and start acid suppression where appropriate. Escalate for endoscopy if alarm features are present.","recommendations":"Return urgently for black stool, vomiting blood, progressive weight loss, persistent vomiting, or severe abdominal pain."}'::jsonb),

('consult_nephro_ckd_fluid_review', 'consultation', 'consultation', true,
 'Nephrology - Renal Impairment Review',
 'Known or suspected kidney disease with oedema or reduced urine output',
 ARRAY['nephrology','renal impairment','ckd','oedema','urine output'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with reduced urine output, leg swelling, or known chronic kidney disease follow-up. History of hypertension, diabetes, and nephrotoxic medication exposure is reviewed.","review_of_systems":"No current chest pain. Shortness of breath may worsen with fluid overload. No gross haematuria is reported today.","examination_findings":"Blood pressure may be elevated. Mild pallor and pedal oedema may be present. Lungs are assessed for fluid overload and abdomen is examined for renal tenderness or distension.","assessment":"Renal impairment or chronic kidney disease review with need to assess fluid status and progression.","plan":"Check renal profile, electrolytes, urinalysis, urine protein assessment, and renal ultrasound where indicated. Review blood pressure targets, avoid nephrotoxins, and arrange nephrology follow-up planning.","recommendations":"Return urgently for breathlessness, severe weakness, markedly reduced urine output, confusion, or rapidly worsening swelling."}'::jsonb),

('consult_neuro_seizure_review', 'consultation', 'consultation', true,
 'Neurology - Seizure Review',
 'Recurrent seizure history and follow-up note for neurology clinic',
 ARRAY['neurology','seizure','epilepsy','loss of consciousness','postictal'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with recurrent episodes of loss of consciousness with abnormal limb movements and post episode confusion. Trigger factors, medication adherence, and last seizure timing are reviewed.","review_of_systems":"No fever, recent head trauma, or persistent focal weakness reported at present. No current chest pain or severe breathlessness.","examination_findings":"Patient is alert at review. No meningeal signs are seen. Cranial nerves and limb power are grossly intact unless otherwise documented. No tongue bite or injury is actively bleeding.","assessment":"Known or suspected seizure disorder requiring neurology assessment and evaluation for provoking factors.","plan":"Check glucose and electrolytes, review antiepileptic use, and arrange EEG or brain imaging when indicated. Reinforce seizure precautions and medication adherence.","recommendations":"Return urgently for prolonged seizure, repeated seizures without recovery, new focal weakness, head injury, or persistent confusion."}'::jsonb),

('consult_neurosurg_radiculopathy_review', 'consultation', 'consultation', true,
 'Neurosurgery - Radiculopathy Review',
 'Spine pain with limb weakness or compressive symptoms for neurosurgery review',
 ARRAY['neurosurgery','radiculopathy','spine','weakness','back pain'],
 10,
 '{"history_of_presenting_complaint":"Patient presents with neck or low back pain radiating to a limb with numbness or progressive weakness. Symptoms worsen with movement and may interfere with walking or hand use.","review_of_systems":"No fever or recent major trauma is reported today. Screen for bladder dysfunction, saddle numbness, and rapidly progressive weakness.","examination_findings":"Localized spine tenderness may be present. Straight leg raise or nerve tension testing may reproduce symptoms. Focal motor or sensory deficit is documented where present.","assessment":"Possible compressive spinal pathology for neurosurgical review. Cauda equina syndrome or cord compression must be excluded if red flags are present.","plan":"Provide analgesia, urgent MRI where red flags exist, and neurosurgical review. Document power, sensation, gait, and bladder or bowel symptoms clearly.","recommendations":"Return urgently or escalate immediately for urinary retention, saddle numbness, rapidly worsening weakness, or inability to walk."}'::jsonb),

('consult_neuropsych_mood_behaviour_review', 'consultation', 'consultation', true,
 'Neuropsychiatry - Mood and Behaviour Review',
 'Low mood, sleep change, irritability, or behavioural symptoms note',
 ARRAY['neuropsychiatry','mood','behaviour','sleep','mental state'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with low mood, irritability, poor sleep, reduced concentration, or behavioural change affecting daily function. Stressors, substance exposure, and prior episodes are reviewed.","review_of_systems":"No fever or recent head trauma reported. Appetite and energy may be reduced. Safety concerns, psychotic symptoms, and self harm risk are assessed where appropriate.","examination_findings":"Patient is alert and oriented. Speech is coherent. Mood may appear low or anxious. Behaviour is cooperative unless otherwise documented. No acute medical instability is identified.","assessment":"Neuropsychiatric symptoms requiring structured mental state assessment and review for organic contributors where relevant.","plan":"Complete mental state examination, review safety, screen for substance use, and request targeted laboratory tests if clinically indicated. Arrange neuropsychiatry follow-up and counselling plan where appropriate.","recommendations":"Return urgently or escalate same day for suicidal ideation, severe agitation, violence risk, confusion, or inability to maintain basic self care."}'::jsonb),

('consult_gensurg_hernia_review', 'consultation', 'consultation', true,
 'General Surgery - Hernia Review',
 'Groin or abdominal wall swelling review for general surgery clinic',
 ARRAY['general surgery','hernia','groin swelling','abdominal wall','surgical clinic'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with groin or abdominal wall swelling that becomes more obvious on standing or coughing. Pain is usually mild to moderate and there is no current vomiting or obstipation.","review_of_systems":"No fever, abdominal distension, or inability to pass stool is reported today. No severe persistent pain at rest.","examination_findings":"A reducible groin or abdominal wall swelling with cough impulse may be present. Abdomen is soft with no peritonism. Bowel sounds are present.","assessment":"Likely uncomplicated hernia for general surgery review. Incarceration or obstruction must be excluded if symptoms worsen.","plan":"Provide analgesia, advise avoidance of heavy lifting, and arrange surgical review for elective repair planning. Escalate urgently if swelling becomes irreducible or painful.","recommendations":"Return urgently for irreducible swelling, vomiting, increasing abdominal pain, distension, or fever."}'::jsonb),

('consult_omfs_facial_swelling_review', 'consultation', 'consultation', true,
 'Oral and Maxillofacial - Facial Swelling Review',
 'Jaw pain or facial swelling note for oral and maxillofacial clinics',
 ARRAY['oral maxillofacial','facial swelling','jaw pain','trismus','dental infection'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with facial swelling, jaw pain, or painful chewing. Symptoms may follow dental pain, trauma, or oral infection. Difficulty opening the mouth is assessed.","review_of_systems":"No current airway compromise is reported. Ask about fever, drooling, dysphagia, and recent dental procedures.","examination_findings":"Unilateral facial swelling and local tenderness may be present. Oral cavity examination may show gingival inflammation or tooth related sepsis. Mouth opening is assessed and airway remains patent unless otherwise documented.","assessment":"Facial swelling for oral and maxillofacial review. Odontogenic infection and deep space spread must be considered.","plan":"Give analgesia, start antibiotics where clinically indicated, request imaging if deep infection or fracture is suspected, and arrange maxillofacial review.","recommendations":"Return urgently or escalate immediately for drooling, breathing difficulty, worsening trismus, fever, or rapidly enlarging swelling."}'::jsonb),

('consult_pulm_chronic_cough_review', 'consultation', 'consultation', true,
 'Pulmonology - Chronic Cough Review',
 'Persistent cough and breathlessness template for pulmonology clinic',
 ARRAY['pulmonology','chronic cough','dyspnoea','wheeze','chest clinic'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with chronic cough, sputum production, wheeze, or exertional breathlessness over weeks to months. Smoking exposure, occupational exposure, and prior inhaler use are reviewed.","review_of_systems":"No pleuritic chest pain or syncope reported today. Ask about weight loss, haemoptysis, fever, and nocturnal symptoms.","examination_findings":"Patient is comfortable or mildly breathless on exertion. Oxygen saturation is assessed. Scattered wheeze or basal crackles may be present. No acute cyanosis is seen.","assessment":"Chronic respiratory symptom complex for pulmonology review. Asthma, COPD, tuberculosis, interstitial disease, or other chronic lung pathology remain possible.","plan":"Request chest radiograph, spirometry, and sputum based workup where indicated. Review inhaler technique and smoking cessation needs. Arrange pulmonology follow-up with severity assessment.","recommendations":"Return urgently for haemoptysis, severe breathlessness, chest pain, confusion, or rapidly worsening cough."}'::jsonb),

('consult_endo_thyroid_swelling_review', 'consultation', 'consultation', true,
 'Endocrinology - Thyroid Swelling Review',
 'Goitre, weight change, or palpitations template for endocrine clinic',
 ARRAY['endocrinology','thyroid','goitre','palpitations','weight loss'],
 9,
 '{"history_of_presenting_complaint":"Patient presents with neck swelling, palpitations, heat intolerance, or unexplained weight change. Duration of symptoms, compressive symptoms, and family history are reviewed.","review_of_systems":"No severe chest pain or syncope today. Ask about tremor, bowel habit change, menstrual change, and voice alteration.","examination_findings":"Thyroid enlargement may be visible or palpable. Pulse may be elevated and a fine tremor may be present. No stridor is present unless otherwise documented.","assessment":"Possible thyroid disorder or goitre for endocrinology review. Thyrotoxicosis, hypothyroidism, or structural thyroid disease remain possible.","plan":"Request thyroid function tests, thyroid ultrasound, and ECG where indicated. Review airway or swallowing symptoms and arrange endocrine follow-up with medical management planning.","recommendations":"Return urgently for breathing difficulty, severe palpitations, syncope, or rapidly enlarging neck swelling."}'::jsonb),

('consult_plastics_scar_wound_review', 'consultation', 'consultation', true,
 'Plastic Surgery - Scar or Wound Review',
 'Healing wound, burn scar, or contracture template for plastic surgery clinic',
 ARRAY['plastic surgery','scar','wound','burn','contracture'],
 9,
 '{"history_of_presenting_complaint":"Patient presents for review of a healing wound, burn scar, or soft tissue defect. Pain, discharge, and restriction of movement are assessed together with cosmetic or functional concerns.","review_of_systems":"No fever or systemic symptoms are reported today. Ask about redness, foul discharge, sensory change, and progressive tightening of scar tissue.","examination_findings":"Wound bed or scar is inspected for healing, erythema, contracture, and surrounding tenderness. Range of motion is assessed where scar crosses a joint. No gross necrosis is seen unless otherwise documented.","assessment":"Healing soft tissue wound or scar requiring plastic surgery review for functional or cosmetic optimization.","plan":"Continue wound care plan, review dressing needs, assess need for scar management or contracture release, and coordinate therapy support where indicated.","recommendations":"Return urgently for spreading redness, fever, foul discharge, severe pain, or rapidly worsening movement restriction."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Remaining specialty clinic examination summaries ─────────────────────────
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

('specialty_exam_gastro_dyspepsia', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Gastroenterology Dyspepsia',
 'Focused upper abdominal examination summary for gastro clinic',
 ARRAY['specialty exam','gastroenterology','dyspepsia','epigastric'],
 8,
 '{"examination_findings":"Mild epigastric tenderness is present without guarding, rebound tenderness, or palpable mass. Patient is haemodynamically stable.","plan":"Review alarm features, arrange upper gastrointestinal workup when indicated, and continue symptom directed treatment."}'::jsonb),

('specialty_exam_nephro_fluid_status', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Nephrology Fluid Status',
 'Focused fluid status and renal review summary',
 ARRAY['specialty exam','nephrology','oedema','renal','fluid status'],
 8,
 '{"examination_findings":"Blood pressure is elevated. Mild pallor and bilateral pedal oedema are present. Respiratory examination is reviewed for crackles or fluid overload.","plan":"Check renal profile, urinalysis, and fluid balance markers, then correlate with chronic kidney disease stage and medication review."}'::jsonb),

('specialty_exam_neuro_seizure', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Neurology Seizure Review',
 'Focused neurologic review template for seizure clinic',
 ARRAY['specialty exam','neurology','seizure','cranial nerves'],
 8,
 '{"examination_findings":"Patient is alert and oriented. Cranial nerves are grossly intact. No obvious focal limb weakness or meningeal sign is noted during review.","plan":"Review provoking factors, arrange EEG or neuroimaging when indicated, and reinforce seizure precautions and medication adherence."}'::jsonb),

('specialty_exam_neurosurg_radiculopathy', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Neurosurgery Spine Compression',
 'Focused spine and radiculopathy summary for neurosurgery clinic',
 ARRAY['specialty exam','neurosurgery','spine','radiculopathy','weakness'],
 8,
 '{"examination_findings":"Spine movement reproduces radicular pain. Nerve tension signs may be positive. Documented focal weakness or sensory change is recorded where present.","plan":"Arrange spine imaging urgently when red flags exist and correlate with bladder, bowel, and gait status before neurosurgical review."}'::jsonb),

('specialty_exam_neuropsych_mental_state', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Neuropsychiatry Mental State',
 'Focused mental state and behaviour summary',
 ARRAY['specialty exam','neuropsychiatry','mental state','mood','behaviour'],
 8,
 '{"examination_findings":"Patient is oriented, speech is coherent, and behaviour is cooperative unless otherwise documented. Mood may appear low or anxious with preserved attention during review.","plan":"Complete formal mental state assessment, document risk clearly, and correlate with medical contributors or substance history where relevant."}'::jsonb),

('specialty_exam_gensurg_hernia', 'consultation', 'specialty_exam', true,
 'Specialty Exam - General Surgery Hernia',
 'Focused groin or abdominal wall hernia summary',
 ARRAY['specialty exam','general surgery','hernia','groin'],
 8,
 '{"examination_findings":"Reducible groin or abdominal wall swelling with cough impulse is noted. Abdomen is soft with no peritonism or obstructive abdominal distension.","plan":"Counsel on danger signs, avoid heavy lifting, and prepare for elective or urgent surgical review depending on reducibility and pain pattern."}'::jsonb),

('specialty_exam_omfs_facial_swelling', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Oral and Maxillofacial Swelling',
 'Focused jaw and facial swelling examination summary',
 ARRAY['specialty exam','oral maxillofacial','facial swelling','jaw'],
 8,
 '{"examination_findings":"Localized facial swelling and tenderness are present. Oral examination may show dental sepsis or gingival inflammation. Mouth opening is assessed and airway remains patent.","plan":"Escalate for deep space infection concern, request imaging when indicated, and continue maxillofacial review planning."}'::jsonb),

('specialty_exam_pulm_chronic_cough', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Pulmonology Chronic Cough',
 'Focused respiratory summary for pulmonology clinic',
 ARRAY['specialty exam','pulmonology','chronic cough','wheeze'],
 8,
 '{"examination_findings":"Respiratory rate and oxygen saturation are reviewed. Scattered wheeze or basal crackles may be present. No acute cyanosis is observed.","plan":"Correlate with chest imaging and spirometry, review inhaler technique, and escalate for haemoptysis or significant hypoxia."}'::jsonb),

('specialty_exam_endo_thyroid', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Endocrinology Thyroid Review',
 'Focused thyroid examination summary for endocrine clinic',
 ARRAY['specialty exam','endocrinology','thyroid','goitre'],
 8,
 '{"examination_findings":"Diffuse or nodular thyroid enlargement may be palpable. Fine tremor and elevated pulse may accompany hyperthyroid symptoms. No stridor is present unless otherwise documented.","plan":"Request thyroid function tests and ultrasound, then correlate with compressive symptoms and cardiovascular status."}'::jsonb),

('specialty_exam_plastics_scar', 'consultation', 'specialty_exam', true,
 'Specialty Exam - Plastic Surgery Scar Review',
 'Focused scar or wound assessment summary',
 ARRAY['specialty exam','plastic surgery','scar','wound'],
 8,
 '{"examination_findings":"Healing wound or mature scar is inspected for erythema, discharge, contracture, and limitation of adjacent joint movement. Surrounding tissue viability is preserved unless otherwise documented.","plan":"Continue wound or scar management, assess need for procedure planning, and coordinate therapy support for function preservation."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;

-- ── Dedicated module templates: Dental, Ophthalmology, Physiotherapy ────────
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

('dental_exam_acute_odontogenic_pain', 'dental', 'dental_exam', true,
 'Dental - Acute Tooth Pain Review',
 'Shared dental exam template for caries or pulpitis presentations',
 ARRAY['dental','tooth pain','caries','pulpitis','dental exam'],
 10,
 '{"complaint_description":"Severe toothache with chewing pain and sensitivity to cold stimuli.","dental_history":"Recurrent tooth pain with delayed presentation for dental care. Prior fillings or extractions may be present.","medical_history":"Drug allergy, bleeding risk, and relevant comorbidities reviewed before procedure planning.","extraoral_findings":"No gross facial asymmetry. Mild tenderness may be present over the affected jaw.","intraoral_findings":"Deep carious lesion is seen on the symptomatic tooth with percussion tenderness and surrounding gingival inflammation.","radiograph_findings":"Periapical radiolucency or deep carious involvement is noted where radiograph is available.","provisional_diagnosis":"Dental caries with symptomatic irreversible pulpitis or apical periodontitis.","final_diagnosis":"","treatment_plan":"Provide analgesia, control infection when indicated, obtain dental radiograph, and plan definitive restoration or extraction based on tooth status."}'::jsonb),

('dental_exam_periodontal_review', 'dental', 'dental_exam', true,
 'Dental - Periodontal Review',
 'Shared dental exam template for bleeding gums and periodontal disease',
 ARRAY['dental','periodontal','gingivitis','bleeding gums','halitosis'],
 9,
 '{"complaint_description":"Bleeding gums with bad breath and discomfort during brushing.","dental_history":"Patient reports irregular scaling history, plaque accumulation, or recurrent gum swelling.","medical_history":"Relevant diabetes, smoking exposure, and medication history reviewed.","extraoral_findings":"No facial swelling is present. Regional nodes are not significantly enlarged unless otherwise documented.","intraoral_findings":"Generalized plaque and calculus deposits are present with gingival inflammation and periodontal pocket concerns where examined.","radiograph_findings":"Alveolar bone loss is assessed where radiographs are available.","provisional_diagnosis":"Gingivitis or chronic periodontitis pattern.","final_diagnosis":"","treatment_plan":"Provide oral hygiene counselling, arrange scaling and root planing where indicated, and review periodontal risk factors with follow-up planning."}'::jsonb),

('ophthalmology_exam_red_eye', 'ophthalmology', 'ophthalmology_exam', true,
 'Ophthalmology - Red Eye Review',
 'Shared eye exam template for acute red eye presentations',
 ARRAY['ophthalmology','red eye','photophobia','conjunctivitis','eye exam'],
 10,
 '{"chief_complaint":"Red painful eye with tearing, discomfort, and possible photophobia.","provisional_diagnosis":"Red eye for ophthalmic review. Conjunctivitis, corneal abrasion, and acute glaucoma should be excluded based on examination.","final_diagnosis":"","treatment_plan":"Check visual acuity, assess cornea and anterior chamber, provide appropriate topical therapy after examination, and refer urgently if vision is reduced or pain is severe."}'::jsonb),

('ophthalmology_exam_glaucoma_follow_up', 'ophthalmology', 'ophthalmology_exam', true,
 'Ophthalmology - Glaucoma Follow-up',
 'Shared eye exam template for glaucoma clinic reviews',
 ARRAY['ophthalmology','glaucoma','follow-up','iop','optic nerve'],
 9,
 '{"chief_complaint":"Blurred vision or routine glaucoma follow-up with medication review.","provisional_diagnosis":"Known glaucoma for pressure and optic nerve status review.","final_diagnosis":"Glaucoma follow-up under ongoing treatment.","treatment_plan":"Check intraocular pressure, optic nerve status, medication adherence, and visual field history, then continue or adjust anti glaucoma drops as indicated."}'::jsonb),

('physio_assessment_low_back_pain', 'physiotherapy', 'physio_assessment', true,
 'Physiotherapy - Low Back Pain Assessment',
 'Shared physio assessment template for mechanical low back pain',
 ARRAY['physiotherapy','low back pain','rehab','rom','muscle spasm'],
 10,
 '{"chief_complaint":"Low back pain radiating to the buttock and worse with bending or prolonged sitting.","rom_notes":"Lumbar flexion and extension are reduced by pain. Repeated movement increases discomfort.","muscle_strength_notes":"Lower limb power is preserved or mildly reduced due to pain inhibition.","sensation_notes":"No clear dermatomal sensory loss is reported today.","reflex_notes":"Reflexes are symmetrical.","palpation_findings":"Lumbar paraspinal tenderness and muscle spasm are present.","physio_diagnosis":"Mechanical low back pain with functional limitation.","short_term_goals":"Reduce pain, improve lumbar mobility, and restore confidence with basic movement.","long_term_goals":"Return to work and normal daily activity with improved posture control.","patient_goals":"Able to sit, bend, and walk longer with minimal pain.","prognosis_notes":"Good rehabilitation potential with adherence to exercise, pacing, and ergonomic advice."}'::jsonb),

('physio_assessment_post_stroke_rehab', 'physiotherapy', 'physio_assessment', true,
 'Physiotherapy - Post Stroke Rehabilitation',
 'Shared physio assessment template for stroke rehabilitation clinics',
 ARRAY['physiotherapy','stroke rehab','hemiparesis','balance','gait'],
 9,
 '{"chief_complaint":"Post stroke weakness affecting gait, balance, and upper limb function.","rom_notes":"Shoulder and ankle range are restricted and require assisted mobility work.","muscle_strength_notes":"Reduced strength is noted on the affected side with impaired selective control.","sensation_notes":"Altered sensation over affected limbs may interfere with balance and motor relearning.","reflex_notes":"Tone and reflexes are increased on the affected side.","palpation_findings":"Muscle tightness and soft tissue tenderness are present in overused muscle groups.","physio_diagnosis":"Post stroke hemiparesis with balance and mobility impairment.","short_term_goals":"Improve transfers, sitting balance, and safe assisted ambulation.","long_term_goals":"Improve independence in gait and upper limb use for daily activities.","patient_goals":"Walk more safely and manage basic personal care with less assistance.","prognosis_notes":"Rehabilitation potential is fair to good depending on therapy intensity, comorbidity control, and home support."}'::jsonb)

ON CONFLICT (template_key, created_by) DO NOTHING;