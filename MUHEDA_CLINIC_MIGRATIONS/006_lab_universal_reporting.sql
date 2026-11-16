-- =============================================================================
-- 006. UNIVERSAL LABORATORY REQUEST / REPORT SUPPORT
--
-- Adds request grouping and specimen metadata used by the simplified
-- laboratory request and result workflow. Existing lab rows remain valid.
-- =============================================================================

ALTER TABLE public.lab_requests
    ADD COLUMN IF NOT EXISTS lab_request_group_id UUID,
    ADD COLUMN IF NOT EXISTS specimen_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS specimen_identifier VARCHAR(100);

COMMENT ON COLUMN public.lab_requests.lab_request_group_id IS
    'Groups laboratory requests submitted together so one laboratory report can include all requested investigations.';
COMMENT ON COLUMN public.lab_requests.specimen_type IS
    'Specimen collected for this investigation, e.g. Blood (EDTA), Urine, Sputum.';
COMMENT ON COLUMN public.lab_requests.specimen_identifier IS
    'Optional laboratory specimen/sample identification number.';

CREATE INDEX IF NOT EXISTS idx_lab_requests_report_group
    ON public.lab_requests (lab_request_group_id)
    WHERE lab_request_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter_report
    ON public.lab_requests (encounter_id, created_at);
