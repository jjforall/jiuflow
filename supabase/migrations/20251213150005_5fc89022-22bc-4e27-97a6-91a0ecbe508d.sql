
-- Fix the security definer view warning by recreating view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

-- Create view without SECURITY DEFINER (default is INVOKER which is safer)
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  display_name_reading,
  username,
  avatar_url,
  bio,
  belt_history,
  titles,
  home_dojo,
  organization_id,
  is_public,
  created_at
FROM public.profiles
WHERE is_public = true;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;
