-- Add hometown, hobbies, and marital_status columns to profiles table
ALTER TABLE profiles 
ADD COLUMN hometown text,
ADD COLUMN hobbies jsonb DEFAULT '[]'::jsonb,
ADD COLUMN marital_status text;