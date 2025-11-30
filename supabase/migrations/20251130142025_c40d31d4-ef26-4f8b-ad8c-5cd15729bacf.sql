-- Add series_prefix column to techniques table
ALTER TABLE public.techniques
ADD COLUMN series_prefix text;

-- Add comment to explain the column
COMMENT ON COLUMN public.techniques.series_prefix IS 'Series prefix letter (A, B, C, etc.) for grouping and display';