-- Create dojos table
CREATE TABLE IF NOT EXISTS public.dojos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  description TEXT,
  description_ja TEXT,
  description_pt TEXT,
  location TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_dojos table for relationships
CREATE TABLE IF NOT EXISTS public.user_dojos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('home', 'training')),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, dojo_id, relationship_type)
);

-- Enable RLS
ALTER TABLE public.dojos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dojos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dojos
CREATE POLICY "Anyone can view dojos"
  ON public.dojos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create dojos"
  ON public.dojos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own dojos"
  ON public.dojos FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can update all dojos"
  ON public.dojos FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dojos"
  ON public.dojos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_dojos
CREATE POLICY "Anyone can view user dojo relationships"
  ON public.user_dojos FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own dojo relationships"
  ON public.user_dojos FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_dojos_name ON public.dojos(name);
CREATE INDEX idx_dojos_created_by ON public.dojos(created_by);
CREATE INDEX idx_user_dojos_user_id ON public.user_dojos(user_id);
CREATE INDEX idx_user_dojos_dojo_id ON public.user_dojos(dojo_id);

-- Create trigger for updated_at
CREATE TRIGGER update_dojos_updated_at
  BEFORE UPDATE ON public.dojos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();