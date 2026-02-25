-- Enable pg_cron and pg_net extensions if not already enabled
-- Note: These extensions usually need to be enabled in the Supabase Dashboard
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily trial reminders at 10:00 AM JST = 01:00 UTC
-- Supabase pg_cron runs in UTC. 10 AM JST is optimal for email open rates.
SELECT cron.schedule(
  'send-trial-reminders',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jkiohqfamhiykurxrhsn.supabase.co/functions/v1/send-trial-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;
  $$
);

-- Daily win-back emails at 11:00 AM JST = 02:00 UTC
-- Sent 1 hour after trial reminders to avoid overwhelming the Resend API
SELECT cron.schedule(
  'send-win-back-emails',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jkiohqfamhiykurxrhsn.supabase.co/functions/v1/send-win-back-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;
  $$
);
