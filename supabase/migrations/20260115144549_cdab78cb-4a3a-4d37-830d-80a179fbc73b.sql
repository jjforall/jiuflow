-- Fix user_dojos privacy issue
-- Step 1: Add privacy control column
ALTER TABLE public.user_dojos ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Step 2: Drop duplicate SELECT policies
DROP POLICY IF EXISTS "Enable read access for user dojos" ON public.user_dojos;
DROP POLICY IF EXISTS "Anyone can view user dojo relationships" ON public.user_dojos;

-- Step 3: Create privacy-aware SELECT policy
CREATE POLICY "View public dojos or own relationships"
ON public.user_dojos FOR SELECT
USING (
  is_public = true 
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);