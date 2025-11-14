-- Create a function to automatically assign users to tenants when they sign up
-- This function will be called via a database trigger or from the application

-- Function to assign a user to a tenant with a default role
CREATE OR REPLACE FUNCTION public.assign_user_to_tenant(
    p_user_id UUID,
    p_tenant_id UUID,
    p_role public.user_role DEFAULT 'engineer'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert user-tenant relationship if it doesn't exist
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (p_user_id, p_tenant_id, p_role)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_user_to_tenant(UUID, UUID, public.user_role) TO authenticated;

-- Note: The application should call this function when a user signs up
-- based on the domain they're accessing. This ensures users are automatically
-- assigned to the correct tenant with the engineer role by default.

