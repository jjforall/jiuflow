
-- Fix 5: line_settings - restrict to admin only
DROP POLICY IF EXISTS "Service role full access to LINE settings" ON public.line_settings;
CREATE POLICY "Only admins can manage LINE settings"
ON public.line_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 6: contact_messages - keep public but add basic validation
DROP POLICY IF EXISTS "Anyone can create contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can create contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(name) <= 100
  AND length(email) <= 255
  AND length(message) <= 5000
  AND length(subject) <= 200
);

-- Fix 7: dojo_trial_bookings - keep public but add basic validation
DROP POLICY IF EXISTS "Public can create trial bookings" ON public.dojo_trial_bookings;
CREATE POLICY "Public can create trial bookings"
ON public.dojo_trial_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(name) <= 100
  AND length(email) <= 255
);
