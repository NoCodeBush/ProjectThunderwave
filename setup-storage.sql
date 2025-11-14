-- Complete setup script for job-images storage
-- Run this in Supabase SQL Editor

-- 1. First, let's check if the bucket exists
SELECT name, public FROM storage.buckets WHERE name = 'job-images';

-- If it doesn't exist, you'll need to create it manually in the dashboard
-- Then apply these policies:

-- 2. Drop any existing policies for job-images
DROP POLICY IF EXISTS "Users can upload job images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view job images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- 3. Create new policies
CREATE POLICY "Users can upload job images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view job images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'job-images'
  AND EXISTS (
    SELECT 1 FROM job_images ji
    JOIN jobs j ON ji.job_id = j.id
    WHERE ji.file_path = name
    AND (
      j.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM job_assignments ja
        WHERE ja.job_id = j.id
        AND ja.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-images'
  AND EXISTS (
    SELECT 1 FROM job_images
    WHERE file_path = name
    AND uploaded_by = auth.uid()
  )
);

-- 4. Check that job_images table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'job_images';

-- 5. Check current RLS policies on job_images
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'job_images';

-- 6. List some storage objects to verify
SELECT bucket_id, name, updated_at FROM storage.objects
WHERE bucket_id = 'job-images'
ORDER BY updated_at DESC
LIMIT 10;

-- 7. List recent job_images records
SELECT id, job_id, filename, file_path, created_at FROM job_images
ORDER BY created_at DESC
LIMIT 10;
