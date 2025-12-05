-- Create community_reactions table for likes/reactions
CREATE TABLE public.community_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id UUID REFERENCES public.community_threads(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_target CHECK (
    (thread_id IS NOT NULL AND post_id IS NULL) OR 
    (thread_id IS NULL AND post_id IS NOT NULL)
  ),
  CONSTRAINT unique_thread_reaction UNIQUE (user_id, thread_id),
  CONSTRAINT unique_post_reaction UNIQUE (user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view reactions"
  ON public.community_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reactions"
  ON public.community_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.community_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_community_reactions_thread ON public.community_reactions(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_community_reactions_post ON public.community_reactions(post_id) WHERE post_id IS NOT NULL;