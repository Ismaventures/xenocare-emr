-- =====================================================
-- COMPREHENSIVE LAB TEST CATALOGUE SEED DATA
-- Aligned with schema: lab_test_catalogue table
-- Includes NHIS codes and pricing
-- =====================================================

-- Clear existing seed data (optional - comment out if appending)
-- DELETE FROM lab_test_catalogue WHERE code LIKE 'LAB%';

INSERT INTO lab_test_catalogue (
    code,
    name,
    category,
    specimen_type,
    price,
    tat_minutes,
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
-- HEMATOLOGY
-- =====================================================
('LAB-HEM-001', 'Full Blood Count (FBC)', 'Hematology', 'Blood (EDTA)', 3500.00, 60, true, 'NHIS-LAB-001', 2800.00, true, 80, 'Complete blood cell count including WBC differential, RBC indices, and platelet count', NOW(), NOW()),
('LAB-HEM-002', 'Packed Cell Volume (PCV)', 'Hematology', 'Blood (EDTA)', 1500.00, 30, true, 'NHIS-LAB-002', 1200.00, true, 80, 'Hematocrit measurement', NOW(), NOW()),
('LAB-HEM-003', 'Hemoglobin Estimation', 'Hematology', 'Blood (EDTA)', 1200.00, 30, true, 'NHIS-LAB-003', 1000.00, true, 80, 'Hemoglobin concentration measurement', NOW(), NOW()),
('LAB-HEM-004', 'Erythrocyte Sedimentation Rate (ESR)', 'Hematology', 'Blood (EDTA)', 1800.00, 60, true, 'NHIS-LAB-004', 1400.00, true, 80, 'Inflammation marker', NOW(), NOW()),
('LAB-HEM-005', 'Reticulocyte Count', 'Hematology', 'Blood (EDTA)', 2500.00, 90, true, 'NHIS-LAB-005', 2000.00, true, 80, 'Immature red blood cell count', NOW(), NOW()),
('LAB-HEM-006', 'Peripheral Blood Film (PBF)', 'Hematology', 'Blood (EDTA)', 3000.00, 120, true, 'NHIS-LAB-006', 2400.00, true, 80, 'Microscopic examination of blood cells', NOW(), NOW()),
('LAB-HEM-007', 'Sickling Test', 'Hematology', 'Blood (EDTA)', 2000.00, 45, true, 'NHIS-LAB-007', 1600.00, true, 80, 'Screening for sickle cell trait/disease', NOW(), NOW()),
('LAB-HEM-008', 'Hemoglobin Electrophoresis', 'Hematology', 'Blood (EDTA)', 8500.00, 1440, true, 'NHIS-LAB-008', 6800.00, true, 80, 'Hemoglobin variant identification', NOW(), NOW()),
('LAB-HEM-009', 'G6PD Screening', 'Hematology', 'Blood (EDTA)', 4500.00, 180, true, 'NHIS-LAB-009', 3600.00, true, 80, 'Glucose-6-phosphate dehydrogenase deficiency screening', NOW(), NOW()),
('LAB-HEM-010', 'Bone Marrow Aspiration & Biopsy', 'Hematology', 'Bone Marrow', 25000.00, 2880, true, 'NHIS-LAB-010', 20000.00, true, 80, 'Bone marrow examination', NOW(), NOW()),

-- =====================================================
-- COAGULATION STUDIES
-- =====================================================
('LAB-COA-001', 'Prothrombin Time (PT)', 'Coagulation', 'Blood (Citrate)', 4000.00, 60, true, 'NHIS-LAB-011', 3200.00, true, 80, 'Extrinsic pathway clotting time', NOW(), NOW()),
('LAB-COA-002', 'INR (International Normalized Ratio)', 'Coagulation', 'Blood (Citrate)', 4000.00, 60, true, 'NHIS-LAB-012', 3200.00, true, 80, 'Standardized PT for warfarin monitoring', NOW(), NOW()),
('LAB-COA-003', 'Activated Partial Thromboplastin Time (APTT)', 'Coagulation', 'Blood (Citrate)', 4500.00, 60, true, 'NHIS-LAB-013', 3600.00, true, 80, 'Intrinsic pathway clotting time', NOW(), NOW()),
('LAB-COA-004', 'Bleeding Time', 'Coagulation', 'In Vivo', 1500.00, 30, true, 'NHIS-LAB-014', 1200.00, true, 80, 'Platelet function screening', NOW(), NOW()),
('LAB-COA-005', 'Clotting Time', 'Coagulation', 'Blood (Plain)', 1500.00, 30, true, 'NHIS-LAB-015', 1200.00, true, 80, 'Basic clotting function', NOW(), NOW()),
('LAB-COA-006', 'D-Dimer', 'Coagulation', 'Blood (Citrate)', 8000.00, 120, true, 'NHIS-LAB-016', 6400.00, true, 80, 'Fibrin degradation product for DVT/PE screening', NOW(), NOW()),
('LAB-COA-007', 'Fibrinogen Level', 'Coagulation', 'Blood (Citrate)', 6000.00, 120, true, 'NHIS-LAB-017', 4800.00, true, 80, 'Clotting factor I level', NOW(), NOW()),

-- =====================================================
-- CLINICAL CHEMISTRY / BIOCHEMISTRY
-- =====================================================
('LAB-CHM-001', 'Fasting Blood Sugar (FBS)', 'Clinical Chemistry', 'Blood (Fluoride)', 1500.00, 30, true, 'NHIS-LAB-020', 1200.00, true, 80, 'Fasting glucose level', NOW(), NOW()),
('LAB-CHM-002', 'Random Blood Sugar (RBS)', 'Clinical Chemistry', 'Blood (Fluoride)', 1500.00, 30, true, 'NHIS-LAB-021', 1200.00, true, 80, 'Random glucose level', NOW(), NOW()),
('LAB-CHM-003', '2-Hour Post Prandial Blood Sugar', 'Clinical Chemistry', 'Blood (Fluoride)', 1800.00, 30, true, 'NHIS-LAB-022', 1400.00, true, 80, 'Post-meal glucose', NOW(), NOW()),
('LAB-CHM-004', 'Oral Glucose Tolerance Test (OGTT)', 'Clinical Chemistry', 'Blood (Fluoride)', 5000.00, 180, true, 'NHIS-LAB-023', 4000.00, true, 80, 'Glucose tolerance assessment', NOW(), NOW()),
('LAB-CHM-005', 'Glycated Hemoglobin (HbA1c)', 'Clinical Chemistry', 'Blood (EDTA)', 6500.00, 120, true, 'NHIS-LAB-024', 5200.00, true, 80, '3-month average blood sugar', NOW(), NOW()),
('LAB-CHM-006', 'Urea', 'Clinical Chemistry', 'Blood (Plain)', 2000.00, 60, true, 'NHIS-LAB-025', 1600.00, true, 80, 'Blood urea nitrogen', NOW(), NOW()),
('LAB-CHM-007', 'Creatinine', 'Clinical Chemistry', 'Blood (Plain)', 2000.00, 60, true, 'NHIS-LAB-026', 1600.00, true, 80, 'Kidney function marker', NOW(), NOW()),
('LAB-CHM-008', 'Urea & Electrolytes (U&E)', 'Clinical Chemistry', 'Blood (Plain)', 5500.00, 90, true, 'NHIS-LAB-027', 4400.00, true, 80, 'Renal panel with electrolytes', NOW(), NOW()),
('LAB-CHM-009', 'Serum Electrolytes (Na, K, Cl, HCO3)', 'Clinical Chemistry', 'Blood (Plain)', 4500.00, 60, true, 'NHIS-LAB-028', 3600.00, true, 80, 'Electrolyte panel', NOW(), NOW()),
('LAB-CHM-010', 'Liver Function Tests (LFT)', 'Clinical Chemistry', 'Blood (Plain)', 7500.00, 120, true, 'NHIS-LAB-029', 6000.00, true, 80, 'Complete liver panel', NOW(), NOW()),
('LAB-CHM-011', 'Total Bilirubin', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-030', 2000.00, true, 80, 'Total bilirubin level', NOW(), NOW()),
('LAB-CHM-012', 'Direct/Conjugated Bilirubin', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-031', 2000.00, true, 80, 'Direct bilirubin level', NOW(), NOW()),
('LAB-CHM-013', 'Alanine Aminotransferase (ALT/SGPT)', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-032', 2000.00, true, 80, 'Liver enzyme', NOW(), NOW()),
('LAB-CHM-014', 'Aspartate Aminotransferase (AST/SGOT)', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-033', 2000.00, true, 80, 'Liver/cardiac enzyme', NOW(), NOW()),
('LAB-CHM-015', 'Alkaline Phosphatase (ALP)', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-034', 2000.00, true, 80, 'Bone/liver enzyme', NOW(), NOW()),
('LAB-CHM-016', 'Gamma-Glutamyl Transferase (GGT)', 'Clinical Chemistry', 'Blood (Plain)', 3000.00, 60, true, 'NHIS-LAB-035', 2400.00, true, 80, 'Liver enzyme', NOW(), NOW()),
('LAB-CHM-017', 'Total Protein', 'Clinical Chemistry', 'Blood (Plain)', 2000.00, 60, true, 'NHIS-LAB-036', 1600.00, true, 80, 'Serum total protein', NOW(), NOW()),
('LAB-CHM-018', 'Serum Albumin', 'Clinical Chemistry', 'Blood (Plain)', 2000.00, 60, true, 'NHIS-LAB-037', 1600.00, true, 80, 'Albumin level', NOW(), NOW()),
('LAB-CHM-019', 'Lipid Profile', 'Clinical Chemistry', 'Blood (Plain)', 6000.00, 120, true, 'NHIS-LAB-038', 4800.00, true, 80, 'Total cholesterol, HDL, LDL, Triglycerides', NOW(), NOW()),
('LAB-CHM-020', 'Total Cholesterol', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-039', 2000.00, true, 80, 'Total cholesterol level', NOW(), NOW()),
('LAB-CHM-021', 'Triglycerides', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-040', 2000.00, true, 80, 'Triglyceride level', NOW(), NOW()),
('LAB-CHM-022', 'HDL Cholesterol', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-041', 2000.00, true, 80, 'High-density lipoprotein', NOW(), NOW()),
('LAB-CHM-023', 'LDL Cholesterol', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-042', 2000.00, true, 80, 'Low-density lipoprotein', NOW(), NOW()),
('LAB-CHM-024', 'Uric Acid', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-043', 2000.00, true, 80, 'Gout marker', NOW(), NOW()),
('LAB-CHM-025', 'Serum Calcium', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-044', 2000.00, true, 80, 'Total calcium level', NOW(), NOW()),
('LAB-CHM-026', 'Serum Phosphate', 'Clinical Chemistry', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-045', 2000.00, true, 80, 'Phosphorus level', NOW(), NOW()),
('LAB-CHM-027', 'Serum Magnesium', 'Clinical Chemistry', 'Blood (Plain)', 3000.00, 60, true, 'NHIS-LAB-046', 2400.00, true, 80, 'Magnesium level', NOW(), NOW()),
('LAB-CHM-028', 'Amylase', 'Clinical Chemistry', 'Blood (Plain)', 4000.00, 90, true, 'NHIS-LAB-047', 3200.00, true, 80, 'Pancreatic enzyme', NOW(), NOW()),
('LAB-CHM-029', 'Lipase', 'Clinical Chemistry', 'Blood (Plain)', 4500.00, 90, true, 'NHIS-LAB-048', 3600.00, true, 80, 'Pancreatic enzyme', NOW(), NOW()),
('LAB-CHM-030', 'Lactate Dehydrogenase (LDH)', 'Clinical Chemistry', 'Blood (Plain)', 3500.00, 60, true, 'NHIS-LAB-049', 2800.00, true, 80, 'Tissue damage marker', NOW(), NOW()),
('LAB-CHM-031', 'Creatine Kinase (CK)', 'Clinical Chemistry', 'Blood (Plain)', 4000.00, 60, true, 'NHIS-LAB-050', 3200.00, true, 80, 'Muscle/cardiac enzyme', NOW(), NOW()),
('LAB-CHM-032', 'CK-MB', 'Clinical Chemistry', 'Blood (Plain)', 6000.00, 60, true, 'NHIS-LAB-051', 4800.00, true, 80, 'Cardiac-specific CK', NOW(), NOW()),
('LAB-CHM-033', 'Troponin I/T', 'Clinical Chemistry', 'Blood (Plain)', 8000.00, 60, true, 'NHIS-LAB-052', 6400.00, true, 80, 'Cardiac injury marker', NOW(), NOW()),
('LAB-CHM-034', 'BNP/NT-proBNP', 'Clinical Chemistry', 'Blood (EDTA)', 15000.00, 120, true, 'NHIS-LAB-053', 12000.00, true, 80, 'Heart failure marker', NOW(), NOW()),

-- =====================================================
-- SEROLOGY / IMMUNOLOGY
-- =====================================================
('LAB-SER-001', 'HIV 1 & 2 Antibody Screen', 'Serology', 'Blood (Plain)', 3000.00, 60, true, 'NHIS-LAB-060', 2400.00, true, 100, 'HIV screening test', NOW(), NOW()),
('LAB-SER-002', 'HIV Viral Load', 'Serology', 'Blood (EDTA)', 25000.00, 2880, true, 'NHIS-LAB-061', 20000.00, true, 100, 'HIV RNA quantification', NOW(), NOW()),
('LAB-SER-003', 'CD4 Count', 'Serology', 'Blood (EDTA)', 8000.00, 1440, true, 'NHIS-LAB-062', 6400.00, true, 100, 'T-helper cell count', NOW(), NOW()),
('LAB-SER-004', 'Hepatitis B Surface Antigen (HBsAg)', 'Serology', 'Blood (Plain)', 3000.00, 60, true, 'NHIS-LAB-063', 2400.00, true, 80, 'Hepatitis B screening', NOW(), NOW()),
('LAB-SER-005', 'Hepatitis B Core Antibody (Anti-HBc)', 'Serology', 'Blood (Plain)', 5000.00, 120, true, 'NHIS-LAB-064', 4000.00, true, 80, 'Hepatitis B exposure marker', NOW(), NOW()),
('LAB-SER-006', 'Hepatitis B Surface Antibody (Anti-HBs)', 'Serology', 'Blood (Plain)', 5000.00, 120, true, 'NHIS-LAB-065', 4000.00, true, 80, 'Hepatitis B immunity marker', NOW(), NOW()),
('LAB-SER-007', 'Hepatitis C Antibody (Anti-HCV)', 'Serology', 'Blood (Plain)', 5000.00, 60, true, 'NHIS-LAB-066', 4000.00, true, 80, 'Hepatitis C screening', NOW(), NOW()),
('LAB-SER-008', 'VDRL/RPR (Syphilis Screen)', 'Serology', 'Blood (Plain)', 2000.00, 60, true, 'NHIS-LAB-067', 1600.00, true, 80, 'Syphilis screening', NOW(), NOW()),
('LAB-SER-009', 'TPHA (Syphilis Confirmatory)', 'Serology', 'Blood (Plain)', 4000.00, 120, true, 'NHIS-LAB-068', 3200.00, true, 80, 'Syphilis confirmation', NOW(), NOW()),
('LAB-SER-010', 'Widal Test (Typhoid)', 'Serology', 'Blood (Plain)', 2500.00, 60, true, 'NHIS-LAB-069', 2000.00, true, 80, 'Typhoid fever screening', NOW(), NOW()),
('LAB-SER-011', 'Malaria Parasite (MP) RDT', 'Serology', 'Blood (EDTA)', 1500.00, 20, true, 'NHIS-LAB-070', 1200.00, true, 100, 'Rapid malaria test', NOW(), NOW()),
('LAB-SER-012', 'Malaria Parasite (Microscopy)', 'Serology', 'Blood (EDTA)', 2000.00, 60, true, 'NHIS-LAB-071', 1600.00, true, 100, 'Blood film for malaria', NOW(), NOW()),
('LAB-SER-013', 'Pregnancy Test (Urine)', 'Serology', 'Urine', 1500.00, 15, true, 'NHIS-LAB-072', 1200.00, true, 80, 'Qualitative hCG', NOW(), NOW()),
('LAB-SER-014', 'Pregnancy Test (Blood/Beta-hCG)', 'Serology', 'Blood (Plain)', 4000.00, 60, true, 'NHIS-LAB-073', 3200.00, true, 80, 'Quantitative hCG', NOW(), NOW()),
('LAB-SER-015', 'Rheumatoid Factor (RF)', 'Serology', 'Blood (Plain)', 4000.00, 120, true, 'NHIS-LAB-074', 3200.00, true, 80, 'Rheumatoid arthritis marker', NOW(), NOW()),
('LAB-SER-016', 'Anti-Streptolysin O (ASO)', 'Serology', 'Blood (Plain)', 3500.00, 120, true, 'NHIS-LAB-075', 2800.00, true, 80, 'Streptococcal infection marker', NOW(), NOW()),
('LAB-SER-017', 'C-Reactive Protein (CRP)', 'Serology', 'Blood (Plain)', 4000.00, 60, true, 'NHIS-LAB-076', 3200.00, true, 80, 'Inflammation marker', NOW(), NOW()),
('LAB-SER-018', 'ANA (Antinuclear Antibody)', 'Serology', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-077', 9600.00, true, 80, 'Autoimmune screen', NOW(), NOW()),
('LAB-SER-019', 'Prostate Specific Antigen (PSA)', 'Serology', 'Blood (Plain)', 8000.00, 120, true, 'NHIS-LAB-078', 6400.00, true, 80, 'Prostate cancer marker', NOW(), NOW()),
('LAB-SER-020', 'CA-125 (Ovarian Cancer Marker)', 'Serology', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-079', 9600.00, true, 80, 'Ovarian tumor marker', NOW(), NOW()),
('LAB-SER-021', 'CEA (Carcinoembryonic Antigen)', 'Serology', 'Blood (Plain)', 10000.00, 1440, true, 'NHIS-LAB-080', 8000.00, true, 80, 'GI/colorectal tumor marker', NOW(), NOW()),
('LAB-SER-022', 'AFP (Alpha-Fetoprotein)', 'Serology', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-081', 6400.00, true, 80, 'Liver tumor/pregnancy marker', NOW(), NOW()),

-- =====================================================
-- MICROBIOLOGY
-- =====================================================
('LAB-MIC-001', 'Urine Microscopy, Culture & Sensitivity (M/C/S)', 'Microbiology', 'Urine', 5000.00, 2880, true, 'NHIS-LAB-090', 4000.00, true, 80, 'Complete urine culture', NOW(), NOW()),
('LAB-MIC-002', 'Urine Routine Examination', 'Microbiology', 'Urine', 1500.00, 30, true, 'NHIS-LAB-091', 1200.00, true, 80, 'Urinalysis', NOW(), NOW()),
('LAB-MIC-003', 'Stool Microscopy', 'Microbiology', 'Stool', 2000.00, 60, true, 'NHIS-LAB-092', 1600.00, true, 80, 'Stool ova and parasites', NOW(), NOW()),
('LAB-MIC-004', 'Stool Culture & Sensitivity', 'Microbiology', 'Stool', 5500.00, 2880, true, 'NHIS-LAB-093', 4400.00, true, 80, 'Stool bacterial culture', NOW(), NOW()),
('LAB-MIC-005', 'Blood Culture & Sensitivity', 'Microbiology', 'Blood (Culture Bottle)', 8000.00, 4320, true, 'NHIS-LAB-094', 6400.00, true, 80, 'Blood bacterial culture', NOW(), NOW()),
('LAB-MIC-006', 'Wound Swab M/C/S', 'Microbiology', 'Swab', 4500.00, 2880, true, 'NHIS-LAB-095', 3600.00, true, 80, 'Wound culture', NOW(), NOW()),
('LAB-MIC-007', 'High Vaginal Swab (HVS) M/C/S', 'Microbiology', 'Swab', 4500.00, 2880, true, 'NHIS-LAB-096', 3600.00, true, 80, 'Vaginal culture', NOW(), NOW()),
('LAB-MIC-008', 'Throat Swab M/C/S', 'Microbiology', 'Swab', 4500.00, 2880, true, 'NHIS-LAB-097', 3600.00, true, 80, 'Throat culture', NOW(), NOW()),
('LAB-MIC-009', 'Urethral Swab M/C/S', 'Microbiology', 'Swab', 4500.00, 2880, true, 'NHIS-LAB-098', 3600.00, true, 80, 'Urethral culture', NOW(), NOW()),
('LAB-MIC-010', 'Sputum M/C/S', 'Microbiology', 'Sputum', 5000.00, 2880, true, 'NHIS-LAB-099', 4000.00, true, 80, 'Sputum culture', NOW(), NOW()),
('LAB-MIC-011', 'Sputum for AFB (TB Microscopy)', 'Microbiology', 'Sputum', 3000.00, 1440, true, 'NHIS-LAB-100', 2400.00, true, 100, 'TB screening by microscopy', NOW(), NOW()),
('LAB-MIC-012', 'GeneXpert MTB/RIF', 'Microbiology', 'Sputum', 15000.00, 180, true, 'NHIS-LAB-101', 12000.00, true, 100, 'Rapid TB PCR with rifampicin resistance', NOW(), NOW()),
('LAB-MIC-013', 'CSF Analysis (Routine)', 'Microbiology', 'Cerebrospinal Fluid', 8000.00, 120, true, 'NHIS-LAB-102', 6400.00, true, 80, 'CSF glucose, protein, cell count', NOW(), NOW()),
('LAB-MIC-014', 'CSF Culture & Sensitivity', 'Microbiology', 'Cerebrospinal Fluid', 8500.00, 4320, true, 'NHIS-LAB-103', 6800.00, true, 80, 'CSF bacterial culture', NOW(), NOW()),
('LAB-MIC-015', 'Seminal Fluid Analysis (SFA)', 'Microbiology', 'Semen', 6000.00, 120, true, 'NHIS-LAB-104', 4800.00, true, 80, 'Complete semen analysis', NOW(), NOW()),
('LAB-MIC-016', 'KOH Preparation (Fungal)', 'Microbiology', 'Skin Scraping', 2000.00, 30, true, 'NHIS-LAB-105', 1600.00, true, 80, 'Fungal screening', NOW(), NOW()),
('LAB-MIC-017', 'Gram Stain', 'Microbiology', 'Various', 1500.00, 30, true, 'NHIS-LAB-106', 1200.00, true, 80, 'Bacterial stain', NOW(), NOW()),

-- =====================================================
-- HORMONES / ENDOCRINOLOGY
-- =====================================================
('LAB-HOR-001', 'Thyroid Function Tests (TFT) - T3, T4, TSH', 'Hormones', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-110', 9600.00, true, 80, 'Complete thyroid panel', NOW(), NOW()),
('LAB-HOR-002', 'TSH (Thyroid Stimulating Hormone)', 'Hormones', 'Blood (Plain)', 5000.00, 120, true, 'NHIS-LAB-111', 4000.00, true, 80, 'Thyroid screening', NOW(), NOW()),
('LAB-HOR-003', 'Free T4 (FT4)', 'Hormones', 'Blood (Plain)', 5000.00, 120, true, 'NHIS-LAB-112', 4000.00, true, 80, 'Free thyroxine', NOW(), NOW()),
('LAB-HOR-004', 'Free T3 (FT3)', 'Hormones', 'Blood (Plain)', 5000.00, 120, true, 'NHIS-LAB-113', 4000.00, true, 80, 'Free triiodothyronine', NOW(), NOW()),
('LAB-HOR-005', 'Prolactin', 'Hormones', 'Blood (Plain)', 6000.00, 1440, true, 'NHIS-LAB-114', 4800.00, true, 80, 'Pituitary hormone', NOW(), NOW()),
('LAB-HOR-006', 'FSH (Follicle Stimulating Hormone)', 'Hormones', 'Blood (Plain)', 6000.00, 1440, true, 'NHIS-LAB-115', 4800.00, true, 80, 'Reproductive hormone', NOW(), NOW()),
('LAB-HOR-007', 'LH (Luteinizing Hormone)', 'Hormones', 'Blood (Plain)', 6000.00, 1440, true, 'NHIS-LAB-116', 4800.00, true, 80, 'Reproductive hormone', NOW(), NOW()),
('LAB-HOR-008', 'Estradiol (E2)', 'Hormones', 'Blood (Plain)', 7000.00, 1440, true, 'NHIS-LAB-117', 5600.00, true, 80, 'Estrogen level', NOW(), NOW()),
('LAB-HOR-009', 'Progesterone', 'Hormones', 'Blood (Plain)', 6000.00, 1440, true, 'NHIS-LAB-118', 4800.00, true, 80, 'Progesterone level', NOW(), NOW()),
('LAB-HOR-010', 'Testosterone (Total)', 'Hormones', 'Blood (Plain)', 7000.00, 1440, true, 'NHIS-LAB-119', 5600.00, true, 80, 'Male hormone', NOW(), NOW()),
('LAB-HOR-011', 'Cortisol (Morning)', 'Hormones', 'Blood (Plain)', 6000.00, 1440, true, 'NHIS-LAB-120', 4800.00, true, 80, 'Adrenal function', NOW(), NOW()),
('LAB-HOR-012', 'Parathyroid Hormone (PTH)', 'Hormones', 'Blood (Plain)', 10000.00, 1440, true, 'NHIS-LAB-121', 8000.00, true, 80, 'Calcium regulation', NOW(), NOW()),
('LAB-HOR-013', 'Vitamin D (25-OH)', 'Hormones', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-122', 9600.00, true, 80, 'Vitamin D status', NOW(), NOW()),
('LAB-HOR-014', 'Insulin (Fasting)', 'Hormones', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-123', 6400.00, true, 80, 'Insulin level', NOW(), NOW()),

-- =====================================================
-- BLOOD BANK / TRANSFUSION
-- =====================================================
('LAB-BBK-001', 'Blood Grouping (ABO/Rh)', 'Blood Bank', 'Blood (EDTA)', 2000.00, 30, true, 'NHIS-LAB-130', 1600.00, true, 80, 'ABO and Rhesus typing', NOW(), NOW()),
('LAB-BBK-002', 'Cross-Matching', 'Blood Bank', 'Blood (EDTA)', 3500.00, 60, true, 'NHIS-LAB-131', 2800.00, true, 80, 'Compatibility testing', NOW(), NOW()),
('LAB-BBK-003', 'Direct Coombs Test (DCT)', 'Blood Bank', 'Blood (EDTA)', 4000.00, 120, true, 'NHIS-LAB-132', 3200.00, true, 80, 'Direct antiglobulin test', NOW(), NOW()),
('LAB-BBK-004', 'Indirect Coombs Test (ICT)', 'Blood Bank', 'Blood (EDTA)', 4000.00, 120, true, 'NHIS-LAB-133', 3200.00, true, 80, 'Indirect antiglobulin test', NOW(), NOW()),
('LAB-BBK-005', 'Antibody Screening', 'Blood Bank', 'Blood (EDTA)', 5000.00, 180, true, 'NHIS-LAB-134', 4000.00, true, 80, 'Irregular antibody screen', NOW(), NOW())

ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    specimen_type = EXCLUDED.specimen_type,
    price = EXCLUDED.price,
    tat_minutes = EXCLUDED.tat_minutes,
    is_active = EXCLUDED.is_active,
    nhis_code = EXCLUDED.nhis_code,
    nhis_price = EXCLUDED.nhis_price,
    is_nhis_covered = EXCLUDED.is_nhis_covered,
    nhis_percentage = EXCLUDED.nhis_percentage,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lab_test_catalogue_category ON lab_test_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_lab_test_catalogue_nhis_code ON lab_test_catalogue(nhis_code);
