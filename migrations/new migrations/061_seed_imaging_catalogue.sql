-- =====================================================
-- COMPREHENSIVE IMAGING CATALOGUE SEED DATA
-- Aligned with schema: imaging_catalogue table
-- Uses imaging_type ENUM: 'X-Ray', 'Ultrasound', 'MRI', 'CT', 'Mammography', 'Fluoroscopy', 'Other'
-- Includes NHIS codes and pricing
-- =====================================================

-- Clear existing seed data (optional - comment out if appending)
-- DELETE FROM imaging_catalogue WHERE code LIKE 'IMG%';

INSERT INTO imaging_catalogue (
    code,
    name,
    modality,
    body_part,
    price,
    is_active,
    nhis_code,
    nhis_price,
    is_nhis_covered,
    nhis_percentage,
    description,
    created_at,
    updated_at
) VALUES
-- =====================================================
-- X-RAY EXAMINATIONS
-- =====================================================
-- Chest X-Rays
('IMG-XR-001', 'Chest X-Ray (PA View)', 'X-Ray', 'Chest', 8000.00, true, 'NHIS-IMG-001', 6400.00, true, 80, 'Single posterior-anterior chest radiograph', NOW(), NOW()),
('IMG-XR-002', 'Chest X-Ray (PA & Lateral)', 'X-Ray', 'Chest', 12000.00, true, 'NHIS-IMG-002', 9600.00, true, 80, 'Two-view chest examination', NOW(), NOW()),
('IMG-XR-003', 'Chest X-Ray (AP Portable/Erect)', 'X-Ray', 'Chest', 10000.00, true, 'NHIS-IMG-003', 8000.00, true, 80, 'Bedside or portable chest radiograph', NOW(), NOW()),
('IMG-XR-004', 'Chest X-Ray (Lordotic View)', 'X-Ray', 'Chest', 8000.00, true, 'NHIS-IMG-004', 6400.00, true, 80, 'Apical lordotic view for lung apices', NOW(), NOW()),

-- Spine X-Rays
('IMG-XR-010', 'Cervical Spine X-Ray (AP & Lateral)', 'X-Ray', 'Cervical Spine', 12000.00, true, 'NHIS-IMG-010', 9600.00, true, 80, 'Two-view cervical spine', NOW(), NOW()),
('IMG-XR-011', 'Cervical Spine X-Ray (Oblique)', 'X-Ray', 'Cervical Spine', 8000.00, true, 'NHIS-IMG-011', 6400.00, true, 80, 'Oblique view for foramina', NOW(), NOW()),
('IMG-XR-012', 'Cervical Spine X-Ray (Open Mouth/Odontoid)', 'X-Ray', 'Cervical Spine', 8000.00, true, 'NHIS-IMG-012', 6400.00, true, 80, 'C1-C2 odontoid view', NOW(), NOW()),
('IMG-XR-013', 'Thoracic Spine X-Ray (AP & Lateral)', 'X-Ray', 'Thoracic Spine', 12000.00, true, 'NHIS-IMG-013', 9600.00, true, 80, 'Two-view thoracic spine', NOW(), NOW()),
('IMG-XR-014', 'Lumbar Spine X-Ray (AP & Lateral)', 'X-Ray', 'Lumbar Spine', 12000.00, true, 'NHIS-IMG-014', 9600.00, true, 80, 'Two-view lumbar spine', NOW(), NOW()),
('IMG-XR-015', 'Lumbar Spine X-Ray (Oblique)', 'X-Ray', 'Lumbar Spine', 8000.00, true, 'NHIS-IMG-015', 6400.00, true, 80, 'Oblique views for pars interarticularis', NOW(), NOW()),
('IMG-XR-016', 'Sacrococcygeal X-Ray', 'X-Ray', 'Sacrum/Coccyx', 10000.00, true, 'NHIS-IMG-016', 8000.00, true, 80, 'Sacrum and coccyx views', NOW(), NOW()),
('IMG-XR-017', 'Whole Spine X-Ray (Scoliosis Series)', 'X-Ray', 'Whole Spine', 25000.00, true, 'NHIS-IMG-017', 20000.00, true, 80, 'Standing full spine for scoliosis assessment', NOW(), NOW()),

-- Skull and Facial X-Rays
('IMG-XR-020', 'Skull X-Ray (AP & Lateral)', 'X-Ray', 'Skull', 12000.00, true, 'NHIS-IMG-020', 9600.00, true, 80, 'Two-view skull examination', NOW(), NOW()),
('IMG-XR-021', 'Paranasal Sinuses X-Ray (Waters/Caldwell)', 'X-Ray', 'Sinuses', 10000.00, true, 'NHIS-IMG-021', 8000.00, true, 80, 'Sinus views', NOW(), NOW()),
('IMG-XR-022', 'Facial Bones X-Ray', 'X-Ray', 'Face', 12000.00, true, 'NHIS-IMG-022', 9600.00, true, 80, 'Facial bone series', NOW(), NOW()),
('IMG-XR-023', 'Mandible X-Ray', 'X-Ray', 'Mandible', 10000.00, true, 'NHIS-IMG-023', 8000.00, true, 80, 'Jaw examination', NOW(), NOW()),
('IMG-XR-024', 'Nasal Bone X-Ray', 'X-Ray', 'Nose', 8000.00, true, 'NHIS-IMG-024', 6400.00, true, 80, 'Nasal bone views', NOW(), NOW()),
('IMG-XR-025', 'Temporomandibular Joint (TMJ) X-Ray', 'X-Ray', 'TMJ', 12000.00, true, 'NHIS-IMG-025', 9600.00, true, 80, 'TMJ views open and closed', NOW(), NOW()),
('IMG-XR-026', 'Orbits X-Ray', 'X-Ray', 'Orbits', 10000.00, true, 'NHIS-IMG-026', 8000.00, true, 80, 'Orbital views', NOW(), NOW()),

