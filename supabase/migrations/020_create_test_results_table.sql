-- Create status enum for test results if it does not exist
DO $$
BEGIN
    CREATE TYPE public.test_result_status AS ENUM ('draft', 'submitted');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create table to store test form submissions
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    responses JSONB NOT NULL,
    status public.test_result_status NOT NULL DEFAULT 'submitted',
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON public.test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_job_id ON public.test_results(job_id);
CREATE INDEX IF NOT EXISTS idx_test_results_submitted_at ON public.test_results(submitted_at DESC);

-- Enable Row Level Security
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Allow job owners and assigned engineers to view test results
CREATE POLICY "Users can view test results for their jobs"
    ON public.test_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.jobs
            WHERE jobs.id = test_results.job_id
            AND (
                jobs.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1
                    FROM public.job_assignments
                    WHERE job_assignments.job_id = jobs.id
                    AND job_assignments.user_id = auth.uid()
                )
                OR test_results.submitted_by = auth.uid()
            )
        )
    );

-- Allow job owners and assigned engineers to insert test results for their jobs
CREATE POLICY "Users can submit test results for their jobs"
    ON public.test_results FOR INSERT
    WITH CHECK (
        test_results.submitted_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.jobs
            WHERE jobs.id = test_results.job_id
            AND (
                jobs.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1
                    FROM public.job_assignments
                    WHERE job_assignments.job_id = jobs.id
                    AND job_assignments.user_id = auth.uid()
                )
            )
        )
    );

-- Allow job owners and assigned engineers to update existing results
CREATE POLICY "Users can update their submitted test results"
    ON public.test_results FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.jobs
            WHERE jobs.id = test_results.job_id
            AND (
                jobs.user_id = auth.uid()
                OR test_results.submitted_by = auth.uid()
                OR EXISTS (
                    SELECT 1
                    FROM public.job_assignments
                    WHERE job_assignments.job_id = jobs.id
                    AND job_assignments.user_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.jobs
            WHERE jobs.id = test_results.job_id
            AND (
                jobs.user_id = auth.uid()
                OR test_results.submitted_by = auth.uid()
                OR EXISTS (
                    SELECT 1
                    FROM public.job_assignments
                    WHERE job_assignments.job_id = jobs.id
                    AND job_assignments.user_id = auth.uid()
                )
            )
        )
    );

-- Keep updated_at column fresh
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_test_results_updated_at'
    ) THEN
        CREATE TRIGGER set_test_results_updated_at
        BEFORE UPDATE ON public.test_results
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END$$;

COMMENT ON TABLE public.test_results IS 'Stores submitted responses for configured commissioning tests.';

