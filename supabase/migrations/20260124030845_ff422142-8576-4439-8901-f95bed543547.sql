-- Create table for special video invitation links
CREATE TABLE public.special_video_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    max_views INTEGER,
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.special_video_invites ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage invites"
ON public.special_video_invites
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read valid invites (for token validation)
CREATE POLICY "Anyone can validate invite tokens"
ON public.special_video_invites
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create index for token lookups
CREATE INDEX idx_special_video_invites_token ON public.special_video_invites(token);
CREATE INDEX idx_special_video_invites_technique ON public.special_video_invites(technique_id);