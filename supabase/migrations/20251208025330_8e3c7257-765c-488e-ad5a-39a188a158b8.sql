-- Make receiver_id nullable for group messages
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ja TEXT,
  date_start DATE NOT NULL,
  date_end DATE,
  location TEXT NOT NULL,
  location_ja TEXT,
  venue TEXT,
  venue_ja TEXT,
  organizer TEXT NOT NULL,
  description TEXT,
  description_ja TEXT,
  country TEXT DEFAULT 'JP',
  is_international BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'domestic', -- domestic, international, major
  registration_url TEXT,
  notes TEXT,
  notes_ja TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Anyone can view tournaments
CREATE POLICY "Anyone can view tournaments"
  ON public.tournaments
  FOR SELECT
  USING (true);

-- Only admins can manage tournaments
CREATE POLICY "Admins can manage tournaments"
  ON public.tournaments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for date queries
CREATE INDEX idx_tournaments_date_start ON public.tournaments(date_start);
CREATE INDEX idx_tournaments_category ON public.tournaments(category);