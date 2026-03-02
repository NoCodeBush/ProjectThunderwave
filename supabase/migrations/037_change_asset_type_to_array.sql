-- Change tests.asset_type from single TEXT to array TEXT[]
-- This allows tests to be assigned to multiple asset types

-- Step 1: Add new column for asset types array
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS asset_types TEXT[];

-- Step 2: Migrate existing data from asset_type to asset_types (only if asset_type column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tests' AND column_name = 'asset_type'
    ) THEN
        UPDATE public.tests
        SET asset_types = ARRAY[asset_type]
        WHERE asset_type IS NOT NULL AND asset_types IS NULL;
    END IF;
END $$;

-- Step 3: Drop the old asset_type column (if it exists)
ALTER TABLE public.tests DROP COLUMN IF EXISTS asset_type;

-- Step 4: Create index for better query performance on asset_types
CREATE INDEX IF NOT EXISTS idx_tests_asset_types ON public.tests USING GIN(asset_types);

-- Step 5: Drop old index if it exists
DROP INDEX IF EXISTS idx_tests_asset_type;

-- Add comment explaining the change
COMMENT ON COLUMN public.tests.asset_types IS 'Array of asset types this test applies to (e.g., [''transformer'', ''circuit_breaker''])';
