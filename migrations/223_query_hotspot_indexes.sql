-- =============================================================================
-- 223_query_hotspot_indexes.sql
-- Targeted index additions for high-frequency PostgREST query patterns.
--
-- Focus:
-- 1) Notification acknowledgement polling by user + ack state.
-- 2) Clinical request approval queues filtered by request_type + nhis status.
-- =============================================================================

BEGIN;

-- Speeds up notification polling query pattern:
-- WHERE user_id = ?
--   AND is_persistent = true
--   AND requires_acknowledgement = true
--   AND acknowledged_at IS NULL
--   AND (snoozed_until IS NULL OR snoozed_until < now())
-- ORDER BY priority, created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_ack_poll
ON public.notifications (
  user_id,
  is_persistent,
  requires_acknowledgement,
  acknowledged_at,
  snoozed_until,
  priority,
  created_at DESC
)
WHERE requires_acknowledgement = true
  AND acknowledged_at IS NULL;

-- Speeds up repeated NHIS approval queue filters on clinical requests:
-- WHERE request_type = ?
--   AND nhis_approval_status IN (?, ?)
CREATE INDEX IF NOT EXISTS idx_clinical_requests_type_nhis_status
ON public.clinical_requests (request_type, nhis_approval_status);

COMMIT;
