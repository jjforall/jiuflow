-- Add multilingual bio fields to celebrities table
ALTER TABLE public.celebrities
  ADD COLUMN IF NOT EXISTS bio_ja TEXT,
  ADD COLUMN IF NOT EXISTS bio_en TEXT,
  ADD COLUMN IF NOT EXISTS bio_pt TEXT,
  ADD COLUMN IF NOT EXISTS bio_es TEXT,
  ADD COLUMN IF NOT EXISTS bio_fr TEXT,
  ADD COLUMN IF NOT EXISTS bio_de TEXT,
  ADD COLUMN IF NOT EXISTS bio_zh TEXT,
  ADD COLUMN IF NOT EXISTS bio_ko TEXT,
  ADD COLUMN IF NOT EXISTS bio_it TEXT,
  ADD COLUMN IF NOT EXISTS bio_ru TEXT,
  ADD COLUMN IF NOT EXISTS bio_ar TEXT,
  ADD COLUMN IF NOT EXISTS bio_hi TEXT;

-- Migrate existing bio data to bio_ja (assuming existing data is in Japanese)
UPDATE public.celebrities
SET bio_ja = bio
WHERE bio IS NOT NULL AND bio_ja IS NULL;