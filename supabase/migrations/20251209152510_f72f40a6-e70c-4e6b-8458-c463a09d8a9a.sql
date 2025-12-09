-- Create a public bucket for community media (Open Mat posts/replies)
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to community-media bucket
CREATE POLICY "Authenticated users can upload community media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-media');

-- Allow anyone to view community media
CREATE POLICY "Anyone can view community media"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-media');

-- Allow users to delete their own community media
CREATE POLICY "Users can delete own community media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);