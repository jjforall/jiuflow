-- Drop existing SELECT policies for profiles
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new SELECT policy: users can view their own profile OR public profiles
CREATE POLICY "Users can view own or public profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR is_public = true 
  OR has_role(auth.uid(), 'admin')
);

-- Add policy for authenticated users to update ONLY their own profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));