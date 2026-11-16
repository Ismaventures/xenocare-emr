-- Seed lab test catalogue entries grouped by category
INSERT INTO lab_test_catalogue (
    code,
    name,
    category,
    specimen_type,
    price,
    tat_minutes,
    is_active,
    created_at,
    updated_at
) VALUES
    -- Hematology
    ('HEM010', 'Reticulocyte Count', 'Hematology', 'Blood', 3800.00, 120, true, NOW(), NOW()),
    ('HEM011', 'Peripheral Blood Film', 'Hematology', 'Blood', 3200.00, 180, true, NOW(), NOW()),
    ('HEM012', 'Packed Cell Volume (PCV)', 'Hematology', 'Blood', 1800.00, 60, true, NOW(), NOW()),
    ('HEM013', 'Coagulation Profile (PT/INR)', 'Hematology', 'Blood', 4500.00, 150, true, NOW(), NOW()),
    ('HEM014', 'Erythrocyte Count', 'Hematology', 'Blood', 2500.00, 90, true, NOW(), NOW()),

    -- Chemical Pathology
    ('CHM010', 'Glycated Hemoglobin (HbA1c)', 'Chemical Pathology', 'Blood', 4500.00, 1440, true, NOW(), NOW()),
    ('CHM011', 'Renal Function Panel', 'Chemical Pathology', 'Blood', 5500.00, 1440, true, NOW(), NOW()),
    ('CHM012', 'Serum Electrolytes', 'Chemical Pathology', 'Blood', 4000.00, 360, true, NOW(), NOW()),
    ('CHM013', 'Lactate Dehydrogenase (LDH)', 'Chemical Pathology', 'Blood', 3800.00, 360, true, NOW(), NOW()),
    ('CHM014', 'Serum Calcium', 'Chemical Pathology', 'Blood', 3000.00, 240, true, NOW(), NOW()),

    -- Microbiology
    ('MIC010', 'Urine M/C/S', 'Microbiology', 'Urine', 2500.00, 2880, true, NOW(), NOW()),
    ('MIC011', 'Semen Analysis', 'Microbiology', 'Semen', 5000.00, 1440, true, NOW(), NOW()),
    ('MIC012', 'High Vaginal Swab (HVS)', 'Microbiology', 'Swab', 3800.00, 2880, true, NOW(), NOW()),
    ('MIC013', 'Throat Swab Culture', 'Microbiology', 'Swab', 3200.00, 2880, true, NOW(), NOW()),
    ('MIC014', 'AFB Microscopy (TB)', 'Microbiology', 'Sputum', 3500.00, 4320, true, NOW(), NOW()),

    -- Serology
    ('SER010', 'Pregnancy Test (β-hCG)', 'Serology', 'Blood', 2000.00, 120, true, NOW(), NOW()),
    ('SER011', 'Widal Test (Typhoid)', 'Serology', 'Blood', 2200.00, 180, true, NOW(), NOW()),
    ('SER012', 'Rheumatoid Factor (RF)', 'Serology', 'Blood', 3000.00, 360, true, NOW(), NOW()),
    ('SER013', 'Anti-Streptolysin O (ASO)', 'Serology', 'Blood', 2800.00, 360, true, NOW(), NOW()),
    ('SER014', 'Prostate Specific Antigen (PSA)', 'Serology', 'Blood', 6000.00, 360, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    specimen_type = EXCLUDED.specimen_type,
    price = EXCLUDED.price,
    tat_minutes = EXCLUDED.tat_minutes,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
