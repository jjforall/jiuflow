-- Add media columns to community_threads (posts) and community_posts (replies)
ALTER TABLE public.community_threads 
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text; -- 'image' or 'video'

ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text; -- 'image' or 'video'