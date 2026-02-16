-- Re-enable pg_net notification triggers after integration tests complete.
ALTER TABLE public.bookings ENABLE TRIGGER on_booking_change;
ALTER TABLE public.chat_messages ENABLE TRIGGER on_new_message;
ALTER TABLE public.rides ENABLE TRIGGER on_new_ride_check_alerts;
ALTER TABLE public.reports ENABLE TRIGGER on_new_report_notify_admins;
