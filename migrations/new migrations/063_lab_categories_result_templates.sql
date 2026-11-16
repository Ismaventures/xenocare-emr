-- =====================================================
-- LAB CATEGORIES AND RESULT TEMPLATES MIGRATION
-- Migration: 063_lab_categories_result_templates.sql
-- Purpose: Add standardized lab categories and result template types
-- Non-destructive: Preserves existing IDs and records
-- =====================================================

-- =====================================================
-- 1. CREATE LAB CATEGORIES REFERENCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS lab_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    result_template_type VARCHAR(50) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard lab categories with result template types
INSERT INTO lab_categories (code, name, display_name, description, result_template_type, display_order) VALUES
    ('HEMATOLOGY', 'Hematology', 'Hematology', 'Blood cell analysis including CBC, differential counts, and blood typing', 'numeric_table', 1),
    ('CLINICAL_CHEMISTRY', 'Clinical Chemistry', 'Clinical Chemistry / Chemical Pathology', 'Biochemical analysis of blood and body fluids', 'panel_numeric', 2),
    ('MICROBIOLOGY', 'Microbiology', 'Microbiology', 'Culture, sensitivity, and identification of microorganisms', 'culture_sensitivity', 3),
    ('PARASITOLOGY', 'Parasitology', 'Parasitology', 'Detection and identification of parasites in specimens', 'parasite_report', 4),
    ('SEROLOGY', 'Serology', 'Immunology / Serology', 'Antibody and antigen detection for infectious diseases and autoimmune markers', 'qualitative_quantitative', 5),
    ('URINALYSIS', 'Urinalysis', 'Urinalysis', 'Physical, chemical, and microscopic examination of urine', 'urinalysis_checklist', 6),
    ('HISTOPATHOLOGY', 'Histopathology', 'Histopathology & Cytology', 'Tissue examination and pathological diagnosis', 'narrative_diagnostic', 7),
    ('ENDOCRINOLOGY', 'Endocrinology', 'Endocrinology', 'Hormone level measurements', 'numeric_timing', 8),
    ('MOLECULAR', 'Molecular', 'Molecular Diagnostics & Rapid Tests', 'PCR, genetic testing, and point-of-care rapid diagnostics', 'binary_metadata', 9),
    ('COAGULATION', 'Coagulation', 'Coagulation Studies', 'Blood clotting function tests', 'numeric_table', 10),
    ('BLOOD_BANK', 'Blood Bank', 'Blood Bank / Transfusion Medicine', 'Blood typing, cross-matching, and compatibility testing', 'qualitative_quantitative', 11),
    ('HORMONES', 'Hormones', 'Hormone Panel', 'Endocrine and reproductive hormone testing', 'numeric_timing', 12)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    result_template_type = EXCLUDED.result_template_type,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- =====================================================
