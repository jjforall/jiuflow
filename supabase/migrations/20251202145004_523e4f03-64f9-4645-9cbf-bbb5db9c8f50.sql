-- Add is_public column to profiles table with default false
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Update RLS policy to only show public profiles to others
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

CREATE POLICY "Anyone can view public profiles" 
ON public.profiles 
FOR SELECT 
USING (is_public = true OR auth.uid() = id);