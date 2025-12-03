-- Create storage bucket for product logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-logos', 'product-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view product logos (public bucket)
CREATE POLICY "Public can view product logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-logos');

-- Allow authenticated users with admin role to upload product logos
CREATE POLICY "Admins can upload product logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow admins to update product logos
CREATE POLICY "Admins can update product logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-logos' AND auth.role() = 'authenticated');

-- Allow admins to delete product logos
CREATE POLICY "Admins can delete product logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'product-logos' AND auth.role() = 'authenticated');