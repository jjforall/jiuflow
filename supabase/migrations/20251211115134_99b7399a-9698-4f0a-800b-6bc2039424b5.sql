-- Add visibility column to techniques table
ALTER TABLE public.techniques 
ADD COLUMN visibility text NOT NULL DEFAULT 'public' 
CHECK (visibility IN ('public', 'unlisted', 'private'));

-- Add comment for clarity
COMMENT ON COLUMN public.techniques.visibility IS 'Video visibility: public (searchable), unlisted (link only), private (admin only)';