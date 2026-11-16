-- Migration: Fix ai_interaction_logs constraints
-- The app passes staff IDs (not auth.users IDs) and sometimes partial patient IDs.
-- Relax FK constraints so audit logging never fails silently.

-- 1. Drop RLS policies FIRST (they reference user_id, blocking type changes)
DROP POLICY IF EXISTS ai_logs_insert_own ON ai_interaction_logs;
DROP POLICY IF EXISTS ai_logs_select_own ON ai_interaction_logs;
DROP POLICY IF EXISTS ai_logs_insert_any ON ai_interaction_logs;
DROP POLICY IF EXISTS ai_logs_select_any ON ai_interaction_logs;

-- 2. Drop FK constraints
ALTER TABLE IF EXISTS public.ai_interaction_logs
  DROP CONSTRAINT IF EXISTS ai_interaction_logs_user_id_fkey;

ALTER TABLE IF EXISTS public.ai_interaction_logs
  DROP CONSTRAINT IF EXISTS ai_interaction_logs_patient_id_fkey;

ALTER TABLE IF EXISTS public.ai_interaction_logs
  DROP CONSTRAINT IF EXISTS ai_interaction_logs_encounter_id_fkey;

-- 3. Change column types (now safe — no policies reference them)
ALTER TABLE IF EXISTS public.ai_interaction_logs
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS public.ai_interaction_logs
  ALTER COLUMN patient_id TYPE text USING patient_id::text;

ALTER TABLE IF EXISTS public.ai_interaction_logs
  ALTER COLUMN patient_id DROP NOT NULL;

-- 4. Re-create permissive RLS policies
CREATE POLICY ai_logs_insert_any ON ai_interaction_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY ai_logs_select_any ON ai_interaction_logs
  FOR SELECT USING (true);
