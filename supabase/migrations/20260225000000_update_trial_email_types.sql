-- Update the email_type CHECK constraint to support new Day 28 timing (2_days_before)
-- Also ensure old '3_days_before' records remain valid for backward compatibility

ALTER TABLE public.trial_email_logs
  DROP CONSTRAINT IF EXISTS trial_email_logs_email_type_check;

ALTER TABLE public.trial_email_logs
  ADD CONSTRAINT trial_email_logs_email_type_check
  CHECK (email_type IN ('3_days_before', '2_days_before', '1_day_before', 'win_back'));

COMMENT ON COLUMN public.trial_email_logs.email_type IS 'Type of email: 2_days_before (Day 28), 1_day_before (Day 29), win_back (Day 35). Legacy: 3_days_before';
