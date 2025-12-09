-- Create table to store user Oura Ring tokens
CREATE TABLE public.user_oura_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_oura_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view their own Oura token"
  ON public.user_oura_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Oura token"
  ON public.user_oura_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Oura token"
  ON public.user_oura_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Oura token"
  ON public.user_oura_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Create table to cache Oura data
CREATE TABLE public.user_oura_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sleep_data JSONB DEFAULT '[]'::jsonb,
  activity_data JSONB DEFAULT '[]'::jsonb,
  readiness_data JSONB DEFAULT '[]'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_oura_data ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view their own Oura data"
  ON public.user_oura_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Oura data"
  ON public.user_oura_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Oura data"
  ON public.user_oura_data FOR UPDATE
  USING (auth.uid() = user_id);