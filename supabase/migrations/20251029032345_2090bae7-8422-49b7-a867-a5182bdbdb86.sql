-- Fix storage policies for technique-videos bucket to allow uploads
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;

-- Allow anyone to upload videos to technique-videos bucket
CREATE POLICY "Anyone can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'technique-videos');

-- Allow anyone to update videos in technique-videos bucket
CREATE POLICY "Anyone can update videos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'technique-videos');

-- Allow anyone to delete videos from technique-videos bucket
CREATE POLICY "Anyone can delete videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'technique-videos');