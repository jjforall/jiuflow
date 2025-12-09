-- Add is_public column to tournament_participants
ALTER TABLE public.tournament_participants
ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Update RLS policy to allow viewing only public participants (for non-owners)
DROP POLICY IF EXISTS "Anyone can view tournament participants" ON public.tournament_participants;

CREATE POLICY "Anyone can view public tournament participants"
ON public.tournament_participants
FOR SELECT
USING (is_public = true OR auth.uid() = user_id);