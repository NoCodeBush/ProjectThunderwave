-- Fix multi-tenancy structure: remove tenant_id from child tables
-- Assets and job_assignments should inherit tenant context through job relationship

-- Remove tenant_id from assets table
ALTER TABLE public.assets DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Remove tenant_id from job_assignments table
ALTER TABLE public.job_assignments DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Drop the old indexes that included tenant_id on these tables
DROP INDEX IF EXISTS idx_assets_tenant_id;
DROP INDEX IF EXISTS idx_job_assignments_tenant_id;

-- Update RLS policies for assets to use tenant context through jobs
DROP POLICY IF EXISTS "Users can view assets in their tenant" ON public.assets;
DROP POLICY IF EXISTS "Users can insert assets in their tenant" ON public.assets;
DROP POLICY IF EXISTS "Users can update assets in their tenant" ON public.assets;
DROP POLICY IF EXISTS "Users can delete assets in their tenant" ON public.assets;

-- New policies for assets (tenant context through job relationship)
-- These policies rely on the application layer to filter by tenant

CREATE POLICY "Users can view assets for their jobs"
    ON public.assets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = assets.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert assets for their jobs"
    ON public.assets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = assets.job_id
            AND jobs.user_id = auth.uid()
        ) AND
        created_by = auth.uid()
    );

CREATE POLICY "Users can update their own assets"
    ON public.assets FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own assets"
    ON public.assets FOR DELETE
    USING (created_by = auth.uid());

-- Update RLS policies for job_assignments to use tenant context through jobs
DROP POLICY IF EXISTS "Users can view their job assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Job owners can assign users" ON public.job_assignments;
DROP POLICY IF EXISTS "Job owners can remove assignments" ON public.job_assignments;

-- New policies for job_assignments (tenant context through job relationship)
-- These policies rely on the application layer to filter by tenant

CREATE POLICY "Users can view their job assignments"
    ON public.job_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_assignments.job_id
            AND (jobs.user_id = auth.uid() OR job_assignments.user_id = auth.uid())
        )
    );

CREATE POLICY "Job owners can assign users"
    ON public.job_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_assignments.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Job owners can remove assignments"
    ON public.job_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_assignments.job_id
            AND jobs.user_id = auth.uid()
        )
    );
