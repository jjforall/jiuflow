-- Create celebrity applications table
CREATE TABLE public.celebrity_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  username TEXT,
  bio TEXT,
  belt_history JSONB DEFAULT '[]'::jsonb,
  titles JSONB DEFAULT '[]'::jsonb,
  home_dojo TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  email TEXT,
  password TEXT
);

-- Enable RLS
ALTER TABLE public.celebrity_applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all celebrity applications"
ON public.celebrity_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert celebrity applications"
ON public.celebrity_applications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update celebrity applications"
ON public.celebrity_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete celebrity applications"
ON public.celebrity_applications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_celebrity_applications_updated_at
  BEFORE UPDATE ON public.celebrity_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();