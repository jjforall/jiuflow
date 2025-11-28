-- Add profile fields for public display
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Allow everyone to view profiles (for public profile pages)
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
USING (true);