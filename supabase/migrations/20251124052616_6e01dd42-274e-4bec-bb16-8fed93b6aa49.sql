-- Add hashtags column to techniques table
ALTER TABLE public.techniques
ADD COLUMN hashtags text[] DEFAULT '{}';

-- Add index for hashtag searches
CREATE INDEX idx_techniques_hashtags ON public.techniques USING GIN(hashtags);