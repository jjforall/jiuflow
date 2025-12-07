-- Fix celebrity_follows RLS: Drop overly permissive policy that exposes all follow relationships
-- The "Users can view celebrity follows" policy with qual=true allows any user to see all follows
DROP POLICY IF EXISTS "Users can view celebrity follows" ON public.celebrity_follows;

-- Create a new policy that only allows users to view their own follows
CREATE POLICY "Users can view own celebrity follows" 
ON public.celebrity_follows 
FOR SELECT 
USING (auth.uid() = user_id);