-- 2. CREATE RESULT TEMPLATE TYPES REFERENCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS lab_result_template_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    ui_schema JSONB NOT NULL, -- Defines the form structure
    default_fields JSONB, -- Default field configurations
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert result template type definitions
INSERT INTO lab_result_template_types (code, name, description, ui_schema, default_fields) VALUES
(
    'numeric_table',
    'Numeric Table',
    'Structured numeric table with parameters, results, units, reference ranges, and flags (Hematology, Coagulation)',
    '{
        "type": "numeric_table",
        "sections": [
            {
                "name": "results",
                "title": "Test Results",
                "fields": [
                    {"name": "parameter", "type": "text", "label": "Parameter", "required": true},
                    {"name": "result_value", "type": "number", "label": "Result", "required": true},
                    {"name": "unit", "type": "text", "label": "Unit"},
                    {"name": "reference_range", "type": "text", "label": "Reference Range"},
                    {"name": "flag", "type": "select", "label": "Flag", "options": ["Low", "Normal", "High", "Critical Low", "Critical High"]}
                ],
                "repeatable": true
            },
            {
                "name": "morphology",
                "title": "Morphology Comments",
                "fields": [
                    {"name": "morphology_findings", "type": "textarea", "label": "Morphology/Comments"}
                ]
            }
        ],
        "hasAutoFlag": true,
        "hasTrendView": false
    }'::jsonb,
    '{
        "show_morphology": true,
        "auto_flag_enabled": true
    }'::jsonb
),
(
    'panel_numeric',
    'Panel-Based Numeric',
    'Grouped analytes with reference ranges, auto-flagging, and trend view (Clinical Chemistry)',
    '{
        "type": "panel_numeric",
        "sections": [
            {
                "name": "panel_results",
                "title": "Panel Results",
                "grouped": true,
                "groups": ["Renal Function", "Liver Function", "Lipid Profile", "Electrolytes", "Cardiac Markers", "Other"],
                "fields": [
                    {"name": "analyte", "type": "text", "label": "Analyte", "required": true},
                    {"name": "result_value", "type": "number", "label": "Result", "required": true},
                    {"name": "unit", "type": "text", "label": "Unit"},
                    {"name": "reference_range", "type": "text", "label": "Reference Range"},
                    {"name": "flag", "type": "select", "label": "Flag", "options": ["Low", "Normal", "High", "Critical"]},
                    {"name": "group", "type": "select", "label": "Panel Group"}
                ],
                "repeatable": true
            },
            {
                "name": "interpretation",
                "title": "Interpretation",
                "fields": [
                    {"name": "interpretation_note", "type": "textarea", "label": "Clinical Interpretation"}
                ]
            }
        ],
        "hasAutoFlag": true,
        "hasTrendView": true,
        "isAgeSexAware": true
    }'::jsonb,
    '{
        "show_trends": true,
        "age_sex_ranges": true,
        "auto_flag_enabled": true
    }'::jsonb
),
(
    'culture_sensitivity',
    'Culture & Sensitivity',
    'Multi-section for microbiology: microscopy, culture results, antibiotic sensitivity matrix (Microbiology)',
    '{
        "type": "culture_sensitivity",
        "sections": [
            {
                "name": "specimen_info",
                "title": "Specimen Information",
                "fields": [
                    {"name": "specimen_type", "type": "text", "label": "Specimen Type"},
                    {"name": "specimen_quality", "type": "select", "label": "Specimen Quality", "options": ["Adequate", "Inadequate", "Contaminated"]},
                    {"name": "collection_date", "type": "datetime", "label": "Collection Date/Time"}
                ]
            },
            {
                "name": "microscopy",
                "title": "Microscopy",
                "fields": [
                    {"name": "gram_stain", "type": "textarea", "label": "Gram Stain Findings"},
                    {"name": "wet_mount", "type": "textarea", "label": "Wet Mount Findings"},
                    {"name": "cell_count", "type": "text", "label": "WBC/RBC Count"},
                    {"name": "epithelial_cells", "type": "text", "label": "Epithelial Cells"},
                    {"name": "other_findings", "type": "textarea", "label": "Other Microscopy Findings"}
                ]
            },
            {
                "name": "culture",
                "title": "Culture Results",
                "fields": [
                    {"name": "growth", "type": "select", "label": "Growth", "options": ["No Growth", "Light Growth", "Moderate Growth", "Heavy Growth", "Mixed Flora"]},
                    {"name": "organism_isolated", "type": "text", "label": "Organism Isolated"},
                    {"name": "colony_count", "type": "text", "label": "Colony Count (CFU/mL)"},
                    {"name": "incubation_time", "type": "text", "label": "Incubation Time"}
                ],
                "repeatable": true
            },
            {
                "name": "sensitivity",
                "title": "Antibiotic Sensitivity",
                "fields": [
                    {"name": "antibiotic", "type": "text", "label": "Antibiotic", "required": true},
                    {"name": "sensitivity_result", "type": "select", "label": "Result", "options": ["S", "I", "R"], "optionLabels": ["Sensitive", "Intermediate", "Resistant"]},
                    {"name": "mic", "type": "text", "label": "MIC (µg/mL)"},
                    {"name": "zone_diameter", "type": "text", "label": "Zone Diameter (mm)"}
                ],
                "repeatable": true,
                "matrixView": true
            },
            {
                "name": "comments",
                "title": "Comments & Recommendations",
                "fields": [
                    {"name": "comments", "type": "textarea", "label": "Comments"},
                    {"name": "recommendations", "type": "textarea", "label": "Recommendations"}
                ]
            }
        ],
        "hasAutoFlag": false,
        "hasTrendView": false
    }'::jsonb,
    '{
        "show_sensitivity_matrix": true,
        "common_antibiotics": ["Amoxicillin", "Ciprofloxacin", "Ceftriaxone", "Gentamicin", "Metronidazole", "Azithromycin", "Levofloxacin", "Nitrofurantoin", "Cotrimoxazole", "Amikacin"]
    }'::jsonb
),
(
    'parasite_report',
    'Parasite Report',
    'Semi-structured for parasitology: detection, species identification, density grading (Parasitology)',
    '{
        "type": "parasite_report",
        "sections": [
            {
                "name": "specimen_info",
                "title": "Specimen Information",
                "fields": [
                    {"name": "specimen_type", "type": "select", "label": "Specimen Type", "options": ["Blood", "Stool", "Urine", "CSF", "Skin Scraping", "Other"]},
                    {"name": "collection_time", "type": "datetime", "label": "Collection Time"},
                    {"name": "examination_method", "type": "multiselect", "label": "Examination Method", "options": ["Direct Smear", "Concentration", "Thick Film", "Thin Film", "Modified ZN Stain"]}
                ]
            },
            {
                "name": "detection",
                "title": "Parasite Detection",
                "fields": [
                    {"name": "parasite_detected", "type": "select", "label": "Parasite Detected", "options": ["Yes", "No"], "required": true},
                    {"name": "species", "type": "text", "label": "Species Identified"},
                    {"name": "stage", "type": "text", "label": "Stage/Form"},
                    {"name": "density_grading", "type": "select", "label": "Density Grading", "options": ["+", "++", "+++", "++++"]},
                    {"name": "parasite_count", "type": "text", "label": "Parasite Count (per µL or HPF)"}
                ],
                "repeatable": true
            },
            {
                "name": "additional",
                "title": "Additional Findings",
                "fields": [
                    {"name": "other_organisms", "type": "textarea", "label": "Other Organisms Seen"},
                    {"name": "notes", "type": "textarea", "label": "Notes/Comments"}
                ]
            }
        ],
        "hasAutoFlag": false,
        "hasTrendView": false
    }'::jsonb,
    '{
        "common_parasites": ["Plasmodium falciparum", "Plasmodium vivax", "Plasmodium malariae", "Plasmodium ovale", "Entamoeba histolytica", "Giardia lamblia", "Ascaris lumbricoides", "Hookworm", "Trichuris trichiura", "Schistosoma haematobium", "Schistosoma mansoni"]
    }'::jsonb
),
(
    'qualitative_quantitative',
    'Qualitative + Quantitative',
    'For serology/immunology: positive/negative with optional titer and confirmation (Serology)',
    '{
        "type": "qualitative_quantitative",
        "sections": [
            {
                "name": "qualitative",
                "title": "Qualitative Result",
                "fields": [
                    {"name": "result", "type": "select", "label": "Result", "options": ["Positive", "Negative", "Reactive", "Non-Reactive", "Indeterminate", "Equivocal"], "required": true},
                    {"name": "signal_cutoff", "type": "number", "label": "Signal/Cutoff Ratio"}
                ]
            },
            {
                "name": "quantitative",
                "title": "Quantitative Result (if applicable)",
                "fields": [
                    {"name": "titer", "type": "text", "label": "Titer"},
                    {"name": "concentration", "type": "number", "label": "Concentration"},
                    {"name": "unit", "type": "text", "label": "Unit"},
                    {"name": "reference_range", "type": "text", "label": "Reference Range"}
                ]
            },
            {
                "name": "confirmation",
                "title": "Confirmation Status",
                "fields": [
                    {"name": "confirmation_test", "type": "text", "label": "Confirmatory Test"},
                    {"name": "confirmation_result", "type": "select", "label": "Confirmation Result", "options": ["Confirmed Positive", "Confirmed Negative", "Pending", "Not Required"]},
                    {"name": "confirmation_date", "type": "date", "label": "Confirmation Date"}
                ]
            },
            {
                "name": "notes",
                "title": "Clinical Notes",
                "fields": [
                    {"name": "interpretation", "type": "textarea", "label": "Interpretation"},
                    {"name": "notes", "type": "textarea", "label": "Additional Notes"}
                ]
            }
        ],
        "hasAutoFlag": false,
        "hasTrendView": true,
        "sensitiveTest": true
    }'::jsonb,
    '{
        "sensitive_results_workflow": true,
        "require_confirmation_for_positive": ["HIV", "Hepatitis"]
    }'::jsonb
),
(
    'urinalysis_checklist',
    'Urinalysis Checklist',
    'Physical, chemical, and microscopy sections for complete urinalysis (Urinalysis)',
    '{
        "type": "urinalysis_checklist",
        "sections": [
            {
                "name": "physical",
                "title": "Physical Examination",
                "fields": [
                    {"name": "color", "type": "select", "label": "Color", "options": ["Colorless", "Pale Yellow", "Yellow", "Dark Yellow", "Amber", "Orange", "Pink/Red", "Brown", "Green", "Cloudy"]},
                    {"name": "appearance", "type": "select", "label": "Appearance/Clarity", "options": ["Clear", "Slightly Cloudy", "Cloudy", "Turbid"]},
                    {"name": "specific_gravity", "type": "number", "label": "Specific Gravity", "min": 1.001, "max": 1.035, "step": 0.001},
                    {"name": "volume", "type": "number", "label": "Volume (mL)"},
                    {"name": "odor", "type": "select", "label": "Odor", "options": ["Normal", "Ammoniacal", "Fruity", "Foul"]}
                ]
            },
            {
                "name": "chemical",
                "title": "Chemical Examination (Dipstick)",
                "fields": [
                    {"name": "ph", "type": "number", "label": "pH", "min": 4.5, "max": 9.0, "step": 0.5},
                    {"name": "protein", "type": "select", "label": "Protein", "options": ["Negative", "Trace", "+", "++", "+++", "++++"]},
                    {"name": "glucose", "type": "select", "label": "Glucose", "options": ["Negative", "Trace", "+", "++", "+++", "++++"]},
                    {"name": "ketones", "type": "select", "label": "Ketones", "options": ["Negative", "Trace", "+", "++", "+++"]},
                    {"name": "blood", "type": "select", "label": "Blood", "options": ["Negative", "Trace", "+", "++", "+++"]},
                    {"name": "bilirubin", "type": "select", "label": "Bilirubin", "options": ["Negative", "+", "++", "+++"]},
                    {"name": "urobilinogen", "type": "select", "label": "Urobilinogen", "options": ["Normal", "+", "++"]},
                    {"name": "nitrite", "type": "select", "label": "Nitrite", "options": ["Negative", "Positive"]},
                    {"name": "leukocyte_esterase", "type": "select", "label": "Leukocyte Esterase", "options": ["Negative", "Trace", "+", "++", "+++"]}
                ]
            },
            {
                "name": "microscopy",
                "title": "Microscopic Examination",
                "fields": [
                    {"name": "rbc", "type": "text", "label": "Red Blood Cells (/HPF)"},
                    {"name": "wbc", "type": "text", "label": "White Blood Cells (/HPF)"},
                    {"name": "epithelial_cells", "type": "text", "label": "Epithelial Cells (/HPF)"},
                    {"name": "casts", "type": "text", "label": "Casts"},
                    {"name": "cast_types", "type": "multiselect", "label": "Cast Types", "options": ["Hyaline", "Granular", "RBC", "WBC", "Waxy", "Fatty"]},
                    {"name": "crystals", "type": "text", "label": "Crystals"},
                    {"name": "crystal_types", "type": "multiselect", "label": "Crystal Types", "options": ["Uric Acid", "Calcium Oxalate", "Triple Phosphate", "Amorphous"]},
                    {"name": "bacteria", "type": "select", "label": "Bacteria", "options": ["None Seen", "Few", "Moderate", "Many"]},
                    {"name": "yeast", "type": "select", "label": "Yeast", "options": ["None Seen", "Few", "Moderate", "Many"]},
                    {"name": "parasites", "type": "text", "label": "Parasites"},
                    {"name": "other_findings", "type": "textarea", "label": "Other Findings"}
                ]
            },
            {
                "name": "interpretation",
                "title": "Interpretation",
                "fields": [
                    {"name": "interpretation", "type": "textarea", "label": "Clinical Interpretation"},
                    {"name": "comments", "type": "textarea", "label": "Comments"}
                ]
            }
        ],
        "hasAutoFlag": true,
        "hasTrendView": false
    }'::jsonb,
    '{
        "flag_abnormal_protein": true,
        "flag_abnormal_glucose": true,
        "flag_bacteria_many": true
    }'::jsonb
),
(
    'narrative_diagnostic',
    'Narrative Diagnostic Report',
    'Full narrative report for histopathology and cytology with consultant approval (Histopathology)',
    '{
        "type": "narrative_diagnostic",
        "sections": [
            {
                "name": "specimen",
                "title": "Specimen Information",
                "fields": [
                    {"name": "specimen_type", "type": "text", "label": "Specimen Type", "required": true},
                    {"name": "specimen_site", "type": "text", "label": "Site/Location"},
                    {"name": "procedure", "type": "text", "label": "Procedure"},
                    {"name": "specimen_received", "type": "datetime", "label": "Date/Time Received"},
                    {"name": "fixative", "type": "text", "label": "Fixative Used"},
                    {"name": "specimen_adequacy", "type": "select", "label": "Specimen Adequacy", "options": ["Adequate", "Suboptimal", "Inadequate"]}
                ]
            },
            {
                "name": "macroscopy",
                "title": "Macroscopic Description",
                "fields": [
                    {"name": "gross_description", "type": "textarea", "label": "Gross Description", "required": true},
                    {"name": "measurements", "type": "text", "label": "Measurements"},
                    {"name": "blocks_submitted", "type": "text", "label": "Number of Blocks Submitted"}
                ]
            },
            {
                "name": "microscopy",
                "title": "Microscopic Description",
                "fields": [
                    {"name": "microscopic_findings", "type": "textarea", "label": "Microscopic Findings", "required": true},
                    {"name": "special_stains", "type": "textarea", "label": "Special Stains"},
                    {"name": "immunohistochemistry", "type": "textarea", "label": "Immunohistochemistry"}
                ]
            },
            {
                "name": "diagnosis",
                "title": "Diagnosis",
                "fields": [
                    {"name": "diagnosis", "type": "textarea", "label": "Final Diagnosis", "required": true},
                    {"name": "snomed_codes", "type": "text", "label": "SNOMED Codes"},
                    {"name": "tumor_staging", "type": "textarea", "label": "TNM Staging (if applicable)"},
                    {"name": "margin_status", "type": "text", "label": "Margin Status"}
                ]
            },
            {
                "name": "recommendation",
                "title": "Recommendations",
                "fields": [
                    {"name": "recommendations", "type": "textarea", "label": "Recommendations"},
                    {"name": "clinical_correlation", "type": "textarea", "label": "Clinical Correlation"}
                ]
            },
            {
                "name": "approval",
                "title": "Report Approval",
                "fields": [
                    {"name": "reported_by", "type": "text", "label": "Reported By", "readonly": true},
                    {"name": "consultant_pathologist", "type": "text", "label": "Consultant Pathologist"},
                    {"name": "approval_status", "type": "select", "label": "Approval Status", "options": ["Draft", "Pending Approval", "Approved", "Amended"]},
                    {"name": "approval_date", "type": "datetime", "label": "Approval Date"}
                ],
                "lockAfterApproval": true
            }
        ],
        "hasAutoFlag": false,
        "hasTrendView": false,
        "requiresConsultantApproval": true
    }'::jsonb,
    '{
        "require_consultant_signoff": true,
        "lock_after_approval": true,
        "allow_amendments": true
    }'::jsonb
),
(
    'numeric_timing',
    'Numeric with Timing',
    'Numeric results with sample timing relevance and trend view (Endocrinology/Hormones)',
    '{
        "type": "numeric_timing",
        "sections": [
            {
                "name": "sample_timing",
                "title": "Sample Timing Information",
                "fields": [
                    {"name": "collection_time", "type": "time", "label": "Collection Time", "required": true},
                    {"name": "fasting_status", "type": "select", "label": "Fasting Status", "options": ["Fasting", "Non-Fasting", "Not Applicable"]},
                    {"name": "sample_timing_notes", "type": "text", "label": "Timing Notes (e.g., Day of Cycle, AM/PM Cortisol)"}
                ]
            },
            {
                "name": "results",
                "title": "Test Results",
                "fields": [
                    {"name": "parameter", "type": "text", "label": "Parameter", "required": true},
                    {"name": "result_value", "type": "number", "label": "Result", "required": true},
                    {"name": "unit", "type": "text", "label": "Unit"},
                    {"name": "reference_range", "type": "text", "label": "Reference Range"},
                    {"name": "flag", "type": "select", "label": "Flag", "options": ["Low", "Normal", "High"]}
                ],
                "repeatable": true
            },
            {
                "name": "interpretation",
                "title": "Interpretation",
                "fields": [
                    {"name": "interpretation", "type": "textarea", "label": "Clinical Interpretation"},
                    {"name": "notes", "type": "textarea", "label": "Additional Notes"}
                ]
            }
        ],
        "hasAutoFlag": true,
        "hasTrendView": true,
        "timingRelevant": true
    }'::jsonb,
    '{
        "show_trends": true,
        "timing_critical": true
    }'::jsonb
),
(
    'binary_metadata',
    'Binary Result with Metadata',
    'Detected/Not detected with kit info, QC, and traceability (Molecular/Rapid Tests)',
    '{
        "type": "binary_metadata",
        "sections": [
            {
                "name": "result",
                "title": "Test Result",
                "fields": [
                    {"name": "result", "type": "select", "label": "Result", "options": ["Detected", "Not Detected", "Indeterminate", "Invalid"], "required": true},
                    {"name": "ct_value", "type": "number", "label": "Ct Value (if applicable)", "step": 0.01},
                    {"name": "viral_load", "type": "text", "label": "Viral Load (if applicable)"},
                    {"name": "gene_targets", "type": "multiselect", "label": "Gene Targets Detected", "options": ["Target 1", "Target 2", "Internal Control"]}
                ]
            },
            {
                "name": "kit_info",
                "title": "Kit/Reagent Information",
                "fields": [
                    {"name": "kit_name", "type": "text", "label": "Kit/Test Name", "required": true},
                    {"name": "manufacturer", "type": "text", "label": "Manufacturer"},
                    {"name": "lot_number", "type": "text", "label": "Lot Number", "required": true},
                    {"name": "expiry_date", "type": "date", "label": "Expiry Date", "required": true}
                ]
            },
            {
                "name": "qc",
                "title": "Quality Control",
                "fields": [
                    {"name": "qc_passed", "type": "checkbox", "label": "QC Passed", "required": true},
                    {"name": "positive_control", "type": "select", "label": "Positive Control", "options": ["Valid", "Invalid"]},
                    {"name": "negative_control", "type": "select", "label": "Negative Control", "options": ["Valid", "Invalid"]},
                    {"name": "internal_control", "type": "select", "label": "Internal Control", "options": ["Valid", "Invalid", "N/A"]}
                ]
            },
            {
                "name": "traceability",
                "title": "Traceability",
                "fields": [
                    {"name": "instrument_id", "type": "text", "label": "Instrument ID"},
                    {"name": "run_id", "type": "text", "label": "Run ID"},
                    {"name": "operator", "type": "text", "label": "Operator", "readonly": true},
                    {"name": "run_date", "type": "datetime", "label": "Run Date/Time"}
                ]
            },
            {
                "name": "notes",
                "title": "Notes",
                "fields": [
                    {"name": "interpretation", "type": "textarea", "label": "Interpretation"},
                    {"name": "comments", "type": "textarea", "label": "Comments"}
                ]
            }
        ],
        "hasAutoFlag": false,
        "hasTrendView": false,
        "requiresQC": true
    }'::jsonb,
    '{
        "require_qc_validation": true,
        "require_lot_tracking": true,
        "require_expiry_check": true
    }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ui_schema = EXCLUDED.ui_schema,
    default_fields = EXCLUDED.default_fields,
    updated_at = NOW();

