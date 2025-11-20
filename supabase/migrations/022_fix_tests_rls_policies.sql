-- Fix RLS policies for tests table to support tests without jobs
-- Tests can now be created without job association, so we need to update the policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tests for their jobs" ON public.tests;
DROP POLICY IF EXISTS "Users can insert tests for their jobs" ON public.tests;
DROP POLICY IF EXISTS "Users can update their own tests" ON public.tests;
DROP POLICY IF EXISTS "Users can delete their own tests" ON public.tests;

-- New policies that support both job-based and tenant-based access

-- View policy: Users can view tests they created OR tests for jobs they own
CREATE POLICY "Users can view tests"
    ON public.tests FOR SELECT
    USING (
        created_by = auth.uid() OR
        (
            job_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.jobs
                WHERE jobs.id = tests.job_id
                AND jobs.user_id = auth.uid()
            )
        )
    );

-- Insert policy: Users can create tests (job_id is now optional)
CREATE POLICY "Users can insert tests"
    ON public.tests FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
    );

-- Update policy: Users can update tests they created
CREATE POLICY "Users can update their own tests"
    ON public.tests FOR UPDATE
    USING (created_by = auth.uid());

-- Delete policy: Users can delete tests they created
CREATE POLICY "Users can delete their own tests"
    ON public.tests FOR DELETE
    USING (created_by = auth.uid());

-- Update test_inputs policies to also support tests without jobs
DROP POLICY IF EXISTS "Users can view test inputs for their tests" ON public.test_inputs;

CREATE POLICY "Users can view test inputs for their tests"
    ON public.test_inputs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = test_inputs.test_id
            AND (
                tests.created_by = auth.uid() OR
                (
                    tests.job_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM public.jobs
                        WHERE jobs.id = tests.job_id
                        AND jobs.user_id = auth.uid()
                    )
                )
            )
        )
    );
