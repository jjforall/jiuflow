-- Add RLS policies for avatars bucket

-- Allow authenticated users to upload avatar files
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their own avatar files
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL
);

-- Allow public read access to avatars
CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');