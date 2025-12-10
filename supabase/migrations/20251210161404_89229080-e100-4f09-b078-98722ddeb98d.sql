-- Create tournament_results table
CREATE TABLE public.tournament_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  weight_class TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  athlete_name TEXT NOT NULL,
  athlete_name_ja TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  celebrity_id UUID REFERENCES public.celebrities(id) ON DELETE SET NULL,
  team_name TEXT,
  team_name_ja TEXT,
  notes TEXT,
  notes_ja TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view tournament results"
  ON public.tournament_results
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tournament results"
  ON public.tournament_results
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_tournament_results_tournament_id ON public.tournament_results(tournament_id);
CREATE INDEX idx_tournament_results_weight_class ON public.tournament_results(weight_class);

-- Add trigger for updated_at
CREATE TRIGGER update_tournament_results_updated_at
  BEFORE UPDATE ON public.tournament_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();