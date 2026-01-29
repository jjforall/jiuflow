-- 体験予約テーブル
CREATE TABLE public.dojo_trial_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT,
  schedule_id UUID REFERENCES public.dojo_class_schedules(id) ON DELETE SET NULL,
  experience_level TEXT DEFAULT 'none',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  staff_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dojo_trial_bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Dojo staff can manage trial bookings" ON public.dojo_trial_bookings
  FOR ALL USING (public.is_dojo_staff(dojo_id, auth.uid()));

CREATE POLICY "Public can create trial bookings" ON public.dojo_trial_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view their own trial bookings by email" ON public.dojo_trial_bookings
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_dojo_trial_bookings_updated_at
  BEFORE UPDATE ON public.dojo_trial_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();