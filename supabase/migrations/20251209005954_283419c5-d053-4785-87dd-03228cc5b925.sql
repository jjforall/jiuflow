-- Fix 1: Profiles table - protect sensitive data from public access
-- Drop existing policies that might be too permissive
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;

-- Create a secure policy: Users can only view their own full profile
-- Public profile access should go through the security definer function get_public_profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins can view all profiles (for admin dashboard)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view all profiles
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Fix 2: Celebrity applications - ensure email is protected
-- The existing policies are correct but let's add admin SELECT through the masked function
-- First, ensure the current policies are in place
DROP POLICY IF EXISTS "Admins can view applications" ON public.celebrity_applications;

-- Admins should use the get_celebrity_applications_masked function instead of direct access
-- This is already implemented, so no additional policy needed for admin SELECT

-- Create a view for public profile access that excludes sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
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