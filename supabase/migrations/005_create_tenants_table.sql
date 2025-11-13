-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    primary_color TEXT NOT NULL DEFAULT '#3b82f6',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on domain for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON public.tenants(domain);

-- Enable Row Level Security
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read tenant info (needed for domain-based lookup)
DO $$
BEGIN
    -- Policy: Anyone can view tenants
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view tenants' AND schemaname = 'public' AND tablename = 'tenants'
    ) THEN
        CREATE POLICY "Anyone can view tenants"
            ON public.tenants
            FOR SELECT
            USING (true);
    END IF;

    -- Policy: Authenticated users can insert tenants
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert tenants' AND schemaname = 'public' AND tablename = 'tenants'
    ) THEN
        CREATE POLICY "Authenticated users can insert tenants"
            ON public.tenants
            FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
    END IF;

    -- Policy: Authenticated users can update tenants
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update tenants' AND schemaname = 'public' AND tablename = 'tenants'
    ) THEN
        CREATE POLICY "Authenticated users can update tenants"
            ON public.tenants
            FOR UPDATE
            USING (auth.role() = 'authenticated');
    END IF;
END
$$;

-- Create trigger to update updated_at on row update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_tenants_updated_at'
    ) THEN
        CREATE TRIGGER set_tenants_updated_at
        BEFORE UPDATE ON public.tenants
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;


