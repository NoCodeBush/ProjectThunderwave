-- Add 'nested_table' to test_input_type enum
DO $$ 
BEGIN
    -- Check if 'nested_table' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'nested_table' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'test_input_type')
    ) THEN
        ALTER TYPE public.test_input_type ADD VALUE 'nested_table';
    END IF;
END $$;

-- Add nested_table_layout column to test_inputs table
ALTER TABLE public.test_inputs 
ADD COLUMN IF NOT EXISTS nested_table_layout JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN public.test_inputs.nested_table_layout IS 'JSON configuration for nested-table-type inputs, supporting cells within cells and complex table structures';