-- =====================================================
-- 3. ADD RESULT TEMPLATE COLUMNS TO LAB_TEST_CATALOGUE
-- =====================================================

-- Add result_template_type column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_test_catalogue' AND column_name = 'result_template_type'
    ) THEN
        ALTER TABLE lab_test_catalogue ADD COLUMN result_template_type VARCHAR(50);
    END IF;
END $$;

-- Add category_code column for FK reference (optional, for future use)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_test_catalogue' AND column_name = 'category_code'
    ) THEN
        ALTER TABLE lab_test_catalogue ADD COLUMN category_code VARCHAR(50);
    END IF;
END $$;

-- Add test parameters/components definition (for panel tests)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_test_catalogue' AND column_name = 'test_parameters'
    ) THEN
        ALTER TABLE lab_test_catalogue ADD COLUMN test_parameters JSONB;
    END IF;
END $$;

-- =====================================================
-- 4. UPDATE EXISTING LAB TESTS WITH TEMPLATE TYPES
-- Mapping existing categories to new standardized categories
-- =====================================================

-- Update Hematology tests
UPDATE lab_test_catalogue SET 
    category_code = 'HEMATOLOGY',
    result_template_type = 'numeric_table'
WHERE category IN ('Hematology') OR code LIKE 'LAB-HEM-%' OR code LIKE 'HEM%';

