-- Add is_sample column to techniques table
ALTER TABLE public.techniques 
ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

-- Add storage policy for sample technique videos
CREATE POLICY "Anyone can view sample technique videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'technique-videos'
  AND EXISTS (
    SELECT 1 FROM public.techniques t
    WHERE t.is_sample = true
    AND (
      t.video_url LIKE '%' || name || '%'
      OR t.video_url_ja LIKE '%' || name || '%'
      OR t.video_url_pt LIKE '%' || name || '%'
    )
  )
);