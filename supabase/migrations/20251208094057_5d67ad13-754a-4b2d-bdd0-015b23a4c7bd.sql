-- Make technique-videos bucket public so videos can be accessed
UPDATE storage.buckets
SET public = true
WHERE id = 'technique-videos';