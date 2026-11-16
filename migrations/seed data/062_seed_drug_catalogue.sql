-- =====================================================
-- COMPREHENSIVE DRUG CATALOGUE SEED DATA
-- Aligned with schema: drug_catalogue table
-- Uses drug_category ENUM: 'Antibiotics', 'Analgesics', 'Antimalarials', 'Antihypertensives', 
--   'Antidiabetics', 'Antivirals', 'Antifungals', 'Vaccines', 'IV Fluids', 'Vitamins and Supplements'
-- Includes NHIS codes and pricing
-- =====================================================

-- Clear existing seed data (optional - comment out if appending)
-- DELETE FROM drug_catalogue WHERE code LIKE 'DRG%';

INSERT INTO drug_catalogue (
    code,
    name,
    category,
    drug_type,
    dosage_form,
    strengths,
    formulation,
    brand_name,
    manufacturer,
    price,
    unit_price,
    selling_price,
    unit_cost,
    stock_quantity,
    reorder_level,
    unit_of_measure,
    is_active,
    is_controlled,
    requires_prescription,
    nhis_code,
    nhis_price,
    is_nhis_covered,
    nhis_eligible,
    nhis_percentage,
    description,
    created_at,
    updated_at
) VALUES
-- =====================================================
-- ANTIBIOTICS
-- =====================================================
-- Penicillins
('DRG-ANT-001', 'Amoxicillin Capsules 250mg', 'Antibiotics', 'Capsules', 'Capsule', '250mg', 'Oral Capsule', 'Amoxil', 'GlaxoSmithKline', 50.00, 50.00, 65.00, 35.00, 1000, 200, 'Capsule', true, false, true, 'NHIS-DRG-001', 40.00, true, true, 80, 'Broad-spectrum penicillin antibiotic', NOW(), NOW()),
('DRG-ANT-002', 'Amoxicillin Capsules 500mg', 'Antibiotics', 'Capsules', 'Capsule', '500mg', 'Oral Capsule', 'Amoxil', 'GlaxoSmithKline', 80.00, 80.00, 100.00, 55.00, 800, 150, 'Capsule', true, false, true, 'NHIS-DRG-002', 65.00, true, true, 80, 'Broad-spectrum penicillin antibiotic', NOW(), NOW()),
('DRG-ANT-003', 'Amoxicillin Suspension 125mg/5ml', 'Antibiotics', 'Syrups', 'Suspension', '125mg/5ml', 'Oral Suspension', 'Amoxil', 'GlaxoSmithKline', 650.00, 650.00, 850.00, 450.00, 200, 50, 'Bottle', true, false, true, 'NHIS-DRG-003', 520.00, true, true, 80, 'Pediatric amoxicillin suspension', NOW(), NOW()),
('DRG-ANT-004', 'Amoxicillin Suspension 250mg/5ml', 'Antibiotics', 'Syrups', 'Suspension', '250mg/5ml', 'Oral Suspension', 'Amoxil', 'GlaxoSmithKline', 850.00, 850.00, 1100.00, 600.00, 150, 40, 'Bottle', true, false, true, 'NHIS-DRG-004', 680.00, true, true, 80, 'Pediatric amoxicillin suspension', NOW(), NOW()),
('DRG-ANT-005', 'Ampicillin Injection 500mg', 'Antibiotics', 'Injections', 'Powder for Injection', '500mg', 'IV/IM Injection', 'Penbritin', 'Various', 350.00, 350.00, 450.00, 250.00, 300, 80, 'Vial', true, false, true, 'NHIS-DRG-005', 280.00, true, true, 80, 'Parenteral penicillin', NOW(), NOW()),
('DRG-ANT-006', 'Ampicillin Injection 1g', 'Antibiotics', 'Injections', 'Powder for Injection', '1g', 'IV/IM Injection', 'Penbritin', 'Various', 550.00, 550.00, 700.00, 380.00, 250, 60, 'Vial', true, false, true, 'NHIS-DRG-006', 440.00, true, true, 80, 'Parenteral penicillin', NOW(), NOW()),
('DRG-ANT-007', 'Amoxicillin/Clavulanate 375mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '375mg', 'Oral Tablet', 'Augmentin', 'GlaxoSmithKline', 180.00, 180.00, 230.00, 130.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-007', 145.00, true, true, 80, 'Beta-lactamase inhibitor combination', NOW(), NOW()),
('DRG-ANT-008', 'Amoxicillin/Clavulanate 625mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '625mg', 'Oral Tablet', 'Augmentin', 'GlaxoSmithKline', 280.00, 280.00, 360.00, 200.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-008', 225.00, true, true, 80, 'Beta-lactamase inhibitor combination', NOW(), NOW()),
('DRG-ANT-009', 'Amoxicillin/Clavulanate 1.2g Injection', 'Antibiotics', 'Injections', 'Powder for Injection', '1.2g', 'IV Injection', 'Augmentin', 'GlaxoSmithKline', 1200.00, 1200.00, 1500.00, 850.00, 150, 40, 'Vial', true, false, true, 'NHIS-DRG-009', 960.00, true, true, 80, 'Parenteral co-amoxiclav', NOW(), NOW()),