-- Abdominal X-Rays
('IMG-XR-030', 'Abdominal X-Ray (Supine)', 'X-Ray', 'Abdomen', 10000.00, true, 'NHIS-IMG-030', 8000.00, true, 80, 'Plain abdominal radiograph', NOW(), NOW()),
('IMG-XR-031', 'Abdominal X-Ray (Erect)', 'X-Ray', 'Abdomen', 10000.00, true, 'NHIS-IMG-031', 8000.00, true, 80, 'Erect abdominal for air-fluid levels', NOW(), NOW()),
('IMG-XR-032', 'Acute Abdominal Series', 'X-Ray', 'Abdomen', 18000.00, true, 'NHIS-IMG-032', 14400.00, true, 80, 'Supine, erect abdomen and chest', NOW(), NOW()),
('IMG-XR-033', 'KUB (Kidneys, Ureters, Bladder)', 'X-Ray', 'Abdomen', 10000.00, true, 'NHIS-IMG-033', 8000.00, true, 80, 'Plain film for urinary tract', NOW(), NOW()),

-- Pelvis and Hip X-Rays
('IMG-XR-040', 'Pelvis X-Ray (AP)', 'X-Ray', 'Pelvis', 10000.00, true, 'NHIS-IMG-040', 8000.00, true, 80, 'Single pelvic view', NOW(), NOW()),
('IMG-XR-041', 'Hip X-Ray (AP & Lateral)', 'X-Ray', 'Hip', 12000.00, true, 'NHIS-IMG-041', 9600.00, true, 80, 'Two-view hip examination', NOW(), NOW()),
('IMG-XR-042', 'Hip X-Ray (Frog Leg Lateral)', 'X-Ray', 'Hip', 10000.00, true, 'NHIS-IMG-042', 8000.00, true, 80, 'Frog leg view for hip', NOW(), NOW()),
('IMG-XR-043', 'Sacroiliac Joints X-Ray', 'X-Ray', 'Sacroiliac Joints', 10000.00, true, 'NHIS-IMG-043', 8000.00, true, 80, 'SI joint views', NOW(), NOW()),

-- Upper Limb X-Rays
('IMG-XR-050', 'Shoulder X-Ray (AP & Axial)', 'X-Ray', 'Shoulder', 12000.00, true, 'NHIS-IMG-050', 9600.00, true, 80, 'Two-view shoulder examination', NOW(), NOW()),
('IMG-XR-051', 'Clavicle X-Ray', 'X-Ray', 'Clavicle', 8000.00, true, 'NHIS-IMG-051', 6400.00, true, 80, 'Clavicle views', NOW(), NOW()),
('IMG-XR-052', 'Scapula X-Ray', 'X-Ray', 'Scapula', 10000.00, true, 'NHIS-IMG-052', 8000.00, true, 80, 'Scapula views', NOW(), NOW()),
('IMG-XR-053', 'Humerus X-Ray (AP & Lateral)', 'X-Ray', 'Humerus', 10000.00, true, 'NHIS-IMG-053', 8000.00, true, 80, 'Two-view humerus', NOW(), NOW()),
('IMG-XR-054', 'Elbow X-Ray (AP & Lateral)', 'X-Ray', 'Elbow', 10000.00, true, 'NHIS-IMG-054', 8000.00, true, 80, 'Two-view elbow examination', NOW(), NOW()),
('IMG-XR-055', 'Forearm X-Ray (AP & Lateral)', 'X-Ray', 'Forearm', 10000.00, true, 'NHIS-IMG-055', 8000.00, true, 80, 'Radius and ulna views', NOW(), NOW()),
('IMG-XR-056', 'Wrist X-Ray (AP & Lateral)', 'X-Ray', 'Wrist', 10000.00, true, 'NHIS-IMG-056', 8000.00, true, 80, 'Two-view wrist examination', NOW(), NOW()),
('IMG-XR-057', 'Wrist X-Ray (Scaphoid Views)', 'X-Ray', 'Wrist', 12000.00, true, 'NHIS-IMG-057', 9600.00, true, 80, 'Scaphoid series', NOW(), NOW()),
('IMG-XR-058', 'Hand X-Ray (AP & Oblique)', 'X-Ray', 'Hand', 10000.00, true, 'NHIS-IMG-058', 8000.00, true, 80, 'Two-view hand examination', NOW(), NOW()),
('IMG-XR-059', 'Finger X-Ray', 'X-Ray', 'Finger', 6000.00, true, 'NHIS-IMG-059', 4800.00, true, 80, 'Individual digit views', NOW(), NOW()),
('IMG-XR-060', 'Thumb X-Ray', 'X-Ray', 'Thumb', 6000.00, true, 'NHIS-IMG-060', 4800.00, true, 80, 'Thumb views', NOW(), NOW()),

