-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view follows" ON public.celebrity_follows;

-- Create new policy: Users can only view their own follows
CREATE POLICY "Users can view their own follows"
ON public.celebrity_follows
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all follows for analytics
CREATE POLICY "Admins can view all follows"
ON public.celebrity_follows
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));