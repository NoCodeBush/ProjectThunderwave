-- Make user_id optional in test_equipment table

-- Alter the column to allow NULL values
ALTER TABLE public.test_equipment
  ALTER COLUMN user_id DROP NOT NULL;

-- Update the administrator INSERT policy to allow NULL user_id (unassigned equipment)
DROP POLICY IF EXISTS "Administrators can insert test equipment for any user in their tenant" ON public.test_equipment;

CREATE POLICY "Administrators can insert test equipment for any user in their tenant"
    ON public.test_equipment FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id) AND
        (user_id IS NULL OR true) -- Allow NULL user_id for unassigned equipment
    );