-- Lower Limb X-Rays
('IMG-XR-070', 'Femur X-Ray (AP & Lateral)', 'X-Ray', 'Femur', 12000.00, true, 'NHIS-IMG-070', 9600.00, true, 80, 'Two-view femur examination', NOW(), NOW()),
('IMG-XR-071', 'Knee X-Ray (AP & Lateral)', 'X-Ray', 'Knee', 10000.00, true, 'NHIS-IMG-071', 8000.00, true, 80, 'Two-view knee examination', NOW(), NOW()),
('IMG-XR-072', 'Knee X-Ray (Standing/Weight-bearing)', 'X-Ray', 'Knee', 12000.00, true, 'NHIS-IMG-072', 9600.00, true, 80, 'Weight-bearing knee views', NOW(), NOW()),
('IMG-XR-073', 'Knee X-Ray (Skyline/Sunrise)', 'X-Ray', 'Knee', 8000.00, true, 'NHIS-IMG-073', 6400.00, true, 80, 'Patellofemoral view', NOW(), NOW()),
('IMG-XR-074', 'Tibia/Fibula X-Ray (AP & Lateral)', 'X-Ray', 'Leg', 10000.00, true, 'NHIS-IMG-074', 8000.00, true, 80, 'Two-view lower leg', NOW(), NOW()),
('IMG-XR-075', 'Ankle X-Ray (AP & Lateral)', 'X-Ray', 'Ankle', 10000.00, true, 'NHIS-IMG-075', 8000.00, true, 80, 'Two-view ankle examination', NOW(), NOW()),
('IMG-XR-076', 'Ankle X-Ray (Mortise View)', 'X-Ray', 'Ankle', 8000.00, true, 'NHIS-IMG-076', 6400.00, true, 80, 'Mortise view for joint space', NOW(), NOW()),
('IMG-XR-077', 'Foot X-Ray (AP & Oblique)', 'X-Ray', 'Foot', 10000.00, true, 'NHIS-IMG-077', 8000.00, true, 80, 'Two-view foot examination', NOW(), NOW()),
('IMG-XR-078', 'Foot X-Ray (Weight-bearing)', 'X-Ray', 'Foot', 12000.00, true, 'NHIS-IMG-078', 9600.00, true, 80, 'Standing foot views', NOW(), NOW()),
('IMG-XR-079', 'Calcaneus X-Ray', 'X-Ray', 'Heel', 8000.00, true, 'NHIS-IMG-079', 6400.00, true, 80, 'Heel bone views', NOW(), NOW()),
('IMG-XR-080', 'Toe X-Ray', 'X-Ray', 'Toe', 6000.00, true, 'NHIS-IMG-080', 4800.00, true, 80, 'Individual toe views', NOW(), NOW()),

-- =====================================================
-- ULTRASOUND EXAMINATIONS
-- =====================================================
-- Abdominal Ultrasound
('IMG-US-001', 'Abdominal Ultrasound (Complete)', 'Ultrasound', 'Abdomen', 15000.00, true, 'NHIS-IMG-100', 12000.00, true, 80, 'Comprehensive abdominal scan including liver, gallbladder, pancreas, spleen, kidneys', NOW(), NOW()),
('IMG-US-002', 'Hepatobiliary Ultrasound', 'Ultrasound', 'Liver/Gallbladder', 12000.00, true, 'NHIS-IMG-101', 9600.00, true, 80, 'Focused liver and gallbladder scan', NOW(), NOW()),
('IMG-US-003', 'Renal Ultrasound (Both Kidneys)', 'Ultrasound', 'Kidneys', 12000.00, true, 'NHIS-IMG-102', 9600.00, true, 80, 'Bilateral kidney examination', NOW(), NOW()),
('IMG-US-004', 'KUB Ultrasound', 'Ultrasound', 'Kidneys/Ureters/Bladder', 15000.00, true, 'NHIS-IMG-103', 12000.00, true, 80, 'Urinary tract ultrasound', NOW(), NOW()),
('IMG-US-005', 'Spleen Ultrasound', 'Ultrasound', 'Spleen', 8000.00, true, 'NHIS-IMG-104', 6400.00, true, 80, 'Splenic examination', NOW(), NOW()),
('IMG-US-006', 'Pancreas Ultrasound', 'Ultrasound', 'Pancreas', 10000.00, true, 'NHIS-IMG-105', 8000.00, true, 80, 'Pancreatic examination', NOW(), NOW()),

-- Pelvic Ultrasound
('IMG-US-010', 'Pelvic Ultrasound (Transabdominal)', 'Ultrasound', 'Pelvis', 12000.00, true, 'NHIS-IMG-110', 9600.00, true, 80, 'Transabdominal pelvic scan', NOW(), NOW()),
('IMG-US-011', 'Pelvic Ultrasound (Transvaginal)', 'Ultrasound', 'Pelvis', 15000.00, true, 'NHIS-IMG-111', 12000.00, true, 80, 'Endovaginal pelvic examination', NOW(), NOW()),
('IMG-US-012', 'Prostate Ultrasound (Transrectal)', 'Ultrasound', 'Prostate', 18000.00, true, 'NHIS-IMG-112', 14400.00, true, 80, 'TRUS prostate examination', NOW(), NOW()),
('IMG-US-013', 'Prostate Ultrasound (Transabdominal)', 'Ultrasound', 'Prostate', 12000.00, true, 'NHIS-IMG-113', 9600.00, true, 80, 'Transabdominal prostate scan', NOW(), NOW()),
('IMG-US-014', 'Scrotal Ultrasound', 'Ultrasound', 'Scrotum/Testes', 12000.00, true, 'NHIS-IMG-114', 9600.00, true, 80, 'Testicular examination', NOW(), NOW()),
('IMG-US-015', 'Bladder Ultrasound with PVR', 'Ultrasound', 'Bladder', 10000.00, true, 'NHIS-IMG-115', 8000.00, true, 80, 'Bladder volume and post-void residual', NOW(), NOW()),

-- Obstetric Ultrasound
('IMG-US-020', 'Early Pregnancy Scan (Dating)', 'Ultrasound', 'Obstetrics', 12000.00, true, 'NHIS-IMG-120', 9600.00, true, 80, 'First trimester dating scan', NOW(), NOW()),
('IMG-US-021', 'Viability Scan', 'Ultrasound', 'Obstetrics', 10000.00, true, 'NHIS-IMG-121', 8000.00, true, 80, 'Confirm pregnancy viability', NOW(), NOW()),
('IMG-US-022', 'Nuchal Translucency Scan (NT)', 'Ultrasound', 'Obstetrics', 20000.00, true, 'NHIS-IMG-122', 16000.00, true, 80, '11-14 week screening scan', NOW(), NOW()),
('IMG-US-023', 'Anomaly Scan (18-22 weeks)', 'Ultrasound', 'Obstetrics', 25000.00, true, 'NHIS-IMG-123', 20000.00, true, 80, 'Detailed fetal anatomy scan', NOW(), NOW()),
('IMG-US-024', 'Growth Scan (3rd Trimester)', 'Ultrasound', 'Obstetrics', 15000.00, true, 'NHIS-IMG-124', 12000.00, true, 80, 'Fetal growth assessment', NOW(), NOW()),
('IMG-US-025', 'Biophysical Profile (BPP)', 'Ultrasound', 'Obstetrics', 18000.00, true, 'NHIS-IMG-125', 14400.00, true, 80, 'Fetal wellbeing assessment', NOW(), NOW()),
('IMG-US-026', 'Cervical Length Assessment', 'Ultrasound', 'Obstetrics', 10000.00, true, 'NHIS-IMG-126', 8000.00, true, 80, 'Transvaginal cervical measurement', NOW(), NOW()),
('IMG-US-027', 'Multiple Pregnancy Scan', 'Ultrasound', 'Obstetrics', 30000.00, true, 'NHIS-IMG-127', 24000.00, true, 80, 'Twin/multiple gestation assessment', NOW(), NOW()),
('IMG-US-028', 'Fetal Doppler Study', 'Ultrasound', 'Obstetrics', 20000.00, true, 'NHIS-IMG-128', 16000.00, true, 80, 'Umbilical artery and fetal vessel Doppler', NOW(), NOW()),

