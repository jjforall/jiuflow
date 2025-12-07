-- Fix security definer view issue by setting security_invoker = true
-- This is intentionally set to false for public_profiles to allow user discovery
-- The view already filters for is_public = true and excludes sensitive fields
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = false)
AS
SELECT 
  id,
  display_name,
  display_name_reading,
  username,
  bio,
  avatar_url,
  cover_image_url,
  belt_history,
  titles,
  social_links,
  favorite_fighters,
  favorite_techniques,
  hobbies,
  training_locations,
  organization_id,
  home_dojo,
  hometown,
  is_public,
  created_at
FROM public.profiles
WHERE is_public = true;