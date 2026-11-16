-- =============================================================================
-- Migration: 122_nhis_duplicate_names_cleanup.sql
-- Description: Disambiguate procedures with same name but different NHIS codes
--              by appending specialty suffix to procedure names
-- =============================================================================

-- This migration fixes 27 procedure names that exist in multiple specialties
-- with different NHIS codes. Each code is official from NHIA, but having 
-- identical names causes confusion in lookups and billing.
--
-- Solution: Append specialty suffix like "(Paediatric)" or "(Endoscopic)" 
-- to make each name unique while preserving all official codes.

BEGIN;

-- ============================================================================
-- 1. Continuous Positive Airway Pressure (Moved to ICU) - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Continuous Positive Airway Pressure (Adult ICU)' 
WHERE code = 'NHIA-010-021' AND name LIKE 'Continuous Positive Airway Pressure%';

UPDATE nhis_procedures SET name = 'Continuous Positive Airway Pressure (Paediatric)' 
WHERE code = 'NHIA-111-004' AND name LIKE 'Continuous Positive Airway Pressure%';

-- ============================================================================
-- 2. Oesophagoscopy - 3 entries (ENT, General Surgery, Endoscopic)
-- ============================================================================
UPDATE nhis_procedures SET name = 'Oesophagoscopy (ENT)' 
WHERE code = 'NHIA-022-012' AND name = 'Oesophagoscopy';

UPDATE nhis_procedures SET name = 'Oesophagoscopy (General Surgery)' 
WHERE code = 'NHIA-062-039' AND name = 'Oesophagoscopy';

UPDATE nhis_procedures SET name = 'Oesophagoscopy (Endoscopic)' 
WHERE code = 'NHIA-071-028' AND name = 'Oesophagoscopy';

-- ============================================================================
-- 3. Vulvectomy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Vulvectomy (Obstetrics & Gynaecology)' 
WHERE code = 'NHIA-033-032' AND name = 'Vulvectomy';

UPDATE nhis_procedures SET name = 'Vulvectomy (General Surgery)' 
WHERE code = 'NHIA-063-212' AND name = 'Vulvectomy';

-- ============================================================================
-- 4. Aspiration - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Aspiration (Internal Medicine)' 
WHERE code = 'NHIA-040-001' AND name = 'Aspiration';

UPDATE nhis_procedures SET name = 'Aspiration (Paediatric)' 
WHERE code = 'NHIA-111-007' AND name = 'Aspiration';

-- ============================================================================
-- 5. Diagnostic Paracentesis - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Diagnostic Paracentesis (Internal Medicine)' 
WHERE code = 'NHIA-040-003' AND name = 'Diagnostic Paracentesis';

UPDATE nhis_procedures SET name = 'Diagnostic Paracentesis (Paediatric)' 
WHERE code = 'NHIA-111-009' AND name = 'Diagnostic Paracentesis';

-- ============================================================================
-- 6. Therapeutic Paracentesis - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Therapeutic Paracentesis (Internal Medicine)' 
WHERE code = 'NHIA-040-005' AND name = 'Therapeutic Paracentesis';

UPDATE nhis_procedures SET name = 'Therapeutic Paracentesis (Paediatric)' 
WHERE code = 'NHIA-111-010' AND name = 'Therapeutic Paracentesis';

-- ============================================================================
-- 7. Endotracheal Intubation (per session) - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Endotracheal Intubation per session (Adult)' 
WHERE code = 'NHIA-040-006' AND name LIKE 'Endotracheal Intubation%';

UPDATE nhis_procedures SET name = 'Endotracheal Intubation per session (Paediatric)' 
WHERE code = 'NHIA-111-002' AND name LIKE 'Endotracheal Intubation%';

-- ============================================================================
-- 8. Gastric Lavage - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Gastric Lavage (Internal Medicine)' 
WHERE code = 'NHIA-040-013' AND name = 'Gastric Lavage';

UPDATE nhis_procedures SET name = 'Gastric Lavage (Paediatric)' 
WHERE code = 'NHIA-111-006' AND name = 'Gastric Lavage';

-- ============================================================================
-- 9. Lumbar Puncture - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Lumbar Puncture (Internal Medicine)' 
WHERE code = 'NHIA-040-014' AND name = 'Lumbar Puncture';