-- Breast Ultrasound
('IMG-US-030', 'Breast Ultrasound (Unilateral)', 'Ultrasound', 'Breast', 12000.00, true, 'NHIS-IMG-130', 9600.00, true, 80, 'Single breast examination', NOW(), NOW()),
('IMG-US-031', 'Breast Ultrasound (Bilateral)', 'Ultrasound', 'Breast', 18000.00, true, 'NHIS-IMG-131', 14400.00, true, 80, 'Both breasts examination', NOW(), NOW()),
('IMG-US-032', 'Axillary Ultrasound', 'Ultrasound', 'Axilla', 8000.00, true, 'NHIS-IMG-132', 6400.00, true, 80, 'Axillary lymph node assessment', NOW(), NOW()),

-- Thyroid and Neck Ultrasound
('IMG-US-040', 'Thyroid Ultrasound', 'Ultrasound', 'Thyroid', 12000.00, true, 'NHIS-IMG-140', 9600.00, true, 80, 'Thyroid gland examination', NOW(), NOW()),
('IMG-US-041', 'Neck Soft Tissue Ultrasound', 'Ultrasound', 'Neck', 12000.00, true, 'NHIS-IMG-141', 9600.00, true, 80, 'Neck mass evaluation', NOW(), NOW()),
('IMG-US-042', 'Salivary Gland Ultrasound', 'Ultrasound', 'Salivary Glands', 10000.00, true, 'NHIS-IMG-142', 8000.00, true, 80, 'Parotid/submandibular gland scan', NOW(), NOW()),
('IMG-US-043', 'Lymph Node Ultrasound (Cervical)', 'Ultrasound', 'Neck', 10000.00, true, 'NHIS-IMG-143', 8000.00, true, 80, 'Cervical lymph node assessment', NOW(), NOW()),

-- Vascular Ultrasound (Doppler)
('IMG-US-050', 'Carotid Doppler (Bilateral)', 'Ultrasound', 'Carotid Arteries', 25000.00, true, 'NHIS-IMG-150', 20000.00, true, 80, 'Carotid artery duplex scan', NOW(), NOW()),
('IMG-US-051', 'Lower Limb Arterial Doppler', 'Ultrasound', 'Lower Limb Arteries', 25000.00, true, 'NHIS-IMG-151', 20000.00, true, 80, 'Peripheral arterial assessment', NOW(), NOW()),
('IMG-US-052', 'Lower Limb Venous Doppler (DVT Study)', 'Ultrasound', 'Lower Limb Veins', 20000.00, true, 'NHIS-IMG-152', 16000.00, true, 80, 'Deep vein thrombosis screening', NOW(), NOW()),
('IMG-US-053', 'Upper Limb Venous Doppler', 'Ultrasound', 'Upper Limb Veins', 18000.00, true, 'NHIS-IMG-153', 14400.00, true, 80, 'Upper extremity venous assessment', NOW(), NOW()),
('IMG-US-054', 'Renal Doppler', 'Ultrasound', 'Renal Arteries', 20000.00, true, 'NHIS-IMG-154', 16000.00, true, 80, 'Renal artery duplex scan', NOW(), NOW()),
('IMG-US-055', 'Hepatic Doppler', 'Ultrasound', 'Liver', 18000.00, true, 'NHIS-IMG-155', 14400.00, true, 80, 'Portal vein and hepatic vessel assessment', NOW(), NOW()),
('IMG-US-056', 'Abdominal Aorta Ultrasound', 'Ultrasound', 'Aorta', 18000.00, true, 'NHIS-IMG-156', 14400.00, true, 80, 'AAA screening', NOW(), NOW()),

-- Musculoskeletal Ultrasound
('IMG-US-060', 'Shoulder Ultrasound', 'Ultrasound', 'Shoulder', 15000.00, true, 'NHIS-IMG-160', 12000.00, true, 80, 'Rotator cuff and shoulder soft tissue', NOW(), NOW()),
('IMG-US-061', 'Elbow Ultrasound', 'Ultrasound', 'Elbow', 12000.00, true, 'NHIS-IMG-161', 9600.00, true, 80, 'Elbow joint and soft tissue', NOW(), NOW()),
('IMG-US-062', 'Wrist Ultrasound', 'Ultrasound', 'Wrist', 12000.00, true, 'NHIS-IMG-162', 9600.00, true, 80, 'Wrist joint and tendons', NOW(), NOW()),
('IMG-US-063', 'Hip Ultrasound (Adult)', 'Ultrasound', 'Hip', 15000.00, true, 'NHIS-IMG-163', 12000.00, true, 80, 'Hip joint assessment', NOW(), NOW()),
('IMG-US-064', 'Hip Ultrasound (Pediatric DDH)', 'Ultrasound', 'Hip', 15000.00, true, 'NHIS-IMG-164', 12000.00, true, 80, 'Developmental dysplasia screening', NOW(), NOW()),
('IMG-US-065', 'Knee Ultrasound', 'Ultrasound', 'Knee', 15000.00, true, 'NHIS-IMG-165', 12000.00, true, 80, 'Knee joint and soft tissue', NOW(), NOW()),
('IMG-US-066', 'Ankle Ultrasound', 'Ultrasound', 'Ankle', 12000.00, true, 'NHIS-IMG-166', 9600.00, true, 80, 'Ankle joint and tendons', NOW(), NOW()),
('IMG-US-067', 'Soft Tissue Mass Ultrasound', 'Ultrasound', 'Soft Tissue', 12000.00, true, 'NHIS-IMG-167', 9600.00, true, 80, 'Superficial mass characterization', NOW(), NOW()),

