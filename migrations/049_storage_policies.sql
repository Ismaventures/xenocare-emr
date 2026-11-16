-- Create radiology-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('radiology-images', 'radiology-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files to radiology-images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'radiology-images');

-- Policy to allow authenticated users to view files in radiology-images
CREATE POLICY "Allow authenticated select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'radiology-images');

-- Policy to allow authenticated users to update their own files (optional, but good for overwrites)
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'radiology-images');

-- Policy to allow authenticated users to delete their own files (optional)
CREATE POLICY "Allow authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'radiology-images');
