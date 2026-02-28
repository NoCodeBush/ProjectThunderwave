-- Restrict user_tenant_profiles view so only tenant members can see profiles in their tenant(s)

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
INNER JOIN public.user_tenants ut ON u.id = ut.user_id
WHERE public.is_user_in_tenant(auth.uid(), ut.tenant_id);
