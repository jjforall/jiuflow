-- Fix: Set the view to use SECURITY INVOKER (the default, safer option)
-- Drop and recreate with explicit security invoker setting
DROP VIEW IF EXISTS public.public_profiles;

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

-- Grant access to authenticated and anon users for the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;