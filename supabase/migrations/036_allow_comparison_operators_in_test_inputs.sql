-- Change test_inputs expected value columns from NUMERIC to TEXT
-- This allows comparison operators like ">999", "<100", ">=50", etc.

-- Drop any existing data type and convert to TEXT
ALTER TABLE public.test_inputs
    ALTER COLUMN expected_min TYPE TEXT USING expected_min::TEXT;

ALTER TABLE public.test_inputs
    ALTER COLUMN expected_max TYPE TEXT USING expected_max::TEXT;

ALTER TABLE public.test_inputs
    ALTER COLUMN expected_value TYPE TEXT USING expected_value::TEXT;

-- Add comment explaining the change
COMMENT ON COLUMN public.test_inputs.expected_min IS 'Minimum expected value (can include comparison operators like ">10")';
COMMENT ON COLUMN public.test_inputs.expected_max IS 'Maximum expected value (can include comparison operators like "<100")';
COMMENT ON COLUMN public.test_inputs.expected_value IS 'Expected exact value (can include comparison operators)';
