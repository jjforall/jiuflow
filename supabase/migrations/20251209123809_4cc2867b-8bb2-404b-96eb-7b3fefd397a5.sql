-- Create favorite_venues table
CREATE TABLE public.favorite_venues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, venue_id)
);

-- Enable RLS
ALTER TABLE public.favorite_venues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorite venues"
ON public.favorite_venues FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite venues"
ON public.favorite_venues FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite venues"
ON public.favorite_venues FOR DELETE
USING (auth.uid() = user_id);