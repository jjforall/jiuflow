-- Add video_url column to celebrities table for persistent video URL storage
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS video_url TEXT;
