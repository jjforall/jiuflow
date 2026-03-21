
-- Add share token and expiration to video_lists
ALTER TABLE public.video_lists
ADD COLUMN share_token text UNIQUE,
ADD COLUMN share_token_expires_at timestamp with time zone;

-- Create index for share token lookups
CREATE INDEX idx_video_lists_share_token ON public.video_lists (share_token) WHERE share_token IS NOT NULL;

-- Allow public access to shared playlists via share_token (read-only)
CREATE POLICY "Anyone can view shared playlists via token"
ON public.video_lists
FOR SELECT
USING (
  share_token IS NOT NULL 
  AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
);
