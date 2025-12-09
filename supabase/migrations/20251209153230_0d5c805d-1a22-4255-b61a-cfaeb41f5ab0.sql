-- Add user_video_id to community_threads and community_posts
ALTER TABLE public.community_threads 
ADD COLUMN IF NOT EXISTS user_video_id uuid REFERENCES public.user_videos(id) ON DELETE SET NULL;

ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS user_video_id uuid REFERENCES public.user_videos(id) ON DELETE SET NULL;