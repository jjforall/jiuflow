-- Fix celebrity_applications: Remove any public INSERT policy and ensure only admins can SELECT
DROP POLICY IF EXISTS "Anyone can submit celebrity applications" ON public.celebrity_applications;

-- Create authenticated INSERT policy instead (users must be logged in to apply)
CREATE POLICY "Authenticated users can submit celebrity applications" 
ON public.celebrity_applications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix subscriptions: Remove the direct SELECT policy for staff/admin
-- They should use get_subscriptions_masked() function instead
DROP POLICY IF EXISTS "Staff should use get_subscriptions_masked function" ON public.subscriptions;

-- Keep only the user's own subscription policy
-- (Already exists: "Users can view their own subscriptions")