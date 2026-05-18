
-- 1. video_transcriptions: gate behind subscription / sample
DROP POLICY IF EXISTS "Anyone can view transcriptions" ON public.video_transcriptions;

CREATE POLICY "Subscribers and staff can view transcriptions"
ON public.video_transcriptions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.status = ANY (ARRAY['active'::text, 'trialing'::text])
  )
  OR EXISTS (
    SELECT 1 FROM public.techniques t
    WHERE t.id = video_transcriptions.technique_id
      AND t.is_sample = true
  )
);

-- 2. community_reactions: authenticated only
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.community_reactions;

CREATE POLICY "Authenticated users can view reactions"
ON public.community_reactions
FOR SELECT
TO authenticated
USING (true);

-- 3. realtime.messages: default deny broadcast/presence (postgres_changes unaffected)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny broadcast and presence by default" ON realtime.messages;

CREATE POLICY "Deny broadcast and presence by default"
ON realtime.messages
FOR SELECT
TO authenticated
USING (false);

DROP POLICY IF EXISTS "Deny broadcast and presence writes by default" ON realtime.messages;

CREATE POLICY "Deny broadcast and presence writes by default"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (false);
