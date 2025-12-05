-- Add translated content columns to community_threads
ALTER TABLE public.community_threads
ADD COLUMN IF NOT EXISTS content_en TEXT,
ADD COLUMN IF NOT EXISTS content_ja TEXT,
ADD COLUMN IF NOT EXISTS content_pt TEXT,
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS title_ja TEXT,
ADD COLUMN IF NOT EXISTS title_pt TEXT;

-- Add translated content columns to community_posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS content_en TEXT,
ADD COLUMN IF NOT EXISTS content_ja TEXT,
ADD COLUMN IF NOT EXISTS content_pt TEXT;