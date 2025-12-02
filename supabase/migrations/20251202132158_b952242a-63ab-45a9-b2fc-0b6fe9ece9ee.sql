-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public)
VALUES ('music-tracks', 'music-tracks', true);

-- Allow anyone to view music files
CREATE POLICY "Anyone can view music files"
ON storage.objects FOR SELECT
USING (bucket_id = 'music-tracks');

-- Allow admins to upload music files
CREATE POLICY "Admins can upload music files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'music-tracks' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update music files
CREATE POLICY "Admins can update music files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'music-tracks' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete music files
CREATE POLICY "Admins can delete music files"
ON storage.objects FOR DELETE
USING (bucket_id = 'music-tracks' AND has_role(auth.uid(), 'admin'::app_role));