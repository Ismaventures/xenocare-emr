-- Migration: Add additional fields to scan_results table for complete radiology reports
-- Date: 2026-02-03
-- Purpose: Store technique, comparison, urgency, preliminary status, and notes for radiology reports

-- Add technique column (imaging technique used)
ALTER TABLE public.scan_results 
ADD COLUMN IF NOT EXISTS technique TEXT;

-- Add comparison column (reference to prior studies)
ALTER TABLE public.scan_results 
ADD COLUMN IF NOT EXISTS comparison TEXT;

-- Add urgency column (Normal, Urgent, Critical)
ALTER TABLE public.scan_results 
ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) DEFAULT 'Normal';

-- Add is_preliminary column (true if report is preliminary, pending final review)
ALTER TABLE public.scan_results 
ADD COLUMN IF NOT EXISTS is_preliminary BOOLEAN DEFAULT false;

-- Add notes column (additional notes/recommendations)
ALTER TABLE public.scan_results 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add check constraint for urgency values
ALTER TABLE public.scan_results 
DROP CONSTRAINT IF EXISTS scan_results_urgency_check;

ALTER TABLE public.scan_results 
ADD CONSTRAINT scan_results_urgency_check 
CHECK (urgency IS NULL OR urgency IN ('Normal', 'Urgent', 'Critical'));

-- Add comments for documentation
COMMENT ON COLUMN public.scan_results.technique IS 'Imaging technique used (e.g., IV contrast, sequences)';
COMMENT ON COLUMN public.scan_results.comparison IS 'Reference to prior studies for comparison';
COMMENT ON COLUMN public.scan_results.urgency IS 'Report urgency level: Normal, Urgent, or Critical';
COMMENT ON COLUMN public.scan_results.is_preliminary IS 'True if report is preliminary, pending final radiologist review';
COMMENT ON COLUMN public.scan_results.notes IS 'Additional notes, recommendations, or follow-up instructions';
