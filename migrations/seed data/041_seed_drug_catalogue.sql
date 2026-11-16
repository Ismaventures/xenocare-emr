-- Seed drug catalogue entries grouped by therapeutic category
INSERT INTO drug_catalogue (
    code,
    name,
    generic_name,
    category,
    drug_type,
    strength,
    unit_price,
    stock_quantity,
    reorder_level,
    is_active,
    created_at,
    updated_at
) VALUES
    -- Antibiotics
    ('DRG100', 'Amoxicillin Capsules 500mg', 'Amoxicillin', 'Antibiotics', 'Capsules', '500mg', 65.00, 450, 120, true, NOW(), NOW()),
    ('DRG101', 'Cefuroxime Tablets 500mg', 'Cefuroxime Axetil', 'Antibiotics', 'Tablets', '500mg', 180.00, 320, 100, true, NOW(), NOW()),
    ('DRG102', 'Azithromycin Tablets 250mg', 'Azithromycin', 'Antibiotics', 'Tablets', '250mg', 220.00, 280, 80, true, NOW(), NOW()),
    ('DRG103', 'Ciprofloxacin Tablets 500mg', 'Ciprofloxacin', 'Antibiotics', 'Tablets', '500mg', 150.00, 300, 90, true, NOW(), NOW()),
    ('DRG104', 'Ceftriaxone Injection 1g', 'Ceftriaxone', 'Antibiotics', 'Injections', '1g', 850.00, 180, 60, true, NOW(), NOW()),

    -- Analgesics
    ('DRG110', 'Paracetamol Tablets 500mg', 'Paracetamol', 'Analgesics', 'Tablets', '500mg', 25.00, 1200, 300, true, NOW(), NOW()),
    ('DRG111', 'Ibuprofen Tablets 400mg', 'Ibuprofen', 'Analgesics', 'Tablets', '400mg', 45.00, 900, 250, true, NOW(), NOW()),
    ('DRG112', 'Diclofenac SR Tablets 100mg', 'Diclofenac Sodium', 'Analgesics', 'Tablets', '100mg', 95.00, 420, 120, true, NOW(), NOW()),
    ('DRG113', 'Tramadol Capsules 50mg', 'Tramadol Hydrochloride', 'Analgesics', 'Capsules', '50mg', 180.00, 260, 80, true, NOW(), NOW()),
    ('DRG114', 'Morphine Injection 10mg/ml', 'Morphine Sulfate', 'Analgesics', 'Injections', '10mg/ml', 1200.00, 90, 40, true, NOW(), NOW()),

    -- Antimalarials
    ('DRG120', 'Artemether/Lumefantrine Tablets', 'Artemether/Lumefantrine', 'Antimalarials', 'Tablets', '20/120mg', 650.00, 380, 150, true, NOW(), NOW()),
    ('DRG121', 'Dihydroartemisinin/Piperaquine', 'DHA/Piperaquine', 'Antimalarials', 'Tablets', '40/320mg', 720.00, 240, 90, true, NOW(), NOW()),
    ('DRG122', 'Artesunate Injection 60mg', 'Artesunate', 'Antimalarials', 'Injections', '60mg', 950.00, 160, 60, true, NOW(), NOW()),

    -- Antihypertensives
    ('DRG130', 'Amlodipine Tablets 5mg', 'Amlodipine Besylate', 'Antihypertensives', 'Tablets', '5mg', 110.00, 500, 150, true, NOW(), NOW()),
    ('DRG131', 'Losartan Tablets 50mg', 'Losartan Potassium', 'Antihypertensives', 'Tablets', '50mg', 140.00, 340, 120, true, NOW(), NOW()),
    ('DRG132', 'Lisinopril Tablets 10mg', 'Lisinopril', 'Antihypertensives', 'Tablets', '10mg', 135.00, 260, 90, true, NOW(), NOW()),
    ('DRG133', 'Hydrochlorothiazide Tablets 25mg', 'Hydrochlorothiazide', 'Antihypertensives', 'Tablets', '25mg', 80.00, 410, 140, true, NOW(), NOW()),

    -- Antidiabetics
    ('DRG140', 'Metformin Tablets 500mg', 'Metformin Hydrochloride', 'Antidiabetics', 'Tablets', '500mg', 95.00, 600, 200, true, NOW(), NOW()),
    ('DRG141', 'Gliclazide MR Tablets 60mg', 'Gliclazide', 'Antidiabetics', 'Tablets', '60mg', 180.00, 220, 70, true, NOW(), NOW()),
    ('DRG142', 'Insulin Glargine Injection 100IU', 'Insulin Glargine', 'Antidiabetics', 'Injections', '100IU/ml', 4200.00, 80, 30, true, NOW(), NOW()),

    -- Vitamins and Supplements
    ('DRG150', 'Vitamin C Tablets 500mg', 'Ascorbic Acid', 'Vitamins and Supplements', 'Tablets', '500mg', 30.00, 1500, 400, true, NOW(), NOW()),
    ('DRG151', 'Calcium + Vitamin D Tablets', 'Calcium Carbonate/Cholecalciferol', 'Vitamins and Supplements', 'Tablets', '600mg/400IU', 210.00, 260, 80, true, NOW(), NOW()),
    ('DRG152', 'Folic Acid Tablets 5mg', 'Folic Acid', 'Vitamins and Supplements', 'Tablets', '5mg', 55.00, 500, 160, true, NOW(), NOW()),
    ('DRG153', 'Prenatal Multivitamin', 'Prenatal Combination', 'Vitamins and Supplements', 'Capsules', 'Standard Dose', 320.00, 200, 70, true, NOW(), NOW()),

    -- IV Fluids
    ('DRG160', 'Normal Saline 0.9% 1L', 'Sodium Chloride', 'IV Fluids', 'IV Infusions', '1L', 550.00, 240, 90, true, NOW(), NOW()),
    ('DRG161', 'Ringers Lactate 1L', 'Ringers Solution', 'IV Fluids', 'IV Infusions', '1L', 620.00, 210, 80, true, NOW(), NOW()),
    ('DRG162', 'Dextrose 5% 500ml', 'Dextrose', 'IV Fluids', 'IV Infusions', '500ml', 480.00, 260, 90, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    generic_name = EXCLUDED.generic_name,
    category = EXCLUDED.category,
    drug_type = EXCLUDED.drug_type,
    strength = EXCLUDED.strength,
    unit_price = EXCLUDED.unit_price,
    stock_quantity = EXCLUDED.stock_quantity,
    reorder_level = EXCLUDED.reorder_level,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
