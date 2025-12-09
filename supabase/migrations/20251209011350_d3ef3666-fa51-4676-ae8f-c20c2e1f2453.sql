-- Fix messages table security
-- 1. Add explicit deny for anonymous users
-- 2. Replace direct group member check with security definer function

-- Add explicit deny for anonymous users
CREATE POLICY "Deny anonymous access to messages"
ON public.messages
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Drop existing group message policies that use direct subqueries
DROP POLICY IF EXISTS "Group members can view group messages" ON public.messages;
DROP POLICY IF EXISTS "Group members can send group messages" ON public.messages;

-- Recreate group message policies using the security definer function
-- This prevents any potential bypass of RLS

-- Group members can view group messages (using security definer function)
CREATE POLICY "Group members can view group messages"
ON public.messages
FOR SELECT
USING (
  (group_id IS NOT NULL AND is_group_member(group_id, auth.uid()))
);

-- Group members can send group messages (using security definer function)
CREATE POLICY "Group members can send group messages"
ON public.messages
FOR INSERT
WITH CHECK (
  group_id IS NOT NULL 
  AND sender_id = auth.uid()
  AND is_group_member(group_id, auth.uid())
);

-- Also add explicit deny on related tables
CREATE POLICY "Deny anonymous access to message_groups"
ON public.message_groups
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to message_group_members"
ON public.message_group_members
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_group_members ENABLE ROW LEVEL SECURITY;