
-- Allow video_list_items to be read when the parent list has a valid share token
CREATE POLICY "Items visible via share token"
ON public.video_list_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM video_lists
    WHERE video_lists.id = video_list_items.list_id
    AND video_lists.share_token IS NOT NULL
    AND (video_lists.share_token_expires_at IS NULL OR video_lists.share_token_expires_at > now())
  )
);
