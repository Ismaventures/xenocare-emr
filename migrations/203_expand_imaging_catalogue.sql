-- =============================================================================
-- Migration 203b: Expand imaging_catalogue with full hospital radiology catalog
-- =============================================================================
-- PREREQUISITE: Run 203a_add_imaging_enum_values.sql FIRST and commit it.
-- That adds the new enum values. Then run this file to insert the records.
--
-- Existing 20 records (RAD010-RAD044) are preserved. New records use RAD050+.
-- =============================================================================

-- Uses ON CONFLICT (code) DO NOTHING to skip any that already exist.

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 1: PLAIN RADIOGRAPHY (X-RAY) — modality 'X-Ray'
-- ═══════════════════════════════════════════════════════════════════════════
-- Existing: RAD010 Chest X-Ray, RAD011 Cervical Spine, RAD012 Lumbar Spine,
--           RAD013 Pelvic X-Ray, RAD014 Extremity X-Ray

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description)
VALUES
    ('RAD050', 'Skull X-Ray (AP/LAT)',              'X-Ray', 'Head',           5500, true,  'Plain radiograph of the skull'),
    ('RAD051', 'Facial Bones X-Ray',                'X-Ray', 'Face',           5800, true,  'Plain radiograph of facial bones'),
    ('RAD052', 'Mandible X-Ray',                    'X-Ray', 'Jaw',            5500, true,  'Plain radiograph of the mandible'),
    ('RAD053', 'Nasal Bones X-Ray',                 'X-Ray', 'Nose',           4500, true,  'Plain radiograph of nasal bones'),
    ('RAD054', 'Sinuses X-Ray (OM View)',            'X-Ray', 'Sinuses',        5500, true,  'Occipito-mental view of paranasal sinuses'),
    ('RAD055', 'Orbits X-Ray',                      'X-Ray', 'Orbits',         5000, true,  'Plain radiograph of the orbits'),
    ('RAD056', 'Thoracic Spine X-Ray',              'X-Ray', 'Thoracic Spine', 7000, true,  'AP and lateral views of thoracic spine'),
    ('RAD057', 'Sacroiliac Joint X-Ray',            'X-Ray', 'Pelvis',         6500, true,  'Plain radiograph of sacroiliac joints'),
    ('RAD058', 'Hip Joint X-Ray',                   'X-Ray', 'Hip',            6000, true,  'AP pelvis and lateral hip'),
    ('RAD059', 'Knee X-Ray (AP/LAT)',               'X-Ray', 'Knee',           5500, true,  'AP and lateral views of knee'),
    ('RAD060', 'Ankle X-Ray',                       'X-Ray', 'Ankle',          5500, true,  'AP, lateral and mortise views'),
    ('RAD061', 'Foot X-Ray',                        'X-Ray', 'Foot',           5000, true,  'AP and oblique views of foot'),
    ('RAD062', 'Hand X-Ray',                        'X-Ray', 'Hand',           5000, true,  'PA and oblique views of hand'),
    ('RAD063', 'Wrist X-Ray',                       'X-Ray', 'Wrist',          5000, true,  'PA and lateral views of wrist'),
    ('RAD064', 'Forearm X-Ray',                     'X-Ray', 'Forearm',        5500, true,  'AP and lateral views of forearm'),
    ('RAD065', 'Elbow X-Ray',                       'X-Ray', 'Elbow',          5500, true,  'AP and lateral views of elbow'),
    ('RAD066', 'Shoulder X-Ray',                    'X-Ray', 'Shoulder',       6000, true,  'AP and axillary views of shoulder'),
    ('RAD067', 'Clavicle X-Ray',                    'X-Ray', 'Clavicle',       5500, true,  'Plain radiograph of clavicle'),
    ('RAD068', 'Abdominal X-Ray (Plain)',            'X-Ray', 'Abdomen',        6500, true,  'Supine and erect abdominal film'),
    ('RAD069', 'KUB X-Ray',                         'X-Ray', 'Abdomen',        6500, true,  'Kidney-ureter-bladder plain film'),
    ('RAD070', 'Whole Spine X-Ray',                 'X-Ray', 'Spine',          9500, true,  'Full spine AP and lateral views'),
    ('RAD071', 'Chest X-Ray (AP Only)',              'X-Ray', 'Chest',          5500, true,  'Anteroposterior chest radiograph'),
    ('RAD072', 'Tibia/Fibula X-Ray',                'X-Ray', 'Leg',            5500, true,  'AP and lateral views of lower leg'),
    ('RAD073', 'Humerus X-Ray',                     'X-Ray', 'Upper Arm',      5500, true,  'AP and lateral views of humerus'),
    ('RAD074', 'Femur X-Ray',                       'X-Ray', 'Thigh',          6000, true,  'AP and lateral views of femur'),
    ('RAD075', 'Dental Panoramic (OPG)',             'X-Ray', 'Jaw',            8000, true,  'Orthopantomogram — full mouth survey')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 2: ULTRASOUND — modality 'Ultrasound'
