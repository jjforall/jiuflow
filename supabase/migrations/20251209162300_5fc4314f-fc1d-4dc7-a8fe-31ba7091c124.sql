-- Drop existing constraint and add updated one with 'sparring' value
ALTER TABLE public.user_videos DROP CONSTRAINT IF EXISTS user_videos_video_type_check;
ALTER TABLE public.user_videos ADD CONSTRAINT user_videos_video_type_check CHECK (video_type = ANY (ARRAY['match'::text, 'technique'::text, 'other'::text, 'sparring'::text]));