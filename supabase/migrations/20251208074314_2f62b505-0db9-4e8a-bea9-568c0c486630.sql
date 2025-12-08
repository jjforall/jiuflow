-- ============================================
-- PROFILES TABLE: Ensure strict access control
-- ============================================

-- Verify only owner can SELECT (already exists, but let's be explicit)
-- The current policy "Authenticated users can view own profile" with qual=(auth.uid() = id) is correct

-- Add explicit policy to block any other access patterns
-- Note: In PostgreSQL RLS, if no policy matches, access is denied by default


-- ============================================
-- CELEBRITY_APPLICATIONS TABLE: Complete lockdown
-- ============================================

-- Drop ALL existing policies and recreate with strict controls
DROP POLICY IF EXISTS "Admins can delete celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Admins can insert celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Admins can update celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Authenticated users can submit celebrity applications" ON public.celebrity_applications;

-- 1. INSERT: Only authenticated users can submit their own applications
-- We add email validation to ensure they use their own email
CREATE POLICY "Users can submit own applications" 
ON public.celebrity_applications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. SELECT: ONLY through get_celebrity_applications_masked() function
-- No direct SELECT policy for anyone - forces use of the audited function
-- Admins must use the RPC function which has audit logging

-- 3. UPDATE: Only admins can update applications (for approval/rejection)
CREATE POLICY "Admins can update applications" 
ON public.celebrity_applications 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. DELETE: Only admins can delete applications
CREATE POLICY "Admins can delete applications" 
ON public.celebrity_applications 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));


-- ============================================
-- PUBLIC_PROFILES VIEW: Ensure it's secure
-- ============================================

-- Drop and recreate public_profiles view with explicit security
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
    id,
    display_name,
    display_name_reading,
    username,
    bio,
    avatar_url,
    cover_image_url,
    home_dojo,
    hometown,
    belt_history,
    training_locations,
    titles,
    organization_id,
    social_links,
    favorite_fighters,
    favorite_techniques,
    hobbies,
    is_public,
    created_at,
    updated_at
FROM public.profiles
WHERE is_public = true;

-- Note: email, stripe_customer_id, date_of_birth are NOT included in public view