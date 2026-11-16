-- =====================================================
-- COMPREHENSIVE LAB TEST SEED DATA WITH COMPLETE CATEGORIZATION
-- Migration: 064_comprehensive_lab_test_seed.sql
-- Purpose: Add missing lab tests across all standard categories
-- Non-destructive: Uses ON CONFLICT DO UPDATE
-- Reference: Based on remote_schema.sql master schema
-- =====================================================

-- =====================================================
-- ENSURE REQUIRED COLUMNS EXIST (IDEMPOTENT)
-- Based on remote schema, lab_test_catalogue has these columns:
-- id, code, name, category, specimen_type, price, tat_minutes, is_active,
-- created_at, updated_at, nhis_code, nhis_price, is_nhis_covered, 
-- nhis_percentage, description, updated_by
-- We need to add: category_code, result_template_type, test_parameters
-- =====================================================
DO $$
BEGIN
    -- Add category_code column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lab_test_catalogue' 
        AND column_name = 'category_code'
    ) THEN
        ALTER TABLE public.lab_test_catalogue ADD COLUMN category_code character varying(50);
        COMMENT ON COLUMN public.lab_test_catalogue.category_code IS 'Standardized category code (HEMATOLOGY, MICROBIOLOGY, etc.)';
    END IF;

    -- Add result_template_type column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lab_test_catalogue' 
        AND column_name = 'result_template_type'
    ) THEN
        ALTER TABLE public.lab_test_catalogue ADD COLUMN result_template_type character varying(50);
        COMMENT ON COLUMN public.lab_test_catalogue.result_template_type IS 'UI template type for result entry (numeric_table, culture_sensitivity, etc.)';
    END IF;

    -- Add test_parameters column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lab_test_catalogue' 
        AND column_name = 'test_parameters'
    ) THEN
        ALTER TABLE public.lab_test_catalogue ADD COLUMN test_parameters jsonb;
        COMMENT ON COLUMN public.lab_test_catalogue.test_parameters IS 'JSON configuration for test parameters and reference ranges';
    END IF;
END $$;