-- =====================================================
-- CT SCAN EXAMINATIONS
-- =====================================================
-- Head and Neck CT
('IMG-CT-001', 'CT Brain (Plain)', 'CT', 'Head', 45000.00, true, 'NHIS-IMG-200', 36000.00, true, 80, 'Non-contrast head CT', NOW(), NOW()),
('IMG-CT-002', 'CT Brain (With Contrast)', 'CT', 'Head', 55000.00, true, 'NHIS-IMG-201', 44000.00, true, 80, 'Contrast-enhanced head CT', NOW(), NOW()),
('IMG-CT-003', 'CT Brain (Plain + Contrast)', 'CT', 'Head', 65000.00, true, 'NHIS-IMG-202', 52000.00, true, 80, 'Pre and post-contrast head CT', NOW(), NOW()),
('IMG-CT-004', 'CT Orbits', 'CT', 'Orbits', 50000.00, true, 'NHIS-IMG-203', 40000.00, true, 80, 'Orbital CT examination', NOW(), NOW()),
('IMG-CT-005', 'CT Paranasal Sinuses', 'CT', 'Sinuses', 45000.00, true, 'NHIS-IMG-204', 36000.00, true, 80, 'Sinus CT examination', NOW(), NOW()),
('IMG-CT-006', 'CT Temporal Bones', 'CT', 'Temporal Bones', 55000.00, true, 'NHIS-IMG-205', 44000.00, true, 80, 'High-resolution temporal bone CT', NOW(), NOW()),
('IMG-CT-007', 'CT Facial Bones', 'CT', 'Face', 50000.00, true, 'NHIS-IMG-206', 40000.00, true, 80, 'Facial trauma/reconstruction CT', NOW(), NOW()),
('IMG-CT-008', 'CT Neck (Soft Tissue)', 'CT', 'Neck', 55000.00, true, 'NHIS-IMG-207', 44000.00, true, 80, 'Neck soft tissue evaluation', NOW(), NOW()),

-- Chest CT
('IMG-CT-010', 'CT Chest (Plain)', 'CT', 'Chest', 55000.00, true, 'NHIS-IMG-210', 44000.00, true, 80, 'Non-contrast chest CT', NOW(), NOW()),
('IMG-CT-011', 'CT Chest (With Contrast)', 'CT', 'Chest', 65000.00, true, 'NHIS-IMG-211', 52000.00, true, 80, 'Contrast-enhanced chest CT', NOW(), NOW()),
('IMG-CT-012', 'CT Chest (HRCT - High Resolution)', 'CT', 'Chest', 60000.00, true, 'NHIS-IMG-212', 48000.00, true, 80, 'High resolution for ILD', NOW(), NOW()),
('IMG-CT-013', 'CT Pulmonary Angiography (CTPA)', 'CT', 'Chest', 75000.00, true, 'NHIS-IMG-213', 60000.00, true, 80, 'PE protocol CT', NOW(), NOW()),

-- Abdominal and Pelvic CT
('IMG-CT-020', 'CT Abdomen (Plain)', 'CT', 'Abdomen', 55000.00, true, 'NHIS-IMG-220', 44000.00, true, 80, 'Non-contrast abdominal CT', NOW(), NOW()),
('IMG-CT-021', 'CT Abdomen (With Contrast)', 'CT', 'Abdomen', 70000.00, true, 'NHIS-IMG-221', 56000.00, true, 80, 'Contrast-enhanced abdominal CT', NOW(), NOW()),
('IMG-CT-022', 'CT Pelvis (Plain)', 'CT', 'Pelvis', 55000.00, true, 'NHIS-IMG-222', 44000.00, true, 80, 'Non-contrast pelvic CT', NOW(), NOW()),
('IMG-CT-023', 'CT Pelvis (With Contrast)', 'CT', 'Pelvis', 70000.00, true, 'NHIS-IMG-223', 56000.00, true, 80, 'Contrast-enhanced pelvic CT', NOW(), NOW()),
('IMG-CT-024', 'CT Abdomen & Pelvis (Plain)', 'CT', 'Abdomen/Pelvis', 75000.00, true, 'NHIS-IMG-224', 60000.00, true, 80, 'Combined abdominopelvic CT plain', NOW(), NOW()),
('IMG-CT-025', 'CT Abdomen & Pelvis (With Contrast)', 'CT', 'Abdomen/Pelvis', 95000.00, true, 'NHIS-IMG-225', 76000.00, true, 80, 'Combined abdominopelvic CT contrast', NOW(), NOW()),
('IMG-CT-026', 'CT Urography (CTU)', 'CT', 'Urinary Tract', 90000.00, true, 'NHIS-IMG-226', 72000.00, true, 80, 'CT urogram with excretory phase', NOW(), NOW()),
('IMG-CT-027', 'CT Colonography (Virtual Colonoscopy)', 'CT', 'Colon', 85000.00, true, 'NHIS-IMG-227', 68000.00, true, 80, 'CT colon examination', NOW(), NOW()),