-- Update Coagulation tests
UPDATE lab_test_catalogue SET 
    category = 'Coagulation',
    category_code = 'COAGULATION',
    result_template_type = 'numeric_table'
WHERE code LIKE 'LAB-COA-%';

-- Update Clinical Chemistry tests
UPDATE lab_test_catalogue SET 
    category_code = 'CLINICAL_CHEMISTRY',
    result_template_type = 'panel_numeric'
WHERE category IN ('Clinical Chemistry', 'Chemical Pathology') OR code LIKE 'LAB-CHM-%' OR code LIKE 'CHM%';

-- Update Microbiology tests (culture-based)
UPDATE lab_test_catalogue SET 
    category_code = 'MICROBIOLOGY',
    result_template_type = 'culture_sensitivity'
WHERE category = 'Microbiology' OR code LIKE 'LAB-MIC-%' OR code LIKE 'MIC%';

-- Update Urinalysis (special handling - under microbiology but different template)
UPDATE lab_test_catalogue SET 
    category = 'Urinalysis',
    category_code = 'URINALYSIS',
    result_template_type = 'urinalysis_checklist'
WHERE name ILIKE '%urinalysis%' OR name ILIKE '%urine routine%' OR code = 'LAB-MIC-002';

-- Update Serology tests
UPDATE lab_test_catalogue SET 
    category_code = 'SEROLOGY',
    result_template_type = 'qualitative_quantitative'
