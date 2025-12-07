-- Create favorite_techniques table for user favorites
CREATE TABLE public.favorite_techniques (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    technique_id uuid NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, technique_id)
);

-- Enable RLS
ALTER TABLE public.favorite_techniques ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorite techniques"
ON public.favorite_techniques
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add their own favorite techniques"
ON public.favorite_techniques
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove their own favorite techniques"
ON public.favorite_techniques
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_favorite_techniques_user_id ON public.favorite_techniques(user_id);
CREATE INDEX idx_favorite_techniques_technique_id ON public.favorite_techniques(technique_id);