-- Disable pg_net notification triggers that call Edge Functions via HTTP.
-- These would timeout/fail without Edge Functions running.
ALTER TABLE public.bookings DISABLE TRIGGER on_booking_change;
ALTER TABLE public.chat_messages DISABLE TRIGGER on_new_message;
ALTER TABLE public.rides DISABLE TRIGGER on_new_ride_check_alerts;
ALTER TABLE public.reports DISABLE TRIGGER on_new_report_notify_admins;
