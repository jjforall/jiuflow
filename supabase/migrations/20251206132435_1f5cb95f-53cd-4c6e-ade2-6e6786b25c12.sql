-- Fix security definer views by recreating them with SECURITY INVOKER
-- This ensures RLS policies of the querying user are applied

-- Drop and recreate public_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  username,
  bio,
  avatar_url,
  cover_image_url,
  belt_history,
  titles,
  home_dojo,
  hometown,
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

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Drop and recreate public_dojos view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_dojos;
CREATE VIEW public.public_dojos 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  name_ja,
  name_pt,
  description,
  description_ja,
  description_pt,
  location,
  website,
  instagram,
  facebook,
  youtube,
  twitter,
  line,
  blog_url,
  logo_url,
  cover_image_url,
  mission,
  mission_ja,
  mission_pt,
  target_audience,
  target_audience_ja,
  target_audience_pt,
  access_info,
  access_info_ja,
  access_info_pt,
  rules,
  rules_ja,
  rules_pt,
  safety_measures,
  safety_measures_ja,
  safety_measures_pt,
  online_resources,
  online_resources_ja,
  online_resources_pt,
  features,
  classes,
  pricing,
  schedule,
  instructors,
  facilities,
  opening_hours,
  trial_info,
  faq,
  testimonials,
  gallery,
  news,
  perks,
  media_coverage,
  is_verified,
  slug,
  created_at,
  updated_at,
  -- Only show email/phone to authenticated users
  CASE WHEN auth.uid() IS NOT NULL THEN email ELSE NULL END as email,
  CASE WHEN auth.uid() IS NOT NULL THEN phone ELSE NULL END as phone
FROM public.dojos;

-- Grant access to the view
GRANT SELECT ON public.public_dojos TO authenticated;
GRANT SELECT ON public.public_dojos TO anon;

-- Add comments
COMMENT ON VIEW public.public_profiles IS 'Secure view (SECURITY INVOKER) that excludes sensitive data from public profiles';
COMMENT ON VIEW public.public_dojos IS 'Secure view (SECURITY INVOKER) that hides email/phone from anonymous users';