-- Spine CT
('IMG-CT-030', 'CT Cervical Spine', 'CT', 'Cervical Spine', 55000.00, true, 'NHIS-IMG-230', 44000.00, true, 80, 'Cervical spine CT', NOW(), NOW()),
('IMG-CT-031', 'CT Thoracic Spine', 'CT', 'Thoracic Spine', 55000.00, true, 'NHIS-IMG-231', 44000.00, true, 80, 'Thoracic spine CT', NOW(), NOW()),
('IMG-CT-032', 'CT Lumbar Spine', 'CT', 'Lumbar Spine', 55000.00, true, 'NHIS-IMG-232', 44000.00, true, 80, 'Lumbar spine CT', NOW(), NOW()),
('IMG-CT-033', 'CT Whole Spine', 'CT', 'Whole Spine', 95000.00, true, 'NHIS-IMG-233', 76000.00, true, 80, 'Complete spine CT', NOW(), NOW()),

-- CT Angiography
('IMG-CT-040', 'CT Angiography - Brain (CTA Head)', 'CT', 'Intracranial Vessels', 85000.00, true, 'NHIS-IMG-240', 68000.00, true, 80, 'Cerebral CTA', NOW(), NOW()),
('IMG-CT-041', 'CT Angiography - Carotid', 'CT', 'Carotid Arteries', 80000.00, true, 'NHIS-IMG-241', 64000.00, true, 80, 'Carotid CTA', NOW(), NOW()),
('IMG-CT-042', 'CT Angiography - Aorta (Chest)', 'CT', 'Thoracic Aorta', 85000.00, true, 'NHIS-IMG-242', 68000.00, true, 80, 'Thoracic aorta CTA', NOW(), NOW()),
('IMG-CT-043', 'CT Angiography - Abdominal Aorta', 'CT', 'Abdominal Aorta', 85000.00, true, 'NHIS-IMG-243', 68000.00, true, 80, 'Abdominal aorta CTA', NOW(), NOW()),
('IMG-CT-044', 'CT Angiography - Lower Limb Runoff', 'CT', 'Lower Limb Arteries', 95000.00, true, 'NHIS-IMG-244', 76000.00, true, 80, 'Lower extremity CTA', NOW(), NOW()),
('IMG-CT-045', 'CT Coronary Angiography', 'CT', 'Coronary Arteries', 120000.00, true, 'NHIS-IMG-245', 96000.00, true, 80, 'Cardiac CT with coronary assessment', NOW(), NOW()),

-- Musculoskeletal CT
('IMG-CT-050', 'CT Shoulder', 'CT', 'Shoulder', 55000.00, true, 'NHIS-IMG-250', 44000.00, true, 80, 'Shoulder joint CT', NOW(), NOW()),
('IMG-CT-051', 'CT Hip', 'CT', 'Hip', 55000.00, true, 'NHIS-IMG-251', 44000.00, true, 80, 'Hip joint CT', NOW(), NOW()),
('IMG-CT-052', 'CT Knee', 'CT', 'Knee', 55000.00, true, 'NHIS-IMG-252', 44000.00, true, 80, 'Knee joint CT', NOW(), NOW()),
('IMG-CT-053', 'CT Ankle/Foot', 'CT', 'Ankle/Foot', 55000.00, true, 'NHIS-IMG-253', 44000.00, true, 80, 'Ankle and foot CT', NOW(), NOW()),
('IMG-CT-054', 'CT Wrist/Hand', 'CT', 'Wrist/Hand', 55000.00, true, 'NHIS-IMG-254', 44000.00, true, 80, 'Wrist and hand CT', NOW(), NOW()),

-- =====================================================
-- MRI EXAMINATIONS
-- =====================================================
-- Brain MRI
('IMG-MR-001', 'MRI Brain (Plain)', 'MRI', 'Brain', 95000.00, true, 'NHIS-IMG-300', 76000.00, true, 80, 'Non-contrast brain MRI', NOW(), NOW()),
('IMG-MR-002', 'MRI Brain (With Contrast)', 'MRI', 'Brain', 120000.00, true, 'NHIS-IMG-301', 96000.00, true, 80, 'Contrast-enhanced brain MRI', NOW(), NOW()),
('IMG-MR-003', 'MRI Brain (Plain + Contrast)', 'MRI', 'Brain', 140000.00, true, 'NHIS-IMG-302', 112000.00, true, 80, 'Pre and post-contrast brain MRI', NOW(), NOW()),
('IMG-MR-004', 'MRI Pituitary (With Contrast)', 'MRI', 'Pituitary', 110000.00, true, 'NHIS-IMG-303', 88000.00, true, 80, 'Dedicated pituitary protocol', NOW(), NOW()),
('IMG-MR-005', 'MRI Internal Auditory Canal (IAC)', 'MRI', 'IAC', 110000.00, true, 'NHIS-IMG-304', 88000.00, true, 80, 'Acoustic neuroma protocol', NOW(), NOW()),
('IMG-MR-006', 'MR Angiography Brain (MRA)', 'MRI', 'Intracranial Vessels', 110000.00, true, 'NHIS-IMG-305', 88000.00, true, 80, 'Non-contrast MR angiography', NOW(), NOW()),
('IMG-MR-007', 'MR Venography Brain (MRV)', 'MRI', 'Cerebral Veins', 110000.00, true, 'NHIS-IMG-306', 88000.00, true, 80, 'Cerebral venous imaging', NOW(), NOW()),

