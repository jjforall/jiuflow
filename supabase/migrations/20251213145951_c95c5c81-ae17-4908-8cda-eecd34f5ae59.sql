
-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.get_public_profile(text, boolean);

-- Drop existing public_profiles view if exists and recreate with only safe fields
DROP VIEW IF EXISTS public.public_profiles;

-- Create a secure view that only exposes non-sensitive fields for public profiles
CREATE VIEW public.public_profiles AS
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

-- Recreate the get_public_profile function with only safe fields (excluding sensitive data)
CREATE FUNCTION public.get_public_profile(p_identifier text, p_is_uuid boolean DEFAULT false)
RETURNS TABLE(
  id uuid,
  display_name text,
  display_name_reading text,
  bio text,
  avatar_url text,
  cover_image_url text,
  username text,
  home_dojo text,
  organization_id uuid,
  is_public boolean,
  belt_history jsonb,
  titles jsonb,
  social_links jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function intentionally EXCLUDES sensitive fields:
  -- date_of_birth, hometown, marital_status, education, work_experience,
  -- training_locations, favorite_fighters, favorite_techniques, hobbies
  IF p_is_uuid THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.display_name,
      p.display_name_reading,
      p.bio,
      p.avatar_url,
      p.cover_image_url,
      p.username,
      p.home_dojo,
      p.organization_id,
      p.is_public,
      p.belt_history,
      p.titles,
      p.social_links,
      p.created_at
    FROM profiles p
    WHERE p.id = p_identifier::uuid
      AND p.is_public = TRUE;
  ELSE
    RETURN QUERY
    SELECT 
      p.id,
      p.display_name,
      p.display_name_reading,
      p.bio,
      p.avatar_url,
      p.cover_image_url,
      p.username,
      p.home_dojo,
      p.organization_id,
      p.is_public,
      p.belt_history,
      p.titles,
      p.social_links,
      p.created_at
    FROM profiles p
    WHERE LOWER(p.username) = LOWER(p_identifier)
      AND p.is_public = TRUE;
  END IF;
END;
$$;
