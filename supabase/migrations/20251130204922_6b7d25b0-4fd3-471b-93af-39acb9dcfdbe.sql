-- Add celebrity role to app_role enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'staff');
    END IF;
    
    -- Add celebrity to the enum
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'celebrity';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create celebrities table for approved athletes
CREATE TABLE IF NOT EXISTS public.celebrities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  belt_history jsonb DEFAULT '[]'::jsonb,
  titles jsonb DEFAULT '[]'::jsonb,
  organization_id uuid REFERENCES public.organizations(id),
  home_dojo text,
  social_links jsonb DEFAULT '{}'::jsonb,
  stats jsonb DEFAULT '{}'::jsonb,
  featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.celebrities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for celebrities
CREATE POLICY "Anyone can view celebrities"
  ON public.celebrities
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert celebrities"
  ON public.celebrities
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update celebrities"
  ON public.celebrities
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete celebrities"
  ON public.celebrities
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_celebrities_featured ON public.celebrities(featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_celebrities_user_id ON public.celebrities(user_id);