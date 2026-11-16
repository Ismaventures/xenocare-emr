-- ============================================================================
-- Migration 142: Fix process_nhis_referral_queue 409 Conflict
-- ============================================================================
-- PROBLEM: Two overloaded versions of process_nhis_referral_queue exist:
--   1. 7-param version: (uuid, varchar, uuid, text, text, varchar, nhis_tariff_group)
--   2. 12-param version: (uuid, varchar, uuid, text, text, varchar, nhis_tariff_group, varchar, varchar, date, text, varchar)
--
-- PostgREST returns HTTP 409 Conflict because it cannot disambiguate between
-- the two overloaded functions when the client sends all parameters with NULL defaults.
--
-- FIX: Drop the old 7-param version. The 12-param version has defaults for all
-- extra parameters, so it handles both use cases.
-- ============================================================================

-- Drop the OLD 7-parameter overload (the newer 12-param version handles everything)
DROP FUNCTION IF EXISTS public.process_nhis_referral_queue(
    uuid, character varying, uuid, text, text, character varying, public.nhis_tariff_group
);

-- Verify only one version remains
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'process_nhis_referral_queue' AND n.nspname = 'public';
    
    IF v_count = 1 THEN
        RAISE NOTICE 'SUCCESS: Only 1 version of process_nhis_referral_queue remains (no more 409 conflict)';
    ELSIF v_count = 0 THEN
        RAISE WARNING 'WARNING: No versions of process_nhis_referral_queue found! The function may need to be recreated.';
    ELSE
        RAISE WARNING 'WARNING: % versions of process_nhis_referral_queue still exist. Manual cleanup needed.', v_count;
    END IF;
END $$;

-- Ensure grants on the remaining version
GRANT EXECUTE ON FUNCTION public.process_nhis_referral_queue(
    uuid, character varying, uuid, text, text, character varying, 
    public.nhis_tariff_group, character varying, character varying, 
    date, text, character varying
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_nhis_referral_queue(
    uuid, character varying, uuid, text, text, character varying, 
    public.nhis_tariff_group, character varying, character varying, 
    date, text, character varying
) TO service_role;

-- ============================================================================
-- SUMMARY:
-- Dropped the old 7-param overload of process_nhis_referral_queue.
-- PostgREST can now unambiguously resolve calls to the 12-param version.
-- This fixes the HTTP 409 Conflict error.
-- ============================================================================
