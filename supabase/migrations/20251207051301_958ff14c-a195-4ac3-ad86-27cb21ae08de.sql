-- Drop the SECURITY DEFINER view as it bypasses RLS
DROP VIEW IF EXISTS public.printful_orders_secure;

-- Instead, create a function to mask old order data that respects RLS
CREATE OR REPLACE FUNCTION public.get_printful_orders_masked()
RETURNS TABLE (
    id uuid,
    stripe_session_id text,
    printful_order_id text,
    status text,
    customer_email text,
    shipping_name text,
    shipping_address jsonb,
    cart_items jsonb,
    total_amount integer,
    error_message text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log the admin access
    IF has_role(auth.uid(), 'admin'::app_role) THEN
        INSERT INTO public.admin_audit_log (
            admin_user_id,
            action,
            table_name,
            details
        ) VALUES (
            auth.uid(),
            'view_orders',
            'printful_orders',
            jsonb_build_object('access_type', 'list', 'timestamp', now())
        );
    END IF;

    RETURN QUERY
    SELECT 
        po.id,
        po.stripe_session_id,
        po.printful_order_id,
        po.status,
        -- Only show full customer email for orders in last 6 months
        CASE 
            WHEN po.created_at > (now() - interval '6 months') THEN po.customer_email
            ELSE CASE 
                WHEN po.customer_email IS NOT NULL 
                THEN substring(po.customer_email, 1, 2) || '***@' || split_part(po.customer_email, '@', 2)
                ELSE NULL
            END
        END as customer_email,
        -- Only show full shipping info for orders in last 6 months
        CASE 
            WHEN po.created_at > (now() - interval '6 months') THEN po.shipping_name
            ELSE CASE 
                WHEN po.shipping_name IS NOT NULL 
                THEN substring(po.shipping_name, 1, 1) || '***'
                ELSE NULL
            END
        END as shipping_name,
        CASE 
            WHEN po.created_at > (now() - interval '6 months') THEN po.shipping_address
            ELSE jsonb_build_object('masked', true, 'country', po.shipping_address->>'country')
        END as shipping_address,
        po.cart_items,
        po.total_amount,
        po.error_message,
        po.created_at,
        po.updated_at
    FROM public.printful_orders po
    WHERE has_role(auth.uid(), 'admin'::app_role);
END;
$$;