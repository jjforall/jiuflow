-- Create get_celebrity_applications_masked function with audit logging
CREATE OR REPLACE FUNCTION public.get_celebrity_applications_masked()
RETURNS TABLE (
    id uuid,
    display_name text,
    username text,
    bio text,
    home_dojo text,
    email text,
    belt_history jsonb,
    titles jsonb,
    organization_id uuid,
    status text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admins can access this function
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Log admin access
    INSERT INTO public.admin_audit_log (
        admin_user_id,
        action,
        table_name,
        details
    ) VALUES (
        auth.uid(),
        'view_celebrity_applications',
        'celebrity_applications',
        jsonb_build_object('access_type', 'list', 'timestamp', now())
    );

    RETURN QUERY
    SELECT 
        ca.id,
        ca.display_name,
        ca.username,
        ca.bio,
        ca.home_dojo,
        -- Mask email for applications older than 6 months
        CASE 
            WHEN ca.created_at > (now() - interval '6 months') THEN ca.email
            ELSE CASE 
                WHEN ca.email IS NOT NULL 
                THEN substring(ca.email, 1, 2) || '***@' || split_part(ca.email, '@', 2)
                ELSE NULL
            END
        END as email,
        ca.belt_history,
        ca.titles,
        ca.organization_id,
        ca.status,
        ca.reviewed_by,
        ca.reviewed_at,
        ca.created_at,
        ca.updated_at
    FROM public.celebrity_applications ca
    ORDER BY ca.created_at DESC;
END;
$$;

-- Remove direct admin SELECT policy (force use of masked function)
DROP POLICY IF EXISTS "Admins can view celebrity applications" ON public.celebrity_applications;