UPDATE nhis_procedures SET name = 'Lumbar Puncture (Paediatric)' 
WHERE code = 'NHIA-111-012' AND name = 'Lumbar Puncture';

-- ============================================================================
-- 10. Oxygen Therapy (per hour) - 2 entries (same price, keep both)
-- ============================================================================
UPDATE nhis_procedures SET name = 'Oxygen Therapy per hour (Adult)' 
WHERE code = 'NHIA-040-018' AND name LIKE 'Oxygen Therapy%hour%';

UPDATE nhis_procedures SET name = 'Oxygen Therapy per hour (Paediatric)' 
WHERE code = 'NHIA-111-003' AND name LIKE 'Oxygen Therapy%hour%';

-- ============================================================================
-- 11. Excision biopsy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Excision Biopsy (Orthopaedic)' 
WHERE code = 'NHIA-052-003' AND name ILIKE 'Excision biopsy';

UPDATE nhis_procedures SET name = 'Excision Biopsy (Paediatric Surgery)' 
WHERE code = 'NHIA-112-028' AND name ILIKE 'Excision biopsy';

-- ============================================================================
-- 12. Sequestrectomy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Sequestrectomy (Orthopaedic)' 
WHERE code = 'NHIA-053-005' AND name = 'Sequestrectomy';

UPDATE nhis_procedures SET name = 'Sequestrectomy (Maxillofacial)' 
WHERE code = 'NHIA-121-014' AND name = 'Sequestrectomy';

-- ============================================================================
-- 13. Bronchoscopy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Bronchoscopy (General Surgery)' 
WHERE code = 'NHIA-062-009' AND name = 'Bronchoscopy';

UPDATE nhis_procedures SET name = 'Bronchoscopy (Endoscopic)' 
WHERE code = 'NHIA-071-026' AND name = 'Bronchoscopy';

-- ============================================================================
-- 14. Cystourethroscopy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Cystourethroscopy (General Surgery)' 
WHERE code = 'NHIA-062-011' AND name = 'Cystourethroscopy';

UPDATE nhis_procedures SET name = 'Cystourethroscopy (Endoscopic)' 
WHERE code = 'NHIA-071-027' AND name = 'Cystourethroscopy';

-- ============================================================================
-- 15. Fistulectomy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Fistulectomy (General Surgery)' 
WHERE code = 'NHIA-062-028' AND name = 'Fistulectomy';

UPDATE nhis_procedures SET name = 'Fistulectomy (Maxillofacial)' 
WHERE code = 'NHIA-121-013' AND name = 'Fistulectomy';

-- ============================================================================
-- 16. Rectal polyp - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Rectal Polyp Removal (General Surgery)' 
WHERE code = 'NHIA-062-044' AND name ILIKE 'Rectal polyp';

UPDATE nhis_procedures SET name = 'Rectal Polyp Removal (Paediatric Surgery)' 
WHERE code = 'NHIA-112-002' AND name ILIKE 'Rectal polyp';

-- ============================================================================
-- 17. Cholecystectomy - 2 entries (open vs laparoscopic)
-- ============================================================================
UPDATE nhis_procedures SET name = 'Cholecystectomy (Open Surgery)' 
WHERE code = 'NHIA-063-013' AND name = 'Cholecystectomy';

UPDATE nhis_procedures SET name = 'Cholecystectomy (Laparoscopic)' 
WHERE code = 'NHIA-071-004' AND name = 'Cholecystectomy';

-- ============================================================================
-- 18. Cystolithotomy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Cystolithotomy (General Surgery)' 
WHERE code = 'NHIA-063-030' AND name = 'Cystolithotomy';

UPDATE nhis_procedures SET name = 'Cystolithotomy (Paediatric Surgery)' 
WHERE code = 'NHIA-112-015' AND name = 'Cystolithotomy';

-- ============================================================================
-- 19. Hemicolectomy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Hemicolectomy (Open Surgery)' 
WHERE code = 'NHIA-063-064' AND name = 'Hemicolectomy';

UPDATE nhis_procedures SET name = 'Hemicolectomy (Laparoscopic)' 
WHERE code = 'NHIA-071-010' AND name = 'Hemicolectomy';

