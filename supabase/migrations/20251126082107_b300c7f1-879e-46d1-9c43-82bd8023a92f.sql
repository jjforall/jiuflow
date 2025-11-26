-- Add series management fields to techniques table
ALTER TABLE public.techniques
ADD COLUMN series_name text,
ADD COLUMN series_order integer;

-- Add index for efficient grouping
CREATE INDEX idx_techniques_series ON public.techniques(series_name, series_order);

-- Update the existing closed guard techniques as an example
-- (Admin can update these values later through the dashboard)
COMMENT ON COLUMN public.techniques.series_name IS 'シリーズ名（例：Closed Guard Series）。nullの場合は単独の技として扱われる';
COMMENT ON COLUMN public.techniques.series_order IS 'シリーズ内での表示順序（1, 2, 3...）';