WHERE category = 'Serology' OR code LIKE 'LAB-SER-%' OR code LIKE 'SER%';

-- Update Hormones/Endocrinology tests
UPDATE lab_test_catalogue SET 
    category = 'Endocrinology',
    category_code = 'ENDOCRINOLOGY',
    result_template_type = 'numeric_timing'
WHERE category = 'Hormones' OR code LIKE 'LAB-HOR-%';

-- Update Blood Bank tests
UPDATE lab_test_catalogue SET 
    category = 'Blood Bank',
    category_code = 'BLOOD_BANK',
    result_template_type = 'qualitative_quantitative'
WHERE category = 'Blood Bank' OR code LIKE 'LAB-BBK-%';

-- Update Parasitology tests (malaria, stool parasites)
UPDATE lab_test_catalogue SET 
    category = 'Parasitology',
    category_code = 'PARASITOLOGY',
    result_template_type = 'parasite_report'
WHERE name ILIKE '%malaria%' OR name ILIKE '%parasite%' OR name ILIKE '%stool microscopy%'
    AND result_template_type IS NULL;

-- Update Molecular/Rapid tests
UPDATE lab_test_catalogue SET 
    category = 'Molecular Diagnostics',
    category_code = 'MOLECULAR',
    result_template_type = 'binary_metadata'