-- Cephalosporins
('DRG-ANT-010', 'Cefuroxime Tablets 250mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '250mg', 'Oral Tablet', 'Zinnat', 'GlaxoSmithKline', 220.00, 220.00, 280.00, 160.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-010', 175.00, true, true, 80, '2nd generation cephalosporin', NOW(), NOW()),
('DRG-ANT-011', 'Cefuroxime Tablets 500mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Zinnat', 'GlaxoSmithKline', 380.00, 380.00, 480.00, 280.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-011', 305.00, true, true, 80, '2nd generation cephalosporin', NOW(), NOW()),
('DRG-ANT-012', 'Cefuroxime Injection 750mg', 'Antibiotics', 'Injections', 'Powder for Injection', '750mg', 'IV/IM Injection', 'Zinacef', 'GlaxoSmithKline', 850.00, 850.00, 1100.00, 620.00, 180, 50, 'Vial', true, false, true, 'NHIS-DRG-012', 680.00, true, true, 80, 'Parenteral 2nd gen cephalosporin', NOW(), NOW()),
('DRG-ANT-013', 'Ceftriaxone Injection 500mg', 'Antibiotics', 'Injections', 'Powder for Injection', '500mg', 'IV/IM Injection', 'Rocephin', 'Roche', 650.00, 650.00, 850.00, 480.00, 250, 60, 'Vial', true, false, true, 'NHIS-DRG-013', 520.00, true, true, 80, '3rd generation cephalosporin', NOW(), NOW()),
('DRG-ANT-014', 'Ceftriaxone Injection 1g', 'Antibiotics', 'Injections', 'Powder for Injection', '1g', 'IV/IM Injection', 'Rocephin', 'Roche', 1100.00, 1100.00, 1400.00, 800.00, 300, 80, 'Vial', true, false, true, 'NHIS-DRG-014', 880.00, true, true, 80, '3rd generation cephalosporin', NOW(), NOW()),
('DRG-ANT-015', 'Ceftriaxone Injection 2g', 'Antibiotics', 'Injections', 'Powder for Injection', '2g', 'IV/IM Injection', 'Rocephin', 'Roche', 1800.00, 1800.00, 2300.00, 1300.00, 150, 40, 'Vial', true, false, true, 'NHIS-DRG-015', 1440.00, true, true, 80, '3rd generation cephalosporin', NOW(), NOW()),
('DRG-ANT-016', 'Cefixime Capsules 200mg', 'Antibiotics', 'Capsules', 'Capsule', '200mg', 'Oral Capsule', 'Suprax', 'Sanofi', 280.00, 280.00, 360.00, 200.00, 250, 60, 'Capsule', true, false, true, 'NHIS-DRG-016', 225.00, true, true, 80, '3rd generation oral cephalosporin', NOW(), NOW()),
('DRG-ANT-017', 'Cefixime Capsules 400mg', 'Antibiotics', 'Capsules', 'Capsule', '400mg', 'Oral Capsule', 'Suprax', 'Sanofi', 480.00, 480.00, 620.00, 350.00, 200, 50, 'Capsule', true, false, true, 'NHIS-DRG-017', 385.00, true, true, 80, '3rd generation oral cephalosporin', NOW(), NOW()),
('DRG-ANT-018', 'Ceftazidime Injection 1g', 'Antibiotics', 'Injections', 'Powder for Injection', '1g', 'IV/IM Injection', 'Fortum', 'GlaxoSmithKline', 2200.00, 2200.00, 2800.00, 1600.00, 100, 30, 'Vial', true, false, true, 'NHIS-DRG-018', 1760.00, true, true, 80, 'Anti-pseudomonal cephalosporin', NOW(), NOW()),
('DRG-ANT-019', 'Cefotaxime Injection 1g', 'Antibiotics', 'Injections', 'Powder for Injection', '1g', 'IV/IM Injection', 'Claforan', 'Sanofi', 1400.00, 1400.00, 1800.00, 1000.00, 120, 35, 'Vial', true, false, true, 'NHIS-DRG-019', 1120.00, true, true, 80, '3rd generation cephalosporin', NOW(), NOW()),

-- Macrolides
('DRG-ANT-020', 'Azithromycin Tablets 250mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '250mg', 'Oral Tablet', 'Zithromax', 'Pfizer', 350.00, 350.00, 450.00, 250.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-020', 280.00, true, true, 80, 'Macrolide antibiotic', NOW(), NOW()),
('DRG-ANT-021', 'Azithromycin Tablets 500mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Zithromax', 'Pfizer', 550.00, 550.00, 700.00, 400.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-021', 440.00, true, true, 80, 'Macrolide antibiotic', NOW(), NOW()),
('DRG-ANT-022', 'Azithromycin Suspension 200mg/5ml', 'Antibiotics', 'Syrups', 'Suspension', '200mg/5ml', 'Oral Suspension', 'Zithromax', 'Pfizer', 1200.00, 1200.00, 1550.00, 850.00, 100, 30, 'Bottle', true, false, true, 'NHIS-DRG-022', 960.00, true, true, 80, 'Pediatric azithromycin', NOW(), NOW()),
('DRG-ANT-023', 'Erythromycin Tablets 250mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '250mg', 'Oral Tablet', 'Erythrocin', 'Abbott', 120.00, 120.00, 150.00, 85.00, 500, 120, 'Tablet', true, false, true, 'NHIS-DRG-023', 95.00, true, true, 80, 'Macrolide antibiotic', NOW(), NOW()),
('DRG-ANT-024', 'Erythromycin Tablets 500mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Erythrocin', 'Abbott', 180.00, 180.00, 230.00, 130.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-024', 145.00, true, true, 80, 'Macrolide antibiotic', NOW(), NOW()),
('DRG-ANT-025', 'Clarithromycin Tablets 250mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '250mg', 'Oral Tablet', 'Klacid', 'Abbott', 280.00, 280.00, 360.00, 200.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-025', 225.00, true, true, 80, 'Macrolide antibiotic', NOW(), NOW()),
('DRG-ANT-026', 'Clarithromycin Tablets 500mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Klacid', 'Abbott', 450.00, 450.00, 580.00, 320.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-026', 360.00, true, true, 80, 'Macrolide antibiotic', NOW(), NOW()),

-- Fluoroquinolones
('DRG-ANT-030', 'Ciprofloxacin Tablets 250mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '250mg', 'Oral Tablet', 'Ciprobay', 'Bayer', 120.00, 120.00, 150.00, 85.00, 600, 150, 'Tablet', true, false, true, 'NHIS-DRG-030', 95.00, true, true, 80, 'Fluoroquinolone antibiotic', NOW(), NOW()),
('DRG-ANT-031', 'Ciprofloxacin Tablets 500mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Ciprobay', 'Bayer', 180.00, 180.00, 230.00, 130.00, 500, 120, 'Tablet', true, false, true, 'NHIS-DRG-031', 145.00, true, true, 80, 'Fluoroquinolone antibiotic', NOW(), NOW()),
('DRG-ANT-032', 'Ciprofloxacin Injection 200mg/100ml', 'Antibiotics', 'IV Infusions', 'Solution for Infusion', '200mg/100ml', 'IV Infusion', 'Ciprobay', 'Bayer', 850.00, 850.00, 1100.00, 620.00, 150, 40, 'Bottle', true, false, true, 'NHIS-DRG-032', 680.00, true, true, 80, 'Parenteral ciprofloxacin', NOW(), NOW()),
('DRG-ANT-033', 'Levofloxacin Tablets 250mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '250mg', 'Oral Tablet', 'Tavanic', 'Sanofi', 220.00, 220.00, 280.00, 160.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-033', 175.00, true, true, 80, 'Respiratory fluoroquinolone', NOW(), NOW()),
('DRG-ANT-034', 'Levofloxacin Tablets 500mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Tavanic', 'Sanofi', 380.00, 380.00, 480.00, 280.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-034', 305.00, true, true, 80, 'Respiratory fluoroquinolone', NOW(), NOW()),
('DRG-ANT-035', 'Levofloxacin Injection 500mg/100ml', 'Antibiotics', 'IV Infusions', 'Solution for Infusion', '500mg/100ml', 'IV Infusion', 'Tavanic', 'Sanofi', 1500.00, 1500.00, 1950.00, 1100.00, 100, 30, 'Bottle', true, false, true, 'NHIS-DRG-035', 1200.00, true, true, 80, 'Parenteral levofloxacin', NOW(), NOW()),
('DRG-ANT-036', 'Ofloxacin Tablets 200mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '200mg', 'Oral Tablet', 'Tarivid', 'Sanofi', 150.00, 150.00, 195.00, 110.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-036', 120.00, true, true, 80, 'Fluoroquinolone antibiotic', NOW(), NOW()),
('DRG-ANT-037', 'Norfloxacin Tablets 400mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '400mg', 'Oral Tablet', 'Noroxin', 'MSD', 100.00, 100.00, 130.00, 70.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-037', 80.00, true, true, 80, 'Urinary tract fluoroquinolone', NOW(), NOW()),

-- Aminoglycosides
('DRG-ANT-040', 'Gentamicin Injection 80mg/2ml', 'Antibiotics', 'Injections', 'Solution for Injection', '80mg/2ml', 'IM/IV Injection', 'Garamycin', 'Various', 150.00, 150.00, 195.00, 110.00, 400, 100, 'Ampoule', true, false, true, 'NHIS-DRG-040', 120.00, true, true, 80, 'Aminoglycoside antibiotic', NOW(), NOW()),
('DRG-ANT-041', 'Amikacin Injection 500mg/2ml', 'Antibiotics', 'Injections', 'Solution for Injection', '500mg/2ml', 'IM/IV Injection', 'Amikin', 'Bristol-Myers', 1200.00, 1200.00, 1550.00, 880.00, 120, 35, 'Vial', true, false, true, 'NHIS-DRG-041', 960.00, true, true, 80, 'Aminoglycoside for resistant bacteria', NOW(), NOW()),

-- Other Antibiotics
('DRG-ANT-050', 'Metronidazole Tablets 200mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '200mg', 'Oral Tablet', 'Flagyl', 'Sanofi', 40.00, 40.00, 50.00, 30.00, 800, 200, 'Tablet', true, false, true, 'NHIS-DRG-050', 30.00, true, true, 80, 'Nitroimidazole antibiotic', NOW(), NOW()),
('DRG-ANT-051', 'Metronidazole Tablets 400mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '400mg', 'Oral Tablet', 'Flagyl', 'Sanofi', 60.00, 60.00, 75.00, 45.00, 700, 180, 'Tablet', true, false, true, 'NHIS-DRG-051', 50.00, true, true, 80, 'Nitroimidazole antibiotic', NOW(), NOW()),
('DRG-ANT-052', 'Metronidazole Injection 500mg/100ml', 'Antibiotics', 'IV Infusions', 'Solution for Infusion', '500mg/100ml', 'IV Infusion', 'Flagyl', 'Sanofi', 450.00, 450.00, 580.00, 320.00, 200, 50, 'Bottle', true, false, true, 'NHIS-DRG-052', 360.00, true, true, 80, 'Parenteral metronidazole', NOW(), NOW()),
('DRG-ANT-053', 'Tinidazole Tablets 500mg', 'Antibiotics', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Fasigyn', 'Pfizer', 120.00, 120.00, 150.00, 85.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-053', 95.00, true, true, 80, 'Nitroimidazole for protozoal infections', NOW(), NOW()),
('DRG-ANT-054', 'Doxycycline Capsules 100mg', 'Antibiotics', 'Capsules', 'Capsule', '100mg', 'Oral Capsule', 'Vibramycin', 'Pfizer', 80.00, 80.00, 100.00, 55.00, 600, 150, 'Capsule', true, false, true, 'NHIS-DRG-054', 65.00, true, true, 80, 'Tetracycline antibiotic', NOW(), NOW()),
('DRG-ANT-055', 'Cotrimoxazole Tablets 480mg', 'Antibiotics', 'Tablets', 'Tablet', '480mg', 'Oral Tablet', 'Septrin', 'GlaxoSmithKline', 30.00, 30.00, 40.00, 20.00, 1000, 250, 'Tablet', true, false, true, 'NHIS-DRG-055', 25.00, true, true, 80, 'Sulfonamide combination', NOW(), NOW()),
('DRG-ANT-056', 'Cotrimoxazole Tablets 960mg', 'Antibiotics', 'Tablets', 'Tablet', '960mg', 'Oral Tablet', 'Septrin', 'GlaxoSmithKline', 50.00, 50.00, 65.00, 35.00, 800, 200, 'Tablet', true, false, true, 'NHIS-DRG-056', 40.00, true, true, 80, 'Sulfonamide combination', NOW(), NOW()),
('DRG-ANT-057', 'Nitrofurantoin Capsules 100mg', 'Antibiotics', 'Capsules', 'Capsule', '100mg', 'Oral Capsule', 'Macrodantin', 'Various', 120.00, 120.00, 150.00, 85.00, 400, 100, 'Capsule', true, false, true, 'NHIS-DRG-057', 95.00, true, true, 80, 'Urinary tract antibiotic', NOW(), NOW()),
('DRG-ANT-058', 'Vancomycin Injection 500mg', 'Antibiotics', 'Injections', 'Powder for Injection', '500mg', 'IV Injection', 'Vancocin', 'Various', 3500.00, 3500.00, 4500.00, 2500.00, 50, 20, 'Vial', true, true, true, 'NHIS-DRG-058', 2800.00, true, true, 80, 'Glycopeptide antibiotic for MRSA', NOW(), NOW()),
('DRG-ANT-059', 'Clindamycin Capsules 300mg', 'Antibiotics', 'Capsules', 'Capsule', '300mg', 'Oral Capsule', 'Dalacin C', 'Pfizer', 180.00, 180.00, 230.00, 130.00, 300, 80, 'Capsule', true, false, true, 'NHIS-DRG-059', 145.00, true, true, 80, 'Lincosamide antibiotic', NOW(), NOW()),

-- =====================================================
-- ANALGESICS
-- =====================================================
-- Non-Opioid Analgesics
('DRG-ANA-001', 'Paracetamol Tablets 500mg', 'Analgesics', 'Tablets', 'Tablet', '500mg', 'Oral Tablet', 'Panadol', 'GlaxoSmithKline', 15.00, 15.00, 20.00, 10.00, 2000, 500, 'Tablet', true, false, false, 'NHIS-DRG-100', 12.00, true, true, 80, 'Simple analgesic and antipyretic', NOW(), NOW()),
('DRG-ANA-002', 'Paracetamol Tablets 1g', 'Analgesics', 'Tablets', 'Tablet', '1g', 'Oral Tablet', 'Panadol Extra', 'GlaxoSmithKline', 30.00, 30.00, 40.00, 20.00, 1500, 400, 'Tablet', true, false, false, 'NHIS-DRG-101', 25.00, true, true, 80, 'High-strength paracetamol', NOW(), NOW()),
('DRG-ANA-003', 'Paracetamol Syrup 120mg/5ml', 'Analgesics', 'Syrups', 'Suspension', '120mg/5ml', 'Oral Suspension', 'Calpol', 'GlaxoSmithKline', 450.00, 450.00, 580.00, 320.00, 300, 80, 'Bottle', true, false, false, 'NHIS-DRG-102', 360.00, true, true, 80, 'Pediatric paracetamol', NOW(), NOW()),
('DRG-ANA-004', 'Paracetamol Infusion 1g/100ml', 'Analgesics', 'IV Infusions', 'Solution for Infusion', '1g/100ml', 'IV Infusion', 'Perfalgan', 'Bristol-Myers', 1800.00, 1800.00, 2300.00, 1300.00, 100, 30, 'Bottle', true, false, true, 'NHIS-DRG-103', 1440.00, true, true, 80, 'IV paracetamol', NOW(), NOW()),
('DRG-ANA-005', 'Paracetamol Suppository 125mg', 'Analgesics', 'Capsules', 'Suppository', '125mg', 'Rectal Suppository', 'Efferalgan', 'Bristol-Myers', 250.00, 250.00, 320.00, 180.00, 100, 30, 'Box', true, false, false, 'NHIS-DRG-104', 200.00, true, true, 80, 'Pediatric paracetamol suppository', NOW(), NOW()),

-- NSAIDs
('DRG-ANA-010', 'Ibuprofen Tablets 200mg', 'Analgesics', 'Tablets', 'Film-coated Tablet', '200mg', 'Oral Tablet', 'Brufen', 'Abbott', 25.00, 25.00, 30.00, 18.00, 1200, 300, 'Tablet', true, false, false, 'NHIS-DRG-110', 20.00, true, true, 80, 'NSAID', NOW(), NOW()),
('DRG-ANA-011', 'Ibuprofen Tablets 400mg', 'Analgesics', 'Tablets', 'Film-coated Tablet', '400mg', 'Oral Tablet', 'Brufen', 'Abbott', 40.00, 40.00, 50.00, 30.00, 1000, 250, 'Tablet', true, false, false, 'NHIS-DRG-111', 30.00, true, true, 80, 'NSAID', NOW(), NOW()),
('DRG-ANA-012', 'Ibuprofen Syrup 100mg/5ml', 'Analgesics', 'Syrups', 'Suspension', '100mg/5ml', 'Oral Suspension', 'Brufen', 'Abbott', 650.00, 650.00, 850.00, 480.00, 200, 50, 'Bottle', true, false, false, 'NHIS-DRG-112', 520.00, true, true, 80, 'Pediatric ibuprofen', NOW(), NOW()),
('DRG-ANA-013', 'Diclofenac Tablets 25mg', 'Analgesics', 'Tablets', 'Enteric-coated Tablet', '25mg', 'Oral Tablet', 'Voltaren', 'Novartis', 30.00, 30.00, 40.00, 22.00, 800, 200, 'Tablet', true, false, true, 'NHIS-DRG-113', 25.00, true, true, 80, 'NSAID', NOW(), NOW()),
('DRG-ANA-014', 'Diclofenac Tablets 50mg', 'Analgesics', 'Tablets', 'Enteric-coated Tablet', '50mg', 'Oral Tablet', 'Voltaren', 'Novartis', 45.00, 45.00, 60.00, 32.00, 700, 180, 'Tablet', true, false, true, 'NHIS-DRG-114', 36.00, true, true, 80, 'NSAID', NOW(), NOW()),
('DRG-ANA-015', 'Diclofenac SR Tablets 100mg', 'Analgesics', 'Tablets', 'Modified-release Tablet', '100mg', 'Oral Tablet', 'Voltaren SR', 'Novartis', 120.00, 120.00, 150.00, 85.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-115', 95.00, true, true, 80, 'Sustained-release diclofenac', NOW(), NOW()),
('DRG-ANA-016', 'Diclofenac Injection 75mg/3ml', 'Analgesics', 'Injections', 'Solution for Injection', '75mg/3ml', 'IM Injection', 'Voltaren', 'Novartis', 180.00, 180.00, 230.00, 130.00, 400, 100, 'Ampoule', true, false, true, 'NHIS-DRG-116', 145.00, true, true, 80, 'IM diclofenac', NOW(), NOW()),
('DRG-ANA-017', 'Diclofenac Gel 1%', 'Analgesics', 'Creams/Ointments', 'Gel', '1%', 'Topical Gel', 'Voltaren Emulgel', 'Novartis', 850.00, 850.00, 1100.00, 620.00, 150, 40, 'Tube', true, false, false, 'NHIS-DRG-117', 680.00, true, true, 80, 'Topical diclofenac', NOW(), NOW()),
('DRG-ANA-018', 'Piroxicam Capsules 20mg', 'Analgesics', 'Capsules', 'Capsule', '20mg', 'Oral Capsule', 'Feldene', 'Pfizer', 80.00, 80.00, 100.00, 55.00, 500, 120, 'Capsule', true, false, true, 'NHIS-DRG-118', 65.00, true, true, 80, 'Long-acting NSAID', NOW(), NOW()),
('DRG-ANA-019', 'Meloxicam Tablets 7.5mg', 'Analgesics', 'Tablets', 'Tablet', '7.5mg', 'Oral Tablet', 'Mobic', 'Boehringer', 150.00, 150.00, 195.00, 110.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-119', 120.00, true, true, 80, 'COX-2 preferential NSAID', NOW(), NOW()),
('DRG-ANA-020', 'Meloxicam Tablets 15mg', 'Analgesics', 'Tablets', 'Tablet', '15mg', 'Oral Tablet', 'Mobic', 'Boehringer', 220.00, 220.00, 280.00, 160.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-120', 175.00, true, true, 80, 'COX-2 preferential NSAID', NOW(), NOW()),
('DRG-ANA-021', 'Celecoxib Capsules 100mg', 'Analgesics', 'Capsules', 'Capsule', '100mg', 'Oral Capsule', 'Celebrex', 'Pfizer', 180.00, 180.00, 230.00, 130.00, 250, 60, 'Capsule', true, false, true, 'NHIS-DRG-121', 145.00, true, true, 80, 'COX-2 selective NSAID', NOW(), NOW()),
('DRG-ANA-022', 'Celecoxib Capsules 200mg', 'Analgesics', 'Capsules', 'Capsule', '200mg', 'Oral Capsule', 'Celebrex', 'Pfizer', 280.00, 280.00, 360.00, 200.00, 200, 50, 'Capsule', true, false, true, 'NHIS-DRG-122', 225.00, true, true, 80, 'COX-2 selective NSAID', NOW(), NOW()),
('DRG-ANA-023', 'Ketorolac Injection 30mg/ml', 'Analgesics', 'Injections', 'Solution for Injection', '30mg/ml', 'IM/IV Injection', 'Toradol', 'Roche', 350.00, 350.00, 450.00, 250.00, 200, 50, 'Ampoule', true, false, true, 'NHIS-DRG-123', 280.00, true, true, 80, 'Potent injectable NSAID', NOW(), NOW()),

-- Opioid Analgesics
('DRG-ANA-030', 'Tramadol Capsules 50mg', 'Analgesics', 'Capsules', 'Capsule', '50mg', 'Oral Capsule', 'Tramal', 'Grunenthal', 120.00, 120.00, 150.00, 85.00, 400, 100, 'Capsule', true, true, true, 'NHIS-DRG-130', 95.00, true, true, 80, 'Weak opioid analgesic', NOW(), NOW()),
('DRG-ANA-031', 'Tramadol Injection 100mg/2ml', 'Analgesics', 'Injections', 'Solution for Injection', '100mg/2ml', 'IM/IV Injection', 'Tramal', 'Grunenthal', 280.00, 280.00, 360.00, 200.00, 200, 50, 'Ampoule', true, true, true, 'NHIS-DRG-131', 225.00, true, true, 80, 'Injectable tramadol', NOW(), NOW()),
('DRG-ANA-032', 'Codeine Phosphate Tablets 30mg', 'Analgesics', 'Tablets', 'Tablet', '30mg', 'Oral Tablet', 'Codeine', 'Various', 80.00, 80.00, 100.00, 55.00, 200, 50, 'Tablet', true, true, true, 'NHIS-DRG-132', 65.00, true, true, 80, 'Weak opioid for mild-moderate pain', NOW(), NOW()),
('DRG-ANA-033', 'Morphine Injection 10mg/ml', 'Analgesics', 'Injections', 'Solution for Injection', '10mg/ml', 'SC/IM/IV Injection', 'Morphine', 'Various', 450.00, 450.00, 580.00, 320.00, 100, 30, 'Ampoule', true, true, true, 'NHIS-DRG-133', 360.00, true, true, 80, 'Strong opioid for severe pain', NOW(), NOW()),
('DRG-ANA-034', 'Pethidine Injection 50mg/ml', 'Analgesics', 'Injections', 'Solution for Injection', '50mg/ml', 'IM Injection', 'Pethidine', 'Various', 380.00, 380.00, 480.00, 280.00, 80, 25, 'Ampoule', true, true, true, 'NHIS-DRG-134', 305.00, true, true, 80, 'Opioid for acute pain', NOW(), NOW()),
('DRG-ANA-035', 'Pentazocine Injection 30mg/ml', 'Analgesics', 'Injections', 'Solution for Injection', '30mg/ml', 'IM/IV Injection', 'Fortwin', 'Sanofi', 350.00, 350.00, 450.00, 250.00, 100, 30, 'Ampoule', true, true, true, 'NHIS-DRG-135', 280.00, true, true, 80, 'Partial opioid agonist', NOW(), NOW()),

-- =====================================================
-- ANTIMALARIALS
-- =====================================================
('DRG-MAL-001', 'Artemether/Lumefantrine Tablets (20/120mg)', 'Antimalarials', 'Tablets', 'Dispersible Tablet', '20/120mg', 'Oral Tablet', 'Coartem', 'Novartis', 180.00, 180.00, 230.00, 130.00, 500, 150, 'Pack', true, false, true, 'NHIS-DRG-200', 145.00, true, true, 100, 'First-line ACT for uncomplicated malaria', NOW(), NOW()),
('DRG-MAL-002', 'Artemether/Lumefantrine Tablets (80/480mg)', 'Antimalarials', 'Tablets', 'Tablet', '80/480mg', 'Oral Tablet', 'Coartem', 'Novartis', 650.00, 650.00, 850.00, 480.00, 400, 120, 'Pack', true, false, true, 'NHIS-DRG-201', 520.00, true, true, 100, 'Adult ACT for uncomplicated malaria', NOW(), NOW()),
('DRG-MAL-003', 'Artemether Injection 80mg/ml', 'Antimalarials', 'Injections', 'Oily Solution', '80mg/ml', 'IM Injection', 'Artesunate', 'Various', 450.00, 450.00, 580.00, 320.00, 200, 60, 'Ampoule', true, false, true, 'NHIS-DRG-202', 360.00, true, true, 100, 'Severe malaria (alternative)', NOW(), NOW()),
('DRG-MAL-004', 'Artesunate Injection 60mg', 'Antimalarials', 'Injections', 'Powder for Injection', '60mg', 'IV/IM Injection', 'Artesunate', 'Guilin', 850.00, 850.00, 1100.00, 620.00, 200, 60, 'Vial', true, false, true, 'NHIS-DRG-203', 680.00, true, true, 100, 'First-line for severe malaria', NOW(), NOW()),
('DRG-MAL-005', 'Artesunate Tablets 50mg', 'Antimalarials', 'Tablets', 'Tablet', '50mg', 'Oral Tablet', 'Artesunate', 'Various', 80.00, 80.00, 100.00, 55.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-204', 65.00, true, true, 100, 'ACT component', NOW(), NOW()),
('DRG-MAL-006', 'Artesunate Suppository 100mg', 'Antimalarials', 'Capsules', 'Suppository', '100mg', 'Rectal Suppository', 'Artesunate', 'Various', 350.00, 350.00, 450.00, 250.00, 100, 30, 'Box', true, false, true, 'NHIS-DRG-205', 280.00, true, true, 100, 'Pre-referral severe malaria', NOW(), NOW()),
('DRG-MAL-007', 'Dihydroartemisinin/Piperaquine Tablets', 'Antimalarials', 'Tablets', 'Film-coated Tablet', '40/320mg', 'Oral Tablet', 'Duo-Cotecxin', 'Holley', 750.00, 750.00, 950.00, 550.00, 300, 80, 'Pack', true, false, true, 'NHIS-DRG-206', 600.00, true, true, 100, 'Alternative ACT', NOW(), NOW()),
('DRG-MAL-008', 'Quinine Sulphate Tablets 300mg', 'Antimalarials', 'Tablets', 'Film-coated Tablet', '300mg', 'Oral Tablet', 'Quinine', 'Various', 60.00, 60.00, 75.00, 45.00, 500, 150, 'Tablet', true, false, true, 'NHIS-DRG-207', 50.00, true, true, 100, 'Alternative for complicated malaria', NOW(), NOW()),
('DRG-MAL-009', 'Quinine Injection 300mg/ml', 'Antimalarials', 'Injections', 'Solution for Injection', '300mg/ml', 'IV Infusion', 'Quinine', 'Various', 280.00, 280.00, 360.00, 200.00, 200, 60, 'Ampoule', true, false, true, 'NHIS-DRG-208', 225.00, true, true, 100, 'Severe malaria (alternative)', NOW(), NOW()),
('DRG-MAL-010', 'Amodiaquine Tablets 200mg', 'Antimalarials', 'Tablets', 'Tablet', '200mg', 'Oral Tablet', 'Camoquin', 'Parke-Davis', 40.00, 40.00, 50.00, 30.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-209', 30.00, true, true, 100, 'ACT partner drug', NOW(), NOW()),
('DRG-MAL-011', 'Sulfadoxine/Pyrimethamine Tablets', 'Antimalarials', 'Tablets', 'Tablet', '500/25mg', 'Oral Tablet', 'Fansidar', 'Roche', 120.00, 120.00, 150.00, 85.00, 300, 80, 'Pack', true, false, true, 'NHIS-DRG-210', 95.00, true, true, 100, 'IPTp in pregnancy', NOW(), NOW()),

-- =====================================================
-- ANTIHYPERTENSIVES
-- =====================================================
-- ACE Inhibitors
('DRG-HTN-001', 'Lisinopril Tablets 5mg', 'Antihypertensives', 'Tablets', 'Tablet', '5mg', 'Oral Tablet', 'Zestril', 'AstraZeneca', 80.00, 80.00, 100.00, 55.00, 500, 120, 'Tablet', true, false, true, 'NHIS-DRG-300', 65.00, true, true, 80, 'ACE inhibitor', NOW(), NOW()),
('DRG-HTN-002', 'Lisinopril Tablets 10mg', 'Antihypertensives', 'Tablets', 'Tablet', '10mg', 'Oral Tablet', 'Zestril', 'AstraZeneca', 120.00, 120.00, 150.00, 85.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-301', 95.00, true, true, 80, 'ACE inhibitor', NOW(), NOW()),
('DRG-HTN-003', 'Lisinopril Tablets 20mg', 'Antihypertensives', 'Tablets', 'Tablet', '20mg', 'Oral Tablet', 'Zestril', 'AstraZeneca', 180.00, 180.00, 230.00, 130.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-302', 145.00, true, true, 80, 'ACE inhibitor', NOW(), NOW()),
('DRG-HTN-004', 'Enalapril Tablets 5mg', 'Antihypertensives', 'Tablets', 'Tablet', '5mg', 'Oral Tablet', 'Renitec', 'MSD', 80.00, 80.00, 100.00, 55.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-303', 65.00, true, true, 80, 'ACE inhibitor', NOW(), NOW()),
('DRG-HTN-005', 'Enalapril Tablets 10mg', 'Antihypertensives', 'Tablets', 'Tablet', '10mg', 'Oral Tablet', 'Renitec', 'MSD', 120.00, 120.00, 150.00, 85.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-304', 95.00, true, true, 80, 'ACE inhibitor', NOW(), NOW()),
('DRG-HTN-006', 'Ramipril Capsules 2.5mg', 'Antihypertensives', 'Capsules', 'Capsule', '2.5mg', 'Oral Capsule', 'Tritace', 'Sanofi', 150.00, 150.00, 195.00, 110.00, 300, 80, 'Capsule', true, false, true, 'NHIS-DRG-305', 120.00, true, true, 80, 'ACE inhibitor', NOW(), NOW()),
('DRG-HTN-007', 'Ramipril Capsules 5mg', 'Antihypertensives', 'Capsules', 'Capsule', '5mg', 'Oral Capsule', 'Tritace', 'Sanofi', 220.00, 220.00, 280.00, 160.00, 250, 60, 'Capsule', true, false, true, 'NHIS-DRG-306', 175.00, true, true, 80, 'ACE inhibitor', NOW(), NOW()),

-- ARBs (Angiotensin II Receptor Blockers)
('DRG-HTN-010', 'Losartan Tablets 25mg', 'Antihypertensives', 'Tablets', 'Film-coated Tablet', '25mg', 'Oral Tablet', 'Cozaar', 'MSD', 100.00, 100.00, 130.00, 70.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-310', 80.00, true, true, 80, 'ARB', NOW(), NOW()),
('DRG-HTN-011', 'Losartan Tablets 50mg', 'Antihypertensives', 'Tablets', 'Film-coated Tablet', '50mg', 'Oral Tablet', 'Cozaar', 'MSD', 150.00, 150.00, 195.00, 110.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-311', 120.00, true, true, 80, 'ARB', NOW(), NOW()),
('DRG-HTN-012', 'Losartan Tablets 100mg', 'Antihypertensives', 'Tablets', 'Film-coated Tablet', '100mg', 'Oral Tablet', 'Cozaar', 'MSD', 250.00, 250.00, 320.00, 180.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-312', 200.00, true, true, 80, 'ARB', NOW(), NOW()),
('DRG-HTN-013', 'Valsartan Tablets 80mg', 'Antihypertensives', 'Tablets', 'Film-coated Tablet', '80mg', 'Oral Tablet', 'Diovan', 'Novartis', 180.00, 180.00, 230.00, 130.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-313', 145.00, true, true, 80, 'ARB', NOW(), NOW()),
('DRG-HTN-014', 'Valsartan Tablets 160mg', 'Antihypertensives', 'Tablets', 'Film-coated Tablet', '160mg', 'Oral Tablet', 'Diovan', 'Novartis', 320.00, 320.00, 400.00, 230.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-314', 255.00, true, true, 80, 'ARB', NOW(), NOW()),
('DRG-HTN-015', 'Telmisartan Tablets 40mg', 'Antihypertensives', 'Tablets', 'Tablet', '40mg', 'Oral Tablet', 'Micardis', 'Boehringer', 200.00, 200.00, 260.00, 145.00, 280, 70, 'Tablet', true, false, true, 'NHIS-DRG-315', 160.00, true, true, 80, 'ARB', NOW(), NOW()),
('DRG-HTN-016', 'Telmisartan Tablets 80mg', 'Antihypertensives', 'Tablets', 'Tablet', '80mg', 'Oral Tablet', 'Micardis', 'Boehringer', 350.00, 350.00, 450.00, 250.00, 200, 50, 'Tablet', true, false, true, 'NHIS-DRG-316', 280.00, true, true, 80, 'ARB', NOW(), NOW()),

-- Calcium Channel Blockers
('DRG-HTN-020', 'Amlodipine Tablets 5mg', 'Antihypertensives', 'Tablets', 'Tablet', '5mg', 'Oral Tablet', 'Norvasc', 'Pfizer', 80.00, 80.00, 100.00, 55.00, 600, 150, 'Tablet', true, false, true, 'NHIS-DRG-320', 65.00, true, true, 80, 'CCB', NOW(), NOW()),
('DRG-HTN-021', 'Amlodipine Tablets 10mg', 'Antihypertensives', 'Tablets', 'Tablet', '10mg', 'Oral Tablet', 'Norvasc', 'Pfizer', 120.00, 120.00, 150.00, 85.00, 500, 120, 'Tablet', true, false, true, 'NHIS-DRG-321', 95.00, true, true, 80, 'CCB', NOW(), NOW()),
('DRG-HTN-022', 'Nifedipine SR Tablets 20mg', 'Antihypertensives', 'Tablets', 'Modified-release Tablet', '20mg', 'Oral Tablet', 'Adalat', 'Bayer', 80.00, 80.00, 100.00, 55.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-322', 65.00, true, true, 80, 'CCB', NOW(), NOW()),
('DRG-HTN-023', 'Nifedipine XL Tablets 30mg', 'Antihypertensives', 'Tablets', 'Extended-release Tablet', '30mg', 'Oral Tablet', 'Adalat LA', 'Bayer', 150.00, 150.00, 195.00, 110.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-323', 120.00, true, true, 80, 'CCB', NOW(), NOW()),
('DRG-HTN-024', 'Felodipine ER Tablets 5mg', 'Antihypertensives', 'Tablets', 'Extended-release Tablet', '5mg', 'Oral Tablet', 'Plendil', 'AstraZeneca', 180.00, 180.00, 230.00, 130.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-324', 145.00, true, true, 80, 'CCB', NOW(), NOW()),

-- Diuretics
('DRG-HTN-030', 'Hydrochlorothiazide Tablets 25mg', 'Antihypertensives', 'Tablets', 'Tablet', '25mg', 'Oral Tablet', 'Esidrex', 'Novartis', 30.00, 30.00, 40.00, 20.00, 800, 200, 'Tablet', true, false, true, 'NHIS-DRG-330', 25.00, true, true, 80, 'Thiazide diuretic', NOW(), NOW()),
('DRG-HTN-031', 'Furosemide Tablets 40mg', 'Antihypertensives', 'Tablets', 'Tablet', '40mg', 'Oral Tablet', 'Lasix', 'Sanofi', 25.00, 25.00, 30.00, 18.00, 1000, 250, 'Tablet', true, false, true, 'NHIS-DRG-331', 20.00, true, true, 80, 'Loop diuretic', NOW(), NOW()),
('DRG-HTN-032', 'Furosemide Injection 20mg/2ml', 'Antihypertensives', 'Injections', 'Solution for Injection', '20mg/2ml', 'IV/IM Injection', 'Lasix', 'Sanofi', 120.00, 120.00, 150.00, 85.00, 500, 120, 'Ampoule', true, false, true, 'NHIS-DRG-332', 95.00, true, true, 80, 'IV loop diuretic', NOW(), NOW()),
('DRG-HTN-033', 'Spironolactone Tablets 25mg', 'Antihypertensives', 'Tablets', 'Tablet', '25mg', 'Oral Tablet', 'Aldactone', 'Pfizer', 60.00, 60.00, 75.00, 45.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-333', 50.00, true, true, 80, 'Potassium-sparing diuretic', NOW(), NOW()),
('DRG-HTN-034', 'Indapamide SR Tablets 1.5mg', 'Antihypertensives', 'Tablets', 'Modified-release Tablet', '1.5mg', 'Oral Tablet', 'Natrilix SR', 'Servier', 120.00, 120.00, 150.00, 85.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-334', 95.00, true, true, 80, 'Thiazide-like diuretic', NOW(), NOW()),

-- Beta-Blockers
('DRG-HTN-040', 'Atenolol Tablets 50mg', 'Antihypertensives', 'Tablets', 'Tablet', '50mg', 'Oral Tablet', 'Tenormin', 'AstraZeneca', 50.00, 50.00, 65.00, 35.00, 600, 150, 'Tablet', true, false, true, 'NHIS-DRG-340', 40.00, true, true, 80, 'Beta-blocker', NOW(), NOW()),
('DRG-HTN-041', 'Atenolol Tablets 100mg', 'Antihypertensives', 'Tablets', 'Tablet', '100mg', 'Oral Tablet', 'Tenormin', 'AstraZeneca', 80.00, 80.00, 100.00, 55.00, 500, 120, 'Tablet', true, false, true, 'NHIS-DRG-341', 65.00, true, true, 80, 'Beta-blocker', NOW(), NOW()),
('DRG-HTN-042', 'Bisoprolol Tablets 2.5mg', 'Antihypertensives', 'Tablets', 'Tablet', '2.5mg', 'Oral Tablet', 'Concor', 'Merck', 100.00, 100.00, 130.00, 70.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-342', 80.00, true, true, 80, 'Cardioselective beta-blocker', NOW(), NOW()),
('DRG-HTN-043', 'Bisoprolol Tablets 5mg', 'Antihypertensives', 'Tablets', 'Tablet', '5mg', 'Oral Tablet', 'Concor', 'Merck', 150.00, 150.00, 195.00, 110.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-343', 120.00, true, true, 80, 'Cardioselective beta-blocker', NOW(), NOW()),
('DRG-HTN-044', 'Bisoprolol Tablets 10mg', 'Antihypertensives', 'Tablets', 'Tablet', '10mg', 'Oral Tablet', 'Concor', 'Merck', 220.00, 220.00, 280.00, 160.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-344', 175.00, true, true, 80, 'Cardioselective beta-blocker', NOW(), NOW()),
('DRG-HTN-045', 'Carvedilol Tablets 6.25mg', 'Antihypertensives', 'Tablets', 'Tablet', '6.25mg', 'Oral Tablet', 'Dilatrend', 'Roche', 120.00, 120.00, 150.00, 85.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-345', 95.00, true, true, 80, 'Alpha/Beta-blocker', NOW(), NOW()),
('DRG-HTN-046', 'Carvedilol Tablets 12.5mg', 'Antihypertensives', 'Tablets', 'Tablet', '12.5mg', 'Oral Tablet', 'Dilatrend', 'Roche', 180.00, 180.00, 230.00, 130.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-346', 145.00, true, true, 80, 'Alpha/Beta-blocker', NOW(), NOW()),
('DRG-HTN-047', 'Carvedilol Tablets 25mg', 'Antihypertensives', 'Tablets', 'Tablet', '25mg', 'Oral Tablet', 'Dilatrend', 'Roche', 280.00, 280.00, 360.00, 200.00, 200, 50, 'Tablet', true, false, true, 'NHIS-DRG-347', 225.00, true, true, 80, 'Alpha/Beta-blocker', NOW(), NOW()),

-- =====================================================
-- ANTIDIABETICS
-- =====================================================
-- Biguanides
('DRG-DIA-001', 'Metformin Tablets 500mg', 'Antidiabetics', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Glucophage', 'Merck', 40.00, 40.00, 50.00, 30.00, 800, 200, 'Tablet', true, false, true, 'NHIS-DRG-400', 30.00, true, true, 80, 'First-line Type 2 diabetes', NOW(), NOW()),
('DRG-DIA-002', 'Metformin Tablets 850mg', 'Antidiabetics', 'Tablets', 'Film-coated Tablet', '850mg', 'Oral Tablet', 'Glucophage', 'Merck', 60.00, 60.00, 75.00, 45.00, 700, 180, 'Tablet', true, false, true, 'NHIS-DRG-401', 50.00, true, true, 80, 'First-line Type 2 diabetes', NOW(), NOW()),
('DRG-DIA-003', 'Metformin Tablets 1000mg', 'Antidiabetics', 'Tablets', 'Film-coated Tablet', '1000mg', 'Oral Tablet', 'Glucophage', 'Merck', 80.00, 80.00, 100.00, 55.00, 600, 150, 'Tablet', true, false, true, 'NHIS-DRG-402', 65.00, true, true, 80, 'First-line Type 2 diabetes', NOW(), NOW()),
('DRG-DIA-004', 'Metformin XR Tablets 500mg', 'Antidiabetics', 'Tablets', 'Extended-release Tablet', '500mg', 'Oral Tablet', 'Glucophage XR', 'Merck', 80.00, 80.00, 100.00, 55.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-403', 65.00, true, true, 80, 'Extended-release metformin', NOW(), NOW()),

-- Sulfonylureas
('DRG-DIA-010', 'Glibenclamide Tablets 5mg', 'Antidiabetics', 'Tablets', 'Tablet', '5mg', 'Oral Tablet', 'Daonil', 'Sanofi', 30.00, 30.00, 40.00, 20.00, 600, 150, 'Tablet', true, false, true, 'NHIS-DRG-410', 25.00, true, true, 80, 'Sulfonylurea', NOW(), NOW()),
('DRG-DIA-011', 'Gliclazide Tablets 80mg', 'Antidiabetics', 'Tablets', 'Tablet', '80mg', 'Oral Tablet', 'Diamicron', 'Servier', 80.00, 80.00, 100.00, 55.00, 500, 120, 'Tablet', true, false, true, 'NHIS-DRG-411', 65.00, true, true, 80, 'Sulfonylurea', NOW(), NOW()),
('DRG-DIA-012', 'Gliclazide MR Tablets 30mg', 'Antidiabetics', 'Tablets', 'Modified-release Tablet', '30mg', 'Oral Tablet', 'Diamicron MR', 'Servier', 120.00, 120.00, 150.00, 85.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-412', 95.00, true, true, 80, 'Modified-release sulfonylurea', NOW(), NOW()),
('DRG-DIA-013', 'Gliclazide MR Tablets 60mg', 'Antidiabetics', 'Tablets', 'Modified-release Tablet', '60mg', 'Oral Tablet', 'Diamicron MR', 'Servier', 180.00, 180.00, 230.00, 130.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-413', 145.00, true, true, 80, 'Modified-release sulfonylurea', NOW(), NOW()),
('DRG-DIA-014', 'Glimepiride Tablets 1mg', 'Antidiabetics', 'Tablets', 'Tablet', '1mg', 'Oral Tablet', 'Amaryl', 'Sanofi', 80.00, 80.00, 100.00, 55.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-414', 65.00, true, true, 80, 'Sulfonylurea', NOW(), NOW()),
('DRG-DIA-015', 'Glimepiride Tablets 2mg', 'Antidiabetics', 'Tablets', 'Tablet', '2mg', 'Oral Tablet', 'Amaryl', 'Sanofi', 120.00, 120.00, 150.00, 85.00, 350, 80, 'Tablet', true, false, true, 'NHIS-DRG-415', 95.00, true, true, 80, 'Sulfonylurea', NOW(), NOW()),
('DRG-DIA-016', 'Glimepiride Tablets 4mg', 'Antidiabetics', 'Tablets', 'Tablet', '4mg', 'Oral Tablet', 'Amaryl', 'Sanofi', 180.00, 180.00, 230.00, 130.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-416', 145.00, true, true, 80, 'Sulfonylurea', NOW(), NOW()),

-- Insulins
('DRG-DIA-020', 'Insulin Regular (Soluble) 100IU/ml', 'Antidiabetics', 'Injections', 'Solution for Injection', '100IU/ml', 'SC Injection', 'Actrapid', 'Novo Nordisk', 2500.00, 2500.00, 3200.00, 1800.00, 80, 25, 'Vial', true, true, true, 'NHIS-DRG-420', 2000.00, true, true, 80, 'Short-acting insulin', NOW(), NOW()),
('DRG-DIA-021', 'Insulin NPH (Isophane) 100IU/ml', 'Antidiabetics', 'Injections', 'Suspension for Injection', '100IU/ml', 'SC Injection', 'Insulatard', 'Novo Nordisk', 2500.00, 2500.00, 3200.00, 1800.00, 80, 25, 'Vial', true, true, true, 'NHIS-DRG-421', 2000.00, true, true, 80, 'Intermediate-acting insulin', NOW(), NOW()),
('DRG-DIA-022', 'Insulin Mixed 30/70 100IU/ml', 'Antidiabetics', 'Injections', 'Suspension for Injection', '100IU/ml', 'SC Injection', 'Mixtard 30', 'Novo Nordisk', 2800.00, 2800.00, 3600.00, 2000.00, 70, 20, 'Vial', true, true, true, 'NHIS-DRG-422', 2250.00, true, true, 80, 'Premixed insulin', NOW(), NOW()),
('DRG-DIA-023', 'Insulin Glargine 100IU/ml', 'Antidiabetics', 'Injections', 'Solution for Injection', '100IU/ml', 'SC Injection', 'Lantus', 'Sanofi', 5500.00, 5500.00, 7000.00, 4000.00, 50, 15, 'Vial', true, true, true, 'NHIS-DRG-423', 4400.00, true, true, 80, 'Long-acting insulin analog', NOW(), NOW()),
('DRG-DIA-024', 'Insulin Aspart 100IU/ml', 'Antidiabetics', 'Injections', 'Solution for Injection', '100IU/ml', 'SC Injection', 'NovoRapid', 'Novo Nordisk', 4500.00, 4500.00, 5800.00, 3200.00, 50, 15, 'Vial', true, true, true, 'NHIS-DRG-424', 3600.00, true, true, 80, 'Rapid-acting insulin analog', NOW(), NOW()),
('DRG-DIA-025', 'Insulin Glargine Pen 100IU/ml', 'Antidiabetics', 'Injections', 'Solution for Injection', '100IU/ml', 'SC Injection Pen', 'Lantus SoloStar', 'Sanofi', 8500.00, 8500.00, 11000.00, 6200.00, 30, 10, 'Pen', true, true, true, 'NHIS-DRG-425', 6800.00, true, true, 80, 'Long-acting insulin pen', NOW(), NOW()),

-- =====================================================
-- ANTIVIRALS
-- =====================================================
('DRG-AVR-001', 'Acyclovir Tablets 200mg', 'Antivirals', 'Tablets', 'Tablet', '200mg', 'Oral Tablet', 'Zovirax', 'GlaxoSmithKline', 80.00, 80.00, 100.00, 55.00, 400, 100, 'Tablet', true, false, true, 'NHIS-DRG-500', 65.00, true, true, 80, 'Antiviral for herpes', NOW(), NOW()),
('DRG-AVR-002', 'Acyclovir Tablets 400mg', 'Antivirals', 'Tablets', 'Tablet', '400mg', 'Oral Tablet', 'Zovirax', 'GlaxoSmithKline', 150.00, 150.00, 195.00, 110.00, 300, 80, 'Tablet', true, false, true, 'NHIS-DRG-501', 120.00, true, true, 80, 'Antiviral for herpes', NOW(), NOW()),
('DRG-AVR-003', 'Acyclovir Tablets 800mg', 'Antivirals', 'Tablets', 'Tablet', '800mg', 'Oral Tablet', 'Zovirax', 'GlaxoSmithKline', 280.00, 280.00, 360.00, 200.00, 200, 50, 'Tablet', true, false, true, 'NHIS-DRG-502', 225.00, true, true, 80, 'Antiviral for herpes zoster', NOW(), NOW()),
('DRG-AVR-004', 'Acyclovir Cream 5%', 'Antivirals', 'Creams/Ointments', 'Cream', '5%', 'Topical Cream', 'Zovirax', 'GlaxoSmithKline', 850.00, 850.00, 1100.00, 620.00, 100, 30, 'Tube', true, false, false, 'NHIS-DRG-503', 680.00, true, true, 80, 'Topical antiviral', NOW(), NOW()),
('DRG-AVR-005', 'Valacyclovir Tablets 500mg', 'Antivirals', 'Tablets', 'Film-coated Tablet', '500mg', 'Oral Tablet', 'Valtrex', 'GlaxoSmithKline', 450.00, 450.00, 580.00, 320.00, 150, 40, 'Tablet', true, false, true, 'NHIS-DRG-504', 360.00, true, true, 80, 'Prodrug of acyclovir', NOW(), NOW()),
('DRG-AVR-006', 'Oseltamivir Capsules 75mg', 'Antivirals', 'Capsules', 'Capsule', '75mg', 'Oral Capsule', 'Tamiflu', 'Roche', 650.00, 650.00, 850.00, 480.00, 100, 30, 'Capsule', true, false, true, 'NHIS-DRG-505', 520.00, true, true, 80, 'Neuraminidase inhibitor for influenza', NOW(), NOW()),

-- =====================================================
-- ANTIFUNGALS
-- =====================================================
('DRG-AFN-001', 'Fluconazole Capsules 50mg', 'Antifungals', 'Capsules', 'Capsule', '50mg', 'Oral Capsule', 'Diflucan', 'Pfizer', 120.00, 120.00, 150.00, 85.00, 300, 80, 'Capsule', true, false, true, 'NHIS-DRG-600', 95.00, true, true, 80, 'Triazole antifungal', NOW(), NOW()),
('DRG-AFN-002', 'Fluconazole Capsules 150mg', 'Antifungals', 'Capsules', 'Capsule', '150mg', 'Oral Capsule', 'Diflucan', 'Pfizer', 280.00, 280.00, 360.00, 200.00, 250, 60, 'Capsule', true, false, true, 'NHIS-DRG-601', 225.00, true, true, 80, 'Single-dose for vaginal candidiasis', NOW(), NOW()),
('DRG-AFN-003', 'Fluconazole Capsules 200mg', 'Antifungals', 'Capsules', 'Capsule', '200mg', 'Oral Capsule', 'Diflucan', 'Pfizer', 380.00, 380.00, 480.00, 280.00, 200, 50, 'Capsule', true, false, true, 'NHIS-DRG-602', 305.00, true, true, 80, 'Triazole antifungal', NOW(), NOW()),
('DRG-AFN-004', 'Ketoconazole Tablets 200mg', 'Antifungals', 'Tablets', 'Tablet', '200mg', 'Oral Tablet', 'Nizoral', 'Janssen', 150.00, 150.00, 195.00, 110.00, 250, 60, 'Tablet', true, false, true, 'NHIS-DRG-603', 120.00, true, true, 80, 'Imidazole antifungal', NOW(), NOW()),
('DRG-AFN-005', 'Ketoconazole Shampoo 2%', 'Antifungals', 'Syrups', 'Shampoo', '2%', 'Topical Shampoo', 'Nizoral', 'Janssen', 1200.00, 1200.00, 1550.00, 880.00, 80, 25, 'Bottle', true, false, false, 'NHIS-DRG-604', 960.00, true, true, 80, 'Antifungal shampoo', NOW(), NOW()),
('DRG-AFN-006', 'Clotrimazole Cream 1%', 'Antifungals', 'Creams/Ointments', 'Cream', '1%', 'Topical Cream', 'Canesten', 'Bayer', 450.00, 450.00, 580.00, 320.00, 150, 40, 'Tube', true, false, false, 'NHIS-DRG-605', 360.00, true, true, 80, 'Topical imidazole antifungal', NOW(), NOW()),
('DRG-AFN-007', 'Clotrimazole Pessary 500mg', 'Antifungals', 'Tablets', 'Pessary', '500mg', 'Vaginal Pessary', 'Canesten', 'Bayer', 650.00, 650.00, 850.00, 480.00, 100, 30, 'Pessary', true, false, true, 'NHIS-DRG-606', 520.00, true, true, 80, 'Vaginal antifungal', NOW(), NOW()),
('DRG-AFN-008', 'Miconazole Cream 2%', 'Antifungals', 'Creams/Ointments', 'Cream', '2%', 'Topical Cream', 'Daktarin', 'Janssen', 380.00, 380.00, 480.00, 280.00, 120, 35, 'Tube', true, false, false, 'NHIS-DRG-607', 305.00, true, true, 80, 'Topical imidazole antifungal', NOW(), NOW()),
('DRG-AFN-009', 'Miconazole Oral Gel 2%', 'Antifungals', 'Syrups', 'Oral Gel', '2%', 'Oral Gel', 'Daktarin', 'Janssen', 750.00, 750.00, 950.00, 550.00, 100, 30, 'Tube', true, false, false, 'NHIS-DRG-608', 600.00, true, true, 80, 'Oral candidiasis treatment', NOW(), NOW()),
('DRG-AFN-010', 'Nystatin Suspension 100,000IU/ml', 'Antifungals', 'Syrups', 'Oral Suspension', '100,000IU/ml', 'Oral Suspension', 'Mycostatin', 'Bristol-Myers', 650.00, 650.00, 850.00, 480.00, 100, 30, 'Bottle', true, false, true, 'NHIS-DRG-609', 520.00, true, true, 80, 'Oral candidiasis', NOW(), NOW()),
('DRG-AFN-011', 'Terbinafine Tablets 250mg', 'Antifungals', 'Tablets', 'Tablet', '250mg', 'Oral Tablet', 'Lamisil', 'Novartis', 350.00, 350.00, 450.00, 250.00, 150, 40, 'Tablet', true, false, true, 'NHIS-DRG-610', 280.00, true, true, 80, 'Allylamine antifungal for dermatophytes', NOW(), NOW()),
('DRG-AFN-012', 'Terbinafine Cream 1%', 'Antifungals', 'Creams/Ointments', 'Cream', '1%', 'Topical Cream', 'Lamisil', 'Novartis', 650.00, 650.00, 850.00, 480.00, 100, 30, 'Tube', true, false, false, 'NHIS-DRG-611', 520.00, true, true, 80, 'Topical allylamine antifungal', NOW(), NOW()),
('DRG-AFN-013', 'Griseofulvin Tablets 500mg', 'Antifungals', 'Tablets', 'Tablet', '500mg', 'Oral Tablet', 'Grisovin', 'GlaxoSmithKline', 120.00, 120.00, 150.00, 85.00, 200, 50, 'Tablet', true, false, true, 'NHIS-DRG-612', 95.00, true, true, 80, 'Antifungal for tinea capitis', NOW(), NOW()),

-- =====================================================
-- IV FLUIDS
-- =====================================================
('DRG-IVF-001', 'Normal Saline 0.9% 500ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '0.9%', 'IV Infusion', 'NS', 'Various', 350.00, 350.00, 450.00, 250.00, 400, 100, 'Bottle', true, false, true, 'NHIS-DRG-700', 280.00, true, true, 80, 'Isotonic crystalloid', NOW(), NOW()),
('DRG-IVF-002', 'Normal Saline 0.9% 1000ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '0.9%', 'IV Infusion', 'NS', 'Various', 550.00, 550.00, 700.00, 400.00, 350, 80, 'Bottle', true, false, true, 'NHIS-DRG-701', 440.00, true, true, 80, 'Isotonic crystalloid', NOW(), NOW()),
('DRG-IVF-003', 'Dextrose 5% 500ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '5%', 'IV Infusion', 'D5W', 'Various', 380.00, 380.00, 480.00, 280.00, 350, 80, 'Bottle', true, false, true, 'NHIS-DRG-702', 305.00, true, true, 80, 'Hypotonic glucose solution', NOW(), NOW()),
('DRG-IVF-004', 'Dextrose 5% 1000ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '5%', 'IV Infusion', 'D5W', 'Various', 580.00, 580.00, 750.00, 420.00, 300, 80, 'Bottle', true, false, true, 'NHIS-DRG-703', 465.00, true, true, 80, 'Hypotonic glucose solution', NOW(), NOW()),
('DRG-IVF-005', 'Dextrose 10% 500ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '10%', 'IV Infusion', 'D10W', 'Various', 450.00, 450.00, 580.00, 320.00, 200, 50, 'Bottle', true, false, true, 'NHIS-DRG-704', 360.00, true, true, 80, 'Hypertonic glucose solution', NOW(), NOW()),
('DRG-IVF-006', 'Dextrose 50% 50ml', 'IV Fluids', 'IV Infusions', 'Solution for Injection', '50%', 'IV Injection', 'D50', 'Various', 250.00, 250.00, 320.00, 180.00, 150, 40, 'Vial', true, false, true, 'NHIS-DRG-705', 200.00, true, true, 80, 'Hypertonic glucose for hypoglycemia', NOW(), NOW()),
('DRG-IVF-007', 'Dextrose Saline 500ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '4.3%/0.18%', 'IV Infusion', 'D/S', 'Various', 380.00, 380.00, 480.00, 280.00, 300, 80, 'Bottle', true, false, true, 'NHIS-DRG-706', 305.00, true, true, 80, 'Combined glucose and saline', NOW(), NOW()),
('DRG-IVF-008', 'Dextrose Saline 1000ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '4.3%/0.18%', 'IV Infusion', 'D/S', 'Various', 580.00, 580.00, 750.00, 420.00, 250, 60, 'Bottle', true, false, true, 'NHIS-DRG-707', 465.00, true, true, 80, 'Combined glucose and saline', NOW(), NOW()),
('DRG-IVF-009', 'Ringers Lactate 500ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', 'Compound', 'IV Infusion', 'RL', 'Various', 420.00, 420.00, 550.00, 300.00, 300, 80, 'Bottle', true, false, true, 'NHIS-DRG-708', 340.00, true, true, 80, 'Balanced crystalloid', NOW(), NOW()),
('DRG-IVF-010', 'Ringers Lactate 1000ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', 'Compound', 'IV Infusion', 'RL', 'Various', 650.00, 650.00, 850.00, 480.00, 250, 60, 'Bottle', true, false, true, 'NHIS-DRG-709', 520.00, true, true, 80, 'Balanced crystalloid', NOW(), NOW()),
('DRG-IVF-011', 'Mannitol 20% 500ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '20%', 'IV Infusion', 'Mannitol', 'Various', 850.00, 850.00, 1100.00, 620.00, 100, 30, 'Bottle', true, false, true, 'NHIS-DRG-710', 680.00, true, true, 80, 'Osmotic diuretic', NOW(), NOW()),
('DRG-IVF-012', 'Haemaccel 500ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', '3.5%', 'IV Infusion', 'Haemaccel', 'Various', 3500.00, 3500.00, 4500.00, 2500.00, 50, 15, 'Bottle', true, false, true, 'NHIS-DRG-711', 2800.00, true, true, 80, 'Colloid plasma expander', NOW(), NOW()),
('DRG-IVF-013', 'Darrows Solution Half Strength 500ml', 'IV Fluids', 'IV Infusions', 'Solution for Infusion', 'Half Strength', 'IV Infusion', 'Darrows', 'Various', 480.00, 480.00, 620.00, 350.00, 150, 40, 'Bottle', true, false, true, 'NHIS-DRG-712', 385.00, true, true, 80, 'Pediatric rehydration', NOW(), NOW()),

-- =====================================================
-- VITAMINS AND SUPPLEMENTS
-- =====================================================
('DRG-VIT-001', 'Vitamin C Tablets 100mg', 'Vitamins and Supplements', 'Tablets', 'Tablet', '100mg', 'Oral Tablet', 'Vitamin C', 'Various', 15.00, 15.00, 20.00, 10.00, 1500, 400, 'Tablet', true, false, false, 'NHIS-DRG-800', 12.00, true, true, 80, 'Ascorbic acid', NOW(), NOW()),
('DRG-VIT-002', 'Vitamin C Tablets 500mg', 'Vitamins and Supplements', 'Tablets', 'Tablet', '500mg', 'Oral Tablet', 'Vitamin C', 'Various', 30.00, 30.00, 40.00, 20.00, 1200, 300, 'Tablet', true, false, false, 'NHIS-DRG-801', 25.00, true, true, 80, 'Ascorbic acid', NOW(), NOW()),
('DRG-VIT-003', 'Vitamin C Tablets 1000mg', 'Vitamins and Supplements', 'Tablets', 'Effervescent Tablet', '1000mg', 'Oral Tablet', 'Redoxon', 'Bayer', 120.00, 120.00, 150.00, 85.00, 400, 100, 'Tablet', true, false, false, 'NHIS-DRG-802', 95.00, true, true, 80, 'High-dose ascorbic acid', NOW(), NOW()),
('DRG-VIT-004', 'Vitamin B Complex Tablets', 'Vitamins and Supplements', 'Tablets', 'Tablet', 'Standard', 'Oral Tablet', 'B-Complex', 'Various', 25.00, 25.00, 30.00, 18.00, 1000, 250, 'Tablet', true, false, false, 'NHIS-DRG-803', 20.00, true, true, 80, 'B vitamin combination', NOW(), NOW()),
('DRG-VIT-005', 'Vitamin B12 Tablets 1000mcg', 'Vitamins and Supplements', 'Tablets', 'Tablet', '1000mcg', 'Oral Tablet', 'Vitamin B12', 'Various', 50.00, 50.00, 65.00, 35.00, 600, 150, 'Tablet', true, false, false, 'NHIS-DRG-804', 40.00, true, true, 80, 'Cyanocobalamin', NOW(), NOW()),
('DRG-VIT-006', 'Folic Acid Tablets 5mg', 'Vitamins and Supplements', 'Tablets', 'Tablet', '5mg', 'Oral Tablet', 'Folic Acid', 'Various', 20.00, 20.00, 25.00, 15.00, 1500, 400, 'Tablet', true, false, false, 'NHIS-DRG-805', 16.00, true, true, 80, 'Folate supplement', NOW(), NOW()),
('DRG-VIT-007', 'Iron (Ferrous Sulphate) Tablets 200mg', 'Vitamins and Supplements', 'Tablets', 'Tablet', '200mg', 'Oral Tablet', 'Ferrous Sulphate', 'Various', 15.00, 15.00, 20.00, 10.00, 1200, 300, 'Tablet', true, false, false, 'NHIS-DRG-806', 12.00, true, true, 80, 'Iron supplement', NOW(), NOW()),
('DRG-VIT-008', 'Ferrous Fumarate + Folic Acid Tablets', 'Vitamins and Supplements', 'Tablets', 'Tablet', '200mg/0.4mg', 'Oral Tablet', 'Fersolate', 'Various', 25.00, 25.00, 30.00, 18.00, 1000, 250, 'Tablet', true, false, false, 'NHIS-DRG-807', 20.00, true, true, 80, 'Iron and folate for pregnancy', NOW(), NOW()),
('DRG-VIT-009', 'Calcium Carbonate Tablets 500mg', 'Vitamins and Supplements', 'Tablets', 'Chewable Tablet', '500mg', 'Oral Tablet', 'Calcichew', 'Various', 40.00, 40.00, 50.00, 30.00, 800, 200, 'Tablet', true, false, false, 'NHIS-DRG-808', 30.00, true, true, 80, 'Calcium supplement', NOW(), NOW()),
('DRG-VIT-010', 'Calcium + Vitamin D Tablets', 'Vitamins and Supplements', 'Tablets', 'Tablet', '500mg/400IU', 'Oral Tablet', 'Calcichew D3', 'Various', 80.00, 80.00, 100.00, 55.00, 500, 120, 'Tablet', true, false, false, 'NHIS-DRG-809', 65.00, true, true, 80, 'Calcium and vitamin D combination', NOW(), NOW()),
('DRG-VIT-011', 'Vitamin D Tablets 1000IU', 'Vitamins and Supplements', 'Tablets', 'Tablet', '1000IU', 'Oral Tablet', 'Vitamin D3', 'Various', 50.00, 50.00, 65.00, 35.00, 600, 150, 'Tablet', true, false, false, 'NHIS-DRG-810', 40.00, true, true, 80, 'Cholecalciferol', NOW(), NOW()),
('DRG-VIT-012', 'Vitamin E Capsules 400IU', 'Vitamins and Supplements', 'Capsules', 'Soft Capsule', '400IU', 'Oral Capsule', 'Vitamin E', 'Various', 80.00, 80.00, 100.00, 55.00, 400, 100, 'Capsule', true, false, false, 'NHIS-DRG-811', 65.00, true, true, 80, 'Tocopherol', NOW(), NOW()),
('DRG-VIT-013', 'Zinc Sulphate Tablets 20mg', 'Vitamins and Supplements', 'Tablets', 'Tablet', '20mg', 'Oral Tablet', 'Zinc', 'Various', 30.00, 30.00, 40.00, 20.00, 800, 200, 'Tablet', true, false, false, 'NHIS-DRG-812', 25.00, true, true, 80, 'Zinc supplement', NOW(), NOW()),
('DRG-VIT-014', 'Multivitamin Tablets (Adult)', 'Vitamins and Supplements', 'Tablets', 'Tablet', 'Standard', 'Oral Tablet', 'Centrum', 'Pfizer', 80.00, 80.00, 100.00, 55.00, 500, 120, 'Tablet', true, false, false, 'NHIS-DRG-813', 65.00, true, true, 80, 'Adult multivitamin', NOW(), NOW()),
('DRG-VIT-015', 'Multivitamin Syrup (Pediatric)', 'Vitamins and Supplements', 'Syrups', 'Syrup', 'Standard', 'Oral Syrup', 'Minadex', 'Various', 450.00, 450.00, 580.00, 320.00, 200, 50, 'Bottle', true, false, false, 'NHIS-DRG-814', 360.00, true, true, 80, 'Pediatric multivitamin', NOW(), NOW()),
('DRG-VIT-016', 'Prenatal Vitamins', 'Vitamins and Supplements', 'Tablets', 'Tablet', 'Standard', 'Oral Tablet', 'Pregnacare', 'Vitabiotics', 180.00, 180.00, 230.00, 130.00, 300, 80, 'Tablet', true, false, false, 'NHIS-DRG-815', 145.00, true, true, 80, 'Pregnancy vitamins and minerals', NOW(), NOW()),
('DRG-VIT-017', 'Vitamin K Injection 10mg/ml', 'Vitamins and Supplements', 'Injections', 'Solution for Injection', '10mg/ml', 'IM Injection', 'Konakion', 'Roche', 450.00, 450.00, 580.00, 320.00, 100, 30, 'Ampoule', true, false, true, 'NHIS-DRG-816', 360.00, true, true, 80, 'Phytomenadione for bleeding disorders', NOW(), NOW()),
('DRG-VIT-018', 'Thiamine (Vitamin B1) Injection 100mg/ml', 'Vitamins and Supplements', 'Injections', 'Solution for Injection', '100mg/ml', 'IM/IV Injection', 'Thiamine', 'Various', 180.00, 180.00, 230.00, 130.00, 150, 40, 'Ampoule', true, false, true, 'NHIS-DRG-817', 145.00, true, true, 80, 'For Wernicke encephalopathy', NOW(), NOW())

ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    drug_type = EXCLUDED.drug_type,
    dosage_form = EXCLUDED.dosage_form,
    strengths = EXCLUDED.strengths,
    formulation = EXCLUDED.formulation,
    brand_name = EXCLUDED.brand_name,
    manufacturer = EXCLUDED.manufacturer,
    price = EXCLUDED.price,
    unit_price = EXCLUDED.unit_price,
    selling_price = EXCLUDED.selling_price,
    unit_cost = EXCLUDED.unit_cost,
    stock_quantity = EXCLUDED.stock_quantity,
    reorder_level = EXCLUDED.reorder_level,
    unit_of_measure = EXCLUDED.unit_of_measure,
    is_active = EXCLUDED.is_active,
    is_controlled = EXCLUDED.is_controlled,
    requires_prescription = EXCLUDED.requires_prescription,
    nhis_code = EXCLUDED.nhis_code,
    nhis_price = EXCLUDED.nhis_price,
    is_nhis_covered = EXCLUDED.is_nhis_covered,
    nhis_eligible = EXCLUDED.nhis_eligible,
    nhis_percentage = EXCLUDED.nhis_percentage,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_drug_catalogue_category ON drug_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_drug_catalogue_drug_type ON drug_catalogue(drug_type);
CREATE INDEX IF NOT EXISTS idx_drug_catalogue_nhis_code ON drug_catalogue(nhis_code);
CREATE INDEX IF NOT EXISTS idx_drug_catalogue_is_controlled ON drug_catalogue(is_controlled) WHERE is_controlled = true;
