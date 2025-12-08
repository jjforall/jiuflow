-- Fix 1: celebrity_applications - Remove direct SELECT access, force use of masked function
-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.celebrity_applications;

-- Create new policies that don't expose email directly
-- Users can only view their own applications (without seeing other applicants' data)
CREATE POLICY "Users can view own applications only"
ON public.celebrity_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Admins should use get_celebrity_applications_masked() RPC instead of direct access
-- But we need a policy for the function to work (it uses SECURITY DEFINER)
-- No direct admin SELECT policy - they must use the masked function

-- Fix 2: Create a secure view for public profiles that excludes sensitive data
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  display_name,
  display_name_reading,
  bio,
  avatar_url,
  cover_image_url,
  username,
  home_dojo,
  hometown,
  organization_id,
  is_public,
  belt_history,
  training_locations,
  titles,
  favorite_fighters,
  favorite_techniques,
  hobbies,
  social_links,
  created_at
  -- Explicitly EXCLUDING: email, stripe_customer_id, date_of_birth, marital_status, education, work_experience
FROM public.profiles
WHERE is_public = true;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Fix 3: Update get_public_profile function to ensure it never returns sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_profile(p_identifier text, p_is_uuid boolean DEFAULT false)
RETURNS TABLE(
  id uuid, 
  display_name text, 
  display_name_reading text, 
  bio text, 
  avatar_url text, 
  cover_image_url text, 
  username text, 
  home_dojo text, 
  hometown text, 
  organization_id uuid, 
  is_public boolean, 
  belt_history jsonb, 
  training_locations jsonb, 
  titles jsonb, 
  favorite_fighters jsonb, 
  favorite_techniques jsonb, 
  hobbies jsonb, 
  social_links jsonb, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
      p.hometown,
      p.organization_id,
      p.is_public,
      p.belt_history,
      p.training_locations,
      p.titles,
      p.favorite_fighters,
      p.favorite_techniques,
      p.hobbies,
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
      p.hometown,
      p.organization_id,
      p.is_public,
      p.belt_history,
      p.training_locations,
      p.titles,
      p.favorite_fighters,
      p.favorite_techniques,
      p.hobbies,
      p.social_links,
      p.created_at
    FROM profiles p
    WHERE LOWER(p.username) = LOWER(p_identifier)
      AND p.is_public = TRUE;
  END IF;
END;
$$;