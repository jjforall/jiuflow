-- Add cover_image_url column to profiles table
ALTER TABLE public.profiles
ADD COLUMN cover_image_url TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.cover_image_url IS 'URL for user profile cover image';