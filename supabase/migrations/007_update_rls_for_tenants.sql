-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON public.jobs;

DROP POLICY IF EXISTS "Users can view their own test equipment" ON public.test_equipment;
DROP POLICY IF EXISTS "Users can insert their own test equipment" ON public.test_equipment;
DROP POLICY IF EXISTS "Users can update their own test equipment" ON public.test_equipment;
DROP POLICY IF EXISTS "Users can delete their own test equipment" ON public.test_equipment;

DROP POLICY IF EXISTS "Users can view their job assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Job owners can assign users" ON public.job_assignments;
DROP POLICY IF EXISTS "Job owners can remove assignments" ON public.job_assignments;

-- Create function to get tenant_id from domain
CREATE OR REPLACE FUNCTION public.get_tenant_id_from_domain(domain_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    SELECT id INTO tenant_uuid
    FROM public.tenants
    WHERE domain = domain_name
    LIMIT 1;
    
    RETURN tenant_uuid;
END;
$$;

-- Create function to get current tenant_id (from request header or default)
-- This will be set by the application based on the domain
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    tenant_uuid UUID;
    domain_name TEXT;
BEGIN
    -- Try to get tenant from request header (set by application)
    -- For now, we'll use a session variable approach
    -- The application will set this via: SET LOCAL app.tenant_id = 'uuid';
    -- For Supabase, we'll use a different approach - the app will pass tenant_id in queries
    
    -- Return NULL if not set (will be handled by application layer)
    RETURN NULL;
END;
$$;

DO $$
BEGIN
    -- Jobs policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own jobs in their tenant' AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Users can view their own jobs in their tenant"
            ON public.jobs FOR SELECT
            USING (auth.uid() = user_id AND tenant_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own jobs in their tenant' AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Users can insert their own jobs in their tenant"
            ON public.jobs FOR INSERT
            WITH CHECK (auth.uid() = user_id AND tenant_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own jobs in their tenant' AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Users can update their own jobs in their tenant"
            ON public.jobs FOR UPDATE
            USING (auth.uid() = user_id AND tenant_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own jobs in their tenant' AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Users can delete their own jobs in their tenant"
            ON public.jobs FOR DELETE
            USING (auth.uid() = user_id AND tenant_id IS NOT NULL);
    END IF;

    -- Test equipment policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own test equipment in their tenant' AND tablename = 'test_equipment'
    ) THEN
        CREATE POLICY "Users can view their own test equipment in their tenant"
            ON public.test_equipment FOR SELECT
            USING (auth.uid() = user_id AND tenant_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own test equipment in their tenant' AND tablename = 'test_equipment'
    ) THEN
        CREATE POLICY "Users can insert their own test equipment in their tenant"
            ON public.test_equipment FOR INSERT
            WITH CHECK (auth.uid() = user_id AND tenant_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own test equipment in their tenant' AND tablename = 'test_equipment'
    ) THEN
        CREATE POLICY "Users can update their own test equipment in their tenant"
            ON public.test_equipment FOR UPDATE
            USING (auth.uid() = user_id AND tenant_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own test equipment in their tenant' AND tablename = 'test_equipment'
    ) THEN
        CREATE POLICY "Users can delete their own test equipment in their tenant"
            ON public.test_equipment FOR DELETE
            USING (auth.uid() = user_id AND tenant_id IS NOT NULL);
    END IF;

    -- Job assignments policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their job assignments in their tenant' AND tablename = 'job_assignments'
    ) THEN
        CREATE POLICY "Users can view their job assignments in their tenant"
            ON public.job_assignments FOR SELECT
            USING (
                tenant_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.jobs
                    WHERE jobs.id = job_assignments.job_id
                    AND (jobs.user_id = auth.uid() OR job_assignments


