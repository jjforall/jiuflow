-- Fix storage policies: Remove public write access, add admin-only write
DROP POLICY IF EXISTS "Anyone can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;

-- Admin-only upload and delete for technique-videos
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'technique-videos' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'technique-videos' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'technique-videos');

-- Fix techniques table: Remove public write access
DROP POLICY IF EXISTS "Anyone can insert techniques" ON public.techniques;
DROP POLICY IF EXISTS "Anyone can update techniques" ON public.techniques;
DROP POLICY IF EXISTS "Anyone can delete techniques" ON public.techniques;

-- Admin-only write access for techniques
CREATE POLICY "Admins can insert techniques"
ON public.techniques FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update techniques"
ON public.techniques FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete techniques"
ON public.techniques FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));