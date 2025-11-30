-- Create favorite_dojos table
CREATE TABLE IF NOT EXISTS public.favorite_dojos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dojo_id)
);

-- Enable RLS
ALTER TABLE public.favorite_dojos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own favorites"
  ON public.favorite_dojos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
  ON public.favorite_dojos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorite_dojos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_favorite_dojos_user_id ON public.favorite_dojos(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_dojos_dojo_id ON public.favorite_dojos(dojo_id);