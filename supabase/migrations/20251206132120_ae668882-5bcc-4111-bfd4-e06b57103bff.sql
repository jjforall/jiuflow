-- Remove the plaintext password column from celebrity_applications
-- Passwords should never be stored in plaintext - use Supabase Auth instead

ALTER TABLE public.celebrity_applications DROP COLUMN IF EXISTS password;