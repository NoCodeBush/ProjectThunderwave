-- Fix RLS policies to allow proper job viewing for both My Jobs and Schedule pages
-- 
-- Issue: The current policies only allow engineers to see jobs they own (user_id = auth.uid())
-- This breaks two use cases:
-- 1. My Jobs page: Should show jobs the user owns OR is assigned to
-- 2. Schedule page: Should show ALL jobs in the tenant (for calendar view)
--
-- Solution: Replace the restrictive "Engineers can view their own jobs" policy
-- with a more permissive policy that allows all users to view all jobs in their tenant.
-- The application layer (useJobs vs useAllTenantJobs hooks) will handle filtering
-- which jobs to display on each page.

-- Drop the old restrictive policy for engineers
DROP POLICY IF EXISTS "Engineers can view their own jobs" ON public.jobs;

-- Create a new policy that allows all tenant members to view all jobs in their tenant
-- This enables both the My Jobs page (with assigned jobs) and Schedule page (all jobs) to work
CREATE POLICY "All users can view jobs in their tenant"
    ON public.jobs FOR SELECT
    USING (
        tenant_id IS NOT NULL AND
        public.is_user_in_tenant(auth.uid(), tenant_id)
    );
