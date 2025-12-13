-- Create table for LINE settings
CREATE TABLE IF NOT EXISTS public.line_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  ai_provider TEXT NOT NULL DEFAULT 'lovable',
  system_prompt TEXT NOT NULL DEFAULT 'あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。',
  groq_model TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.line_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can view LINE settings"
ON public.line_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update LINE settings"
ON public.line_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access to LINE settings"
ON public.line_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO public.line_settings (enabled, ai_provider, system_prompt, groq_model)
VALUES (true, 'lovable', 'あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。MCPサーバーの機能を使って、選手情報、大会情報、テクニック情報などを検索・管理できます。', 'llama-3.3-70b-versatile');