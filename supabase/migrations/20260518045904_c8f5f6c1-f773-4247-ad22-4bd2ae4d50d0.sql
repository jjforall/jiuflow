DROP POLICY IF EXISTS "Admins can upload product logos" ON storage.objects;
CREATE POLICY "Admins can upload product logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));