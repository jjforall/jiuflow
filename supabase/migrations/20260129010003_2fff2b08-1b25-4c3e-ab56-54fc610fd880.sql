-- Fix Security Definer View issue for public_profiles
-- Need to drop dependent function first and recreate everything

-- Step 1: Drop the view with CASCADE to handle dependencies
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- Step 2: Recreate the view with SECURITY INVOKER
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
FROM profiles
WHERE is_public = true;

-- Step 3: Restore the search function that was dropped by CASCADE
CREATE OR REPLACE FUNCTION public.search_public_profiles(p_query text)
RETURNS SETOF public_profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_query text;
BEGIN
  -- Sanitize the input query
  sanitized_query := public.sanitize_search_term(p_query);
  
  -- Return empty if sanitized query is null
  IF sanitized_query IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT p.*
  FROM public_profiles p
  WHERE p.is_public = TRUE
    AND (
      p.display_name ILIKE '%' || sanitized_query || '%' 
      OR p.display_name_reading ILIKE '%' || sanitized_query || '%'
      OR p.username ILIKE '%' || sanitized_query || '%'
    )
  LIMIT 50;
END;
$$;

-- Step 4: Add comment explaining the view's purpose and security
COMMENT ON VIEW public.public_profiles IS 
'Safe public view of user profiles. INTENTIONALLY excludes sensitive fields: date_of_birth, hometown, marital_status, education, work_experience, training_locations, cover_image_url, favorite_fighters, favorite_techniques, hobbies, social_links. Uses SECURITY INVOKER to enforce RLS of the querying user.';

-- Step 5: Grant appropriate permissions
GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;