-- Migration: 077_fix_eye_exams_cct_columns.sql
-- Fix: Rename columns with Cyrillic characters to proper Latin characters
-- The columns ccт_right and ccт_left were created with Cyrillic 'т' instead of Latin 't'

-- Check if the Cyrillic-named columns exist and rename them
DO $$
BEGIN
    -- Fix cct_right (Cyrillic т to Latin t)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eye_exams' AND column_name = 'ccт_right'
    ) THEN
        ALTER TABLE eye_exams RENAME COLUMN "ccт_right" TO cct_right;
        RAISE NOTICE 'Renamed ccт_right to cct_right';
    END IF;
    
    -- Fix cct_left (Cyrillic т to Latin t)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eye_exams' AND column_name = 'ccт_left'
    ) THEN
        ALTER TABLE eye_exams RENAME COLUMN "ccт_left" TO cct_left;
        RAISE NOTICE 'Renamed ccт_left to cct_left';
    END IF;
    
    -- Add the columns if they don't exist at all
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eye_exams' AND column_name = 'cct_right'
    ) THEN
        ALTER TABLE eye_exams ADD COLUMN cct_right INTEGER;
        RAISE NOTICE 'Added cct_right column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eye_exams' AND column_name = 'cct_left'
    ) THEN
        ALTER TABLE eye_exams ADD COLUMN cct_left INTEGER;
        RAISE NOTICE 'Added cct_left column';
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN eye_exams.cct_right IS 'Central Corneal Thickness - Right Eye (microns)';
COMMENT ON COLUMN eye_exams.cct_left IS 'Central Corneal Thickness - Left Eye (microns)';