-- ═══════════════════════════════════════════════════════════════════════════
-- Existing: RAD020-RAD024

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description)
VALUES
    ('RAD100', 'Pelvic Ultrasound',                  'Ultrasound', 'Pelvis',       7000, true,  'Transabdominal pelvic ultrasound'),
    ('RAD101', 'Abdomino-Pelvic Ultrasound',         'Ultrasound', 'Abdomen/Pelvis', 9500, true, 'Combined abdominal and pelvic scan'),
    ('RAD102', 'Obstetric Ultrasound (1st Trimester)','Ultrasound', 'Obstetrics',   7500, true,  'Early pregnancy dating and viability scan'),
    ('RAD103', 'Obstetric Ultrasound (3rd Trimester)','Ultrasound', 'Obstetrics',   8500, true,  'Late pregnancy growth and presentation scan'),
    ('RAD104', 'Transvaginal Ultrasound',            'Ultrasound', 'Pelvis',       8500, true,  'Endovaginal pelvic sonography'),
    ('RAD105', 'Prostate Ultrasound (Transabdominal)','Ultrasound', 'Pelvis',      7500, true,  'Transabdominal prostate volume estimation'),
    ('RAD106', 'Bladder Ultrasound',                 'Ultrasound', 'Pelvis',       6500, true,  'Pre- and post-void bladder volume'),
    ('RAD107', 'Testicular Ultrasound',              'Ultrasound', 'Scrotum',      7500, true,  'Scrotal ultrasound for testicular pathology'),
    ('RAD108', 'Scrotal Ultrasound with Doppler',    'Ultrasound', 'Scrotum',      9000, true,  'Scrotal scan with colour Doppler'),
    ('RAD109', 'Neck Ultrasound',                    'Ultrasound', 'Neck',         7000, true,  'Soft tissue ultrasound of the neck'),
    ('RAD110', 'Transfontanelle Ultrasound',         'Ultrasound', 'Head',         8000, true,  'Neonatal brain ultrasound via anterior fontanelle'),
    ('RAD111', 'Soft Tissue Ultrasound',             'Ultrasound', 'Soft Tissue',  6500, true,  'Targeted soft tissue mass/collection scan'),
    ('RAD112', 'Small Parts Ultrasound',             'Ultrasound', 'Small Parts',  7000, true,  'Superficial structures scan'),
    ('RAD113', 'Doppler Ultrasound (General)',        'Ultrasound', 'Vascular',     9500, true,  'General vascular Doppler assessment'),
    ('RAD114', 'Carotid Doppler',                    'Ultrasound', 'Neck',         10000, true, 'Duplex carotid artery assessment'),
    ('RAD115', 'Renal Doppler',                      'Ultrasound', 'Abdomen',      10000, true, 'Renal artery and vein Doppler'),
    ('RAD116', 'Lower Limb Venous Doppler',          'Ultrasound', 'Lower Limb',   10000, true, 'Deep vein thrombosis assessment'),
    ('RAD117', 'Lower Limb Arterial Doppler',        'Ultrasound', 'Lower Limb',   10500, true, 'Peripheral arterial disease assessment'),
    ('RAD118', 'Upper Limb Doppler',                 'Ultrasound', 'Upper Limb',   9500, true,  'Upper extremity vascular Doppler'),
    ('RAD119', 'Fetal Doppler',                      'Ultrasound', 'Obstetrics',   9000, true,  'Uterine and umbilical artery Doppler'),
    ('RAD120', 'Ovulation Monitoring Scan',          'Ultrasound', 'Pelvis',       6000, true,  'Serial follicular tracking scan'),
    ('RAD121', 'Musculoskeletal Ultrasound',         'Ultrasound', 'Musculoskeletal', 8000, true, 'Joint/tendon/muscle ultrasound'),
    ('RAD122', 'Renal Ultrasound',                   'Ultrasound', 'Abdomen',      7500, true,  'Focused renal and bladder ultrasound'),
    ('RAD123', 'Hepatobiliary Ultrasound',           'Ultrasound', 'Abdomen',      7500, true,  'Focused liver, gallbladder and biliary scan')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 3: CONTRAST RADIOLOGY — modality 'Fluoroscopy'
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description, requires_nhis_authorization)
VALUES
    ('RAD150', 'Barium Swallow',                     'Fluoroscopy', 'Oesophagus',    15000, true, 'Contrast study of oesophageal swallowing', true),
    ('RAD151', 'Barium Meal',                        'Fluoroscopy', 'Stomach',       16000, true, 'Contrast study of stomach and duodenum', true),
    ('RAD152', 'Barium Meal Follow Through',         'Fluoroscopy', 'Small Bowel',   18000, true, 'Extended contrast study through small bowel', true),
    ('RAD153', 'Small Bowel Enema',                  'Fluoroscopy', 'Small Bowel',   20000, true, 'Enteroclysis — small bowel contrast study', true),
    ('RAD154', 'Barium Enema',                       'Fluoroscopy', 'Large Bowel',   18000, true, 'Double contrast barium enema of large bowel', true),
    ('RAD155', 'Intravenous Urography (IVU)',         'Fluoroscopy', 'Urinary Tract', 22000, true, 'IV contrast study of kidneys, ureters, bladder', true),
    ('RAD156', 'Retrograde Urethrogram',             'Fluoroscopy', 'Urethra',       15000, true, 'Contrast study of urethra', true),
    ('RAD157', 'Micturating Cystourethrogram (MCUG)', 'Fluoroscopy', 'Bladder',      18000, true, 'Voiding cystourethrogram for reflux assessment', true),
    ('RAD158', 'Cystogram',                          'Fluoroscopy', 'Bladder',       15000, true, 'Contrast study of the bladder', true),
    ('RAD159', 'Hysterosalpingogram (HSG)',           'Fluoroscopy', 'Pelvis',        20000, true, 'Contrast study of uterus and fallopian tubes', true),
    ('RAD160', 'Sinogram',                           'Fluoroscopy', 'Soft Tissue',   12000, true, 'Contrast study of sinus tract', false),
    ('RAD161', 'Sialography',                        'Fluoroscopy', 'Salivary Gland', 15000, true, 'Contrast study of salivary duct', true),
    ('RAD162', 'Fistulogram',                        'Fluoroscopy', 'Soft Tissue',   12000, true, 'Contrast study of fistula tract', false),
    ('RAD163', 'Arthrogram',                         'Fluoroscopy', 'Joint',         18000, true, 'Contrast study of joint cavity', true),
    ('RAD164', 'Venogram',                           'Fluoroscopy', 'Vascular',      16000, true, 'Contrast study of venous system', true),
    ('RAD165', 'Phlebogram',                         'Fluoroscopy', 'Vascular',      16000, true, 'Contrast study of superficial veins', true),
    ('RAD166', 'T-Tube Cholangiogram',               'Fluoroscopy', 'Biliary',       18000, true, 'Post-operative biliary contrast study', true)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 4: CT SCAN — modality 'CT'
