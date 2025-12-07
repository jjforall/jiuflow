-- Make user-videos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'user-videos';

-- Make technique-videos bucket private  
UPDATE storage.buckets 
SET public = false 
WHERE id = 'technique-videos';

-- Drop existing permissive SELECT policies for technique-videos
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view technique videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update videos" ON storage.objects;

-- Drop existing permissive SELECT policy for user-videos
DROP POLICY IF EXISTS "Anyone can view user videos" ON storage.objects;

-- Add new SELECT policy for technique-videos (subscribers only)
CREATE POLICY "Subscribers can view technique videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'technique-videos'
  AND EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  )
);

-- Staff can also view technique videos
CREATE POLICY "Staff can view technique videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'technique-videos'
  AND public.has_role(auth.uid(), 'staff')
);

-- Add new SELECT policies for user-videos
-- Users can view their own videos
CREATE POLICY "Users can view their own uploaded videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can view public user videos (based on user_videos table visibility)
CREATE POLICY "Anyone can view public user videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-videos'
  AND EXISTS (
    SELECT 1 FROM public.user_videos uv
    WHERE uv.video_url LIKE '%' || name || '%'
    AND uv.visibility = 'public'
  )
);