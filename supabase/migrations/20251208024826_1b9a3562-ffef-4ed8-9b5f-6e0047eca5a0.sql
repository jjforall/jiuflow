-- Create message groups table
CREATE TABLE public.message_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group members table
CREATE TABLE public.message_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.message_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create message read receipts table for group messages
CREATE TABLE public.message_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Add group_id to messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.message_groups(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS for message_groups
CREATE POLICY "Group members can view their groups"
ON public.message_groups FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.message_group_members 
  WHERE group_id = message_groups.id AND user_id = auth.uid()
));

CREATE POLICY "Users can create groups"
ON public.message_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creator can update group"
ON public.message_groups FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Group creator can delete group"
ON public.message_groups FOR DELETE
USING (auth.uid() = created_by);

-- RLS for message_group_members
CREATE POLICY "Group members can view members"
ON public.message_group_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.message_group_members m
  WHERE m.group_id = message_group_members.group_id AND m.user_id = auth.uid()
));

CREATE POLICY "Group creator can add members"
ON public.message_group_members FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.message_groups g
  WHERE g.id = group_id AND g.created_by = auth.uid()
) OR user_id = auth.uid());

CREATE POLICY "Group creator or self can remove members"
ON public.message_group_members FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.message_groups g
    WHERE g.id = group_id AND g.created_by = auth.uid()
  )
);

-- RLS for message_read_receipts
CREATE POLICY "Users can view read receipts for their messages"
ON public.message_read_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.message_group_members mgm ON m.group_id = mgm.group_id
    WHERE m.id = message_id AND mgm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.message_read_receipts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update messages RLS for group messages
CREATE POLICY "Group members can view group messages"
ON public.messages FOR SELECT
USING (
  group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.message_group_members
    WHERE group_id = messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Group members can send group messages"
ON public.messages FOR INSERT
WITH CHECK (
  group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.message_group_members
    WHERE group_id = messages.group_id AND user_id = auth.uid()
  ) AND sender_id = auth.uid()
);

-- Indexes
CREATE INDEX idx_message_group_members_group ON public.message_group_members(group_id);
CREATE INDEX idx_message_group_members_user ON public.message_group_members(user_id);
CREATE INDEX idx_messages_group ON public.messages(group_id);
CREATE INDEX idx_message_read_receipts_message ON public.message_read_receipts(message_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;