WHERE name ILIKE '%genexpert%' OR name ILIKE '%pcr%' OR name ILIKE '%rdt%' OR name ILIKE '%rapid%'
    AND result_template_type IS NULL;

-- Default: Any remaining tests without template type get panel_numeric
UPDATE lab_test_catalogue SET 
    result_template_type = 'panel_numeric'
WHERE result_template_type IS NULL;

-- =====================================================
-- 5. ADD TEST PARAMETERS FOR COMMON PANEL TESTS
-- =====================================================

-- Full Blood Count parameters
UPDATE lab_test_catalogue SET test_parameters = '{
    "components": [
        {"name": "WBC", "unit": "x10^9/L", "reference_range": "4.0-11.0"},
        {"name": "RBC", "unit": "x10^12/L", "reference_range": "4.5-5.5 (M) / 4.0-5.0 (F)"},
        {"name": "Hemoglobin", "unit": "g/dL", "reference_range": "13.5-17.5 (M) / 12.0-16.0 (F)"},
        {"name": "Hematocrit/PCV", "unit": "%", "reference_range": "40-54 (M) / 36-48 (F)"},
        {"name": "MCV", "unit": "fL", "reference_range": "80-100"},
        {"name": "MCH", "unit": "pg", "reference_range": "27-33"},
        {"name": "MCHC", "unit": "g/dL", "reference_range": "32-36"},
        {"name": "RDW", "unit": "%", "reference_range": "11.5-14.5"},
        {"name": "Platelet Count", "unit": "x10^9/L", "reference_range": "150-400"},
        {"name": "MPV", "unit": "fL", "reference_range": "7.5-11.5"},
        {"name": "Neutrophils", "unit": "%", "reference_range": "40-70"},
        {"name": "Lymphocytes", "unit": "%", "reference_range": "20-40"},
        {"name": "Monocytes", "unit": "%", "reference_range": "2-8"},
        {"name": "Eosinophils", "unit": "%", "reference_range": "1-4"},
        {"name": "Basophils", "unit": "%", "reference_range": "0-1"}
    ]
}'::jsonb
WHERE name ILIKE '%full blood count%' OR name ILIKE '%fbc%' OR name ILIKE '%cbc%';

