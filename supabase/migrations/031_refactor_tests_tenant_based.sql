-- Refactor tests table: remove job_id and asset_id, add tenant_id
-- Tests are now tenant-scoped templates linked to asset_type only.
-- Test results remain linked to job + asset(s) via test_results and test_result_assets.

-- Step 1: Add tenant_id column (nullable initially for data migration)
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Step 2: Migrate existing data - set tenant_id from job where job_id exists
UPDATE public.tests t
SET tenant_id = j.tenant_id
FROM public.jobs j
WHERE t.job_id = j.id AND t.tenant_id IS NULL;

-- Step 3: For tests without job_id (or job had no tenant), derive from created_by via user_tenants
UPDATE public.tests t
SET tenant_id = (
  SELECT ut.tenant_id FROM public.user_tenants ut
  WHERE ut.user_id = t.created_by
  LIMIT 1
)
WHERE t.tenant_id IS NULL;

-- Step 4: Fallback - use tenant from any job the user owns (for legacy data)
UPDATE public.tests t
SET tenant_id = (
  SELECT j.tenant_id FROM public.jobs j
  WHERE j.user_id = t.created_by AND j.tenant_id IS NOT NULL
  LIMIT 1
)
WHERE t.tenant_id IS NULL;

-- Step 5: For any remaining NULLs, use first tenant (should not happen in production)
UPDATE public.tests t
SET tenant_id = (SELECT id FROM public.tenants LIMIT 1)
WHERE t.tenant_id IS NULL;

-- Step 6: Make tenant_id NOT NULL
ALTER TABLE public.tests ALTER COLUMN tenant_id SET NOT NULL;

-- Step 7: Create index for tenant_id
CREATE INDEX IF NOT EXISTS idx_tests_tenant_id ON public.tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tests_asset_type ON public.tests(asset_type);

-- Step 8: Drop RLS policies that reference job_id (must be done BEFORE dropping the column)
DROP POLICY IF EXISTS "Users can view tests" ON public.tests;
DROP POLICY IF EXISTS "Users can view tests for their jobs" ON public.tests;
DROP POLICY IF EXISTS "Users can insert tests" ON public.tests;
DROP POLICY IF EXISTS "Users can insert tests for their jobs" ON public.tests;
DROP POLICY IF EXISTS "Users can update their own tests" ON public.tests;
DROP POLICY IF EXISTS "Users can delete their own tests" ON public.tests;
DROP POLICY IF EXISTS "Users can view test inputs for their tests" ON public.test_inputs;

-- Step 9: Drop job_id and asset_id columns (policies that depended on them are now dropped)
ALTER TABLE public.tests DROP COLUMN IF EXISTS job_id;
ALTER TABLE public.tests DROP COLUMN IF EXISTS asset_id;

-- Step 10: Drop old indexes if they still exist (column drop removes them, but be safe)
DROP INDEX IF EXISTS idx_tests_job_id;
DROP INDEX IF EXISTS idx_tests_asset_id;

-- Step 11: Create new RLS policies for tests
CREATE POLICY "Administrators can view tests in their tenant"
    ON public.tests FOR SELECT
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can view tests in their tenant (members can see tenant tests)
CREATE POLICY "Engineers can view tests in their tenant"
    ON public.tests FOR SELECT
    USING (
        tenant_id IS NOT NULL AND
        public.is_user_in_tenant(auth.uid(), tenant_id)
    );

-- Users can insert tests in their tenant
CREATE POLICY "Users can insert tests in their tenant"
    ON public.tests FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL AND
        created_by = auth.uid() AND
        public.is_user_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can update any test in their tenant
CREATE POLICY "Administrators can update tests in their tenant"
    ON public.tests FOR UPDATE
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can update tests they created
CREATE POLICY "Engineers can update their own tests"
    ON public.tests FOR UPDATE
    USING (
        tenant_id IS NOT NULL AND
        created_by = auth.uid() AND
        public.is_user_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can delete any test in their tenant
CREATE POLICY "Administrators can delete tests in their tenant"
    ON public.tests FOR DELETE
    USING (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Engineers can delete tests they created
CREATE POLICY "Engineers can delete their own tests"
    ON public.tests FOR DELETE
    USING (
        tenant_id IS NOT NULL AND
        created_by = auth.uid() AND
        public.is_user_in_tenant(auth.uid(), tenant_id)
    );

-- Step 12: Create test_inputs RLS policy (uses tenant_id)
CREATE POLICY "Users can view test inputs for their tests"
    ON public.test_inputs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = test_inputs.test_id
            AND tests.tenant_id IS NOT NULL
            AND public.is_user_in_tenant(auth.uid(), tests.tenant_id)
        )
    );

COMMENT ON TABLE public.tests IS 'Commissioning test templates scoped by tenant and asset type. Results are stored in test_results.';
