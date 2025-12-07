-- Recreate public_profiles view with SECURITY INVOKER = false to bypass RLS
-- This is safe because the view only exposes non-sensitive fields for profiles where is_public = true

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = false)
AS
SELECT 
  id,
  display_name,
  username,
  bio,
  avatar_url,
  cover_image_url,
  home_dojo,
  hometown,
  belt_history,
  titles,
  social_links,
  favorite_fighters,
  favorite_techniques,
  hobbies,
  training_locations,
  organization_id,
  is_public,
  created_at
FROM public.profiles
WHERE is_public = true;

-- Grant SELECT permission to all users
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;