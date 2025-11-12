-- Create job_assignments table for many-to-many relationship between jobs and users
CREATE TABLE IF NOT EXISTS public.job_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(job_id, user_id)
);

-- Create index on job_id for faster queries
CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON public.job_assignments(job_id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_job_assignments_user_id ON public.job_assignments(user_id);

-- Enable Row Level Security
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view assignments for jobs they own or are assigned to
CREATE POLICY "Users can view their job assignments"
    ON public.job_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_assignments.job_id
            AND (jobs.user_id = auth.uid() OR job_assignments.user_id = auth.uid())
        )
    );

-- Create policy: Job owners can assign users to their jobs
CREATE POLICY "Job owners can assign users"
    ON public.job_assignments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_assignments.job_id
            AND jobs.user_id = auth.uid()
        )
    );

-- Create policy: Job owners can remove assignments
CREATE POLICY "Job owners can remove assignments"
    ON public.job_assignments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_assignments.job_id
            AND jobs.user_id = auth.uid()
        )
    );

