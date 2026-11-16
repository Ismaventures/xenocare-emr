-- Migration: 125_remove_drg_prefix_drugs.sql
-- Description: Remove all legacy drugs with DRG prefix (replaced by NHIA drugs)
-- Date: 2026-02-05

BEGIN;

-- Count drugs to be deleted (for verification)
-- SELECT COUNT(*) as drg_drugs_count FROM drug_catalogue WHERE code LIKE 'DRG%';

-- Delete all drugs with DRG prefix
DELETE FROM drug_catalogue WHERE code LIKE 'DRG%';

-- Also clean up any orphaned prescriptions referencing deleted drugs
-- (Optional - uncomment if needed)
-- DELETE FROM prescriptions WHERE drug_id NOT IN (SELECT id FROM drug_catalogue);

COMMIT;

-- Verify deletion
-- SELECT COUNT(*) as remaining_drg FROM drug_catalogue WHERE code LIKE 'DRG%';
-- SELECT COUNT(*) as total_drugs FROM drug_catalogue;
