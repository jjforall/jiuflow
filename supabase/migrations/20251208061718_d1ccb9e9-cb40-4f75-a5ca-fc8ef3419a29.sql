-- Add featured_user_id to user_videos for tagging people in videos
ALTER TABLE public.user_videos 
  ADD COLUMN IF NOT EXISTS featured_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_videos_featured_user_id ON public.user_videos(featured_user_id);

-- Drop the restrictive message policy that requires following
DROP POLICY IF EXISTS "Users can send messages to people they follow" ON public.messages;

-- Allow users to send direct messages to anyone
CREATE POLICY "Users can send direct messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND receiver_id IS NOT NULL
  AND group_id IS NULL
);

-- Update or create RLS policy for viewing videos where user is featured
DROP POLICY IF EXISTS "Users can view videos where they are featured" ON public.user_videos;
DROP POLICY IF EXISTS "Anyone can view public videos" ON public.user_videos;

CREATE POLICY "Anyone can view public videos or own videos"
ON public.user_videos
FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() = featured_user_id
  OR (is_public = true AND visibility = 'public')
);