-- Spine MRI
('IMG-MR-010', 'MRI Cervical Spine (Plain)', 'MRI', 'Cervical Spine', 95000.00, true, 'NHIS-IMG-310', 76000.00, true, 80, 'Non-contrast cervical spine MRI', NOW(), NOW()),
('IMG-MR-011', 'MRI Cervical Spine (With Contrast)', 'MRI', 'Cervical Spine', 120000.00, true, 'NHIS-IMG-311', 96000.00, true, 80, 'Contrast-enhanced cervical spine MRI', NOW(), NOW()),
('IMG-MR-012', 'MRI Thoracic Spine (Plain)', 'MRI', 'Thoracic Spine', 95000.00, true, 'NHIS-IMG-312', 76000.00, true, 80, 'Non-contrast thoracic spine MRI', NOW(), NOW()),
('IMG-MR-013', 'MRI Thoracic Spine (With Contrast)', 'MRI', 'Thoracic Spine', 120000.00, true, 'NHIS-IMG-313', 96000.00, true, 80, 'Contrast-enhanced thoracic spine MRI', NOW(), NOW()),
('IMG-MR-014', 'MRI Lumbar Spine (Plain)', 'MRI', 'Lumbar Spine', 95000.00, true, 'NHIS-IMG-314', 76000.00, true, 80, 'Non-contrast lumbar spine MRI', NOW(), NOW()),
('IMG-MR-015', 'MRI Lumbar Spine (With Contrast)', 'MRI', 'Lumbar Spine', 120000.00, true, 'NHIS-IMG-315', 96000.00, true, 80, 'Contrast-enhanced lumbar spine MRI', NOW(), NOW()),
('IMG-MR-016', 'MRI Whole Spine (Screening)', 'MRI', 'Whole Spine', 180000.00, true, 'NHIS-IMG-316', 144000.00, true, 80, 'Complete spine MRI', NOW(), NOW()),

-- Musculoskeletal MRI
('IMG-MR-020', 'MRI Shoulder', 'MRI', 'Shoulder', 90000.00, true, 'NHIS-IMG-320', 72000.00, true, 80, 'Shoulder joint MRI', NOW(), NOW()),
('IMG-MR-021', 'MRI Elbow', 'MRI', 'Elbow', 85000.00, true, 'NHIS-IMG-321', 68000.00, true, 80, 'Elbow joint MRI', NOW(), NOW()),
('IMG-MR-022', 'MRI Wrist', 'MRI', 'Wrist', 85000.00, true, 'NHIS-IMG-322', 68000.00, true, 80, 'Wrist and hand MRI', NOW(), NOW()),
('IMG-MR-023', 'MRI Hip (Unilateral)', 'MRI', 'Hip', 90000.00, true, 'NHIS-IMG-323', 72000.00, true, 80, 'Single hip MRI', NOW(), NOW()),
('IMG-MR-024', 'MRI Hip (Bilateral)', 'MRI', 'Hip', 140000.00, true, 'NHIS-IMG-324', 112000.00, true, 80, 'Both hips MRI', NOW(), NOW()),
('IMG-MR-025', 'MRI Knee', 'MRI', 'Knee', 90000.00, true, 'NHIS-IMG-325', 72000.00, true, 80, 'Knee joint MRI', NOW(), NOW()),
('IMG-MR-026', 'MRI Ankle', 'MRI', 'Ankle', 85000.00, true, 'NHIS-IMG-326', 68000.00, true, 80, 'Ankle and foot MRI', NOW(), NOW()),
('IMG-MR-027', 'MRI Foot', 'MRI', 'Foot', 85000.00, true, 'NHIS-IMG-327', 68000.00, true, 80, 'Foot MRI', NOW(), NOW()),

-- Abdominal and Pelvic MRI
('IMG-MR-030', 'MRI Abdomen (Plain)', 'MRI', 'Abdomen', 110000.00, true, 'NHIS-IMG-330', 88000.00, true, 80, 'Non-contrast abdominal MRI', NOW(), NOW()),
('IMG-MR-031', 'MRI Abdomen (With Contrast)', 'MRI', 'Abdomen', 140000.00, true, 'NHIS-IMG-331', 112000.00, true, 80, 'Contrast-enhanced abdominal MRI', NOW(), NOW()),
('IMG-MR-032', 'MRCP (MR Cholangiopancreatography)', 'MRI', 'Biliary/Pancreatic', 120000.00, true, 'NHIS-IMG-332', 96000.00, true, 80, 'Biliary tract MRI', NOW(), NOW()),
('IMG-MR-033', 'MRI Liver (With Contrast)', 'MRI', 'Liver', 130000.00, true, 'NHIS-IMG-333', 104000.00, true, 80, 'Liver-specific MRI', NOW(), NOW()),
('IMG-MR-034', 'MRI Pelvis (Plain)', 'MRI', 'Pelvis', 110000.00, true, 'NHIS-IMG-334', 88000.00, true, 80, 'Non-contrast pelvic MRI', NOW(), NOW()),
('IMG-MR-035', 'MRI Pelvis (With Contrast)', 'MRI', 'Pelvis', 140000.00, true, 'NHIS-IMG-335', 112000.00, true, 80, 'Contrast-enhanced pelvic MRI', NOW(), NOW()),
('IMG-MR-036', 'MRI Prostate (Multiparametric)', 'MRI', 'Prostate', 150000.00, true, 'NHIS-IMG-336', 120000.00, true, 80, 'mpMRI prostate', NOW(), NOW()),

-- Breast MRI
('IMG-MR-040', 'MRI Breast (Bilateral with Contrast)', 'MRI', 'Breast', 150000.00, true, 'NHIS-IMG-340', 120000.00, true, 80, 'Bilateral breast MRI', NOW(), NOW()),
('IMG-MR-041', 'MRI Breast (Unilateral with Contrast)', 'MRI', 'Breast', 100000.00, true, 'NHIS-IMG-341', 80000.00, true, 80, 'Single breast MRI', NOW(), NOW()),

-- Cardiac MRI
('IMG-MR-050', 'MRI Cardiac (Function)', 'MRI', 'Heart', 180000.00, true, 'NHIS-IMG-350', 144000.00, true, 80, 'Cardiac function assessment', NOW(), NOW()),
('IMG-MR-051', 'MRI Cardiac (Viability/Perfusion)', 'MRI', 'Heart', 220000.00, true, 'NHIS-IMG-351', 176000.00, true, 80, 'Cardiac viability study', NOW(), NOW()),

