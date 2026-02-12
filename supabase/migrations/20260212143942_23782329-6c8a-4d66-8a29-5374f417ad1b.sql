
-- Fix 1: admin_audit_log - restrict INSERT to admin only
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Only admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 2: founder_plan_count - restrict UPDATE to admin only
DROP POLICY IF EXISTS "Service role can update founder plan count" ON public.founder_plan_count;
CREATE POLICY "Only admins can update founder plan count"
ON public.founder_plan_count
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 3: line_chat_logs - restrict INSERT to admin only
DROP POLICY IF EXISTS "Service role can insert line chat logs" ON public.line_chat_logs;
CREATE POLICY "Only admins can insert line chat logs"
ON public.line_chat_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 4: video_revenue_splits - restrict INSERT to admin only
DROP POLICY IF EXISTS "Service role can insert revenue splits" ON public.video_revenue_splits;
CREATE POLICY "Only admins can insert revenue splits"
ON public.video_revenue_splits
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
