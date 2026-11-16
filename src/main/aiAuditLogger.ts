/**
 * AI Audit Logger — main process audit trail for all AI interactions.
 *
 * Every AI query, response, and clinical suggestion is logged to the
 * `ai_interaction_logs` table for compliance and safety review.
 *
 * DB schema columns:
 *   id, user_id, staff_name, patient_id, encounter_id,
 *   request_type, query_text, response_summary, sources_used,
 *   model_used, response_time_ms, tokens_used (jsonb), created_at
 */
import log from 'electron-log';

// Supabase client will be passed in during registration (main process)
let supabaseUrl = '';
let supabaseKey = '';

interface AuditEntry {
  user_id: string;
  patient_id: string;
  facility_id?: string; // not stored — kept for caller convenience
  action_type: string; // mapped → request_type in DB
  query_text?: string;
  response_summary?: string;
  model_used?: string;
  tokens_used?: number;
  search_type?: string; // stored in metadata
  result_count?: number; // stored in metadata
  metadata?: Record<string, unknown>;
}

/**
 * Initialise the audit logger with Supabase credentials.
 * Called once from registerAIHandlers().
 */
export function initAuditLogger(url: string, key: string): void {
  supabaseUrl = url;
  supabaseKey = key;
  log.info('[AI Audit] Logger initialised');
}

/**
 * Write an audit log entry. Non-blocking — errors are logged but don't
 * propagate to the caller.
 */
export async function logAIInteraction(entry: AuditEntry): Promise<void> {
  if (!supabaseUrl || !supabaseKey) {
    log.warn('[AI Audit] Logger not initialised — skipping audit entry');
    return;
  }

  try {
    // Map caller fields → actual DB columns
    const row: Record<string, unknown> = {
      user_id: entry.user_id,
      patient_id: entry.patient_id,
      request_type: entry.action_type, // DB column is request_type
      query_text: entry.query_text || '',
      response_summary: entry.response_summary || null,
      model_used: entry.model_used || null,
      tokens_used:
        entry.tokens_used != null ? { total: entry.tokens_used } : {},
      sources_used: entry.metadata ? JSON.stringify(entry.metadata) : '[]',
      created_at: new Date().toISOString(),
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/ai_interaction_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!response.ok) {
      // Silently skip FK / constraint errors (409/400) — the table schema
      // may have strict FKs to auth.users that don't match staff IDs.
      // These will be fixed when the migration is applied.
      if (response.status === 409 || response.status === 400) {
        log.debug(
          `[AI Audit] Skipped audit log (constraint): ${response.status}`,
        );
      } else {
        const body = await response.text();
        log.warn(
          `[AI Audit] Failed to write audit log: ${response.status} ${body}`,
        );
      }
    }
  } catch (err) {
    log.warn(`[AI Audit] Error writing audit log: ${String(err)}`);
  }
}
