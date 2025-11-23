-- Add table_layout column to test_inputs table
ALTER TABLE public.test_inputs 
ADD COLUMN IF NOT EXISTS table_layout JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN public.test_inputs.table_layout IS 'JSON configuration for table-type inputs, containing columns, rows, cells, and headerRows';

