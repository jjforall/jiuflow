-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_ja TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Anyone can view organizations
CREATE POLICY "Anyone can view organizations"
ON public.organizations
FOR SELECT
USING (true);

-- Only admins can insert organizations
CREATE POLICY "Admins can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update organizations
CREATE POLICY "Admins can update organizations"
ON public.organizations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete organizations
CREATE POLICY "Admins can delete organizations"
ON public.organizations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add organization_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);

-- Create trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default organizations
INSERT INTO public.organizations (name, name_ja, name_pt, description) VALUES
  ('IBJJF', 'IBJJF（国際ブラジリアン柔術連盟）', 'IBJJF (Federação Internacional de Jiu-Jitsu Brasileiro)', 'International Brazilian Jiu-Jitsu Federation'),
  ('JJIF', 'JJIF（国際柔術連盟）', 'JJIF (Federação Internacional de Jiu-Jitsu)', 'Ju-Jitsu International Federation'),
  ('SJJIF', 'SJJIF（スポーツ柔術国際連盟）', 'SJJIF (Federação Internacional de Jiu-Jitsu Esportivo)', 'Sport Jiu-Jitsu International Federation'),
  ('ADCC', 'ADCC', 'ADCC', 'Abu Dhabi Combat Club'),
  ('UAEJJF', 'UAEJJF（UAE柔術連盟）', 'UAEJJF (Federação de Jiu-Jitsu dos Emirados Árabes Unidos)', 'UAE Jiu-Jitsu Federation'),
  ('JJFJ', 'JJFJ（全日本柔術連盟）', 'JJFJ (Federação Japonesa de Jiu-Jitsu)', 'Japanese Jiu-Jitsu Federation'),
  ('Independent', '無所属', 'Independente', 'Independent / No affiliation'),
  ('Other', 'その他', 'Outro', 'Other organization');

COMMENT ON TABLE public.organizations IS 'BJJ organizations and federations';
COMMENT ON COLUMN public.profiles.organization_id IS 'User affiliated organization';