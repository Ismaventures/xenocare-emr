-- Remove foreign key constraint from prescriptions table
ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_drug_id_fkey;

-- Add drug_name column if it doesn't exist
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS drug_name VARCHAR(255);

-- Make drug_id nullable (it might be used for NHIS medicine ID now)
ALTER TABLE prescriptions ALTER COLUMN drug_id DROP NOT NULL;
