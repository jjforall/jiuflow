-- Create admin audit log table for sensitive data access
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id uuid NOT NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    accessed_at timestamp with time zone NOT NULL DEFAULT now(),
    ip_address text,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert audit logs (via edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (true);

-- Create function to log admin access
CREATE OR REPLACE FUNCTION public.log_admin_access(
    p_action text,
    p_table_name text,
    p_record_id uuid DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.admin_audit_log (
        admin_user_id,
        action,
        table_name,
        record_id,
        details
    ) VALUES (
        auth.uid(),
        p_action,
        p_table_name,
        p_record_id,
        p_details
    );
END;
$$;

-- Create a view for printful_orders that only shows orders from the last 6 months
-- and masks sensitive data for older orders
CREATE OR REPLACE VIEW public.printful_orders_secure AS
SELECT 
    id,
    stripe_session_id,
    printful_order_id,
    status,
    -- Only show full customer email for orders in last 6 months, otherwise mask it
    CASE 
        WHEN created_at > (now() - interval '6 months') THEN customer_email
        ELSE CASE 
            WHEN customer_email IS NOT NULL 
            THEN substring(customer_email, 1, 2) || '***@' || split_part(customer_email, '@', 2)
            ELSE NULL
        END
    END as customer_email,
    -- Only show full shipping info for orders in last 6 months
    CASE 
        WHEN created_at > (now() - interval '6 months') THEN shipping_name
        ELSE CASE 
            WHEN shipping_name IS NOT NULL 
            THEN substring(shipping_name, 1, 1) || '***'
            ELSE NULL
        END
    END as shipping_name,
    CASE 
        WHEN created_at > (now() - interval '6 months') THEN shipping_address
        ELSE jsonb_build_object('masked', true, 'country', shipping_address->>'country')
    END as shipping_address,
    cart_items,
    total_amount,
    error_message,
    created_at,
    updated_at
FROM public.printful_orders;