-- ============================================================================
-- 20. Nephrolithotomy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Nephrolithotomy (General Surgery)' 
WHERE code = 'NHIA-063-092' AND name = 'Nephrolithotomy';

UPDATE nhis_procedures SET name = 'Nephrolithotomy (Paediatric Surgery)' 
WHERE code = 'NHIA-112-021' AND name = 'Nephrolithotomy';

-- ============================================================================
-- 21. Pyelolithotomy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Pyelolithotomy (General Surgery)' 
WHERE code = 'NHIA-063-125' AND name = 'Pyelolithotomy';

UPDATE nhis_procedures SET name = 'Pyelolithotomy (Paediatric Surgery)' 
WHERE code = 'NHIA-112-022' AND name = 'Pyelolithotomy';

-- ============================================================================
-- 22. Appendectomy - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Appendectomy (Laparoscopic)' 
WHERE code = 'NHIA-071-003' AND name = 'Appendectomy';

UPDATE nhis_procedures SET name = 'Appendectomy (Paediatric Surgery)' 
WHERE code = 'NHIA-112-030' AND name = 'Appendectomy';

-- ============================================================================
-- 23. Gonioscopy - 3 entries (different prices)
-- ============================================================================
UPDATE nhis_procedures SET name = 'Gonioscopy (Optometry Standard)' 
WHERE code = 'NHIA-081-014' AND name = 'Gonioscopy';

UPDATE nhis_procedures SET name = 'Gonioscopy (Ophthalmology Diagnostic)' 
WHERE code = 'NHIA-093-006' AND name = 'Gonioscopy';

UPDATE nhis_procedures SET name = 'Gonioscopy (Ophthalmology Screening)' 
WHERE code = 'NHIA-093-022' AND name = 'Gonioscopy';

-- ============================================================================
-- 24. Paracentesis (A/C Washout) - 2 entries (both Ophthalmology, different levels)
-- ============================================================================
UPDATE nhis_procedures SET name = 'Paracentesis A/C Washout (Primary)' 
WHERE code = 'NHIA-091-003' AND name LIKE 'Paracentesis%';

UPDATE nhis_procedures SET name = 'Paracentesis A/C Washout (Secondary)' 
WHERE code = 'NHIA-092-002' AND name LIKE 'Paracentesis%';

-- ============================================================================
-- 25. Pterygium Excision - 2 entries (different complexity levels)
-- ============================================================================
UPDATE nhis_procedures SET name = 'Pterygium Excision (Primary)' 
WHERE code = 'NHIA-092-006' AND name LIKE 'Pterygium%';

UPDATE nhis_procedures SET name = 'Pterygium Excision (Secondary/Recurrent)' 
WHERE code = 'NHIA-093-024' AND name LIKE 'Pterygium%';

-- ============================================================================
-- 26. Squint Surgery - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Squint Surgery (Simple)' 
WHERE code = 'NHIA-092-013' AND name ILIKE 'Squint Surgery';

UPDATE nhis_procedures SET name = 'Squint Surgery (Complex)' 
WHERE code = 'NHIA-093-033' AND name ILIKE 'Squint Surgery';

-- ============================================================================
-- 27. Electroencephalography - 2 entries
-- ============================================================================
UPDATE nhis_procedures SET name = 'Electroencephalography (EEG - Psychiatry)' 
WHERE code = 'NHIA-101-008' AND name ILIKE 'Electroencephalography';

UPDATE nhis_procedures SET name = 'Electroencephalography (EEG - Radiology)' 
WHERE code = 'NHIA-178-012' AND name ILIKE 'Electroencephalography';

-- ============================================================================
-- Verify no remaining duplicates
-- ============================================================================
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT name, COUNT(*) as cnt 
        FROM nhis_procedures 
        GROUP BY name 
        HAVING COUNT(*) > 1
    ) dups;
    
    IF dup_count > 0 THEN
        RAISE NOTICE 'WARNING: Still have % duplicate name groups', dup_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All procedure names are now unique';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Migration Summary:
-- - Fixed 27 procedure name groups with duplicate names
-- - All NHIS codes preserved (official NHIA codes)
-- - Names disambiguated with specialty/context suffixes
-- - Allows accurate procedure lookup by name or code
-- ============================================================================