-- =====================================================
-- MAMMOGRAPHY
-- =====================================================
('IMG-MM-001', 'Mammography (Bilateral Screening)', 'Mammography', 'Breast', 25000.00, true, 'NHIS-IMG-400', 20000.00, true, 80, 'Two-view bilateral screening mammogram', NOW(), NOW()),
('IMG-MM-002', 'Mammography (Diagnostic)', 'Mammography', 'Breast', 30000.00, true, 'NHIS-IMG-401', 24000.00, true, 80, 'Diagnostic mammogram with additional views', NOW(), NOW()),
('IMG-MM-003', 'Mammography (Unilateral)', 'Mammography', 'Breast', 15000.00, true, 'NHIS-IMG-402', 12000.00, true, 80, 'Single breast mammogram', NOW(), NOW()),

-- =====================================================
-- FLUOROSCOPY
-- =====================================================
('IMG-FL-001', 'Barium Swallow', 'Fluoroscopy', 'Esophagus', 35000.00, true, 'NHIS-IMG-500', 28000.00, true, 80, 'Esophageal contrast study', NOW(), NOW()),
('IMG-FL-002', 'Barium Meal', 'Fluoroscopy', 'Stomach', 40000.00, true, 'NHIS-IMG-501', 32000.00, true, 80, 'Upper GI series', NOW(), NOW()),
('IMG-FL-003', 'Barium Follow Through', 'Fluoroscopy', 'Small Bowel', 45000.00, true, 'NHIS-IMG-502', 36000.00, true, 80, 'Small bowel series', NOW(), NOW()),
('IMG-FL-004', 'Barium Enema', 'Fluoroscopy', 'Colon', 50000.00, true, 'NHIS-IMG-503', 40000.00, true, 80, 'Lower GI contrast study', NOW(), NOW()),
('IMG-FL-005', 'Intravenous Urography (IVU)', 'Fluoroscopy', 'Urinary Tract', 45000.00, true, 'NHIS-IMG-504', 36000.00, true, 80, 'Excretory urography', NOW(), NOW()),
('IMG-FL-006', 'Hysterosalpingography (HSG)', 'Fluoroscopy', 'Uterus/Tubes', 40000.00, true, 'NHIS-IMG-505', 32000.00, true, 80, 'Tubal patency study', NOW(), NOW()),
('IMG-FL-007', 'Micturating Cystourethrography (MCUG)', 'Fluoroscopy', 'Bladder/Urethra', 40000.00, true, 'NHIS-IMG-506', 32000.00, true, 80, 'Voiding cystourethrogram', NOW(), NOW()),
('IMG-FL-008', 'Retrograde Urethrography', 'Fluoroscopy', 'Urethra', 35000.00, true, 'NHIS-IMG-507', 28000.00, true, 80, 'Urethral contrast study', NOW(), NOW()),
('IMG-FL-009', 'Fistulography', 'Fluoroscopy', 'Fistula Tract', 35000.00, true, 'NHIS-IMG-508', 28000.00, true, 80, 'Fistula tract imaging', NOW(), NOW()),
('IMG-FL-010', 'Sialography', 'Fluoroscopy', 'Salivary Glands', 35000.00, true, 'NHIS-IMG-509', 28000.00, true, 80, 'Salivary duct imaging', NOW(), NOW()),
('IMG-FL-011', 'T-Tube Cholangiography', 'Fluoroscopy', 'Biliary Tract', 40000.00, true, 'NHIS-IMG-510', 32000.00, true, 80, 'Post-operative biliary study', NOW(), NOW()),

-- =====================================================
-- OTHER IMAGING
-- =====================================================
('IMG-OT-001', 'Bone Densitometry (DEXA) - Spine & Hip', 'Other', 'Spine/Hip', 35000.00, true, 'NHIS-IMG-600', 28000.00, true, 80, 'Bone mineral density scan', NOW(), NOW()),
('IMG-OT-002', 'Bone Densitometry (DEXA) - Whole Body', 'Other', 'Whole Body', 45000.00, true, 'NHIS-IMG-601', 36000.00, true, 80, 'Total body composition scan', NOW(), NOW()),
('IMG-OT-003', 'Echocardiography (Transthoracic)', 'Other', 'Heart', 35000.00, true, 'NHIS-IMG-602', 28000.00, true, 80, 'TTE - 2D Echo with Doppler', NOW(), NOW()),
('IMG-OT-004', 'Echocardiography (Transesophageal)', 'Other', 'Heart', 65000.00, true, 'NHIS-IMG-603', 52000.00, true, 80, 'TEE', NOW(), NOW()),
('IMG-OT-005', 'Stress Echocardiography', 'Other', 'Heart', 55000.00, true, 'NHIS-IMG-604', 44000.00, true, 80, 'Exercise or pharmacologic stress echo', NOW(), NOW()),
('IMG-OT-006', 'Electrocardiogram (ECG/EKG)', 'Other', 'Heart', 5000.00, true, 'NHIS-IMG-605', 4000.00, true, 80, '12-lead ECG', NOW(), NOW()),
('IMG-OT-007', 'Holter Monitoring (24-hour)', 'Other', 'Heart', 25000.00, true, 'NHIS-IMG-606', 20000.00, true, 80, 'Ambulatory ECG monitoring', NOW(), NOW()),
('IMG-OT-008', 'Ankle-Brachial Index (ABI)', 'Other', 'Peripheral Vessels', 15000.00, true, 'NHIS-IMG-607', 12000.00, true, 80, 'Peripheral arterial disease screening', NOW(), NOW())

ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    modality = EXCLUDED.modality,
    body_part = EXCLUDED.body_part,
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active,
    nhis_code = EXCLUDED.nhis_code,
    nhis_price = EXCLUDED.nhis_price,
    is_nhis_covered = EXCLUDED.is_nhis_covered,
    nhis_percentage = EXCLUDED.nhis_percentage,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_imaging_catalogue_modality ON imaging_catalogue(modality);
CREATE INDEX IF NOT EXISTS idx_imaging_catalogue_body_part ON imaging_catalogue(body_part);
CREATE INDEX IF NOT EXISTS idx_imaging_catalogue_nhis_code ON imaging_catalogue(nhis_code);
