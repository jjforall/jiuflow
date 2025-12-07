-- Add RLS policy for private videos: owners and purchasers can view
CREATE POLICY "Owners and purchasers can view private videos"
ON public.user_videos
FOR SELECT
USING (
  visibility = 'private' AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.video_purchases
      WHERE video_purchases.video_id = user_videos.id
      AND video_purchases.buyer_id = auth.uid()
    )
  )
);