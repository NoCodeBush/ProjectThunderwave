-- Create job_documents table for storing document metadata
-- Following the pattern of job_images table
CREATE TABLE IF NOT EXISTS public.job_documents (
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
CREATE INDEX IF NOT EXISTS idx_job_documents_job_id ON public.job_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_uploaded_by ON public.job_documents(uploaded_by);

-- Enable Row Level Security
ALTER TABLE public.job_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for job_documents
-- Following the pattern of job_images, tenant context is inherited through job relationship
CREATE POLICY "Users can view documents for their jobs"
    ON public.job_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_documents.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert documents for their jobs"
    ON public.job_documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_documents.job_id
            AND jobs.user_id = auth.uid()
        ) AND
        uploaded_by = auth.uid()
    );

CREATE POLICY "Users can delete their own uploaded documents"
    ON public.job_documents FOR DELETE
    USING (uploaded_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER set_job_documents_updated_at
    BEFORE UPDATE ON public.job_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.job_documents IS 'Metadata for documents uploaded to jobs';
COMMENT ON COLUMN public.job_documents.file_path IS 'Path to document in job-documents storage bucket';

