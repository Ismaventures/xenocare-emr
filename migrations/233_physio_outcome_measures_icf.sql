-- ============================================================================
-- Migration: Add ICF-aligned outcome measures to physio_assessments
-- Adds a JSONB column to store multiple outcome measures per assessment,
-- following the International Classification of Functioning, Disability
-- and Health (ICF) framework.
-- ============================================================================

-- Add outcome_measures JSONB column to physio_assessments
-- Stores array of: { measure, score, baseline_score, icf_domain, notes }
ALTER TABLE public.physio_assessments
ADD COLUMN IF NOT EXISTS outcome_measures jsonb;

-- Add a comment describing the structure
COMMENT ON COLUMN public.physio_assessments.outcome_measures IS
  'Array of ICF-aligned outcome measure entries. Each entry: { measure: string (VAS/NRS/ODI/NDI/DASH/KOOS/WOMAC/SF36/Berg_Balance/TUG/FIM/Barthel_Index/LEFS/SPADI/HOOS/FAAM/EQ5D/PSFS/WHODAS/6MWT/10MWT/DGI/FRT/MAS/NIHSS/FMA/GAS/GROC/QuickDASH/McGill_Pain), score: number|null, baseline_score: number|null, icf_domain: Body_Functions|Body_Structures|Activity|Participation|Environmental|Personal, notes: string }';

-- Index for querying assessments that have outcome measures
CREATE INDEX IF NOT EXISTS idx_physio_assessments_outcome_measures
  ON public.physio_assessments USING gin (outcome_measures)
  WHERE outcome_measures IS NOT NULL;
