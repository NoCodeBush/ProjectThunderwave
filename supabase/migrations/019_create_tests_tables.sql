-- Create enums for test input configuration
DO $$ BEGIN
    CREATE TYPE public.test_input_type AS ENUM ('number', 'text', 'boolean');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.test_expected_type AS ENUM ('range', 'minimum', 'maximum', 'exact');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create tests table
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tests_job_id ON public.tests(job_id);
CREATE INDEX IF NOT EXISTS idx_tests_asset_id ON public.tests(asset_id);

-- Create test_inputs table
CREATE TABLE IF NOT EXISTS public.test_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    input_type public.test_input_type NOT NULL DEFAULT 'number',
    unit TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    expected_type public.test_expected_type NOT NULL,
    expected_min NUMERIC,
    expected_max NUMERIC,
    expected_value NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_test_inputs_test_id ON public.test_inputs(test_id);
CREATE INDEX IF NOT EXISTS idx_test_inputs_position ON public.test_inputs(test_id, position);

-- Enable Row Level Security
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_inputs ENABLE ROW LEVEL SECURITY;

-- Tests policies
CREATE POLICY "Users can view tests for their jobs"
    ON public.tests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = tests.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert tests for their jobs"
    ON public.tests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = tests.job_id
            AND jobs.user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update their own tests"
    ON public.tests FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own tests"
    ON public.tests FOR DELETE
    USING (created_by = auth.uid());

-- Test inputs policies
CREATE POLICY "Users can view test inputs for their tests"
    ON public.test_inputs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = test_inputs.test_id
            AND EXISTS (
                SELECT 1 FROM public.jobs
                WHERE jobs.id = tests.job_id
                AND jobs.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert test inputs for their tests"
    ON public.test_inputs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = test_inputs.test_id
            AND tests.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their test inputs"
    ON public.test_inputs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = test_inputs.test_id
            AND tests.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete their test inputs"
    ON public.test_inputs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = test_inputs.test_id
            AND tests.created_by = auth.uid()
        )
    );

-- updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_tests_updated_at'
    ) THEN
        CREATE TRIGGER set_tests_updated_at
        BEFORE UPDATE ON public.tests
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_test_inputs_updated_at'
    ) THEN
        CREATE TRIGGER set_test_inputs_updated_at
        BEFORE UPDATE ON public.test_inputs
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END$$;

COMMENT ON TABLE public.tests IS 'Commissioning tests linked to jobs and optionally assets';
COMMENT ON TABLE public.test_inputs IS 'Individual input fields with expected result parameters for tests';

