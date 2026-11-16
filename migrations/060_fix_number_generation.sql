-- Migration: Fix Number Generation Functions
-- Version: 060
-- Date: 2026-01-07
-- Description: Fixes the substring index calculation in number generation functions to avoid duplicate key errors

-- Fix generate_admission_number
CREATE OR REPLACE FUNCTION generate_admission_number(facility_code VARCHAR DEFAULT 'ADM')
RETURNS VARCHAR AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
    new_number VARCHAR(50);
    prefix_length INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    -- 'ADM-2026-' has length: len(ADM) + 1 + 4 + 1 = len(ADM) + 6
    -- So the sequence starts at: len(ADM) + 7
    prefix_length := LENGTH(facility_code) + 6;

    SELECT COALESCE(MAX(
        -- Start substring from the character AFTER the prefix (prefix_length + 1)
        CAST(SUBSTRING(admission_number FROM prefix_length + 1) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM admissions
    WHERE admission_number LIKE facility_code || '-' || year_part || '-%';

    new_number := facility_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Fix generate_procedure_number
CREATE OR REPLACE FUNCTION generate_procedure_number(facility_code VARCHAR DEFAULT 'PRC')
RETURNS VARCHAR AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
    new_number VARCHAR(50);
    prefix_length INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    prefix_length := LENGTH(facility_code) + 6;

    SELECT COALESCE(MAX(
        -- Start substring from the character AFTER the prefix (prefix_length + 1)
        CAST(SUBSTRING(procedure_number FROM prefix_length + 1) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM procedures
    WHERE procedure_number LIKE facility_code || '-' || year_part || '-%';

    new_number := facility_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;
