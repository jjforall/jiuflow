-- Create secure storage policies for technique-videos bucket

-- Allow authenticated users to view videos
CREATE POLICY "Authenticated users can view technique videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'technique-videos');

-- Only admins can upload videos
CREATE POLICY "Only admins can upload technique videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technique-videos' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can update videos
CREATE POLICY "Only admins can update technique videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'technique-videos'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can delete videos
CREATE POLICY "Only admins can delete technique videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'technique-videos'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);