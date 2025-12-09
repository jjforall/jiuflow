-- Add explicit DENY policies for anonymous users on sensitive tables
-- This ensures no anonymous access even if other policies are misconfigured

-- Profiles table: Explicit deny for anonymous users
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Celebrity applications: Explicit deny for anonymous users  
CREATE POLICY "Deny anonymous access to celebrity_applications"
ON public.celebrity_applications
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Subscriptions: Explicit deny for anonymous users
CREATE POLICY "Deny anonymous access to subscriptions"
ON public.subscriptions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Verify RLS is enabled (it should already be)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebrity_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;