-- ============================================================================
-- Migration: 218_step4_tighten_function_privileges.sql
-- Purpose:
--   Remove anonymous execution access for mutating RPC functions while keeping
--   authenticated + service_role workflows functional.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Revoke anon from high-risk explicit functions
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_staff_user(text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.update_patient_with_lock(uuid, integer, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.update_billing_order_with_lock(uuid, integer, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.update_consultation_with_lock(uuid, integer, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.update_lab_request_with_lock(uuid, integer, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.update_prescription_with_lock(uuid, integer, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_record_version(character varying, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_facility_id() FROM anon;

-- Ensure app roles retain required access.
GRANT EXECUTE ON FUNCTION public.update_patient_with_lock(uuid, integer, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_billing_order_with_lock(uuid, integer, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_consultation_with_lock(uuid, integer, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_lab_request_with_lock(uuid, integer, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_prescription_with_lock(uuid, integer, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_record_version(character varying, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_facility_id() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Defensive sweep: revoke anon from likely mutating public RPCs
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname ~* '(_with_lock$)'
        OR p.proname ~* '^(create|update|upsert|delete|accept|reject|approve|complete|start|resume|abandon|record|mark|decrement|increment|release|verify|void|cancel|set_)'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END
$$;

COMMIT;

-- Rollback Guidance:
--   Re-grant EXECUTE to anon only for strictly required public-safe functions,
--   based on audited API requirements. Do not broadly re-open anon access.
