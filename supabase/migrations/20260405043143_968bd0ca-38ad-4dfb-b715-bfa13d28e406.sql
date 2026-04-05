
-- 1. Fix video_tips: Replace overly permissive "Anyone can view tips" with scoped policy
DROP POLICY IF EXISTS "Anyone can view tips" ON public.video_tips;

-- Allow tip sender to see their own tips
CREATE POLICY "Users can view their own sent tips"
ON public.video_tips FOR SELECT
TO authenticated
USING (auth.uid() = from_user_id);

-- Allow admins to view all tips
CREATE POLICY "Admins can view all tips"
ON public.video_tips FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix user_points: Remove user self-UPDATE and self-INSERT (should be server-side only)
DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;

-- Only admins/service role can modify points
CREATE POLICY "Admins can manage points"
ON public.user_points FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Fix point_transactions: Remove user self-INSERT (should be server-side only)
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.point_transactions;

-- Only admins/service role can insert transactions
CREATE POLICY "Admins can manage transactions"
ON public.point_transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
