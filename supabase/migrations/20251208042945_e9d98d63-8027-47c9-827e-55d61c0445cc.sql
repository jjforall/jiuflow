-- Create tournament_participants table to track who plans to participate
CREATE TABLE public.tournament_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'registered', 'canceled')),
  weight_class TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Anyone can view participants
CREATE POLICY "Anyone can view tournament participants"
ON public.tournament_participants
FOR SELECT
USING (true);

-- Users can add themselves as participants
CREATE POLICY "Users can add themselves as participants"
ON public.tournament_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own participation
CREATE POLICY "Users can update their own participation"
ON public.tournament_participants
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can remove their own participation
CREATE POLICY "Users can remove their own participation"
ON public.tournament_participants
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_tournament_participants_tournament ON public.tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user ON public.tournament_participants(user_id);