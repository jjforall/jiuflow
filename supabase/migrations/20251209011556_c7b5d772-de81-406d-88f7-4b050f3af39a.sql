-- Add explicit deny for anonymous users on dojos table
-- Authenticated users can still view all dojos (business directory purpose)
CREATE POLICY "Deny anonymous access to dojos"
ON public.dojos
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Ensure RLS is enabled
ALTER TABLE public.dojos ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the design decision
COMMENT ON TABLE public.dojos IS 'Dojo directory. Anonymous access denied. Authenticated users can view all dojos for directory purposes. Contact info is intentionally public for business listings.';