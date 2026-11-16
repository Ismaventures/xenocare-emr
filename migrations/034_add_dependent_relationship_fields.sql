-- =============================================================================
-- NDC Medical Centre EMR - DEPENDENTS UNDER PRINCIPAL
-- Migration: 034_add_dependent_relationship_fields.sql
-- Description: Ensure dependent patients are linked to a principal and store relationship.
-- =============================================================================

-- Add relationship field (if missing)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS relationship_to_principal TEXT;

-- Enforce dependent must have principal + relationship.
-- Use NOT VALID to avoid breaking existing databases with legacy data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_patients_dependent_requires_principal'
  ) THEN
    ALTER TABLE patients
      ADD CONSTRAINT chk_patients_dependent_requires_principal
      CHECK (
        patient_type <> 'Dependent'
        OR (
          principal_id IS NOT NULL
          AND NULLIF(TRIM(relationship_to_principal), '') IS NOT NULL
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_patients_principal_id_only_for_dependents'
  ) THEN
    ALTER TABLE patients
      ADD CONSTRAINT chk_patients_principal_id_only_for_dependents
      CHECK (
        patient_type = 'Dependent'
        OR principal_id IS NULL
      ) NOT VALID;
  END IF;
END $$;

-- Optional: validate once data is cleaned
-- ALTER TABLE patients VALIDATE CONSTRAINT chk_patients_dependent_requires_principal;
-- ALTER TABLE patients VALIDATE CONSTRAINT chk_patients_principal_id_only_for_dependents;
