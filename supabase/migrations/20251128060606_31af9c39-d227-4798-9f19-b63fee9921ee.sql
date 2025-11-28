-- Fix user_roles RLS policies to prevent circular reference issues
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create a simple policy that allows users to view their own roles
-- This prevents circular reference when checking admin status
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Keep the admin policies for insert/update/delete
-- These are fine since they're not used during the initial role check