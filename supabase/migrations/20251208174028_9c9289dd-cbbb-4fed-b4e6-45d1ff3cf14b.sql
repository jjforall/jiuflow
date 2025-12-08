-- Fix infinite recursion in message_group_members policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Group members can view members" ON public.message_group_members;

-- Create a security definer function to check membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM message_group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- Create a new policy using the function
CREATE POLICY "Group members can view members"
ON public.message_group_members
FOR SELECT
USING (
  public.is_group_member(group_id, auth.uid())
);