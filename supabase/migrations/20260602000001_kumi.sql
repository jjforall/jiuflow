-- kumis: Facebook-group-like training communities, separate from dojos
CREATE TABLE public.kumis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kumi_members: role admin|member
CREATE TABLE public.kumi_members (
  kumi_id UUID NOT NULL REFERENCES public.kumis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (kumi_id, user_id)
);

-- Link practice records to a kumi (auto-set on record creation when user belongs to a kumi)
ALTER TABLE public.practice_records ADD COLUMN IF NOT EXISTS kumi_id UUID REFERENCES public.kumis(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_kumi_members_kumi_id ON public.kumi_members(kumi_id);
CREATE INDEX idx_kumi_members_user_id ON public.kumi_members(user_id);
CREATE INDEX idx_practice_records_kumi_id ON public.practice_records(kumi_id);

-- RLS: kumis
ALTER TABLE public.kumis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their kumis" ON public.kumis FOR SELECT USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM public.kumi_members WHERE kumi_id = kumis.id AND user_id = auth.uid())
);

CREATE POLICY "Authenticated users can create kumis" ON public.kumis FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update kumis" ON public.kumis FOR UPDATE USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM public.kumi_members WHERE kumi_id = kumis.id AND user_id = auth.uid() AND role = 'admin')
);

-- Allow anyone to read a kumi by invite_code (needed for join page before membership)
CREATE POLICY "Anyone can view kumi by invite code" ON public.kumis FOR SELECT USING (true);

-- RLS: kumi_members
ALTER TABLE public.kumi_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view kumi roster" ON public.kumi_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.kumi_members km WHERE km.kumi_id = kumi_members.kumi_id AND km.user_id = auth.uid())
);

CREATE POLICY "Users can join kumis" ON public.kumi_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave kumis" ON public.kumi_members FOR DELETE
  USING (user_id = auth.uid());

-- RLS: practice_records — add shared-log visibility for kumi members
CREATE POLICY "Kumi members can view shared practice records" ON public.practice_records FOR SELECT USING (
  kumi_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM public.kumi_members WHERE kumi_id = practice_records.kumi_id AND user_id = auth.uid())
);

-- updated_at trigger for kumis
CREATE TRIGGER update_kumis_updated_at
  BEFORE UPDATE ON public.kumis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
