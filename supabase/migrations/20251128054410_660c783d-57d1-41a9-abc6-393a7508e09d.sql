-- Add price field to user_videos table for paid videos
ALTER TABLE public.user_videos 
ADD COLUMN price INTEGER DEFAULT 0,
ADD COLUMN is_public BOOLEAN DEFAULT true;

-- Add index for public videos
CREATE INDEX idx_user_videos_public ON public.user_videos(is_public, created_at DESC) WHERE is_public = true;

-- Create table for video purchases
CREATE TABLE public.video_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.user_videos(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  stripe_payment_id TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id, video_id)
);

-- Enable RLS
ALTER TABLE public.video_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_purchases
CREATE POLICY "Users can view their own purchases"
  ON public.video_purchases FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Users can create their own purchases"
  ON public.video_purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Allow video owners to see who purchased their videos
CREATE POLICY "Video owners can view purchases of their videos"
  ON public.video_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_videos
      WHERE user_videos.id = video_purchases.video_id
      AND user_videos.user_id = auth.uid()
    )
  );