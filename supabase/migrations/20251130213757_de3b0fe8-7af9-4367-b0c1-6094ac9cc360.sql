-- Celebrity follows table
CREATE TABLE IF NOT EXISTS public.celebrity_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, celebrity_id)
);

-- Enable RLS
ALTER TABLE public.celebrity_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view celebrity follows"
  ON public.celebrity_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own celebrity follows"
  ON public.celebrity_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own celebrity follows"
  ON public.celebrity_follows FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_celebrity_follows_user_id ON public.celebrity_follows(user_id);
CREATE INDEX idx_celebrity_follows_celebrity_id ON public.celebrity_follows(celebrity_id);