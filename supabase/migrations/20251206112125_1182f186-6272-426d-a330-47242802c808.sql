-- Add visibility column to user_videos table
-- visibility: 'public' (一般公開), 'unlisted' (限定公開), 'private' (非公開)
ALTER TABLE public.user_videos 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Update existing data: migrate is_public to visibility
UPDATE public.user_videos 
SET visibility = CASE 
  WHEN is_public = true THEN 'public'
  ELSE 'private'
END;

-- Update RLS policy to allow unlisted videos to be viewed by anyone with the URL
DROP POLICY IF EXISTS "Anyone can view user videos" ON public.user_videos;

CREATE POLICY "Anyone can view public or unlisted videos"
ON public.user_videos
FOR SELECT
USING (visibility IN ('public', 'unlisted'));

-- Add share_token for unlisted videos (optional security enhancement)
ALTER TABLE public.user_videos 
ADD COLUMN IF NOT EXISTS share_token text DEFAULT gen_random_uuid()::text;