-- Update RLS policies to respect RBAC roles
-- Administrators can view all resources in their tenant, engineers can only view their own

-- Drop existing job policies
DROP POLICY IF EXISTS "Users can view their own jobs in their tenant" ON public.jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs in their tenant" ON public.jobs;
DROP POLICY IF EXISTS "Users can update their own jobs in their tenant" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs in their tenant" ON public.jobs;

-- Create new job policies that respect RBAC
-- Administrators can view all jobs in their tenant
CREATE POLICY "Administrators can view all jobs in their tenant"
    ON public.jobs FOR SELECT
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can view their own jobs
CREATE POLICY "Engineers can view their own jobs"
    ON public.jobs FOR SELECT
    USING (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        NOT public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Users can insert their own jobs (both roles)
CREATE POLICY "Users can insert their own jobs in their tenant"
    ON public.jobs FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        public.is_user_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can update any job in their tenant
CREATE POLICY "Administrators can update any job in their tenant"
    ON public.jobs FOR UPDATE
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can update their own jobs
CREATE POLICY "Engineers can update their own jobs"
    ON public.jobs FOR UPDATE
    USING (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        NOT public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can delete any job in their tenant
CREATE POLICY "Administrators can delete any job in their tenant"
    ON public.jobs FOR DELETE
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can delete their own jobs
CREATE POLICY "Engineers can delete their own jobs"
    ON public.jobs FOR DELETE
    USING (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        NOT public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Update test_equipment policies
DROP POLICY IF EXISTS "Users can view their own test equipment in their tenant" ON public.test_equipment;
DROP POLICY IF EXISTS "Users can insert their own test equipment in their tenant" ON public.test_equipment;
DROP POLICY IF EXISTS "Users can update their own test equipment in their tenant" ON public.test_equipment;
DROP POLICY IF EXISTS "Users can delete their own test equipment in their tenant" ON public.test_equipment;

-- Administrators can view all test equipment in their tenant
CREATE POLICY "Administrators can view all test equipment in their tenant"
    ON public.test_equipment FOR SELECT
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can view their own test equipment
CREATE POLICY "Engineers can view their own test equipment"
    ON public.test_equipment FOR SELECT
    USING (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        NOT public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Users can insert their own test equipment (both roles)
CREATE POLICY "Users can insert their own test equipment in their tenant"
    ON public.test_equipment FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        public.is_user_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can update any test equipment in their tenant
CREATE POLICY "Administrators can update any test equipment in their tenant"
    ON public.test_equipment FOR UPDATE
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can update their own test equipment
CREATE POLICY "Engineers can update their own test equipment"
    ON public.test_equipment FOR UPDATE
    USING (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        NOT public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can delete any test equipment in their tenant
CREATE POLICY "Administrators can delete any test equipment in their tenant"
    ON public.test_equipment FOR DELETE
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can delete their own test equipment
CREATE POLICY "Engineers can delete their own test equipment"
    ON public.test_equipment FOR DELETE
    USING (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        NOT public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Update job_assignments policies to respect RBAC
-- Drop all existing policies (from migration 003 and 007)
DROP POLICY IF EXISTS "Users can view their job assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Users can view their job assignments in their tenant" ON public.job_assignments;
DROP POLICY IF EXISTS "Job owners can assign users" ON public.job_assignments;
DROP POLICY IF EXISTS "Job owners can assign users in their tenant" ON public.job_assignments;
DROP POLICY IF EXISTS "Job owners can remove assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Job owners can remove assignments in their tenant" ON public.job_assignments;

-- Administrators can view all job assignments in their tenant
CREATE POLICY "Administrators can view all job assignments in their tenant"
    ON public.job_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_assignments.job_id
            AND public.is_administrator_in_tenant(auth.uid(), j.tenant_id)
        )
    );

-- Engineers can view their own job assignments
CREATE POLICY "Engineers can view their own job assignments"
    ON public.job_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_assignments.job_id
            AND (j.user_id = auth.uid() OR job_assignments.user_id = auth.uid())
            AND NOT public.is_administrator_in_tenant(auth.uid(), j.tenant_id)
        )
    );

-- Administrators can assign users to any job in their tenant
CREATE POLICY "Administrators can assign users to any job in their tenant"
    ON public.job_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_assignments.job_id
            AND public.is_administrator_in_tenant(auth.uid(), j.tenant_id)
        )
    );

-- Job owners can assign users (both roles)
CREATE POLICY "Job owners can assign users"
    ON public.job_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_assignments.job_id
            AND j.user_id = auth.uid()
            AND NOT public.is_administrator_in_tenant(auth.uid(), j.tenant_id)
        )
    );

-- Administrators can remove any assignment in their tenant
CREATE POLICY "Administrators can remove any assignment in their tenant"
    ON public.job_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_assignments.job_id
            AND public.is_administrator_in_tenant(auth.uid(), j.tenant_id)
        )
    );

-- Job owners can remove assignments (both roles)
CREATE POLICY "Job owners can remove assignments"
    ON public.job_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_assignments.job_id
            AND j.user_id = auth.uid()
            AND NOT public.is_administrator_in_tenant(auth.uid(), j.tenant_id)
        )
    );

