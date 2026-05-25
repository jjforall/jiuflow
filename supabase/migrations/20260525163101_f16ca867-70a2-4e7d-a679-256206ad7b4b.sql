-- Revert previous notation change (SG <- I) and rename series_prefix SG -> I
UPDATE public.bjj_notations SET code = 'SG' WHERE id = '122c6dcc-3090-4d30-b9d3-f25af8b5b3dc';
UPDATE public.techniques SET series_prefix = 'I' WHERE series_prefix = 'SG';