-- Chat tables and RPCs: conversations linked to bookings, messages between driver and passenger
-- All mutations through SECURITY DEFINER RPCs (consistent with booking pattern)

-- ============================================================
-- chat_conversations table
-- ============================================================
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id),
  passenger_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- chat_messages table
-- ============================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'phone_share')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_unread ON public.chat_messages(conversation_id, read_at) WHERE read_at IS NULL;

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Participants can view their own conversations
CREATE POLICY "Participants can view own conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR passenger_id = auth.uid());

-- Participants can view messages in their conversations
CREATE POLICY "Participants can view messages in own conversations"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.driver_id = auth.uid() OR c.passenger_id = auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE policies: all mutations through SECURITY DEFINER RPCs

-- ============================================================
-- Realtime publication for chat_messages (Postgres Changes subscriptions)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============================================================
-- get_or_create_conversation: lazy conversation creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_conversation_id UUID;
  v_user_id UUID;
  v_ride_id UUID;
  v_driver_id UUID;
  v_passenger_id UUID;
  v_booking_status TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Check booking exists, is confirmed, and user is participant
  SELECT b.ride_id, r.driver_id, b.passenger_id, b.status
  INTO v_ride_id, v_driver_id, v_passenger_id, v_booking_status
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  WHERE b.id = p_booking_id;

  IF v_ride_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking_status != 'confirmed' THEN
    RAISE EXCEPTION 'Booking must be confirmed to start a conversation';
  END IF;

  IF v_user_id != v_driver_id AND v_user_id != v_passenger_id THEN
    RAISE EXCEPTION 'Not authorized for this booking';
  END IF;

  -- Try to insert (ON CONFLICT handles race conditions)
  INSERT INTO public.chat_conversations (booking_id, ride_id, driver_id, passenger_id)
  VALUES (p_booking_id, v_ride_id, v_driver_id, v_passenger_id)
  ON CONFLICT (booking_id) DO NOTHING;

  -- Retrieve the conversation ID
  SELECT id INTO v_conversation_id
  FROM public.chat_conversations
  WHERE booking_id = p_booking_id;

  RETURN v_conversation_id;
END;
$$;

-- ============================================================
-- send_chat_message: block-aware message sending
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_message_id UUID;
  v_sender_id UUID;
  v_other_id UUID;
  v_driver_id UUID;
  v_passenger_id UUID;
BEGIN
  v_sender_id := auth.uid();

  -- Verify sender is a participant and get conversation details
  SELECT driver_id, passenger_id
  INTO v_driver_id, v_passenger_id
  FROM public.chat_conversations
  WHERE id = p_conversation_id
    AND (driver_id = v_sender_id OR passenger_id = v_sender_id);

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  -- Determine other participant
  IF v_sender_id = v_driver_id THEN
    v_other_id := v_passenger_id;
  ELSE
    v_other_id := v_driver_id;
  END IF;

  -- Block check: prevent messaging if either user has blocked the other
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_sender_id AND blocked_id = v_other_id)
       OR (blocker_id = v_other_id AND blocked_id = v_sender_id)
  ) THEN
    RAISE EXCEPTION 'Unable to send message';
  END IF;

  -- Validate content length
  IF char_length(p_content) < 1 OR char_length(p_content) > 2000 THEN
    RAISE EXCEPTION 'Message content must be between 1 and 2000 characters';
  END IF;

  -- Validate message type
  IF p_message_type NOT IN ('text', 'phone_share') THEN
    RAISE EXCEPTION 'Invalid message type';
  END IF;

  -- Insert message
  INSERT INTO public.chat_messages (conversation_id, sender_id, content, message_type)
  VALUES (p_conversation_id, v_sender_id, p_content, p_message_type)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- ============================================================
-- mark_messages_read: mark all unread messages as read
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Verify user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = p_conversation_id
      AND (driver_id = v_user_id OR passenger_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  -- Mark messages from the other user as read
  UPDATE public.chat_messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != v_user_id
    AND read_at IS NULL;
END;
$$;

-- ============================================================
-- get_unread_count: total unread messages across all conversations
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COUNT(*)
  FROM public.chat_messages m
  JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE (c.driver_id = auth.uid() OR c.passenger_id = auth.uid())
    AND m.sender_id != auth.uid()
    AND m.read_at IS NULL;
$$;
