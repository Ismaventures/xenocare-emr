-- Seed imaging catalogue entries grouped by modality
INSERT INTO imaging_catalogue (
    code,
    name,
    modality,
    body_part,
    price,
    is_active,
    created_at,
    updated_at
) VALUES
    -- X-Ray
    ('RAD010', 'Chest X-Ray (PA/LAT)', 'X-Ray', 'Chest', 6500.00, true, NOW(), NOW()),
    ('RAD011', 'Cervical Spine X-Ray', 'X-Ray', 'Cervical Spine', 7000.00, true, NOW(), NOW()),
    ('RAD012', 'Lumbar Spine X-Ray', 'X-Ray', 'Lumbar Spine', 7200.00, true, NOW(), NOW()),
    ('RAD013', 'Pelvic X-Ray', 'X-Ray', 'Pelvis', 6800.00, true, NOW(), NOW()),
    ('RAD014', 'Extremity X-Ray', 'X-Ray', 'Upper/Lower Limb', 6000.00, true, NOW(), NOW()),

    -- Ultrasound
    ('RAD020', 'Abdominal Ultrasound (Detailed)', 'Ultrasound', 'Abdomen', 7500.00, true, NOW(), NOW()),
    ('RAD021', 'Pelvic Ultrasound with Doppler', 'Ultrasound', 'Pelvis', 8200.00, true, NOW(), NOW()),
    ('RAD022', 'Obstetric Ultrasound (2nd Trimester)', 'Ultrasound', 'Obstetrics', 7800.00, true, NOW(), NOW()),
    ('RAD023', 'Thyroid Ultrasound', 'Ultrasound', 'Neck', 7000.00, true, NOW(), NOW()),
    ('RAD024', 'Breast Ultrasound', 'Ultrasound', 'Breast', 7200.00, true, NOW(), NOW()),

    -- CT Scan
    ('RAD030', 'CT Brain (Contrast)', 'CT', 'Head', 48000.00, true, NOW(), NOW()),
    ('RAD031', 'CT Abdomen & Pelvis', 'CT', 'Abdomen/Pelvis', 55000.00, true, NOW(), NOW()),
    ('RAD032', 'CT Chest (High Resolution)', 'CT', 'Chest', 52000.00, true, NOW(), NOW()),
    ('RAD033', 'CT Angiography (Peripheral)', 'CT', 'Peripheral Vasculature', 65000.00, true, NOW(), NOW()),
    ('RAD034', 'CT Spine (Multilevel)', 'CT', 'Spine', 58000.00, true, NOW(), NOW()),

    -- MRI
    ('RAD040', 'MRI Brain with Contrast', 'MRI', 'Brain', 85000.00, true, NOW(), NOW()),
    ('RAD041', 'MRI Lumbar Spine', 'MRI', 'Lumbar Spine', 90000.00, true, NOW(), NOW()),
    ('RAD042', 'MRI Knee Joint', 'MRI', 'Knee', 88000.00, true, NOW(), NOW()),
    ('RAD043', 'MRI Abdomen & Pelvis', 'MRI', 'Abdomen/Pelvis', 92000.00, true, NOW(), NOW()),
    ('RAD044', 'MRI Angiography (MRA)', 'MRI', 'Cerebral Vasculature', 98000.00, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    modality = EXCLUDED.modality,
    body_part = EXCLUDED.body_part,
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
