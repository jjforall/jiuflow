-- OAuth Clients table (registered applications that can use JiuFlow login)
CREATE TABLE public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL DEFAULT 'jf_' || substr(md5(random()::text), 1, 24),
  client_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  name TEXT NOT NULL,
  description TEXT,
  redirect_uris TEXT[] NOT NULL,
  logo_url TEXT,
  homepage_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAuth Authorization Codes (temporary codes exchanged for tokens)
CREATE TABLE public.oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_id UUID REFERENCES public.oauth_clients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  redirect_uri TEXT NOT NULL,
  scope TEXT DEFAULT 'profile',
  code_challenge TEXT, -- PKCE support
  code_challenge_method TEXT, -- 'S256' or 'plain'
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAuth Access Tokens
CREATE TABLE public.oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_id UUID REFERENCES public.oauth_clients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scope TEXT DEFAULT 'profile',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAuth Refresh Tokens
CREATE TABLE public.oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_token_id UUID REFERENCES public.oauth_access_tokens(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for oauth_clients (admins can manage all, creators can manage their own)
CREATE POLICY "Admins can manage all oauth clients"
ON public.oauth_clients
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active oauth clients"
ON public.oauth_clients
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Users can manage their own oauth clients"
ON public.oauth_clients
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Policies for authorization codes (only service role should access, but users can see their own)
CREATE POLICY "Users can view their own authorization codes"
ON public.oauth_authorization_codes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policies for access tokens
CREATE POLICY "Users can view their own access tokens"
ON public.oauth_access_tokens
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can revoke their own access tokens"
ON public.oauth_access_tokens
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policies for refresh tokens
CREATE POLICY "Users can view their own refresh tokens"
ON public.oauth_refresh_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.oauth_access_tokens
    WHERE id = oauth_refresh_tokens.access_token_id
    AND user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_oauth_auth_codes_code ON public.oauth_authorization_codes(code);
CREATE INDEX idx_oauth_auth_codes_expires ON public.oauth_authorization_codes(expires_at);
CREATE INDEX idx_oauth_access_tokens_token ON public.oauth_access_tokens(token);
CREATE INDEX idx_oauth_access_tokens_expires ON public.oauth_access_tokens(expires_at);
CREATE INDEX idx_oauth_refresh_tokens_token ON public.oauth_refresh_tokens(token);
CREATE INDEX idx_oauth_clients_client_id ON public.oauth_clients(client_id);

-- Trigger for updated_at
CREATE TRIGGER update_oauth_clients_updated_at
  BEFORE UPDATE ON public.oauth_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean up expired tokens (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired authorization codes
  DELETE FROM public.oauth_authorization_codes
  WHERE expires_at < now() OR used_at IS NOT NULL;
  
  -- Revoke expired access tokens
  UPDATE public.oauth_access_tokens
  SET revoked_at = now()
  WHERE expires_at < now() AND revoked_at IS NULL;
END;
$$;