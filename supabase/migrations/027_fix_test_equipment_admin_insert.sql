-- Fix test equipment INSERT policy to allow administrators to assign equipment to any user
-- Currently admins can't add equipment for other users because the policy requires auth.uid() = user_id

-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Users can insert their own test equipment in their tenant" ON public.test_equipment;

-- Allow administrators to insert test equipment for any user in their tenant
CREATE POLICY "Administrators can insert test equipment for any user in their tenant"
    ON public.test_equipment FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Allow engineers to insert test equipment for themselves
CREATE POLICY "Engineers can insert their own test equipment"
    ON public.test_equipment FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL AND
        auth.uid() = user_id AND
        NOT public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );
