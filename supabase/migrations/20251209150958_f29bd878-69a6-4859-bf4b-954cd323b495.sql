-- Add admin policy to view all video views
CREATE POLICY "Admins can view all video views"
ON video_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));