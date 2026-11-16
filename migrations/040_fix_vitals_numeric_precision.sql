-- =============================================================================
-- Migration: Fix numeric field precision for vitals
-- Date: December 27, 2025
-- Purpose: Increase precision of weight, height, blood_glucose fields to prevent overflow
-- Error: "A field with precision 5, scale 2 must round to an absolute value less than 10^3"
-- =============================================================================

-- Fix vitals table
-- weight: DECIMAL(5,2) max 999.99 → DECIMAL(6,2) max 9999.99 (supports weight in kg or lbs)
-- height: DECIMAL(5,2) max 999.99 → DECIMAL(6,2) max 9999.99 (supports height in cm or inches)
-- blood_glucose: DECIMAL(5,2) → DECIMAL(6,2) for safety
-- bmi: DECIMAL(5,2) → DECIMAL(6,2) for safety

ALTER TABLE vitals 
    ALTER COLUMN weight TYPE DECIMAL(6, 2),
    ALTER COLUMN height TYPE DECIMAL(6, 2),
    ALTER COLUMN bmi TYPE DECIMAL(6, 2),
    ALTER COLUMN blood_glucose TYPE DECIMAL(6, 2);

-- Fix triage_assessments table (same fields)
ALTER TABLE triage_assessments 
    ALTER COLUMN weight TYPE DECIMAL(6, 2),
    ALTER COLUMN height TYPE DECIMAL(6, 2),
    ALTER COLUMN bmi TYPE DECIMAL(6, 2),
    ALTER COLUMN blood_glucose TYPE DECIMAL(6, 2);

-- =============================================================================
-- Verification
-- =============================================================================
DO $$
DECLARE
    vitals_weight_precision INTEGER;
    vitals_height_precision INTEGER;
BEGIN
    SELECT numeric_precision INTO vitals_weight_precision
    FROM information_schema.columns 
    WHERE table_name = 'vitals' AND column_name = 'weight';
    
    SELECT numeric_precision INTO vitals_height_precision
    FROM information_schema.columns 
    WHERE table_name = 'vitals' AND column_name = 'height';
    
    IF vitals_weight_precision = 6 AND vitals_height_precision = 6 THEN
        RAISE NOTICE 'SUCCESS: vitals table numeric fields updated to DECIMAL(6,2)';
    ELSE
        RAISE WARNING 'FAILED: vitals table fields may not have been updated correctly';
    END IF;
END $$;
