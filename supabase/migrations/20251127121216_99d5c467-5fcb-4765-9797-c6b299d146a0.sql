-- Create table to track video viewing history
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 1,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own viewing history
CREATE POLICY "Users can view their own video views"
  ON public.video_views
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own viewing history
CREATE POLICY "Users can insert their own video views"
  ON public.video_views
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own viewing history
CREATE POLICY "Users can update their own video views"
  ON public.video_views
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_video_views_user_video ON public.video_views(user_id, video_id);
CREATE INDEX idx_video_views_user ON public.video_views(user_id);

-- Enable realtime for video views
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_views;