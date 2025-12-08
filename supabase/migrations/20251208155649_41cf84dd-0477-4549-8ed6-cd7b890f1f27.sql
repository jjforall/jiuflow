-- Add multilingual name fields to celebrities table
ALTER TABLE public.celebrities
ADD COLUMN IF NOT EXISTS name_en text,
ADD COLUMN IF NOT EXISTS name_ja text,
ADD COLUMN IF NOT EXISTS name_pt text,
ADD COLUMN IF NOT EXISTS name_es text,
ADD COLUMN IF NOT EXISTS name_fr text,
ADD COLUMN IF NOT EXISTS name_de text,
ADD COLUMN IF NOT EXISTS name_zh text,
ADD COLUMN IF NOT EXISTS name_ko text,
ADD COLUMN IF NOT EXISTS name_it text,
ADD COLUMN IF NOT EXISTS name_ru text,
ADD COLUMN IF NOT EXISTS name_ar text,
ADD COLUMN IF NOT EXISTS name_hi text;

-- Copy display_name to name_en as default
UPDATE public.celebrities SET name_en = display_name WHERE name_en IS NULL;