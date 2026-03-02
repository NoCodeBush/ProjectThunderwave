-- Add missing asset types to the asset_type enum
-- PostgreSQL allows adding new values to existing enums

-- Add 'substation' if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'substation' 
        AND enumtypid = 'public.asset_type'::regtype
    ) THEN
        ALTER TYPE public.asset_type ADD VALUE 'substation';
    END IF;
END $$;

-- Add 'switchgear' if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'switchgear' 
        AND enumtypid = 'public.asset_type'::regtype
    ) THEN
        ALTER TYPE public.asset_type ADD VALUE 'switchgear';
    END IF;
END $$;

-- Add 'transformer' if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'transformer' 
        AND enumtypid = 'public.asset_type'::regtype
    ) THEN
        ALTER TYPE public.asset_type ADD VALUE 'transformer';
    END IF;
END $$;

-- Note: We're keeping 'rmu' in the enum for backward compatibility
-- even though we removed it from the TypeScript definition
-- Any existing 'rmu' assets will still work
