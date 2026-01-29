-- =====================================================
-- hacomono風 会員管理・予約システム
-- Phase 1: データベーステーブル + RLSポリシー
-- =====================================================

-- クラス定義テーブル
CREATE TABLE public.dojo_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ja TEXT,
  description TEXT,
  description_ja TEXT,
  class_type TEXT NOT NULL DEFAULT 'regular', -- 'regular', 'open_mat', 'competition', 'private', 'kids', 'nogi'
  instructor_name TEXT,
  instructor_id UUID REFERENCES public.celebrities(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  level TEXT DEFAULT 'all', -- 'all', 'beginner', 'intermediate', 'advanced'
  color TEXT DEFAULT '#3b82f6', -- カレンダー表示用の色
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- スケジュール（繰り返し設定）テーブル
CREATE TABLE public.dojo_class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.dojo_classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sun, 1=Mon, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER,
  room_name TEXT, -- 複数マット対応
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 予約テーブル
CREATE TABLE public.dojo_class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.dojo_class_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'attended', 'no_show', 'waitlist'
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(schedule_id, user_id, booking_date)
);

-- 道場会員プランテーブル
CREATE TABLE public.dojo_membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ja TEXT,
  description TEXT,
  description_ja TEXT,
  price INTEGER NOT NULL, -- JPY
  interval TEXT NOT NULL DEFAULT 'month', -- 'month', 'year', 'once'
  max_bookings_per_month INTEGER, -- NULL = 無制限
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 道場会員登録テーブル
CREATE TABLE public.dojo_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.dojo_membership_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired', 'trial'
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  qr_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  stripe_subscription_id TEXT,
  member_number TEXT, -- 会員番号
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dojo_id, user_id)
);

-- 入退館記録テーブル
CREATE TABLE public.dojo_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.dojo_memberships(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.dojo_class_bookings(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  method TEXT DEFAULT 'qr', -- 'qr', 'manual', 'auto'
  notes TEXT
);

-- 道場管理者テーブル（オーナー以外の管理者）
CREATE TABLE public.dojo_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- 'owner', 'manager', 'staff', 'instructor'
  permissions JSONB DEFAULT '{"can_manage_classes": true, "can_manage_members": false, "can_view_reports": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dojo_id, user_id)
);

-- =====================================================
-- インデックス
-- =====================================================

CREATE INDEX idx_dojo_classes_dojo_id ON public.dojo_classes(dojo_id);
CREATE INDEX idx_dojo_classes_active ON public.dojo_classes(is_active) WHERE is_active = true;

CREATE INDEX idx_dojo_class_schedules_class_id ON public.dojo_class_schedules(class_id);
CREATE INDEX idx_dojo_class_schedules_day ON public.dojo_class_schedules(day_of_week);

CREATE INDEX idx_dojo_class_bookings_schedule_id ON public.dojo_class_bookings(schedule_id);
CREATE INDEX idx_dojo_class_bookings_user_id ON public.dojo_class_bookings(user_id);
CREATE INDEX idx_dojo_class_bookings_date ON public.dojo_class_bookings(booking_date);
CREATE INDEX idx_dojo_class_bookings_status ON public.dojo_class_bookings(status);

CREATE INDEX idx_dojo_memberships_dojo_id ON public.dojo_memberships(dojo_id);
CREATE INDEX idx_dojo_memberships_user_id ON public.dojo_memberships(user_id);
CREATE INDEX idx_dojo_memberships_qr_token ON public.dojo_memberships(qr_token);
CREATE INDEX idx_dojo_memberships_status ON public.dojo_memberships(status);

CREATE INDEX idx_dojo_check_ins_dojo_id ON public.dojo_check_ins(dojo_id);
CREATE INDEX idx_dojo_check_ins_user_id ON public.dojo_check_ins(user_id);
CREATE INDEX idx_dojo_check_ins_date ON public.dojo_check_ins(checked_in_at);

CREATE INDEX idx_dojo_admins_dojo_id ON public.dojo_admins(dojo_id);
CREATE INDEX idx_dojo_admins_user_id ON public.dojo_admins(user_id);

-- =====================================================
-- RLS (Row Level Security) ポリシー
-- =====================================================

