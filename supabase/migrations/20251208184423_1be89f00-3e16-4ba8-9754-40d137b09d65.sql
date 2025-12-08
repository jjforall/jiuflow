-- Create venues table
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ja TEXT,
  address TEXT,
  address_ja TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'JP',
  image_url TEXT,
  capacity INTEGER,
  website TEXT,
  access_info TEXT,
  access_info_ja TEXT,
  google_maps_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view venues"
  ON public.venues FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage venues"
  ON public.venues FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add venue_id to tournaments table
ALTER TABLE public.tournaments ADD COLUMN venue_id UUID REFERENCES public.venues(id);

-- Create index for faster lookups
CREATE INDEX idx_tournaments_venue_id ON public.tournaments(venue_id);
CREATE INDEX idx_venues_country ON public.venues(country);