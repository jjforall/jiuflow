-- Add target_language column to special_video_invites table
ALTER TABLE public.special_video_invites 
ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT 'ja';

-- Update existing records to have 'ja' as default
UPDATE public.special_video_invites 
SET target_language = 'ja' 
WHERE target_language IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.special_video_invites.target_language IS 'Target language for the invite link (e.g., ja, en, pt)';