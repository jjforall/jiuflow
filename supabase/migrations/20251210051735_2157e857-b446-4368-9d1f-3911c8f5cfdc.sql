-- Add gallery column to celebrities table for storing photos
ALTER TABLE public.celebrities 
ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb;

-- Add achievements column for storing competition results/achievements timeline
ALTER TABLE public.celebrities 
ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.celebrities.gallery IS 'Array of photo objects: [{url: string, caption?: string, date?: string}]';
COMMENT ON COLUMN public.celebrities.achievements IS 'Array of achievement objects: [{year: number, title: string, title_ja?: string, category?: string}]';