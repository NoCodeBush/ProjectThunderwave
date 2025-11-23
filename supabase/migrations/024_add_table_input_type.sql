-- Add 'table' to test_input_type enum
DO $$ 
BEGIN
    -- Check if 'table' value already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'table' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'test_input_type'
        )
    ) THEN
        ALTER TYPE public.test_input_type ADD VALUE 'table';
    END IF;
END $$;

