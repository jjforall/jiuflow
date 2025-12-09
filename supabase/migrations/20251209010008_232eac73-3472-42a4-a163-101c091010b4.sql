-- Fix the SECURITY DEFINER view issue by using SECURITY INVOKER instead
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate the view with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
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
FROM public.profiles
WHERE is_public = true;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;