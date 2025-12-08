-- 1. Drop and recreate public_profiles view to expose only safe fields
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
    -- Exclude sensitive fields: email, stripe_customer_id, date_of_birth, marital_status
    organization_id,
    is_public,
    belt_history,
    training_locations,
    titles,
    -- Exclude education and work_experience as they may contain sensitive info
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

-- 2. Add admin-only SELECT policy for celebrity_applications
CREATE POLICY "Admins can view all applications"
ON public.celebrity_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create a policy for users to view ONLY their own applications (not others)
CREATE POLICY "Users can view their own applications"
ON public.celebrity_applications
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));