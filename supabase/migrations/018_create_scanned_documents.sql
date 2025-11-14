-- Create scanned_documents table for storing processed scanned images
CREATE TABLE IF NOT EXISTS public.scanned_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id UUID NOT NULL REFERENCES public.job_images(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    scanned_image_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scanned_documents_image_id ON public.scanned_documents(image_id);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_document_type ON public.scanned_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_created_at ON public.scanned_documents(created_at);

-- Enable Row Level Security
ALTER TABLE public.scanned_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scanned_documents
-- Users can view scanned documents for images they have access to
CREATE POLICY "Users can view scanned documents for their job images"
    ON public.scanned_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.job_images ji
            JOIN public.jobs j ON ji.job_id = j.id
            WHERE ji.id = scanned_documents.image_id
            AND j.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert scanned documents for their job images"
    ON public.scanned_documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.job_images ji
            JOIN public.jobs j ON ji.job_id = j.id
            WHERE ji.id = scanned_documents.image_id
            AND j.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their scanned documents"
    ON public.scanned_documents FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.job_images ji
            WHERE ji.id = scanned_documents.image_id
            AND ji.uploaded_by = auth.uid()
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER set_scanned_documents_updated_at
    BEFORE UPDATE ON public.scanned_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.scanned_documents IS 'Processed scanned images with document classification';
COMMENT ON COLUMN public.scanned_documents.document_type IS 'Detected document type (certificate, invoice, report, etc.)';
COMMENT ON COLUMN public.scanned_documents.scanned_image_path IS 'Path to processed scanned image in storage';
