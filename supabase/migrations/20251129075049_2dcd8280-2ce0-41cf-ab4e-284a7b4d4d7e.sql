-- Add metadata fields to track video translation timestamps
ALTER TABLE techniques 
ADD COLUMN IF NOT EXISTS video_metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN techniques.video_metadata IS 'Stores metadata for each language video including creation dates: {en: {created_at, updated_at}, ja: {created_at, updated_at}, pt: {created_at, updated_at}}';
