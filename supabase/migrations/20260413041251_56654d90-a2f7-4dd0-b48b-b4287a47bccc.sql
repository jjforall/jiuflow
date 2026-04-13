-- Remove the author_email column from community_announcements
-- This column exposes PII (email addresses) via the public SELECT policy
ALTER TABLE public.community_announcements DROP COLUMN IF EXISTS author_email;