-- Liver Function Test parameters
UPDATE lab_test_catalogue SET test_parameters = '{
    "components": [
        {"name": "Total Bilirubin", "unit": "µmol/L", "reference_range": "5-21"},
        {"name": "Direct Bilirubin", "unit": "µmol/L", "reference_range": "0-5"},
        {"name": "ALT (SGPT)", "unit": "U/L", "reference_range": "7-56"},
        {"name": "AST (SGOT)", "unit": "U/L", "reference_range": "10-40"},
        {"name": "ALP", "unit": "U/L", "reference_range": "44-147"},
        {"name": "GGT", "unit": "U/L", "reference_range": "9-48"},
        {"name": "Total Protein", "unit": "g/L", "reference_range": "60-83"},
        {"name": "Albumin", "unit": "g/L", "reference_range": "35-50"},
        {"name": "Globulin", "unit": "g/L", "reference_range": "23-35"}
    ],
    "group": "Liver Function"
}'::jsonb
WHERE name ILIKE '%liver function%' OR name ILIKE '%lft%';

-- Urea & Electrolytes parameters
UPDATE lab_test_catalogue SET test_parameters = '{
    "components": [
        {"name": "Sodium", "unit": "mmol/L", "reference_range": "136-145"},
        {"name": "Potassium", "unit": "mmol/L", "reference_range": "3.5-5.0"},
        {"name": "Chloride", "unit": "mmol/L", "reference_range": "98-106"},
        {"name": "Bicarbonate", "unit": "mmol/L", "reference_range": "22-29"},
        {"name": "Urea", "unit": "mmol/L", "reference_range": "2.5-6.7"},
        {"name": "Creatinine", "unit": "µmol/L", "reference_range": "62-106 (M) / 44-80 (F)"},
        {"name": "eGFR", "unit": "mL/min/1.73m²", "reference_range": ">90"}
    ],
    "group": "Renal Function"
}'::jsonb
WHERE name ILIKE '%urea%electrolyte%' OR name ILIKE '%u&e%' OR name ILIKE '%renal function%';

-- Lipid Profile parameters
UPDATE lab_test_catalogue SET test_parameters = '{
    "components": [
        {"name": "Total Cholesterol", "unit": "mmol/L", "reference_range": "<5.2"},
        {"name": "Triglycerides", "unit": "mmol/L", "reference_range": "<1.7"},
        {"name": "HDL Cholesterol", "unit": "mmol/L", "reference_range": ">1.0 (M) / >1.2 (F)"},
        {"name": "LDL Cholesterol", "unit": "mmol/L", "reference_range": "<3.0"},
        {"name": "VLDL Cholesterol", "unit": "mmol/L", "reference_range": "<0.77"},
        {"name": "Total/HDL Ratio", "unit": "", "reference_range": "<4.5"}
    ],
    "group": "Lipid Profile"
}'::jsonb
WHERE name ILIKE '%lipid profile%';

