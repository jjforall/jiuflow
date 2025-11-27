-- Update RLS policies to allow staff to view (but not modify) admin data

-- Techniques: Staff can view all techniques
CREATE POLICY "Staff can view all techniques"
ON public.techniques
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- User roles: Staff can view all roles
CREATE POLICY "Staff can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- Profiles: Staff can view all profiles
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- Subscriptions: Staff can view all subscriptions
CREATE POLICY "Staff can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));