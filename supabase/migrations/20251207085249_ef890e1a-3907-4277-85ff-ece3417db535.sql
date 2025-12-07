-- Create security definer function to check if user has purchased a video
-- This prevents infinite recursion between user_videos and video_purchases RLS policies
CREATE OR REPLACE FUNCTION public.user_has_purchased_video(p_video_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM video_purchases
    WHERE video_id = p_video_id
    AND buyer_id = p_user_id
  )
$$;

-- Create security definer function to check if user owns a video
CREATE OR REPLACE FUNCTION public.user_owns_video(p_video_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_videos
    WHERE id = p_video_id
    AND user_id = p_user_id
  )
$$;

-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Owners and purchasers can view private videos" ON public.user_videos;

-- Recreate the policy using the security definer function
CREATE POLICY "Owners and purchasers can view private videos"
ON public.user_videos
FOR SELECT
USING (
  visibility = 'private' AND (
    auth.uid() = user_id OR
    public.user_has_purchased_video(id, auth.uid())
  )
);

-- Drop the problematic policy on video_purchases
DROP POLICY IF EXISTS "Video owners can view purchases of their videos" ON public.video_purchases;

-- Recreate the policy using the security definer function
CREATE POLICY "Video owners can view purchases of their videos"
ON public.video_purchases
FOR SELECT
USING (
  public.user_owns_video(video_id, auth.uid())
);