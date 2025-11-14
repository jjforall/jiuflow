-- Create storage bucket for user uploaded videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-videos', 'user-videos', true);

-- Create user_videos table
CREATE TABLE public.user_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_type TEXT NOT NULL CHECK (video_type IN ('match', 'technique', 'other')),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view user videos"
ON public.user_videos
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own videos"
ON public.user_videos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
ON public.user_videos
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
ON public.user_videos
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_videos_updated_at
BEFORE UPDATE ON public.user_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for user-videos bucket
CREATE POLICY "Anyone can view user videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);