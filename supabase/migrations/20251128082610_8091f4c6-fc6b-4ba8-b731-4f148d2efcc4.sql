-- Add social_links column to profiles table
ALTER TABLE profiles 
ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;