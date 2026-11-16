-- Migration: 125_remove_drg_ant_prefix_drugs.sql
-- Description: Remove all legacy drugs with DRG-ANT prefix (replaced by NHIA drugs)
-- Date: 2026-02-05

BEGIN;

-- Count drugs to be deleted (for verification)
-- SELECT COUNT(*) as drg_ant_drugs_count FROM drug_catalogue WHERE code LIKE 'DRG-ANT%';

-- Delete all drugs with DRG-ANT prefix
DELETE FROM drug_catalogue WHERE code LIKE 'DRG-ANT%';

COMMIT;

-- Verify deletion
-- SELECT COUNT(*) as remaining_drg_ant FROM drug_catalogue WHERE code LIKE 'DRG-ANT%';
-- SELECT COUNT(*) as total_drugs FROM drug_catalogue;
