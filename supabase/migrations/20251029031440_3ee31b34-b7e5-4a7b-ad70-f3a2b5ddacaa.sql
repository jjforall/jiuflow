-- Create techniques table
CREATE TABLE public.techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_ja VARCHAR(255) NOT NULL,
  name_pt VARCHAR(255) NOT NULL,
  description TEXT,
  description_ja TEXT,
  description_pt TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('pull', 'control', 'submission')),
  video_url TEXT,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view techniques
CREATE POLICY "Anyone can view techniques"
ON public.techniques
FOR SELECT
USING (true);

-- Policy: Only authenticated users can insert techniques
CREATE POLICY "Authenticated users can insert techniques"
ON public.techniques
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only authenticated users can update techniques
CREATE POLICY "Authenticated users can update techniques"
ON public.techniques
FOR UPDATE
TO authenticated
USING (true);

-- Policy: Only authenticated users can delete techniques
CREATE POLICY "Authenticated users can delete techniques"
ON public.techniques
FOR DELETE
TO authenticated
USING (true);

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('technique-videos', 'technique-videos', true);

-- Storage policies for videos
CREATE POLICY "Anyone can view videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'technique-videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'technique-videos');

CREATE POLICY "Authenticated users can update videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'technique-videos');

CREATE POLICY "Authenticated users can delete videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'technique-videos');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for techniques table
CREATE TRIGGER update_techniques_updated_at
BEFORE UPDATE ON public.techniques
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
