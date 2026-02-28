-- Remove test_result_assets junction table
-- One test result per asset: use test_results.asset_id only.
-- Future multi-asset support: create multiple test_results rows.

-- Backfill asset_id from junction where missing (preserve existing links)
UPDATE public.test_results tr
SET asset_id = (
  SELECT tra.asset_id
  FROM public.test_result_assets tra
  WHERE tra.test_result_id = tr.id
  ORDER BY tra.created_at
  LIMIT 1
)
WHERE tr.asset_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.test_result_assets tra
  WHERE tra.test_result_id = tr.id
);

-- Drop the junction table (cascades to indexes, policies)
DROP TABLE IF EXISTS public.test_result_assets;
