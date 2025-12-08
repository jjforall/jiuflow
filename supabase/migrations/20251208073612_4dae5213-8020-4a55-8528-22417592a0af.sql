-- Create get_profiles_masked function for admin/staff access with data masking
CREATE OR REPLACE FUNCTION public.get_profiles_masked()
RETURNS TABLE (
    id uuid,
    display_name text,
    display_name_reading text,
    bio text,
    avatar_url text,
    cover_image_url text,
    username text,
    home_dojo text,
    hometown text,
    marital_status text,
    date_of_birth date,
    email text,
    stripe_customer_id text,
    organization_id uuid,
    is_public boolean,
    belt_history jsonb,
    training_locations jsonb,
    titles jsonb,
    education jsonb,
    work_experience jsonb,
    favorite_fighters jsonb,
    favorite_techniques jsonb,
    hobbies jsonb,
    social_links jsonb,
    created_at timestamptz,
    updated_at timestamptz
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
            'view_profiles',
            'profiles',
            jsonb_build_object('access_type', 'list', 'timestamp', now())
        );
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.display_name,
        p.display_name_reading,
        p.bio,
        p.avatar_url,
        p.cover_image_url,
        p.username,
        p.home_dojo,
        p.hometown,
        p.marital_status,
        -- Mask date_of_birth for profiles older than 6 months (show only year)
        CASE 
            WHEN p.id = auth.uid() THEN p.date_of_birth
            WHEN p.created_at > (now() - interval '6 months') THEN p.date_of_birth
            ELSE make_date(EXTRACT(YEAR FROM p.date_of_birth)::int, 1, 1)
        END as date_of_birth,
        -- Mask email for older profiles
        CASE 
            WHEN p.id = auth.uid() THEN p.email
            WHEN p.created_at > (now() - interval '6 months') THEN p.email
            ELSE CASE 
                WHEN p.email IS NOT NULL 
                THEN substring(p.email, 1, 2) || '***@' || split_part(p.email, '@', 2)
                ELSE NULL
            END
        END as email,
        -- Mask stripe_customer_id for older profiles
        CASE 
            WHEN p.id = auth.uid() THEN p.stripe_customer_id
            WHEN p.created_at > (now() - interval '6 months') THEN p.stripe_customer_id
            ELSE CASE 
                WHEN p.stripe_customer_id IS NOT NULL 
                THEN 'cus_***' || RIGHT(p.stripe_customer_id, 4)
                ELSE NULL
            END
        END as stripe_customer_id,
        p.organization_id,
        p.is_public,
        p.belt_history,
        p.training_locations,
        p.titles,
        p.education,
        p.work_experience,
        p.favorite_fighters,
        p.favorite_techniques,
        p.hobbies,
        p.social_links,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    WHERE 
        -- Users can see their own profile (unmasked via CASE above)
        p.id = auth.uid()
        -- Admin/Staff can see all (masked for old records)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'staff'::app_role);
END;
$$;

-- Drop the existing admin/staff direct SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Recreate admin/staff policies that redirect to the masked function
-- Note: We can't force function usage via RLS, but we remove direct access
-- Admin dashboard code should use get_profiles_masked() instead

-- Keep only the user's own profile SELECT policy
-- (Already exists: "Authenticated users can view own profile")