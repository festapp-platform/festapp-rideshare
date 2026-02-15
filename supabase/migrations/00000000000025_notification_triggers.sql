-- Notification triggers: fire on booking changes and new chat messages
-- Calls send-notification Edge Function via pg_net (async, non-blocking)

-- Enable pg_net extension for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- Helper: build pg_net HTTP POST to send-notification
-- ============================================================
CREATE OR REPLACE FUNCTION public._notify(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  v_url := current_setting('supabase.service_url', true);
  v_key := current_setting('supabase.service_role_key', true);

  -- Fallback: use hardcoded project URL if setting not available
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://xamctptqmpruhovhjcgm.supabase.co';
  END IF;

  -- Cannot send without service_role key
  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'supabase.service_role_key not available, skipping notification';
    RETURN;
  END IF;

  PERFORM extensions.net.http_post(
    url := v_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'user_id', p_user_id::text,
      'type', p_type,
      'title', p_title,
      'body', p_body,
      'data', p_data
    )
  );
END;
$$;

-- ============================================================
-- notify_on_booking_change: AFTER INSERT OR UPDATE trigger on bookings
-- Handles all booking notification scenarios
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_ride RECORD;
  v_passenger_name TEXT;
  v_data JSONB;
BEGIN
  -- Fetch ride details and driver name
  SELECT r.id, r.driver_id, r.origin_address, r.destination_address,
         dp.display_name AS driver_name
  INTO v_ride
  FROM public.rides r
  JOIN public.profiles dp ON dp.id = r.driver_id
  WHERE r.id = NEW.ride_id;

  -- Fetch passenger name
  SELECT display_name INTO v_passenger_name
  FROM public.profiles WHERE id = NEW.passenger_id;

  -- Deep link data
  v_data := jsonb_build_object(
    'ride_id', NEW.ride_id::text,
    'booking_id', NEW.id::text
  );

  -- ---- INSERT: new booking created ----
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'confirmed' THEN
      -- Instant booking: notify passenger (confirmation) and driver (new booking)
      PERFORM public._notify(
        NEW.passenger_id,
        'booking_confirmation',
        'Booking Confirmed',
        'Your ride from ' || v_ride.origin_address || ' to ' || v_ride.destination_address || ' is confirmed!',
        v_data
      );
      PERFORM public._notify(
        v_ride.driver_id,
        'booking_request',
        'New Booking',
        COALESCE(v_passenger_name, 'A passenger') || ' booked a seat on your ride from ' || v_ride.origin_address || ' to ' || v_ride.destination_address,
        v_data
      );
    ELSIF NEW.status = 'pending' THEN
      -- Request booking: notify driver only
      PERFORM public._notify(
        v_ride.driver_id,
        'booking_request',
        'New Booking Request',
        COALESCE(v_passenger_name, 'A passenger') || ' requested to join your ride from ' || v_ride.origin_address || ' to ' || v_ride.destination_address,
        v_data
      );
    END IF;

  -- ---- UPDATE: status changed ----
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

    -- Pending -> Confirmed (driver accepted)
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
      PERFORM public._notify(
        NEW.passenger_id,
        'booking_confirmation',
        'Booking Confirmed',
        'Your booking on ' || v_ride.origin_address || ' to ' || v_ride.destination_address || ' has been confirmed!',
        v_data
      );

    -- Any -> Cancelled (rejection or cancellation)
    ELSIF NEW.status = 'cancelled' THEN
      -- Rejected (was pending, cancelled by driver)
      IF OLD.status = 'pending' AND NEW.cancelled_by IS NOT NULL AND NEW.cancelled_by != NEW.passenger_id THEN
        PERFORM public._notify(
          NEW.passenger_id,
          'booking_cancellation',
          'Booking Declined',
          'Your booking request was declined',
          v_data
        );

      -- Cancelled by passenger -> notify driver
      ELSIF NEW.cancelled_by = NEW.passenger_id THEN
        PERFORM public._notify(
          v_ride.driver_id,
          'booking_cancellation',
          'Booking Cancelled',
          COALESCE(v_passenger_name, 'A passenger') || ' cancelled their booking on your ride from ' || v_ride.origin_address || ' to ' || v_ride.destination_address,
          v_data
        );

      -- Cancelled by driver (or ride cancellation cascade) -> notify passenger
      ELSE
        PERFORM public._notify(
          NEW.passenger_id,
          'booking_cancellation',
          'Booking Cancelled',
          'Your booking from ' || v_ride.origin_address || ' to ' || v_ride.destination_address || ' has been cancelled',
          v_data
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- notify_on_new_message: AFTER INSERT trigger on chat_messages
-- Sends push notification to the other conversation participant
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_conversation RECORD;
  v_sender_name TEXT;
  v_recipient_id UUID;
  v_body TEXT;
BEGIN
  -- Fetch conversation participants
  SELECT driver_id, passenger_id, id AS conversation_id
  INTO v_conversation
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  -- Determine recipient (the other participant)
  IF NEW.sender_id = v_conversation.driver_id THEN
    v_recipient_id := v_conversation.passenger_id;
  ELSE
    v_recipient_id := v_conversation.driver_id;
  END IF;

  -- Fetch sender name
  SELECT display_name INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  -- Build notification body
  IF NEW.message_type = 'phone_share' THEN
    v_body := 'Shared their phone number';
  ELSE
    v_body := LEFT(NEW.content, 100);
    IF char_length(NEW.content) > 100 THEN
      v_body := v_body || '...';
    END IF;
  END IF;

  PERFORM public._notify(
    v_recipient_id,
    'new_message',
    COALESCE(v_sender_name, 'New message'),
    v_body,
    jsonb_build_object('conversation_id', v_conversation.conversation_id::text)
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- Create triggers
-- ============================================================
CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_booking_change();

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();
