-- Fix for "invalid input value for enum request_status: Dispensed"
-- This error occurs when dispensing a prescription, likely due to a trigger or dependency
-- that tries to map the prescription status (Dispensed) to a generic request_status.

DO $$
BEGIN
    -- Add 'Dispensed' to request_status enum if it doesn't exist
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Dispensed';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Partial';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Out of Stock';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;
