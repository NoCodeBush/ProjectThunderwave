-- Migration for existing systems: Add asset_type column to tests table
-- Note: Fresh installations should use migration 019 which already includes these changes
-- This migration is only needed for databases created before the asset_type feature

-- Add asset_type column if it doesn't exist (for existing databases)
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS asset_type TEXT;

-- Make job_id optional if it's still required (for existing databases)
-- Note: This will only work if there are no NULL job_id values
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tests' AND column_name = 'job_id' AND is_nullable = 'NO'
    ) THEN
        -- Check if there are any NULL job_id values before making it nullable
        IF NOT EXISTS (SELECT 1 FROM public.tests WHERE job_id IS NULL) THEN
            ALTER TABLE public.tests ALTER COLUMN job_id DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- Create index for asset_type for better query performance (for existing databases)
CREATE INDEX IF NOT EXISTS idx_tests_asset_type ON public.tests(asset_type);