-- dojo_classes
ALTER TABLE public.dojo_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active classes" ON public.dojo_classes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Dojo owner can manage classes" ON public.dojo_classes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.dojos WHERE id = dojo_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.dojo_admins WHERE dojo_id = dojo_classes.dojo_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- dojo_class_schedules
ALTER TABLE public.dojo_class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active schedules" ON public.dojo_class_schedules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Dojo staff can manage schedules" ON public.dojo_class_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dojo_classes c
      JOIN public.dojos d ON c.dojo_id = d.id
      WHERE c.id = class_id AND (d.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.dojo_admins WHERE dojo_id = d.id AND user_id = auth.uid()
      ))
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- dojo_class_bookings
ALTER TABLE public.dojo_class_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON public.dojo_class_bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings" ON public.dojo_class_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON public.dojo_class_bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Dojo staff can view all bookings" ON public.dojo_class_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dojo_class_schedules s
      JOIN public.dojo_classes c ON s.class_id = c.id
      JOIN public.dojos d ON c.dojo_id = d.id
      WHERE s.id = schedule_id AND (d.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.dojo_admins WHERE dojo_id = d.id AND user_id = auth.uid()
      ))
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Dojo staff can update all bookings" ON public.dojo_class_bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.dojo_class_schedules s
      JOIN public.dojo_classes c ON s.class_id = c.id
      JOIN public.dojos d ON c.dojo_id = d.id
      WHERE s.id = schedule_id AND (d.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.dojo_admins WHERE dojo_id = d.id AND user_id = auth.uid()
      ))
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- dojo_membership_plans
ALTER TABLE public.dojo_membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.dojo_membership_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Dojo owner can manage plans" ON public.dojo_membership_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.dojos WHERE id = dojo_id AND created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- dojo_memberships
ALTER TABLE public.dojo_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own membership" ON public.dojo_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Dojo staff can view all memberships" ON public.dojo_memberships
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.dojos WHERE id = dojo_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.dojo_admins WHERE dojo_id = dojo_memberships.dojo_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Dojo staff can manage memberships" ON public.dojo_memberships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.dojos WHERE id = dojo_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.dojo_admins WHERE dojo_id = dojo_memberships.dojo_id AND user_id = auth.uid() AND (permissions->>'can_manage_members')::boolean = true)
    OR public.has_role(auth.uid(), 'admin')
  );

-- dojo_check_ins
ALTER TABLE public.dojo_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins" ON public.dojo_check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Dojo staff can view all check-ins" ON public.dojo_check_ins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.dojos WHERE id = dojo_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.dojo_admins WHERE dojo_id = dojo_check_ins.dojo_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Dojo staff can create check-ins" ON public.dojo_check_ins
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.dojos WHERE id = dojo_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.dojo_admins WHERE dojo_id = dojo_check_ins.dojo_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Dojo staff can update check-ins" ON public.dojo_check_ins
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.dojos WHERE id = dojo_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.dojo_admins WHERE dojo_id = dojo_check_ins.dojo_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- dojo_admins
ALTER TABLE public.dojo_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dojo owner can manage admins" ON public.dojo_admins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.dojos WHERE id = dojo_id AND created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view their own record" ON public.dojo_admins
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- Helper Functions
-- =====================================================

-- 道場スタッフ確認関数
CREATE OR REPLACE FUNCTION public.is_dojo_staff(p_dojo_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dojos WHERE id = p_dojo_id AND created_by = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.dojo_admins WHERE dojo_id = p_dojo_id AND user_id = p_user_id
  )
$$;

-- QRトークンから会員情報取得
CREATE OR REPLACE FUNCTION public.get_membership_by_qr_token(p_qr_token text)
RETURNS TABLE (
  membership_id uuid,
  user_id uuid,
  dojo_id uuid,
  status text,
  display_name text,
  avatar_url text,
  plan_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id as membership_id,
    m.user_id,
    m.dojo_id,
    m.status,
    p.display_name,
    p.avatar_url,
    mp.name as plan_name
  FROM public.dojo_memberships m
  JOIN public.profiles p ON m.user_id = p.id
  LEFT JOIN public.dojo_membership_plans mp ON m.plan_id = mp.id
  WHERE m.qr_token = p_qr_token
    AND m.status = 'active'
$$;

-- スケジュールの予約数取得
CREATE OR REPLACE FUNCTION public.get_booking_count(p_schedule_id uuid, p_date date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.dojo_class_bookings
  WHERE schedule_id = p_schedule_id
    AND booking_date = p_date
    AND status IN ('confirmed', 'attended')
$$;

-- =====================================================
-- Triggers
-- =====================================================

-- updated_at自動更新
CREATE TRIGGER update_dojo_classes_updated_at
  BEFORE UPDATE ON public.dojo_classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dojo_class_bookings_updated_at
  BEFORE UPDATE ON public.dojo_class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dojo_membership_plans_updated_at
  BEFORE UPDATE ON public.dojo_membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dojo_memberships_updated_at
  BEFORE UPDATE ON public.dojo_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();