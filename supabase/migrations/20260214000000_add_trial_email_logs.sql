-- Create trial email logs table for tracking trial conversion email campaigns
CREATE TABLE IF NOT EXISTS public.trial_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('3_days_before', '1_day_before', 'win_back')),
  subscription_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_trial_email_logs_user_id ON public.trial_email_logs(user_id);
CREATE INDEX idx_trial_email_logs_email_type ON public.trial_email_logs(email_type);
CREATE INDEX idx_trial_email_logs_sent_at ON public.trial_email_logs(sent_at);
CREATE INDEX idx_trial_email_logs_converted_at ON public.trial_email_logs(converted_at) WHERE converted_at IS NOT NULL;

-- Create unique constraint to prevent duplicate emails per user per type
CREATE UNIQUE INDEX idx_trial_email_logs_user_type_unique
ON public.trial_email_logs(user_id, email_type);

-- Add comment to table
COMMENT ON TABLE public.trial_email_logs IS 'Tracks trial reminder and win-back emails sent to users';

-- Add comments to columns
COMMENT ON COLUMN public.trial_email_logs.email_type IS 'Type of email: 3_days_before, 1_day_before, win_back';
COMMENT ON COLUMN public.trial_email_logs.sent_at IS 'Timestamp when email was sent';
COMMENT ON COLUMN public.trial_email_logs.opened_at IS 'Timestamp when email was opened (tracked via pixel)';
COMMENT ON COLUMN public.trial_email_logs.clicked_at IS 'Timestamp when user clicked CTA link';
COMMENT ON COLUMN public.trial_email_logs.converted_at IS 'Timestamp when user upgraded to paid plan';

-- Enable Row Level Security
ALTER TABLE public.trial_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin users can see all logs
CREATE POLICY "Admins can view all trial email logs"
  ON public.trial_email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users can view their own logs
CREATE POLICY "Users can view their own trial email logs"
  ON public.trial_email_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can insert/update (via Edge Functions)
CREATE POLICY "Service role can insert trial email logs"
  ON public.trial_email_logs
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can update trial email logs"
  ON public.trial_email_logs
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_trial_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_trial_email_logs_updated_at
  BEFORE UPDATE ON public.trial_email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trial_email_logs_updated_at();

-- Create view for email campaign analytics
CREATE OR REPLACE VIEW public.trial_email_analytics AS
SELECT
  email_type,
  COUNT(*) AS total_sent,
  COUNT(opened_at) AS total_opened,
  COUNT(clicked_at) AS total_clicked,
  COUNT(converted_at) AS total_converted,
  ROUND(100.0 * COUNT(opened_at) / NULLIF(COUNT(*), 0), 2) AS open_rate,
  ROUND(100.0 * COUNT(clicked_at) / NULLIF(COUNT(*), 0), 2) AS click_rate,
  ROUND(100.0 * COUNT(converted_at) / NULLIF(COUNT(*), 0), 2) AS conversion_rate,
  DATE_TRUNC('day', sent_at) AS sent_date
FROM public.trial_email_logs
GROUP BY email_type, DATE_TRUNC('day', sent_at)
ORDER BY sent_date DESC, email_type;

-- Grant access to view
GRANT SELECT ON public.trial_email_analytics TO authenticated;

COMMENT ON VIEW public.trial_email_analytics IS 'Analytics for trial email campaigns - open rates, click rates, and conversion rates';
