-- Fix: Replace overly permissive subtitles SELECT policy
DROP POLICY IF EXISTS "Anyone can view subtitles" ON video_subtitles;

CREATE POLICY "Subscribers and staff can view subtitles" ON video_subtitles
  FOR SELECT
  USING (
    -- Admins and staff always have access
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    -- Active subscribers have access
    OR EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = auth.uid()
      AND s.status IN ('active', 'trialing')
    )
    -- Sample technique subtitles are publicly accessible
    OR EXISTS (
      SELECT 1 FROM video_transcriptions vt
      JOIN techniques t ON t.id = vt.technique_id
      WHERE vt.id = video_subtitles.transcription_id
      AND t.is_sample = true
    )
  );