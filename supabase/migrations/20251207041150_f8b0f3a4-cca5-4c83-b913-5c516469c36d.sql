-- SECURITY DEFINER ビューの警告を解消
-- ビューに SECURITY INVOKER を明示的に設定

-- public_profiles ビューを再作成
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
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

-- public_dojos ビューを再作成
DROP VIEW IF EXISTS public.public_dojos;
CREATE VIEW public.public_dojos 
WITH (security_invoker = true) AS
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
  logo_url,
  cover_image_url,
  slug,
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
  blog_url,
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
  is_verified,
  created_at,
  updated_at
FROM public.dojos;