-- =====================================================
-- PARASITOLOGY TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, description, created_at, updated_at
) VALUES
('LAB-PAR-001', 'Malaria Parasite (Microscopy - Thick/Thin Film)', 'Parasitology', 'PARASITOLOGY', 'Blood (EDTA)', 2000.00, 60, true, 'NHIS-LAB-PAR-001', 1600.00, true, 100, 'parasite_report', 'Microscopic examination for malaria parasites with species identification and density grading', NOW(), NOW()),
('LAB-PAR-002', 'Stool Ova & Parasites', 'Parasitology', 'PARASITOLOGY', 'Stool', 2500.00, 60, true, 'NHIS-LAB-PAR-002', 2000.00, true, 80, 'parasite_report', 'Microscopic examination of stool for intestinal parasites', NOW(), NOW()),
('LAB-PAR-003', 'Skin Scraping for Parasites', 'Parasitology', 'PARASITOLOGY', 'Skin Scraping', 2500.00, 60, true, 'NHIS-LAB-PAR-003', 2000.00, true, 80, 'parasite_report', 'Examination for scabies mites and other skin parasites', NOW(), NOW()),
('LAB-PAR-004', 'Wet Mount (Trichomonas)', 'Parasitology', 'PARASITOLOGY', 'Vaginal Swab', 1500.00, 30, true, 'NHIS-LAB-PAR-004', 1200.00, true, 80, 'parasite_report', 'Wet preparation for Trichomonas vaginalis', NOW(), NOW()),
('LAB-PAR-005', 'Modified Ziehl-Neelsen Stain (Cryptosporidium)', 'Parasitology', 'PARASITOLOGY', 'Stool', 3500.00, 120, true, 'NHIS-LAB-PAR-005', 2800.00, true, 80, 'parasite_report', 'Special stain for Cryptosporidium and Cyclospora', NOW(), NOW()),
('LAB-PAR-006', 'Filarial Antigen Test', 'Parasitology', 'PARASITOLOGY', 'Blood (EDTA)', 5000.00, 60, true, 'NHIS-LAB-PAR-006', 4000.00, true, 80, 'parasite_report', 'Rapid test for lymphatic filariasis', NOW(), NOW()),
('LAB-PAR-007', 'Urine for Schistosoma haematobium', 'Parasitology', 'PARASITOLOGY', 'Urine', 2000.00, 60, true, 'NHIS-LAB-PAR-007', 1600.00, true, 80, 'parasite_report', 'Microscopic examination of urine for S. haematobium ova', NOW(), NOW()),
('LAB-PAR-008', 'Kato-Katz Technique', 'Parasitology', 'PARASITOLOGY', 'Stool', 2500.00, 90, true, 'NHIS-LAB-PAR-008', 2000.00, true, 80, 'parasite_report', 'Quantitative technique for intestinal helminth eggs', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- URINALYSIS TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, description, created_at, updated_at
) VALUES
('LAB-URI-001', 'Urinalysis (Complete)', 'Urinalysis', 'URINALYSIS', 'Urine', 2500.00, 30, true, 'NHIS-LAB-URI-001', 2000.00, true, 80, 'urinalysis_checklist', 'Complete urinalysis including physical, chemical, and microscopic examination', NOW(), NOW()),
('LAB-URI-002', 'Urine Dipstick', 'Urinalysis', 'URINALYSIS', 'Urine', 1000.00, 15, true, 'NHIS-LAB-URI-002', 800.00, true, 80, 'urinalysis_checklist', 'Chemical analysis using reagent strip', NOW(), NOW()),
('LAB-URI-003', 'Urine Microscopy', 'Urinalysis', 'URINALYSIS', 'Urine', 1500.00, 30, true, 'NHIS-LAB-URI-003', 1200.00, true, 80, 'urinalysis_checklist', 'Microscopic examination of urine sediment', NOW(), NOW()),
('LAB-URI-004', '24-Hour Urine Protein', 'Urinalysis', 'URINALYSIS', 'Urine (24hr)', 4000.00, 180, true, 'NHIS-LAB-URI-004', 3200.00, true, 80, 'numeric_table', 'Quantitative protein measurement in 24-hour urine', NOW(), NOW()),
('LAB-URI-005', 'Urine Protein/Creatinine Ratio', 'Urinalysis', 'URINALYSIS', 'Urine (Spot)', 3500.00, 120, true, 'NHIS-LAB-URI-005', 2800.00, true, 80, 'panel_numeric', 'Spot urine protein to creatinine ratio', NOW(), NOW()),
('LAB-URI-006', 'Urine Albumin/Creatinine Ratio (ACR)', 'Urinalysis', 'URINALYSIS', 'Urine (Spot)', 4000.00, 120, true, 'NHIS-LAB-URI-006', 3200.00, true, 80, 'panel_numeric', 'Microalbuminuria screening', NOW(), NOW()),
('LAB-URI-007', 'Urine for Bence Jones Protein', 'Urinalysis', 'URINALYSIS', 'Urine', 5000.00, 1440, true, 'NHIS-LAB-URI-007', 4000.00, true, 80, 'qualitative_quantitative', 'Detection of Bence Jones proteins', NOW(), NOW()),
('LAB-URI-008', '24-Hour Urine Creatinine Clearance', 'Urinalysis', 'URINALYSIS', 'Urine (24hr) + Blood', 5500.00, 180, true, 'NHIS-LAB-URI-008', 4400.00, true, 80, 'panel_numeric', 'Calculated creatinine clearance', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- HISTOPATHOLOGY & CYTOLOGY TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, description, created_at, updated_at
) VALUES
('LAB-HIS-001', 'Histopathology (Tissue Biopsy)', 'Histopathology', 'HISTOPATHOLOGY', 'Tissue', 25000.00, 10080, true, 'NHIS-LAB-HIS-001', 20000.00, true, 80, 'narrative_diagnostic', 'Microscopic examination of tissue specimen', NOW(), NOW()),
('LAB-HIS-002', 'Cervical Pap Smear (Cytology)', 'Histopathology', 'HISTOPATHOLOGY', 'Cervical Swab', 5000.00, 4320, true, 'NHIS-LAB-HIS-002', 4000.00, true, 80, 'narrative_diagnostic', 'Cervical cancer screening', NOW(), NOW()),
('LAB-HIS-003', 'Fine Needle Aspiration Cytology (FNAC)', 'Histopathology', 'HISTOPATHOLOGY', 'Aspirate', 15000.00, 4320, true, 'NHIS-LAB-HIS-003', 12000.00, true, 80, 'narrative_diagnostic', 'Cytological examination of aspirated material', NOW(), NOW()),
('LAB-HIS-004', 'Frozen Section', 'Histopathology', 'HISTOPATHOLOGY', 'Tissue', 35000.00, 60, true, 'NHIS-LAB-HIS-004', 28000.00, true, 80, 'narrative_diagnostic', 'Intraoperative rapid diagnosis', NOW(), NOW()),
('LAB-HIS-005', 'Immunohistochemistry (Per Marker)', 'Histopathology', 'HISTOPATHOLOGY', 'Tissue Block', 15000.00, 2880, true, 'NHIS-LAB-HIS-005', 12000.00, true, 80, 'narrative_diagnostic', 'Special staining for specific markers', NOW(), NOW()),
('LAB-HIS-006', 'Special Stains (PAS, Masson, etc.)', 'Histopathology', 'HISTOPATHOLOGY', 'Tissue Block', 8000.00, 1440, true, 'NHIS-LAB-HIS-006', 6400.00, true, 80, 'narrative_diagnostic', 'Histochemical special stains', NOW(), NOW()),
('LAB-HIS-007', 'Fluid Cytology (Pleural/Ascitic/CSF)', 'Histopathology', 'HISTOPATHOLOGY', 'Body Fluid', 8000.00, 2880, true, 'NHIS-LAB-HIS-007', 6400.00, true, 80, 'narrative_diagnostic', 'Cytological examination of body fluids', NOW(), NOW()),
('LAB-HIS-008', 'Sputum Cytology', 'Histopathology', 'HISTOPATHOLOGY', 'Sputum', 6000.00, 2880, true, 'NHIS-LAB-HIS-008', 4800.00, true, 80, 'narrative_diagnostic', 'Cytological examination for malignant cells', NOW(), NOW()),
('LAB-HIS-009', 'Urine Cytology', 'Histopathology', 'HISTOPATHOLOGY', 'Urine', 6000.00, 2880, true, 'NHIS-LAB-HIS-009', 4800.00, true, 80, 'narrative_diagnostic', 'Cytological examination of urine for malignant cells', NOW(), NOW()),
('LAB-HIS-010', 'Cell Block Preparation', 'Histopathology', 'HISTOPATHOLOGY', 'Body Fluid', 10000.00, 4320, true, 'NHIS-LAB-HIS-010', 8000.00, true, 80, 'narrative_diagnostic', 'Cell block from fluid specimens for histology', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- MOLECULAR DIAGNOSTICS & RAPID TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, description, created_at, updated_at
) VALUES
('LAB-MOL-001', 'GeneXpert MTB/RIF', 'Molecular Diagnostics', 'MOLECULAR', 'Sputum', 15000.00, 180, true, 'NHIS-LAB-MOL-001', 12000.00, true, 100, 'binary_metadata', 'Rapid TB PCR with rifampicin resistance detection', NOW(), NOW()),
('LAB-MOL-002', 'COVID-19 RT-PCR', 'Molecular Diagnostics', 'MOLECULAR', 'Nasopharyngeal Swab', 25000.00, 360, true, 'NHIS-LAB-MOL-002', 20000.00, true, 100, 'binary_metadata', 'SARS-CoV-2 RNA detection by PCR', NOW(), NOW()),
('LAB-MOL-003', 'Hepatitis B Viral Load (HBV DNA)', 'Molecular Diagnostics', 'MOLECULAR', 'Blood (EDTA)', 35000.00, 4320, true, 'NHIS-LAB-MOL-003', 28000.00, true, 80, 'binary_metadata', 'Quantitative HBV DNA by PCR', NOW(), NOW()),
('LAB-MOL-004', 'Hepatitis C Viral Load (HCV RNA)', 'Molecular Diagnostics', 'MOLECULAR', 'Blood (EDTA)', 40000.00, 4320, true, 'NHIS-LAB-MOL-004', 32000.00, true, 80, 'binary_metadata', 'Quantitative HCV RNA by PCR', NOW(), NOW()),
('LAB-MOL-005', 'HPV DNA Genotyping', 'Molecular Diagnostics', 'MOLECULAR', 'Cervical Swab', 25000.00, 4320, true, 'NHIS-LAB-MOL-005', 20000.00, true, 80, 'binary_metadata', 'High-risk HPV detection with genotyping', NOW(), NOW()),
('LAB-MOL-006', 'Chlamydia/Gonorrhea PCR', 'Molecular Diagnostics', 'MOLECULAR', 'Urethral/Cervical Swab', 20000.00, 1440, true, 'NHIS-LAB-MOL-006', 16000.00, true, 80, 'binary_metadata', 'Molecular detection of CT/NG', NOW(), NOW()),
('LAB-MOL-007', 'Dengue NS1 Antigen (Rapid)', 'Molecular Diagnostics', 'MOLECULAR', 'Blood (Plain)', 5000.00, 30, true, 'NHIS-LAB-MOL-007', 4000.00, true, 80, 'binary_metadata', 'Rapid dengue NS1 antigen detection', NOW(), NOW()),
('LAB-MOL-008', 'Lassa Fever PCR', 'Molecular Diagnostics', 'MOLECULAR', 'Blood (EDTA)', 50000.00, 1440, true, 'NHIS-LAB-MOL-008', 40000.00, true, 100, 'binary_metadata', 'Lassa virus RNA detection', NOW(), NOW()),
('LAB-MOL-009', 'COVID-19 Rapid Antigen Test', 'Molecular Diagnostics', 'MOLECULAR', 'Nasopharyngeal Swab', 8000.00, 30, true, 'NHIS-LAB-MOL-009', 6400.00, true, 100, 'binary_metadata', 'Rapid SARS-CoV-2 antigen detection', NOW(), NOW()),
('LAB-MOL-010', 'Influenza A/B Rapid Test', 'Molecular Diagnostics', 'MOLECULAR', 'Nasopharyngeal Swab', 6000.00, 30, true, 'NHIS-LAB-MOL-010', 4800.00, true, 80, 'binary_metadata', 'Rapid influenza virus detection', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- ADDITIONAL HEMATOLOGY TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, test_parameters, description, created_at, updated_at
) VALUES
('LAB-HEM-011', 'Absolute Neutrophil Count', 'Hematology', 'HEMATOLOGY', 'Blood (EDTA)', 2000.00, 60, true, 'NHIS-LAB-HEM-011', 1600.00, true, 80, 'numeric_table', NULL, 'Calculated absolute neutrophil count', NOW(), NOW()),
('LAB-HEM-012', 'Osmotic Fragility Test', 'Hematology', 'HEMATOLOGY', 'Blood (Heparinized)', 5000.00, 180, true, 'NHIS-LAB-HEM-012', 4000.00, true, 80, 'numeric_table', NULL, 'Red cell osmotic fragility', NOW(), NOW()),
('LAB-HEM-013', 'Heinz Body Stain', 'Hematology', 'HEMATOLOGY', 'Blood (EDTA)', 3000.00, 120, true, 'NHIS-LAB-HEM-013', 2400.00, true, 80, 'numeric_table', NULL, 'Detection of Heinz bodies in G6PD deficiency', NOW(), NOW()),
('LAB-HEM-014', 'Ham Test (Acidified Serum Test)', 'Hematology', 'HEMATOLOGY', 'Blood (EDTA)', 6000.00, 180, true, 'NHIS-LAB-HEM-014', 4800.00, true, 80, 'qualitative_quantitative', NULL, 'Screening for PNH', NOW(), NOW()),
('LAB-HEM-015', 'LE Cell Preparation', 'Hematology', 'HEMATOLOGY', 'Blood (EDTA)', 4000.00, 180, true, 'NHIS-LAB-HEM-015', 3200.00, true, 80, 'qualitative_quantitative', NULL, 'LE cells for lupus screening', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- ADDITIONAL CLINICAL CHEMISTRY TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, test_parameters, description, created_at, updated_at
) VALUES
('LAB-CHM-035', 'Fructosamine', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 5000.00, 120, true, 'NHIS-LAB-CHM-035', 4000.00, true, 80, 'panel_numeric', NULL, '2-3 week glycemic control', NOW(), NOW()),
('LAB-CHM-036', 'Serum Iron', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 3500.00, 120, true, 'NHIS-LAB-CHM-036', 2800.00, true, 80, 'panel_numeric', NULL, 'Serum iron level', NOW(), NOW()),
('LAB-CHM-037', 'TIBC (Total Iron Binding Capacity)', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 3500.00, 120, true, 'NHIS-LAB-CHM-037', 2800.00, true, 80, 'panel_numeric', NULL, 'Iron binding capacity', NOW(), NOW()),
('LAB-CHM-038', 'Ferritin', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 6000.00, 120, true, 'NHIS-LAB-CHM-038', 4800.00, true, 80, 'panel_numeric', NULL, 'Iron storage marker', NOW(), NOW()),
('LAB-CHM-039', 'Iron Studies (Complete)', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 10000.00, 180, true, 'NHIS-LAB-CHM-039', 8000.00, true, 80, 'panel_numeric', 
    '{"components": [{"name": "Serum Iron", "unit": "µg/dL", "reference_range": "60-170"}, {"name": "TIBC", "unit": "µg/dL", "reference_range": "250-370"}, {"name": "Transferrin Saturation", "unit": "%", "reference_range": "20-50"}, {"name": "Ferritin", "unit": "ng/mL", "reference_range": "12-150 (F) / 12-300 (M)"}], "group": "Iron Studies"}'::jsonb,
    'Complete iron profile', NOW(), NOW()),
