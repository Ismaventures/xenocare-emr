-- =============================================================================
-- 220_radiology_image_retention_60_days.sql
-- Enforce automatic deletion of radiology images older than 60 days.
-- This deletes both:
-- 1) storage objects in bucket: radiology-images
-- 2) matching metadata rows in public.scan_images
-- =============================================================================

ALTER TABLE public.scan_images
ADD COLUMN IF NOT EXISTS upload_date TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.cleanup_expired_radiology_images(
  p_retention_days INTEGER DEFAULT 60
)
RETURNS TABLE(
  deleted_scan_images INTEGER,
  deleted_storage_objects INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_retention_days INTEGER := GREATEST(COALESCE(p_retention_days, 60), 1);
  v_cutoff TIMESTAMPTZ := NOW() - make_interval(days => v_retention_days);
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT
      s.ctid AS row_ref,
      CASE
        WHEN s.image_path IS NULL THEN NULL
        WHEN s.image_path ~* '^https?://' THEN
          split_part(
            regexp_replace(
              s.image_path,
              '^https?://[^/]+/storage/v1/object/(public|sign)/radiology-images/',
              ''
            ),
            '?',
            1
          )
        ELSE split_part(ltrim(s.image_path, '/'), '?', 1)
      END AS object_name
    FROM public.scan_images s
    WHERE COALESCE(s.upload_date, s.created_at) < v_cutoff
  ),
  deleted_objects AS (
    DELETE FROM storage.objects o
    USING candidates c
    WHERE o.bucket_id = 'radiology-images'
      AND c.object_name IS NOT NULL
      AND c.object_name <> ''
      AND o.name = c.object_name
    RETURNING o.id
  ),
  deleted_rows AS (
    DELETE FROM public.scan_images s
    USING candidates c
    WHERE s.ctid = c.row_ref
    RETURNING 1
  )
  SELECT
    COALESCE((SELECT COUNT(*)::INTEGER FROM deleted_rows), 0) AS deleted_scan_images,
    COALESCE((SELECT COUNT(*)::INTEGER FROM deleted_objects), 0) AS deleted_storage_objects;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_radiology_images(INTEGER)
IS 'Deletes radiology image files and scan_images rows older than retention window (default: 60 days).';

GRANT EXECUTE ON FUNCTION public.cleanup_expired_radiology_images(INTEGER) TO service_role;

-- Improve retention cleanup filtering performance.
CREATE INDEX IF NOT EXISTS idx_scan_images_retention_cutoff
ON public.scan_images ((COALESCE(upload_date, created_at)));

-- Schedule daily execution if pg_cron is available.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-radiology-images-60d')
    WHERE EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'cleanup-radiology-images-60d'
    );

    PERFORM cron.schedule(
      'cleanup-radiology-images-60d',
      '15 2 * * *',
      'SELECT public.cleanup_expired_radiology_images(60);'
    );

    RAISE NOTICE 'pg_cron job cleanup-radiology-images-60d scheduled (daily at 02:15).';
  ELSE
    RAISE NOTICE 'pg_cron not available. Call public.cleanup_expired_radiology_images(60) via scheduler/edge function.';
  END IF;
END
$$;
