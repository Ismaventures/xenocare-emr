-- =============================================================================
-- 244. EXTERNAL PRESCRIPTIONS
--
-- Prescriptions written for medicines that are not stocked by the facility.
-- These are saved to the patient's clinical record but must never enter the
-- pharmacy dispensing, stock, billing, or approval queues.
-- =============================================================================

ALTER TABLE public.prescriptions
    ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.prescriptions.is_external IS
    'True when the medicine is prescribed for external purchase and must not be dispensed, billed, or stocked by this facility.';

CREATE INDEX IF NOT EXISTS idx_prescriptions_external_queue
    ON public.prescriptions (status, encounter_id)
    WHERE is_external = false;
