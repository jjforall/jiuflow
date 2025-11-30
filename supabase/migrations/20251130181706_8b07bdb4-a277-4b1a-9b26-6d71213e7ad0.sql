-- Add slug column to dojos table for custom URLs like /sweep
ALTER TABLE public.dojos 
ADD COLUMN slug text UNIQUE;

-- Add index for faster slug lookups
CREATE INDEX idx_dojos_slug ON public.dojos(slug);

-- Update SWEEP dojo with slug if it exists
UPDATE public.dojos 
SET slug = 'sweep' 
WHERE name_ja LIKE '%SWEEP%' OR name LIKE '%SWEEP%';

-- Add comment
COMMENT ON COLUMN public.dojos.slug IS 'URL-friendly identifier for the dojo (e.g., "sweep", "carpe-diem")';