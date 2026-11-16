-- Migration: AI interaction audit log table
-- Logs every AI query for compliance, accountability, and usage analytics

CREATE TABLE IF NOT EXISTS public.ai_interaction_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Who asked
  user_id uuid NOT NULL REFERENCES auth.users(id),
  staff_name text,                         -- Denormalized for quick audit review

  -- Which patient / encounter
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES visits(id),

  -- What was asked
  request_type varchar(30) NOT NULL,       -- 'query', 'draft', 'differential', 'coding', 'completeness', 'trend', 'timeline'
  query_text text NOT NULL,                -- The doctor's original query or action

  -- What was returned
  response_summary text,                   -- Abbreviated AI response (for audit review)
  sources_used jsonb DEFAULT '[]',         -- [{source_table, source_id, record_date}]
  model_used varchar(50),                  -- 'gpt-4o-mini', 'llama3.1:8b', etc.

  -- Performance
  response_time_ms int,                    -- How long the AI took to respond
  tokens_used jsonb DEFAULT '{}',          -- {input: N, output: N}

  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_ai_logs_user
  ON ai_interaction_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_patient
  ON ai_interaction_logs(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created
  ON ai_interaction_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_type
  ON ai_interaction_logs(request_type);

-- RLS: Only the user who created the log + admin can read
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_logs_insert_own ON ai_interaction_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY ai_logs_select_own ON ai_interaction_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
        AND staff.role IN ('admin', 'super_admin')
    )
  );
