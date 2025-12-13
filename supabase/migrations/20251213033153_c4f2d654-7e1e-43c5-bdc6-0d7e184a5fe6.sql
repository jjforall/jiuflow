-- Create line_chat_logs table
CREATE TABLE public.line_chat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  ai_provider TEXT NOT NULL DEFAULT 'lovable',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.line_chat_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view line chat logs"
ON public.line_chat_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert logs (for edge function)
CREATE POLICY "Service role can insert line chat logs"
ON public.line_chat_logs
FOR INSERT
WITH CHECK (true);