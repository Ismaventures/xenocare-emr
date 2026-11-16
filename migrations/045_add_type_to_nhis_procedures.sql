-- Add type column to nhis_procedures table
ALTER TABLE nhis_procedures ADD COLUMN IF NOT EXISTS type TEXT;

-- Add index for type column
CREATE INDEX IF NOT EXISTS idx_nhis_procedures_type ON nhis_procedures(type);
