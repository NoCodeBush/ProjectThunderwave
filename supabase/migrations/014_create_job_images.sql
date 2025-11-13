-- Create job_images table for storing image metadata
-- Following the pattern of other child tables (assets, job_assignments),
-- tenant_id is NOT stored here - tenant context is inherited through job relationship
CREATE TABLE IF NOT EXISTS public.job_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_images_job_id ON public.job_images(job_id);
CREATE INDEX IF NOT EXISTS idx_job_images_uploaded_by ON public.job_images(uploaded_by);

-- Enable Row Level Security
ALTER TABLE public.job_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for job_images
-- Following the pattern of other child tables (assets, job_assignments),
-- tenant context is inherited through job relationship
CREATE POLICY "Users can view images for their jobs"
    ON public.job_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_images.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert images for their jobs"
    ON public.job_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_images.job_id
            AND jobs.user_id = auth.uid()
        ) AND
        uploaded_by = auth.uid()
    );

CREATE POLICY "Users can delete their own uploaded images"
    ON public.job_images FOR DELETE
    USING (uploaded_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER set_job_images_updated_at
    BEFORE UPDATE ON public.job_images
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.job_images IS 'Metadata for images uploaded to jobs';
COMMENT ON COLUMN public.job_images.file_path IS 'Path to the file in Supabase storage';
COMMENT ON COLUMN public.job_images.file_size IS 'File size in bytes';
