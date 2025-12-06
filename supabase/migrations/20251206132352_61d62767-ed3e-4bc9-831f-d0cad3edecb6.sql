-- Create a secure view for public profiles that excludes sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Create a secure view for dojos that hides contact details from anonymous users
CREATE OR REPLACE VIEW public.public_dojos AS
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

-- Add comment explaining the security design
COMMENT ON VIEW public.public_profiles IS 'Secure view that excludes sensitive data (email, stripe_customer_id, date_of_birth, etc.) from public profiles';
COMMENT ON VIEW public.public_dojos IS 'Secure view that hides email/phone from anonymous users while allowing authenticated users to see contact details';