-- ═══════════════════════════════════════════════════════════════════════════
-- Existing: RAD030-RAD034

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description, requires_nhis_authorization)
VALUES
    ('RAD200', 'CT Brain (Plain)',                   'CT', 'Head',            42000, true, 'Non-contrast CT of the brain', true),
    ('RAD201', 'CT Head (Trauma)',                   'CT', 'Head',            42000, true, 'Emergency CT head for trauma', true),
    ('RAD202', 'CT Orbit',                           'CT', 'Orbits',          45000, true, 'CT of the orbits with thin cuts', true),
    ('RAD203', 'CT Sinus',                           'CT', 'Sinuses',         40000, true, 'CT of paranasal sinuses', true),
    ('RAD204', 'CT Neck',                            'CT', 'Neck',            48000, true, 'CT scan of the neck with contrast', true),
    ('RAD205', 'CT Chest (Standard)',                'CT', 'Chest',           48000, true, 'Standard CT of the chest', true),
    ('RAD206', 'CT Abdomen (Plain)',                 'CT', 'Abdomen',         48000, true, 'Non-contrast CT of the abdomen', true),
    ('RAD207', 'CT Pelvis',                          'CT', 'Pelvis',          48000, true, 'CT scan of the pelvis', true),
    ('RAD208', 'CT Cervical Spine',                  'CT', 'Cervical Spine',  50000, true, 'CT of cervical spine', true),
    ('RAD209', 'CT Thoracic Spine',                  'CT', 'Thoracic Spine',  52000, true, 'CT of thoracic spine', true),
    ('RAD210', 'CT Lumbar Spine',                    'CT', 'Lumbar Spine',    52000, true, 'CT of lumbar spine', true),
    ('RAD211', 'CT Whole Spine',                     'CT', 'Spine',           68000, true, 'CT of entire spine', true),
    ('RAD212', 'CT Extremities',                     'CT', 'Extremities',     45000, true, 'CT of upper or lower extremity', true),
    ('RAD213', 'CT Angiography (Cerebral)',           'CT', 'Head',            65000, true, 'CT angiogram of cerebral vessels', true),
    ('RAD214', 'CT Pulmonary Angiography (CTPA)',     'CT', 'Chest',           62000, true, 'CT pulmonary angiography for PE', true),
    ('RAD215', 'CT Abdomen with Contrast',           'CT', 'Abdomen',         55000, true, 'Contrast-enhanced CT abdomen', true),
    ('RAD216', 'CT KUB',                             'CT', 'Urinary Tract',   48000, true, 'Non-contrast CT for renal stones', true),
    ('RAD217', 'CT Urogram',                         'CT', 'Urinary Tract',   58000, true, 'CT urogram with IV contrast', true)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 5: MRI — modality 'MRI'
