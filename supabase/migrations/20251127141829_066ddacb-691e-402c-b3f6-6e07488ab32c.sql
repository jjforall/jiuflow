-- Add language-specific video URL columns to techniques table
ALTER TABLE public.techniques 
ADD COLUMN IF NOT EXISTS video_url_ja TEXT,
ADD COLUMN IF NOT EXISTS video_url_pt TEXT;

-- Add language-specific thumbnail URL columns
ALTER TABLE public.techniques 
ADD COLUMN IF NOT EXISTS thumbnail_url_ja TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url_pt TEXT;

-- Update existing data: copy current video_url to video_url (English) if not set
-- This ensures backward compatibility
UPDATE public.techniques 
SET video_url_ja = video_url 
WHERE video_url_ja IS NULL AND video_url IS NOT NULL;

UPDATE public.techniques 
SET video_url_pt = video_url 
WHERE video_url_pt IS NULL AND video_url IS NOT NULL;

UPDATE public.techniques 
SET thumbnail_url_ja = thumbnail_url 
WHERE thumbnail_url_ja IS NULL AND thumbnail_url IS NOT NULL;

UPDATE public.techniques 
SET thumbnail_url_pt = thumbnail_url 
WHERE thumbnail_url_pt IS NULL AND thumbnail_url IS NOT NULL;

COMMENT ON COLUMN public.techniques.video_url IS 'Video URL for English';
COMMENT ON COLUMN public.techniques.video_url_ja IS 'Video URL for Japanese';
COMMENT ON COLUMN public.techniques.video_url_pt IS 'Video URL for Portuguese';
COMMENT ON COLUMN public.techniques.thumbnail_url IS 'Thumbnail URL for English';
COMMENT ON COLUMN public.techniques.thumbnail_url_ja IS 'Thumbnail URL for Japanese';
COMMENT ON COLUMN public.techniques.thumbnail_url_pt IS 'Thumbnail URL for Portuguese';