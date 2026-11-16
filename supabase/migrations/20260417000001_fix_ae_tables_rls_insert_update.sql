-- Fix: Add missing INSERT and UPDATE RLS policies for all A&E tables.
-- The original migration (20260413100000) created the tables and intended these
-- policies, but only SELECT + service_role policies ended up in the database.
-- Without INSERT policies, all authenticated INSERT operations are denied by RLS.

BEGIN;

-- =============================================================================
-- ae_arrivals — INSERT + UPDATE
-- =============================================================================
DROP POLICY IF EXISTS ae_arrivals_insert ON public.ae_arrivals;
CREATE POLICY ae_arrivals_insert ON public.ae_arrivals
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
        AND encounter_id IS NOT NULL
    );

DROP POLICY IF EXISTS ae_arrivals_update ON public.ae_arrivals;
CREATE POLICY ae_arrivals_update ON public.ae_arrivals
    FOR UPDATE TO authenticated
    USING (
        (created_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- =============================================================================
-- ae_timeline_events — INSERT
-- =============================================================================
DROP POLICY IF EXISTS ae_timeline_insert ON public.ae_timeline_events;
CREATE POLICY ae_timeline_insert ON public.ae_timeline_events
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
    );

-- =============================================================================
-- ae_primary_surveys — INSERT + UPDATE
-- =============================================================================
DROP POLICY IF EXISTS ae_primary_surveys_insert ON public.ae_primary_surveys;
CREATE POLICY ae_primary_surveys_insert ON public.ae_primary_surveys
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
        AND encounter_id IS NOT NULL
    );

DROP POLICY IF EXISTS ae_primary_surveys_update ON public.ae_primary_surveys;
CREATE POLICY ae_primary_surveys_update ON public.ae_primary_surveys
    FOR UPDATE TO authenticated
    USING (
        (performed_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- =============================================================================
-- ae_dispositions — INSERT + UPDATE
-- =============================================================================
DROP POLICY IF EXISTS ae_dispositions_insert ON public.ae_dispositions;
CREATE POLICY ae_dispositions_insert ON public.ae_dispositions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'super_admin')
        AND encounter_id IS NOT NULL
    );

DROP POLICY IF EXISTS ae_dispositions_update ON public.ae_dispositions;
CREATE POLICY ae_dispositions_update ON public.ae_dispositions
    FOR UPDATE TO authenticated
    USING (
        (disposition_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- =============================================================================
-- ae_fluid_charts — INSERT + UPDATE
-- =============================================================================
DROP POLICY IF EXISTS ae_fluid_charts_insert ON public.ae_fluid_charts;
CREATE POLICY ae_fluid_charts_insert ON public.ae_fluid_charts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
        AND encounter_id IS NOT NULL
    );

DROP POLICY IF EXISTS ae_fluid_charts_update ON public.ae_fluid_charts;
CREATE POLICY ae_fluid_charts_update ON public.ae_fluid_charts
    FOR UPDATE TO authenticated
    USING (
        (administered_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

-- =============================================================================
-- ae_procedures — INSERT + UPDATE
-- =============================================================================
DROP POLICY IF EXISTS ae_procedures_insert ON public.ae_procedures;
CREATE POLICY ae_procedures_insert ON public.ae_procedures
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('doctor', 'nurse', 'super_admin')
        AND encounter_id IS NOT NULL
    );

DROP POLICY IF EXISTS ae_procedures_update ON public.ae_procedures;
CREATE POLICY ae_procedures_update ON public.ae_procedures
    FOR UPDATE TO authenticated
    USING (
        (performed_by = public.get_current_staff_id() AND created_at > now() - INTERVAL '24 hours')
        OR public.get_current_user_role() = 'super_admin'
    );

COMMIT;