-- ═══════════════════════════════════════════════════════════════════════════
-- Existing: RAD040-RAD044

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description, requires_nhis_authorization)
VALUES
    ('RAD250', 'MRI Brain (Plain)',                  'MRI', 'Brain',           78000, true, 'Non-contrast MRI brain', true),
    ('RAD251', 'MRI Pituitary',                      'MRI', 'Brain',           85000, true, 'MRI of pituitary fossa with contrast', true),
    ('RAD252', 'MRI Orbit',                          'MRI', 'Orbits',          82000, true, 'MRI of the orbits', true),
    ('RAD253', 'MRI Cervical Spine',                 'MRI', 'Cervical Spine',  85000, true, 'MRI of cervical spine', true),
    ('RAD254', 'MRI Thoracic Spine',                 'MRI', 'Thoracic Spine',  88000, true, 'MRI of thoracic spine', true),
    ('RAD255', 'MRI Whole Spine',                    'MRI', 'Spine',           120000, true, 'MRI of entire spine', true),
    ('RAD256', 'MRI Shoulder',                       'MRI', 'Shoulder',        85000, true, 'MRI of the shoulder joint', true),
    ('RAD257', 'MRI Hip',                            'MRI', 'Hip',             88000, true, 'MRI of the hip joint', true),
    ('RAD258', 'MRI Pelvis',                         'MRI', 'Pelvis',          90000, true, 'MRI of the pelvis', true),
    ('RAD259', 'MRI Whole Body',                     'MRI', 'Whole Body',      150000, true, 'Whole body MRI screening', true),
    ('RAD260', 'MRI Wrist',                          'MRI', 'Wrist',           82000, true, 'MRI of the wrist joint', true),
    ('RAD261', 'MRI Ankle',                          'MRI', 'Ankle',           82000, true, 'MRI of the ankle joint', true),
    ('RAD262', 'MRI Elbow',                          'MRI', 'Elbow',           82000, true, 'MRI of the elbow joint', true),
    ('RAD263', 'MRI Breast',                         'MRI', 'Breast',          95000, true, 'MRI of the breast with contrast', true),
    ('RAD264', 'MRCP',                               'MRI', 'Biliary',         95000, true, 'MR cholangiopancreatography', true),
    ('RAD265', 'MRI Prostate (mpMRI)',               'MRI', 'Pelvis',          95000, true, 'Multiparametric MRI of the prostate', true)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 6: MAMMOGRAPHY — modality 'Mammography'
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description, requires_nhis_authorization)
VALUES
    ('RAD300', 'Screening Mammogram',                'Mammography', 'Breast',   15000, true,  'Bilateral screening mammography', false),
    ('RAD301', 'Diagnostic Mammogram',               'Mammography', 'Breast',   18000, true,  'Targeted diagnostic mammography', false),
    ('RAD302', 'Breast Tomosynthesis (3D Mammo)',     'Mammography', 'Breast',   25000, true,  '3D digital breast tomosynthesis', true),
    ('RAD303', 'Mammogram-Guided Biopsy',            'Mammography', 'Breast',   35000, true,  'Stereotactic mammography-guided biopsy', true)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 7: NUCLEAR MEDICINE — modality 'Nuclear Medicine'
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description, requires_nhis_authorization)
VALUES
    ('RAD350', 'Bone Scan (Whole Body)',              'Nuclear Medicine', 'Whole Body',    45000, true, 'Tc-99m MDP whole body bone scintigraphy', true),
    ('RAD351', 'Thyroid Scan',                       'Nuclear Medicine', 'Neck',          35000, true, 'Tc-99m pertechnetate thyroid scintigraphy', true),
    ('RAD352', 'Renal Scan (DTPA)',                  'Nuclear Medicine', 'Abdomen',       40000, true, 'Tc-99m DTPA dynamic renal scintigraphy', true),
    ('RAD353', 'Renal Scan (DMSA)',                  'Nuclear Medicine', 'Abdomen',       40000, true, 'Tc-99m DMSA static renal cortical scan', true),
    ('RAD354', 'Lung Perfusion Scan (V/Q)',           'Nuclear Medicine', 'Chest',         42000, true, 'Ventilation-perfusion lung scintigraphy', true),
    ('RAD355', 'PET-CT Scan',                        'Nuclear Medicine', 'Whole Body',    250000, true, 'FDG PET-CT whole body oncology scan', true),
    ('RAD356', 'Myocardial Perfusion Scan',          'Nuclear Medicine', 'Heart',         55000, true, 'Tc-99m sestamibi myocardial perfusion imaging', true),
    ('RAD357', 'Parathyroid Scan (Sestamibi)',        'Nuclear Medicine', 'Neck',          45000, true, 'Tc-99m sestamibi parathyroid scintigraphy', true)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 8: OPHTHALMIC IMAGING — modality 'Ophthalmic Imaging'
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description)
VALUES
    ('RAD400', 'Optical Coherence Tomography (OCT)',          'Ophthalmic Imaging', 'Retina',    15000, true,  'OCT of macula and/or RNFL'),
    ('RAD401', 'OCT Macula',                                 'Ophthalmic Imaging', 'Retina',    12000, true,  'Macular OCT for diabetic maculopathy/AMD'),
    ('RAD402', 'OCT RNFL (Glaucoma)',                        'Ophthalmic Imaging', 'Retina',    12000, true,  'Retinal nerve fibre layer OCT for glaucoma'),
    ('RAD403', 'OCT Anterior Segment',                       'Ophthalmic Imaging', 'Anterior Eye', 12000, true, 'Anterior segment OCT'),
    ('RAD404', 'Fundus Photography',                         'Ophthalmic Imaging', 'Retina',    8000,  true,  'Digital fundus photography bilateral'),
    ('RAD405', 'Fluorescein Angiography (FFA)',               'Ophthalmic Imaging', 'Retina',    18000, true,  'IV fluorescein fundus angiography'),
    ('RAD406', 'Indocyanine Green Angiography (ICG)',         'Ophthalmic Imaging', 'Retina',    22000, true,  'ICG choroidal angiography'),
    ('RAD407', 'Corneal Topography',                         'Ophthalmic Imaging', 'Cornea',    10000, true,  'Placido disc corneal topography mapping'),
    ('RAD408', 'Pachymetry',                                 'Ophthalmic Imaging', 'Cornea',    6000,  true,  'Central corneal thickness measurement'),
    ('RAD409', 'A-Scan Biometry',                            'Ophthalmic Imaging', 'Eye',       8000,  true,  'Ultrasound A-scan for IOL calculation'),
    ('RAD410', 'B-Scan Ultrasound (Eye)',                    'Ophthalmic Imaging', 'Eye',       10000, true,  'Ocular B-scan ultrasonography'),
    ('RAD411', 'Visual Field Test (Humphrey)',                'Ophthalmic Imaging', 'Eye',       10000, true,  'Automated perimetry — Humphrey visual field'),
    ('RAD412', 'Specular Microscopy',                        'Ophthalmic Imaging', 'Cornea',    8000,  true,  'Corneal endothelial cell count'),
    ('RAD413', 'Keratometry',                                'Ophthalmic Imaging', 'Cornea',    5000,  true,  'Corneal curvature measurement'),
    ('RAD414', 'IOL Master / Optical Biometry',              'Ophthalmic Imaging', 'Eye',       12000, true,  'Optical biometry for IOL calculation')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 9: CARDIAC DIAGNOSTIC IMAGING — modality 'Cardiac Imaging'
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description, requires_nhis_authorization)
VALUES
    ('RAD450', 'Echocardiography (TTE)',              'Cardiac Imaging', 'Heart',   18000, true, 'Transthoracic echocardiogram', false),
    ('RAD451', 'Transesophageal Echo (TEE)',           'Cardiac Imaging', 'Heart',   35000, true, 'Transesophageal echocardiography', true),
    ('RAD452', 'Stress Echocardiography',             'Cardiac Imaging', 'Heart',   28000, true, 'Exercise or pharmacological stress echo', true),
    ('RAD453', 'Electrocardiogram (ECG)',              'Cardiac Imaging', 'Heart',   3500,  true, 'Standard 12-lead ECG', false),
    ('RAD454', 'Holter ECG Monitoring (24hr)',         'Cardiac Imaging', 'Heart',   15000, true, '24-hour ambulatory ECG monitoring', false),
    ('RAD455', 'Holter ECG Monitoring (48hr)',         'Cardiac Imaging', 'Heart',   20000, true, '48-hour ambulatory ECG monitoring', true),
    ('RAD456', 'Exercise Treadmill Test (ETT)',        'Cardiac Imaging', 'Heart',   18000, true, 'Exercise stress test with ECG monitoring', false),
    ('RAD457', 'Coronary Angiography',                'Cardiac Imaging', 'Heart',   350000, true, 'Invasive coronary catheterization and angiography', true),
    ('RAD458', 'Cardiac CT (Calcium Score)',           'Cardiac Imaging', 'Heart',   55000, true, 'CT coronary artery calcium scoring', true),
    ('RAD459', 'Cardiac MRI',                         'Cardiac Imaging', 'Heart',   120000, true, 'Cardiac MRI with function and viability', true),
    ('RAD460', 'Event Recorder (7-day)',               'Cardiac Imaging', 'Heart',   25000, true, '7-day cardiac event monitor', true),
    ('RAD461', 'Ambulatory BP Monitoring (24hr)',      'Cardiac Imaging', 'Heart',   10000, true, '24-hour ambulatory blood pressure monitoring', false)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORY 10: PULMONARY DIAGNOSTICS — modality 'Pulmonary Diagnostics'
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO imaging_catalogue (code, name, modality, body_part, price, is_nhis_covered, description)
VALUES
    ('RAD500', 'Spirometry',                          'Pulmonary Diagnostics', 'Chest',  8000,  true, 'Basic spirometry — FEV1, FVC, FEV1/FVC'),
    ('RAD501', 'Spirometry with Reversibility',       'Pulmonary Diagnostics', 'Chest',  12000, true, 'Spirometry pre- and post-bronchodilator'),
    ('RAD502', 'Peak Flow Measurement',               'Pulmonary Diagnostics', 'Chest',  3000,  true, 'Peak expiratory flow rate measurement'),
    ('RAD503', 'Lung Volume Measurement',             'Pulmonary Diagnostics', 'Chest',  15000, true, 'Full lung volume measurement (body plethysmography)'),
    ('RAD504', 'Diffusion Capacity Test (DLCO)',       'Pulmonary Diagnostics', 'Chest',  18000, true, 'Carbon monoxide diffusing capacity'),
    ('RAD505', 'Pulse Oximetry (Formal)',              'Pulmonary Diagnostics', 'Chest',  2000,  true, 'Documented pulse oximetry assessment'),
    ('RAD506', 'Arterial Blood Gas (ABG)',             'Pulmonary Diagnostics', 'Chest',  5000,  true, 'Arterial blood gas sampling and analysis'),
    ('RAD507', 'Bronchoscopy (Diagnostic)',            'Pulmonary Diagnostics', 'Chest',  45000, true, 'Flexible bronchoscopy with BAL/wash'),
    ('RAD508', 'Sleep Study (Polysomnography)',        'Pulmonary Diagnostics', 'Chest',  55000, true, 'Overnight polysomnography for sleep apnoea')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Done — Summary
-- ═══════════════════════════════════════════════════════════════════════════
-- New enum values:  4 (Ophthalmic Imaging, Cardiac Imaging, Pulmonary Diagnostics, Nuclear Medicine)
-- New records:     ~126 imaging services
-- Existing kept:    20 records untouched (RAD010-RAD044)
-- Total after:     ~146 imaging services
