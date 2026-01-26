-- ============================================
-- Fix: Profiles table RLS - prevent direct public access to sensitive data
-- Force all public profile access through public_profiles view
-- ============================================

-- Step 1: Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view own or public profiles" ON public.profiles;

-- Step 2: Create restrictive policy - users can ONLY view their own profile
-- Public profile access must go through public_profiles view
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin')
);

-- Step 3: Drop the search function that depends on the view
DROP FUNCTION IF EXISTS public.search_public_profiles(text);
DROP FUNCTION IF EXISTS public.search_public_profiles(text, integer);

-- Step 4: Drop and recreate the view without security_invoker
-- The view runs with definer permissions (bypasses RLS on profiles table)
-- This is intentional - it exposes only safe fields
DROP VIEW IF EXISTS public.public_profiles;

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

-- Step 5: Grant SELECT on the view to public (anon and authenticated)
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Step 6: Recreate the search_public_profiles function
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

-- Step 7: Add comment explaining the security model
COMMENT ON VIEW public.public_profiles IS 'Safe public view of user profiles. INTENTIONALLY excludes sensitive fields: date_of_birth, hometown, marital_status, education, work_experience, training_locations, cover_image_url, favorite_fighters, favorite_techniques, hobbies, social_links. Direct access to profiles table is blocked by RLS - only own profile visible.';