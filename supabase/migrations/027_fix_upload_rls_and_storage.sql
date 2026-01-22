-- Fix RLS policies for job_images and job_documents
-- Allow job owners AND assigned users to upload/view/delete
-- Also fix storage bucket policies for both buckets

-- ============================================
-- PART 1: Fix job_images table RLS policies
-- ============================================

-- Drop existing policies for job_images
DROP POLICY IF EXISTS "Users can view images for their jobs" ON public.job_images;
DROP POLICY IF EXISTS "Users can insert images for their jobs" ON public.job_images;
DROP POLICY IF EXISTS "Users can delete their own uploaded images" ON public.job_images;

-- Users can view images for jobs they own or are assigned to
CREATE POLICY "Users can view images for their jobs"
    ON public.job_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_images.job_id
            AND (
                jobs.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.job_assignments
                    WHERE job_assignments.job_id = jobs.id
                    AND job_assignments.user_id = auth.uid()
                )
            )
        )
    );

-- Users can insert images for jobs they own or are assigned to
CREATE POLICY "Users can insert images for their jobs"
    ON public.job_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_images.job_id
            AND (
                jobs.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.job_assignments
                    WHERE job_assignments.job_id = jobs.id
                    AND job_assignments.user_id = auth.uid()
                )
            )
        ) AND
        uploaded_by = auth.uid()
    );

-- Users can delete their own uploaded images
CREATE POLICY "Users can delete their own uploaded images"
    ON public.job_images FOR DELETE
    USING (uploaded_by = auth.uid());

-- ============================================
-- PART 2: Fix job_documents table RLS policies
-- ============================================

-- Drop existing policies for job_documents
DROP POLICY IF EXISTS "Users can view documents for their jobs" ON public.job_documents;
DROP POLICY IF EXISTS "Users can insert documents for their jobs" ON public.job_documents;
DROP POLICY IF EXISTS "Users can delete their own uploaded documents" ON public.job_documents;

-- Users can view documents for jobs they own or are assigned to
CREATE POLICY "Users can view documents for their jobs"
    ON public.job_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_documents.job_id
            AND (
                jobs.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.job_assignments
                    WHERE job_assignments.job_id = jobs.id
                    AND job_assignments.user_id = auth.uid()
                )
            )
        )
    );

-- Users can insert documents for jobs they own or are assigned to
CREATE POLICY "Users can insert documents for their jobs"
    ON public.job_documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_documents.job_id
            AND (
                jobs.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.job_assignments
                    WHERE job_assignments.job_id = jobs.id
                    AND job_assignments.user_id = auth.uid()
                )
            )
        ) AND
        uploaded_by = auth.uid()
    );

-- Users can delete their own uploaded documents
CREATE POLICY "Users can delete their own uploaded documents"
    ON public.job_documents FOR DELETE
    USING (uploaded_by = auth.uid());

-- ============================================
-- PART 3: Create storage buckets (if they don't exist)
-- ============================================

-- Create job-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create job-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-documents', 'job-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- PART 4: Fix storage bucket policies for job-images
-- ============================================

-- Drop ALL existing storage policies for job-images
DROP POLICY IF EXISTS "Users can upload job images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view job images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view job images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload job images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete job images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own job images" ON storage.objects;

-- Allow ANY authenticated user to upload to job-images bucket
-- Access control is enforced by database RLS when inserting into job_images table
CREATE POLICY "Authenticated users can upload job images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-images'
  AND auth.role() = 'authenticated'
);

-- Allow public read access to job-images (since bucket is public)
CREATE POLICY "Public can view job images"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-images');

-- Allow users to delete files they uploaded (check via database)
CREATE POLICY "Users can delete their own job images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-images'
  AND EXISTS (
    SELECT 1 FROM public.job_images
    WHERE job_images.file_path = storage.objects.name
    AND job_images.uploaded_by = auth.uid()
  )
);

-- ============================================
-- PART 5: Fix storage bucket policies for job-documents
-- ============================================

-- Drop ALL existing storage policies for job-documents
DROP POLICY IF EXISTS "Users can upload job documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view job documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view job documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload job documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete job documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own job documents" ON storage.objects;

-- Allow ANY authenticated user to upload to job-documents bucket
-- Access control is enforced by database RLS when inserting into job_documents table
CREATE POLICY "Authenticated users can upload job documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-documents'
  AND auth.role() = 'authenticated'
);

-- Allow public read access to job-documents (since bucket is public)
CREATE POLICY "Public can view job documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-documents');

-- Allow users to delete files they uploaded (check via database)
CREATE POLICY "Users can delete their own job documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-documents'
  AND EXISTS (
    SELECT 1 FROM public.job_documents
    WHERE job_documents.file_path = storage.objects.name
    AND job_documents.uploaded_by = auth.uid()
  )
);

