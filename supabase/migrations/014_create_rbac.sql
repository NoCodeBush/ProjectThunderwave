-- Create RBAC (Role-Based Access Control) system
-- This migration creates a user_tenants table to link users to tenants with roles

-- Create role enum
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'administrator',
        'engineer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_tenants table to link users to tenants with roles
CREATE TABLE IF NOT EXISTS public.user_tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    role public.user_role NOT NULL DEFAULT 'engineer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, tenant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON public.user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_role ON public.user_tenants(role);

-- Enable Row Level Security
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Create function to get user role in a tenant
CREATE OR REPLACE FUNCTION public.get_user_role_in_tenant(p_user_id UUID, p_tenant_id UUID)
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role public.user_role;
BEGIN
    SELECT role INTO user_role
    FROM public.user_tenants
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    LIMIT 1;
    
    RETURN user_role;
END;
$$;

-- Create function to check if user is administrator in tenant
CREATE OR REPLACE FUNCTION public.is_administrator_in_tenant(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_tenants ut
        WHERE ut.user_id = p_user_id
        AND ut.tenant_id = p_tenant_id
        AND ut.role = 'administrator'
    );
END;
$$;

-- Create function to check if user is a member of a tenant
CREATE OR REPLACE FUNCTION public.is_user_in_tenant(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_tenants
        WHERE user_id = p_user_id
        AND tenant_id = p_tenant_id
    );
END;
$$;

-- RLS Policies for user_tenants table

-- Users can view their own tenant membership
CREATE POLICY "Users can view their own tenant membership"
    ON public.user_tenants FOR SELECT
    USING (auth.uid() = user_id);

-- Administrators can view all users in their tenant
CREATE POLICY "Administrators can view all users in their tenant"
    ON public.user_tenants FOR SELECT
    USING (
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can insert new user-tenant relationships
CREATE POLICY "Administrators can add users to tenant"
    ON public.user_tenants FOR INSERT
    WITH CHECK (
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can update user roles in their tenant
CREATE POLICY "Administrators can update user roles in their tenant"
    ON public.user_tenants FOR UPDATE
    USING (
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    )
    WITH CHECK (
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Administrators can remove users from tenant (but not themselves)
CREATE POLICY "Administrators can remove users from tenant"
    ON public.user_tenants FOR DELETE
    USING (
        auth.uid() != user_id AND
        public.is_administrator_in_tenant(auth.uid(), tenant_id)
    );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER set_user_tenants_updated_at
    BEFORE UPDATE ON public.user_tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create a view for user profiles with tenant and role information
CREATE OR REPLACE VIEW public.user_tenant_profiles AS
SELECT 
    u.id,
    u.email::TEXT as email,
    COALESCE((u.raw_user_meta_data->>'display_name')::TEXT, '') as display_name,
    COALESCE((u.raw_user_meta_data->>'avatar_url')::TEXT, '') as avatar_url,
    ut.tenant_id,
    ut.role,
    ut.created_at as joined_at
FROM auth.users u
INNER JOIN public.user_tenants ut ON u.id = ut.user_id;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.user_tenant_profiles TO authenticated;

-- Create a function to get users for a specific tenant (with role info)
CREATE OR REPLACE FUNCTION public.get_tenant_users(p_tenant_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role public.user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check if the requesting user is an administrator in this tenant
    IF NOT EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = p_tenant_id
        AND ut.role = 'administrator'
    ) THEN
        -- If not admin, only return their own profile
        RETURN QUERY
        SELECT 
            u.id,
            u.email::TEXT,
            COALESCE((u.raw_user_meta_data->>'display_name')::TEXT, '') as display_name,
            COALESCE((u.raw_user_meta_data->>'avatar_url')::TEXT, '') as avatar_url,
            ut.role
        FROM auth.users u
        INNER JOIN public.user_tenants ut ON u.id = ut.user_id
        WHERE ut.tenant_id = p_tenant_id
        AND u.id = auth.uid();
    ELSE
        -- If admin, return all users in the tenant
        RETURN QUERY
        SELECT 
            u.id,
            u.email::TEXT,
            COALESCE((u.raw_user_meta_data->>'display_name')::TEXT, '') as display_name,
            COALESCE((u.raw_user_meta_data->>'avatar_url')::TEXT, '') as avatar_url,
            ut.role
        FROM auth.users u
        INNER JOIN public.user_tenants ut ON u.id = ut.user_id
        WHERE ut.tenant_id = p_tenant_id
        ORDER BY u.email;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_tenant_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_in_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_administrator_in_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_tenant(UUID, UUID) TO authenticated;

