-- Create music tracks table
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  audio_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Public read access for active tracks
CREATE POLICY "Anyone can view active music tracks" 
ON public.music_tracks 
FOR SELECT 
USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage music tracks" 
ON public.music_tracks 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_music_tracks_updated_at
BEFORE UPDATE ON public.music_tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();