('LAB-CHM-040', 'Vitamin B12', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-CHM-040', 6400.00, true, 80, 'panel_numeric', NULL, 'Vitamin B12 level', NOW(), NOW()),
('LAB-CHM-041', 'Folate (Serum)', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 6000.00, 1440, true, 'NHIS-LAB-CHM-041', 4800.00, true, 80, 'panel_numeric', NULL, 'Serum folate level', NOW(), NOW()),
('LAB-CHM-042', 'Homocysteine', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (EDTA)', 10000.00, 1440, true, 'NHIS-LAB-CHM-042', 8000.00, true, 80, 'panel_numeric', NULL, 'Cardiovascular risk marker', NOW(), NOW()),
('LAB-CHM-043', 'Ammonia', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (EDTA on ice)', 6000.00, 60, true, 'NHIS-LAB-CHM-043', 4800.00, true, 80, 'panel_numeric', NULL, 'Blood ammonia level', NOW(), NOW()),
('LAB-CHM-044', 'Lactate', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Fluoride on ice)', 4000.00, 60, true, 'NHIS-LAB-CHM-044', 3200.00, true, 80, 'panel_numeric', NULL, 'Blood lactate level', NOW(), NOW()),
('LAB-CHM-045', 'Arterial Blood Gas (ABG)', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Arterial Blood', 8000.00, 30, true, 'NHIS-LAB-CHM-045', 6400.00, true, 80, 'panel_numeric',
    '{"components": [{"name": "pH", "unit": "", "reference_range": "7.35-7.45"}, {"name": "pCO2", "unit": "mmHg", "reference_range": "35-45"}, {"name": "pO2", "unit": "mmHg", "reference_range": "80-100"}, {"name": "HCO3", "unit": "mEq/L", "reference_range": "22-26"}, {"name": "Base Excess", "unit": "mEq/L", "reference_range": "-2 to +2"}, {"name": "O2 Saturation", "unit": "%", "reference_range": "95-100"}]}'::jsonb,
    'Arterial blood gas analysis', NOW(), NOW()),
('LAB-CHM-046', 'CSF Glucose', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Cerebrospinal Fluid', 2500.00, 60, true, 'NHIS-LAB-CHM-046', 2000.00, true, 80, 'panel_numeric', NULL, 'CSF glucose level', NOW(), NOW()),
('LAB-CHM-047', 'CSF Protein', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Cerebrospinal Fluid', 2500.00, 60, true, 'NHIS-LAB-CHM-047', 2000.00, true, 80, 'panel_numeric', NULL, 'CSF protein level', NOW(), NOW()),
('LAB-CHM-048', 'Ceruloplasmin', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-CHM-048', 6400.00, true, 80, 'panel_numeric', NULL, 'Wilson disease marker', NOW(), NOW()),
('LAB-CHM-049', 'Serum Copper', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 6000.00, 1440, true, 'NHIS-LAB-CHM-049', 4800.00, true, 80, 'panel_numeric', NULL, 'Copper level', NOW(), NOW()),
('LAB-CHM-050', 'Serum Zinc', 'Clinical Chemistry', 'CLINICAL_CHEMISTRY', 'Blood (Plain)', 6000.00, 1440, true, 'NHIS-LAB-CHM-050', 4800.00, true, 80, 'panel_numeric', NULL, 'Zinc level', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    test_parameters = COALESCE(EXCLUDED.test_parameters, lab_test_catalogue.test_parameters),
    updated_at = NOW();

-- =====================================================
-- ADDITIONAL SEROLOGY/IMMUNOLOGY TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, description, created_at, updated_at
) VALUES
('LAB-SER-023', 'Hepatitis B Panel (HBsAg, Anti-HBs, Anti-HBc, HBeAg, Anti-HBe)', 'Serology', 'SEROLOGY', 'Blood (Plain)', 18000.00, 1440, true, 'NHIS-LAB-SER-023', 14400.00, true, 80, 'qualitative_quantitative', 'Complete Hepatitis B serological profile', NOW(), NOW()),
('LAB-SER-024', 'Anti-dsDNA', 'Serology', 'SEROLOGY', 'Blood (Plain)', 15000.00, 1440, true, 'NHIS-LAB-SER-024', 12000.00, true, 80, 'qualitative_quantitative', 'Lupus-specific antibody', NOW(), NOW()),
('LAB-SER-025', 'Complement C3', 'Serology', 'SEROLOGY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-SER-025', 6400.00, true, 80, 'panel_numeric', 'Complement component C3', NOW(), NOW()),
('LAB-SER-026', 'Complement C4', 'Serology', 'SEROLOGY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-SER-026', 6400.00, true, 80, 'panel_numeric', 'Complement component C4', NOW(), NOW()),
('LAB-SER-027', 'IgE (Total)', 'Serology', 'SEROLOGY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-SER-027', 6400.00, true, 80, 'panel_numeric', 'Total immunoglobulin E', NOW(), NOW()),
('LAB-SER-028', 'IgG Subclasses', 'Serology', 'SEROLOGY', 'Blood (Plain)', 25000.00, 2880, true, 'NHIS-LAB-SER-028', 20000.00, true, 80, 'panel_numeric', 'IgG1, IgG2, IgG3, IgG4 levels', NOW(), NOW()),
('LAB-SER-029', 'Immunoglobulins (IgG, IgA, IgM)', 'Serology', 'SEROLOGY', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-SER-029', 9600.00, true, 80, 'panel_numeric', 'Quantitative immunoglobulin levels', NOW(), NOW()),
('LAB-SER-030', 'TORCH Panel (IgG & IgM)', 'Serology', 'SEROLOGY', 'Blood (Plain)', 25000.00, 1440, true, 'NHIS-LAB-SER-030', 20000.00, true, 80, 'qualitative_quantitative', 'Toxoplasma, Rubella, CMV, Herpes screening', NOW(), NOW()),
('LAB-SER-031', 'CMV IgG/IgM', 'Serology', 'SEROLOGY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-SER-031', 6400.00, true, 80, 'qualitative_quantitative', 'Cytomegalovirus antibodies', NOW(), NOW()),
('LAB-SER-032', 'EBV Panel (VCA IgG, VCA IgM, EBNA)', 'Serology', 'SEROLOGY', 'Blood (Plain)', 15000.00, 1440, true, 'NHIS-LAB-SER-032', 12000.00, true, 80, 'qualitative_quantitative', 'Epstein-Barr virus serology', NOW(), NOW()),
('LAB-SER-033', 'H. pylori IgG', 'Serology', 'SEROLOGY', 'Blood (Plain)', 5000.00, 120, true, 'NHIS-LAB-SER-033', 4000.00, true, 80, 'qualitative_quantitative', 'Helicobacter pylori antibody', NOW(), NOW()),
('LAB-SER-034', 'H. pylori Stool Antigen', 'Serology', 'SEROLOGY', 'Stool', 6000.00, 120, true, 'NHIS-LAB-SER-034', 4800.00, true, 80, 'qualitative_quantitative', 'Helicobacter pylori antigen in stool', NOW(), NOW()),
('LAB-SER-035', 'CA-19-9 (Pancreatic Cancer Marker)', 'Serology', 'SEROLOGY', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-SER-035', 9600.00, true, 80, 'panel_numeric', 'Pancreatic/GI tumor marker', NOW(), NOW()),
('LAB-SER-036', 'CA-15-3 (Breast Cancer Marker)', 'Serology', 'SEROLOGY', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-SER-036', 9600.00, true, 80, 'panel_numeric', 'Breast tumor marker', NOW(), NOW()),
('LAB-SER-037', 'Beta-2 Microglobulin', 'Serology', 'SEROLOGY', 'Blood (Plain)', 10000.00, 1440, true, 'NHIS-LAB-SER-037', 8000.00, true, 80, 'panel_numeric', 'Myeloma/lymphoma marker', NOW(), NOW()),
('LAB-SER-038', 'Procalcitonin', 'Serology', 'SEROLOGY', 'Blood (Plain)', 15000.00, 120, true, 'NHIS-LAB-SER-038', 12000.00, true, 80, 'panel_numeric', 'Bacterial sepsis marker', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- ADDITIONAL ENDOCRINOLOGY/HORMONE TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, description, created_at, updated_at
) VALUES
('LAB-HOR-015', 'Growth Hormone (GH)', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 10000.00, 1440, true, 'NHIS-LAB-HOR-015', 8000.00, true, 80, 'numeric_timing', 'Growth hormone level', NOW(), NOW()),
('LAB-HOR-016', 'IGF-1 (Somatomedin C)', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-HOR-016', 9600.00, true, 80, 'numeric_timing', 'Insulin-like growth factor 1', NOW(), NOW()),
('LAB-HOR-017', 'ACTH (Adrenocorticotropic Hormone)', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (EDTA on ice)', 12000.00, 1440, true, 'NHIS-LAB-HOR-017', 9600.00, true, 80, 'numeric_timing', 'Pituitary ACTH level', NOW(), NOW()),
('LAB-HOR-018', 'Aldosterone', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 10000.00, 1440, true, 'NHIS-LAB-HOR-018', 8000.00, true, 80, 'numeric_timing', 'Aldosterone level', NOW(), NOW()),
('LAB-HOR-019', 'Renin Activity (PRA)', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (EDTA)', 15000.00, 1440, true, 'NHIS-LAB-HOR-019', 12000.00, true, 80, 'numeric_timing', 'Plasma renin activity', NOW(), NOW()),
('LAB-HOR-020', 'DHEA-S', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-HOR-020', 6400.00, true, 80, 'numeric_timing', 'Dehydroepiandrosterone sulfate', NOW(), NOW()),
('LAB-HOR-021', 'Androstenedione', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 10000.00, 1440, true, 'NHIS-LAB-HOR-021', 8000.00, true, 80, 'numeric_timing', 'Androgen precursor level', NOW(), NOW()),
('LAB-HOR-022', '17-OH Progesterone', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 10000.00, 1440, true, 'NHIS-LAB-HOR-022', 8000.00, true, 80, 'numeric_timing', 'Congenital adrenal hyperplasia marker', NOW(), NOW()),
('LAB-HOR-023', 'Anti-Mullerian Hormone (AMH)', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 20000.00, 1440, true, 'NHIS-LAB-HOR-023', 16000.00, true, 80, 'numeric_timing', 'Ovarian reserve marker', NOW(), NOW()),
('LAB-HOR-024', 'Sex Hormone Binding Globulin (SHBG)', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-HOR-024', 6400.00, true, 80, 'numeric_timing', 'Sex hormone binding protein', NOW(), NOW()),
('LAB-HOR-025', 'Free Testosterone', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 10000.00, 1440, true, 'NHIS-LAB-HOR-025', 8000.00, true, 80, 'numeric_timing', 'Unbound testosterone level', NOW(), NOW()),
('LAB-HOR-026', 'Cortisol (24-hour Urine)', 'Endocrinology', 'ENDOCRINOLOGY', 'Urine (24hr)', 10000.00, 1440, true, 'NHIS-LAB-HOR-026', 8000.00, true, 80, 'numeric_timing', '24-hour urinary free cortisol', NOW(), NOW()),
('LAB-HOR-027', 'Thyroglobulin', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-HOR-027', 9600.00, true, 80, 'numeric_timing', 'Thyroid cancer marker', NOW(), NOW()),
('LAB-HOR-028', 'Anti-TPO Antibodies', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-HOR-028', 6400.00, true, 80, 'qualitative_quantitative', 'Thyroid peroxidase antibodies', NOW(), NOW()),
('LAB-HOR-029', 'Anti-Thyroglobulin Antibodies', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 8000.00, 1440, true, 'NHIS-LAB-HOR-029', 6400.00, true, 80, 'qualitative_quantitative', 'Thyroglobulin antibodies', NOW(), NOW()),
('LAB-HOR-030', 'Calcitonin', 'Endocrinology', 'ENDOCRINOLOGY', 'Blood (Plain)', 15000.00, 1440, true, 'NHIS-LAB-HOR-030', 12000.00, true, 80, 'numeric_timing', 'Medullary thyroid cancer marker', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- ADDITIONAL MICROBIOLOGY TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, description, created_at, updated_at
) VALUES
('LAB-MIC-018', 'Ear Swab M/C/S', 'Microbiology', 'MICROBIOLOGY', 'Ear Swab', 4500.00, 2880, true, 'NHIS-LAB-MIC-018', 3600.00, true, 80, 'culture_sensitivity', 'Ear culture and sensitivity', NOW(), NOW()),
('LAB-MIC-019', 'Eye Swab M/C/S', 'Microbiology', 'MICROBIOLOGY', 'Eye Swab', 4500.00, 2880, true, 'NHIS-LAB-MIC-019', 3600.00, true, 80, 'culture_sensitivity', 'Eye culture and sensitivity', NOW(), NOW()),
('LAB-MIC-020', 'Nasal Swab M/C/S', 'Microbiology', 'MICROBIOLOGY', 'Nasal Swab', 4500.00, 2880, true, 'NHIS-LAB-MIC-020', 3600.00, true, 80, 'culture_sensitivity', 'Nasal culture and sensitivity', NOW(), NOW()),
('LAB-MIC-021', 'Aspirate Fluid M/C/S', 'Microbiology', 'MICROBIOLOGY', 'Aspirate', 5500.00, 2880, true, 'NHIS-LAB-MIC-021', 4400.00, true, 80, 'culture_sensitivity', 'Culture of aspirated fluid', NOW(), NOW()),
('LAB-MIC-022', 'Catheter Tip Culture', 'Microbiology', 'MICROBIOLOGY', 'Catheter Tip', 5000.00, 2880, true, 'NHIS-LAB-MIC-022', 4000.00, true, 80, 'culture_sensitivity', 'IV catheter tip culture', NOW(), NOW()),
('LAB-MIC-023', 'Fungal Culture', 'Microbiology', 'MICROBIOLOGY', 'Various', 6000.00, 20160, true, 'NHIS-LAB-MIC-023', 4800.00, true, 80, 'culture_sensitivity', 'Culture for fungal organisms', NOW(), NOW()),
('LAB-MIC-024', 'Anaerobic Culture', 'Microbiology', 'MICROBIOLOGY', 'Various', 8000.00, 4320, true, 'NHIS-LAB-MIC-024', 6400.00, true, 80, 'culture_sensitivity', 'Culture for anaerobic organisms', NOW(), NOW()),
('LAB-MIC-025', 'TB Culture (Solid Media)', 'Microbiology', 'MICROBIOLOGY', 'Sputum', 10000.00, 43200, true, 'NHIS-LAB-MIC-025', 8000.00, true, 100, 'culture_sensitivity', 'Mycobacterial culture on solid media', NOW(), NOW()),
('LAB-MIC-026', 'TB Culture (MGIT/Liquid)', 'Microbiology', 'MICROBIOLOGY', 'Sputum', 15000.00, 30240, true, 'NHIS-LAB-MIC-026', 12000.00, true, 100, 'culture_sensitivity', 'Rapid liquid TB culture', NOW(), NOW()),
('LAB-MIC-027', 'Endocervical Swab M/C/S', 'Microbiology', 'MICROBIOLOGY', 'Endocervical Swab', 4500.00, 2880, true, 'NHIS-LAB-MIC-027', 3600.00, true, 80, 'culture_sensitivity', 'Endocervical culture', NOW(), NOW()),
('LAB-MIC-028', 'Prostatic Secretion M/C/S', 'Microbiology', 'MICROBIOLOGY', 'Prostatic Secretion', 5000.00, 2880, true, 'NHIS-LAB-MIC-028', 4000.00, true, 80, 'culture_sensitivity', 'Prostatic fluid culture', NOW(), NOW()),
('LAB-MIC-029', 'Bronchoalveolar Lavage (BAL) Culture', 'Microbiology', 'MICROBIOLOGY', 'BAL Fluid', 8000.00, 4320, true, 'NHIS-LAB-MIC-029', 6400.00, true, 80, 'culture_sensitivity', 'BAL culture and sensitivity', NOW(), NOW()),
('LAB-MIC-030', 'Tissue Culture', 'Microbiology', 'MICROBIOLOGY', 'Tissue', 8000.00, 4320, true, 'NHIS-LAB-MIC-030', 6400.00, true, 80, 'culture_sensitivity', 'Tissue specimen culture', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- ADDITIONAL COAGULATION TESTS
-- =====================================================
INSERT INTO lab_test_catalogue (
    code, name, category, category_code, specimen_type, price, tat_minutes,
    is_active, nhis_code, nhis_price, is_nhis_covered, nhis_percentage,
    result_template_type, description, created_at, updated_at
) VALUES
('LAB-COA-008', 'Protein C', 'Coagulation', 'COAGULATION', 'Blood (Citrate)', 15000.00, 1440, true, 'NHIS-LAB-COA-008', 12000.00, true, 80, 'numeric_table', 'Protein C activity', NOW(), NOW()),
('LAB-COA-009', 'Protein S', 'Coagulation', 'COAGULATION', 'Blood (Citrate)', 15000.00, 1440, true, 'NHIS-LAB-COA-009', 12000.00, true, 80, 'numeric_table', 'Protein S activity', NOW(), NOW()),
('LAB-COA-010', 'Antithrombin III', 'Coagulation', 'COAGULATION', 'Blood (Citrate)', 12000.00, 1440, true, 'NHIS-LAB-COA-010', 9600.00, true, 80, 'numeric_table', 'Antithrombin III level', NOW(), NOW()),
('LAB-COA-011', 'Lupus Anticoagulant', 'Coagulation', 'COAGULATION', 'Blood (Citrate)', 15000.00, 1440, true, 'NHIS-LAB-COA-011', 12000.00, true, 80, 'qualitative_quantitative', 'Lupus anticoagulant screen', NOW(), NOW()),
('LAB-COA-012', 'Factor V Leiden', 'Coagulation', 'COAGULATION', 'Blood (EDTA)', 25000.00, 2880, true, 'NHIS-LAB-COA-012', 20000.00, true, 80, 'binary_metadata', 'Factor V Leiden mutation', NOW(), NOW()),
('LAB-COA-013', 'Prothrombin Gene Mutation (G20210A)', 'Coagulation', 'COAGULATION', 'Blood (EDTA)', 25000.00, 2880, true, 'NHIS-LAB-COA-013', 20000.00, true, 80, 'binary_metadata', 'Prothrombin gene mutation', NOW(), NOW()),
('LAB-COA-014', 'Anti-Cardiolipin Antibodies (IgG, IgM)', 'Coagulation', 'COAGULATION', 'Blood (Plain)', 12000.00, 1440, true, 'NHIS-LAB-COA-014', 9600.00, true, 80, 'qualitative_quantitative', 'Antiphospholipid syndrome marker', NOW(), NOW()),
('LAB-COA-015', 'Anti-Beta2 Glycoprotein I (IgG, IgM)', 'Coagulation', 'COAGULATION', 'Blood (Plain)', 15000.00, 1440, true, 'NHIS-LAB-COA-015', 12000.00, true, 80, 'qualitative_quantitative', 'Antiphospholipid syndrome marker', NOW(), NOW()),
('LAB-COA-016', 'Thrombin Time (TT)', 'Coagulation', 'COAGULATION', 'Blood (Citrate)', 4000.00, 60, true, 'NHIS-LAB-COA-016', 3200.00, true, 80, 'numeric_table', 'Thrombin time', NOW(), NOW()),
('LAB-COA-017', 'Platelet Function Test', 'Coagulation', 'COAGULATION', 'Blood (Citrate)', 15000.00, 180, true, 'NHIS-LAB-COA-017', 12000.00, true, 80, 'numeric_table', 'Platelet aggregation studies', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    category_code = EXCLUDED.category_code,
    result_template_type = EXCLUDED.result_template_type,
    updated_at = NOW();

-- =====================================================
-- FIX MISCATEGORIZED TESTS
-- =====================================================

-- Urinalysis should be in Urinalysis category, not Microbiology
UPDATE lab_test_catalogue SET 
    category = 'Urinalysis',
    category_code = 'URINALYSIS',
    result_template_type = 'urinalysis_checklist'
WHERE code = 'MIC001' OR name ILIKE 'urinalysis';

-- Malaria tests should be in Parasitology
UPDATE lab_test_catalogue SET 
    category = 'Parasitology',
    category_code = 'PARASITOLOGY',
    result_template_type = 'parasite_report'
WHERE name ILIKE '%malaria%' AND category != 'Parasitology';

-- Update stool microscopy to be Parasitology (not Microbiology)
UPDATE lab_test_catalogue SET 
    category = 'Parasitology',
    category_code = 'PARASITOLOGY',
    result_template_type = 'parasite_report'
WHERE name ILIKE '%stool microscopy%' OR name ILIKE '%stool ova%';

-- GeneXpert should be Molecular
UPDATE lab_test_catalogue SET 
    category = 'Molecular Diagnostics',
    category_code = 'MOLECULAR',
    result_template_type = 'binary_metadata'
WHERE name ILIKE '%genexpert%';

-- =====================================================
-- CREATE COMPREHENSIVE CATEGORY SUMMARY VIEW
-- =====================================================

CREATE OR REPLACE VIEW lab_test_category_summary AS
SELECT 
    COALESCE(category_code, 
        CASE 
            WHEN category = 'Hematology' THEN 'HEMATOLOGY'
            WHEN category IN ('Clinical Chemistry', 'Chemical Pathology') THEN 'CLINICAL_CHEMISTRY'
            WHEN category = 'Microbiology' THEN 'MICROBIOLOGY'
            WHEN category = 'Parasitology' THEN 'PARASITOLOGY'
            WHEN category = 'Serology' THEN 'SEROLOGY'
            WHEN category = 'Urinalysis' THEN 'URINALYSIS'
            WHEN category IN ('Histopathology', 'Histopathology & Cytology') THEN 'HISTOPATHOLOGY'
            WHEN category IN ('Endocrinology', 'Hormones') THEN 'ENDOCRINOLOGY'
            WHEN category IN ('Molecular Diagnostics', 'Molecular') THEN 'MOLECULAR'
            WHEN category = 'Coagulation' THEN 'COAGULATION'
            WHEN category = 'Blood Bank' THEN 'BLOOD_BANK'
            ELSE 'OTHER'
        END
    ) as category_code,
    category as category_name,
    result_template_type,
    COUNT(*) as test_count,
    COUNT(*) FILTER (WHERE is_active) as active_count
FROM lab_test_catalogue
GROUP BY category_code, category, result_template_type
ORDER BY category_code;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
