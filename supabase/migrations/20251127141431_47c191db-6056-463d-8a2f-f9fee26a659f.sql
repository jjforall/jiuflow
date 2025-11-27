-- Create video_ratings table
CREATE TABLE IF NOT EXISTS public.video_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Create video_comments table
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_tips table
CREATE TABLE IF NOT EXISTS public.video_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  stripe_payment_id TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tips ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_ratings
CREATE POLICY "Anyone can view ratings"
  ON public.video_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON public.video_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.video_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON public.video_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for video_comments
CREATE POLICY "Anyone can view comments"
  ON public.video_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comments"
  ON public.video_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.video_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.video_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for video_tips
CREATE POLICY "Anyone can view tips"
  ON public.video_tips FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own tips"
  ON public.video_tips FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Create indexes
CREATE INDEX idx_video_ratings_video_id ON public.video_ratings(video_id);
CREATE INDEX idx_video_ratings_user_id ON public.video_ratings(user_id);
CREATE INDEX idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX idx_video_comments_created_at ON public.video_comments(created_at DESC);
CREATE INDEX idx_video_tips_video_id ON public.video_tips(video_id);

-- Add trigger for updated_at
CREATE TRIGGER update_video_ratings_updated_at
  BEFORE UPDATE ON public.video_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_comments_updated_at
  BEFORE UPDATE ON public.video_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();