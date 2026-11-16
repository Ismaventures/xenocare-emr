-- =============================================================================
-- 239. ALLOW CLINICIANS TO SAVE SHARED CLINICAL TEMPLATES
--
-- Shared templates remain readable by all staff, but ownership is still tracked
-- via created_by so only the creator or an admin can update/delete them.
-- =============================================================================

DROP POLICY IF EXISTS ctt_insert ON public.clinical_text_templates;

CREATE POLICY ctt_insert ON public.clinical_text_templates
    FOR INSERT WITH CHECK (
        created_by IN (
            SELECT id FROM public.staff WHERE user_id = auth.uid()
        )
    );