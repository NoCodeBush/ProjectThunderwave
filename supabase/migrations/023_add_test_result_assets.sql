-- Add support for multiple assets per test result
-- Creates a junction table to link test results with multiple assets

-- Create test_result_assets junction table
CREATE TABLE IF NOT EXISTS public.test_result_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_result_id UUID NOT NULL REFERENCES public.test_results(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(test_result_id, asset_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_result_assets_test_result_id ON public.test_result_assets(test_result_id);
CREATE INDEX IF NOT EXISTS idx_test_result_assets_asset_id ON public.test_result_assets(asset_id);

-- Enable Row Level Security
ALTER TABLE public.test_result_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_result_assets
CREATE POLICY "Users can view test result assets for their jobs"
    ON public.test_result_assets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.test_results tr
            JOIN public.jobs j ON tr.job_id = j.id
            WHERE tr.id = test_result_assets.test_result_id
            AND j.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert test result assets for their jobs"
    ON public.test_result_assets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.test_results tr
            JOIN public.jobs j ON tr.job_id = j.id
            WHERE tr.id = test_result_assets.test_result_id
            AND j.user_id = auth.uid()
        )
    );

-- Remove the old single asset_id constraint from test_results (make it nullable)
-- This maintains backward compatibility
ALTER TABLE public.test_results ALTER COLUMN asset_id DROP NOT NULL;
