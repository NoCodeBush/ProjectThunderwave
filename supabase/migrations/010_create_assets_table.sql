-- Create asset types enum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE public.asset_type AS ENUM (
        'ring_main_unit',
        'protection_ct',
        'emergency_stop',
        'earth_vault_indicator',
        'efi_ct',
        'lv_cabinet',
        'lv_acb',
        'metering_cts',
        'rtu',
        'rmu',
        'CT',
        'protection_relay',
        'hv_metering_unit',
        'metering_vt',
        'lv_metering_cts',
        'battery_charger',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create assets table
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Common asset properties
    asset_type asset_type NOT NULL,
    make TEXT,
    model TEXT,
    serial_number TEXT,
    year INTEGER,
    location TEXT,

    -- Flexible properties stored as JSONB for type-specific fields
    properties JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance (skip if column doesn't exist)
DO $$
BEGIN
    -- Create indexes only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assets_job_id') THEN
        CREATE INDEX idx_assets_job_id ON public.assets(job_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assets_tenant_id') THEN
        CREATE INDEX idx_assets_tenant_id ON public.assets(tenant_id);
    END IF;
    
    -- Only create asset_type index if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'assets'
        AND column_name = 'asset_type'
    ) AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assets_type') THEN
        CREATE INDEX idx_assets_type ON public.assets(asset_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assets_serial_number') THEN
        CREATE INDEX idx_assets_serial_number ON public.assets(serial_number);
    END IF;
END$$;

-- Enable Row Level Security
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view assets in their tenant"
    ON public.assets FOR SELECT
    USING (tenant_id IN (
        SELECT id FROM public.tenants WHERE domain IN (
            SELECT domain FROM public.tenants WHERE id = tenant_id
        )
    ));

CREATE POLICY "Users can insert assets in their tenant"
    ON public.assets FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT id FROM public.tenants WHERE domain IN (
                SELECT domain FROM public.tenants WHERE id = tenant_id
            )
        ) AND
        created_by = auth.uid()
    );

CREATE POLICY "Users can update assets in their tenant"
    ON public.assets FOR UPDATE
    USING (
        tenant_id IN (
            SELECT id FROM public.tenants WHERE domain IN (
                SELECT domain FROM public.tenants WHERE id = tenant_id
            )
        ) AND
        created_by = auth.uid()
    );

CREATE POLICY "Users can delete assets in their tenant"
    ON public.assets FOR DELETE
    USING (
        tenant_id IN (
            SELECT id FROM public.tenants WHERE domain IN (
                SELECT domain FROM public.tenants WHERE id = tenant_id
            )
        ) AND
        created_by = auth.uid()
    );

-- Create trigger for updated_at
CREATE TRIGGER set_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.assets IS 'Assets linked to jobs with flexible properties based on asset type';
COMMENT ON COLUMN public.assets.properties IS 'JSONB field containing type-specific properties';
COMMENT ON COLUMN public.assets.asset_type IS 'Type of asset (ring_main_unit, transformer, etc.)';
