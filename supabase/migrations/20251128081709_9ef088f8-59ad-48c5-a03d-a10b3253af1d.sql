-- Add favorite_fighters and favorite_techniques columns to profiles table
ALTER TABLE profiles 
ADD COLUMN favorite_fighters jsonb DEFAULT '[]'::jsonb,
ADD COLUMN favorite_techniques jsonb DEFAULT '[]'::jsonb;