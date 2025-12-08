-- Fix celebrity_applications: Add user_id column and update RLS to use it instead of email matching
ALTER TABLE public.celebrity_applications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop the insecure email-based policy
DROP POLICY IF EXISTS "Users can view their own applications" ON public.celebrity_applications;

-- Create secure user_id based policy
CREATE POLICY "Users can view their own applications" 
ON public.celebrity_applications 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Update insert policy to set user_id
DROP POLICY IF EXISTS "Users can submit own applications" ON public.celebrity_applications;
CREATE POLICY "Users can submit own applications" 
ON public.celebrity_applications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- For profiles: The existing RLS is correct (users can only view their own).
-- The public_profiles view already excludes sensitive fields.
-- Mark the security findings as addressed.