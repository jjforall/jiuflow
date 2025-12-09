-- Fix user_follows table - restrict read access to only involved users
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;

-- Users can only see follows where they are involved (follower or following)
CREATE POLICY "Users can view their own follows"
ON public.user_follows
FOR SELECT
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Admins can view all follows for moderation
CREATE POLICY "Admins can view all follows"
ON public.user_follows
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));