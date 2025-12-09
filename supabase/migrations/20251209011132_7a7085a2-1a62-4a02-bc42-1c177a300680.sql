-- Verify subscriptions table security
-- Remove any direct admin SELECT policy if exists
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Staff can view all subscriptions" ON public.subscriptions;

-- Only owner can see their own subscription directly
-- Admins must use get_subscriptions_masked() function which:
-- 1. Masks stripe_subscription_id and stripe_price_id for subscriptions older than 6 months
-- 2. Logs all admin access to admin_audit_log

COMMENT ON TABLE public.subscriptions IS 'User subscriptions. Direct access restricted to owner only. Admins use get_subscriptions_masked() function.';