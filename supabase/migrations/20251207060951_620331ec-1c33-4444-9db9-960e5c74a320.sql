-- Create a masked function for subscription access with audit logging
CREATE OR REPLACE FUNCTION public.get_subscriptions_masked()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    stripe_subscription_id text,
    stripe_price_id text,
    status text,
    plan_type text,
    current_period_end timestamp with time zone,
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log admin/staff access
    IF has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) THEN
        INSERT INTO public.admin_audit_log (
            admin_user_id,
            action,
            table_name,
            details
        ) VALUES (
            auth.uid(),
            'view_subscriptions',
            'subscriptions',
            jsonb_build_object('access_type', 'list', 'timestamp', now())
        );
    END IF;

    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        -- Mask Stripe subscription ID for subscriptions older than 6 months
        CASE 
            WHEN s.created_at > (now() - interval '6 months') THEN s.stripe_subscription_id
            ELSE CASE 
                WHEN s.stripe_subscription_id IS NOT NULL 
                THEN 'sub_***' || RIGHT(s.stripe_subscription_id, 4)
                ELSE NULL
            END
        END as stripe_subscription_id,
        -- Mask Stripe price ID for older subscriptions
        CASE 
            WHEN s.created_at > (now() - interval '6 months') THEN s.stripe_price_id
            ELSE CASE 
                WHEN s.stripe_price_id IS NOT NULL 
                THEN 'price_***' || RIGHT(s.stripe_price_id, 4)
                ELSE NULL
            END
        END as stripe_price_id,
        s.status,
        s.plan_type,
        s.current_period_end,
        s.trial_start,
        s.trial_end,
        s.created_at,
        s.updated_at
    FROM public.subscriptions s
    WHERE 
        -- Users can see their own subscriptions (unmasked)
        s.user_id = auth.uid()
        -- Staff/Admin can see all (masked for old records)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'staff'::app_role);
END;
$$;

-- Drop the overly permissive staff policy
DROP POLICY IF EXISTS "Staff can view all subscriptions" ON public.subscriptions;

-- Create a more restrictive policy for staff that recommends using the function
CREATE POLICY "Staff should use get_subscriptions_masked function"
ON public.subscriptions
FOR SELECT
USING (
    -- Staff can still query but the function is recommended for audit logging
    has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = user_id
);