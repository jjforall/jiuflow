-- Drop the overly permissive public view policy
DROP POLICY IF EXISTS "Anyone can view community ranks" ON public.community_ranks;

-- Create a new policy that only allows authenticated users to view community ranks
CREATE POLICY "Authenticated users can view community ranks"
ON public.community_ranks
FOR SELECT
TO authenticated
USING (true);