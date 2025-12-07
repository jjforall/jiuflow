-- Fix profiles table security: Clean up duplicate policies and ensure strict access control

-- Drop duplicate/redundant policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate with PERMISSIVE policies and explicit authentication requirement
-- Users can view their own profile (authenticated only)
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view all profiles
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- Users can insert their own profile
CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also fix celebrity_applications to explicitly require authenticated admin role
DROP POLICY IF EXISTS "Admins can view all celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Admins can insert celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Admins can update celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Admins can delete celebrity applications" ON public.celebrity_applications;

CREATE POLICY "Admins can view celebrity applications"
ON public.celebrity_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert celebrity applications"
ON public.celebrity_applications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update celebrity applications"
ON public.celebrity_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete celebrity applications"
ON public.celebrity_applications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));