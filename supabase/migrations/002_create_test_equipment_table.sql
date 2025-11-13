-- Create test_equipment table
CREATE TABLE IF NOT EXISTS public.test_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    date_test DATE NOT NULL,
    expiry DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_test_equipment_user_id ON public.test_equipment(user_id);

-- Create index on date_test for sorting
CREATE INDEX IF NOT EXISTS idx_test_equipment_date_test ON public.test_equipment(date_test DESC);

-- Create index on expiry for filtering expired equipment
CREATE INDEX IF NOT EXISTS idx_test_equipment_expiry ON public.test_equipment(expiry);

-- Enable Row Level Security
ALTER TABLE public.test_equipment ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own test equipment
CREATE POLICY "Users can view their own test equipment"
    ON public.test_equipment
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy: Users can insert their own test equipment
CREATE POLICY "Users can insert their own test equipment"
    ON public.test_equipment
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own test equipment
CREATE POLICY "Users can update their own test equipment"
    ON public.test_equipment
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy: Users can delete their own test equipment
CREATE POLICY "Users can delete their own test equipment"
    ON public.test_equipment
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at on row update

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_test_equipment_updated_at'
    ) THEN
        CREATE TRIGGER set_test_equipment_updated_at
        BEFORE UPDATE ON public.test_equipment
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;