-- Thyroid Function Test parameters
UPDATE lab_test_catalogue SET test_parameters = '{
    "components": [
        {"name": "TSH", "unit": "mIU/L", "reference_range": "0.27-4.2"},
        {"name": "Free T4", "unit": "pmol/L", "reference_range": "12-22"},
        {"name": "Free T3", "unit": "pmol/L", "reference_range": "3.1-6.8"},
        {"name": "Total T4", "unit": "nmol/L", "reference_range": "66-181"},
        {"name": "Total T3", "unit": "nmol/L", "reference_range": "1.3-3.1"}
    ],
    "timing_notes": "Best collected in the morning"
}'::jsonb
WHERE name ILIKE '%thyroid function%' OR name ILIKE '%tft%';

-- =====================================================
-- 6. ENHANCED LAB_RESULTS TABLE FOR STRUCTURED DATA
-- =====================================================

-- Add structured result storage columns
DO $$
BEGIN
    -- Add structured_result column for template-specific data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'structured_result'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN structured_result JSONB;
    END IF;
    
    -- Add result_template_type used for this result
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'result_template_type'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN result_template_type VARCHAR(50);
    END IF;
    
    -- Add collected_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'collected_at'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN collected_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add reported_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'reported_at'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN reported_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add approved_by for consultant approval
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN approved_by UUID REFERENCES staff(id);
    END IF;
    
    -- Add approved_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add result workflow status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'workflow_status'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN workflow_status VARCHAR(50) DEFAULT 'Pending';
    END IF;
    
    -- Add version for audit trail
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'version'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- Add is_critical flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'is_critical'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN is_critical BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add critical_notified_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_results' AND column_name = 'critical_notified_at'
    ) THEN
        ALTER TABLE lab_results ADD COLUMN critical_notified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- =====================================================
-- 7. CREATE LAB RESULT HISTORY TABLE (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS lab_result_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_result_id UUID REFERENCES lab_results(id) ON DELETE CASCADE NOT NULL,
    version INTEGER NOT NULL,
    
    -- Snapshot of result at this version
    result TEXT,
    result_value DECIMAL(20,6),
    structured_result JSONB,
    result_status VARCHAR(50),
    
    -- Who made the change
    modified_by UUID REFERENCES staff(id),
    modification_type VARCHAR(50) NOT NULL, -- 'Created', 'Updated', 'Verified', 'Approved', 'Amended'
    modification_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_result_history_result ON lab_result_history(lab_result_id);
CREATE INDEX IF NOT EXISTS idx_lab_result_history_version ON lab_result_history(lab_result_id, version);

-- =====================================================
-- 8. CREATE CRITICAL VALUE NOTIFICATION LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS lab_critical_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_result_id UUID REFERENCES lab_results(id) ON DELETE CASCADE NOT NULL,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    
    -- Critical value details
    parameter_name VARCHAR(255),
    critical_value TEXT,
    critical_type VARCHAR(50), -- 'Critical Low', 'Critical High'
    
    -- Notification tracking
    notified_to UUID REFERENCES staff(id), -- Ordering physician
    notification_method VARCHAR(50), -- 'System', 'Phone', 'In-Person'
    notification_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Acknowledged', 'Escalated'
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES staff(id),
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_critical_notifications_result ON lab_critical_notifications(lab_result_id);
CREATE INDEX IF NOT EXISTS idx_critical_notifications_patient ON lab_critical_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_critical_notifications_status ON lab_critical_notifications(notification_status);

-- =====================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lab_test_category_code ON lab_test_catalogue(category_code);
CREATE INDEX IF NOT EXISTS idx_lab_test_template_type ON lab_test_catalogue(result_template_type);
CREATE INDEX IF NOT EXISTS idx_lab_results_workflow_status ON lab_results(workflow_status);
CREATE INDEX IF NOT EXISTS idx_lab_results_template_type ON lab_results(result_template_type);
CREATE INDEX IF NOT EXISTS idx_lab_results_critical ON lab_results(is_critical) WHERE is_critical = TRUE;

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE lab_categories IS 'Reference table for standard lab test categories with result template mappings';
COMMENT ON TABLE lab_result_template_types IS 'UI schema definitions for different lab result entry templates';
COMMENT ON TABLE lab_result_history IS 'Audit trail for lab result modifications';
COMMENT ON TABLE lab_critical_notifications IS 'Tracking of critical value notifications';

COMMENT ON COLUMN lab_test_catalogue.result_template_type IS 'Type of result entry template to use for this test';
COMMENT ON COLUMN lab_test_catalogue.category_code IS 'FK reference to lab_categories.code';
COMMENT ON COLUMN lab_test_catalogue.test_parameters IS 'JSON definition of test components/parameters for panel tests';

COMMENT ON COLUMN lab_results.structured_result IS 'Template-specific structured result data';
COMMENT ON COLUMN lab_results.workflow_status IS 'Result workflow: Pending, Verified, Approved, Released, Amended';
COMMENT ON COLUMN lab_results.version IS 'Version number for tracking amendments';
COMMENT ON COLUMN lab_results.is_critical IS 'Flag for critical values requiring immediate notification';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
