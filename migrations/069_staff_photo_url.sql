-- =============================================================================
-- Add photo_url to staff table for profile pictures
-- =============================================================================

-- Add photo_url column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Comment
COMMENT ON COLUMN staff.photo_url IS 'Base64 encoded profile photo or URL to uploaded image';
