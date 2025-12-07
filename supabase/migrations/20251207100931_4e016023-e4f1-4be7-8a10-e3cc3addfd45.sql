-- Add reading/romaji field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name_reading text;

-- Add comment for the column
COMMENT ON COLUMN public.profiles.display_name_reading IS 'Reading of display name in romaji or hiragana for searchability';

-- Update public_profiles view to include the new field
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
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