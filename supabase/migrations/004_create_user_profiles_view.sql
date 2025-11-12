-- Create a function to get user profiles for job assignments
-- This function allows authenticated users to see other users
CREATE OR REPLACE FUNCTION public.get_user_profiles()
RETURNS TABLE (
    id UUID,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT
) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        COALESCE((u.raw_user_meta_data->>'display_name')::TEXT, '') as display_name,
        COALESCE((u.raw_user_meta_data->>'avatar_url')::TEXT, '') as avatar_url
    FROM auth.users u
    WHERE u.id IS NOT NULL
    ORDER BY u.email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profiles() TO authenticated;

-- Create a view that uses the function (for easier querying)
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT * FROM public.get_user_profiles();

-- Grant select on the view
GRANT SELECT ON public.user_profiles TO authenticated;

-- Enable RLS on the view (optional, but good practice)
-- Note: Since the function uses SECURITY DEFINER, RLS on the view may not be necessary
-- but we'll add it for consistency
ALTER VIEW public.user_profiles SET (security_invoker = true);

