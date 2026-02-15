-- Ride reminders: add tracking column and schedule cron job
-- Sends push notifications ~1 hour before departure via send-ride-reminders Edge Function

-- Add reminder tracking column to prevent duplicate reminders
ALTER TABLE public.rides ADD COLUMN reminder_sent_at TIMESTAMPTZ;

-- Schedule ride reminder cron job (every 15 minutes)
-- Uses same pg_cron + pg_net pattern as ride expiry (migration 013)
SELECT cron.schedule(
  'ride-reminders',
  '*/15 * * * *',
  $$
    SELECT extensions.net.http_post(
      url := 'https://xamctptqmpruhovhjcgm.supabase.co/functions/v1/send-ride-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
