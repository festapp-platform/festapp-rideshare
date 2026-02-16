-- Fix chat message deduplication: accept optional client-supplied UUID (BUG-02)
-- When client passes p_message_id, the server uses it so Realtime dedup matches
-- the optimistic message. When NULL (default), a new UUID is generated (backward compat).

CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_message_id UUID DEFAULT NULL
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

  -- Use client-supplied ID or generate new one
  v_message_id := COALESCE(p_message_id, uuid_generate_v4());

  -- Insert message with explicit ID
  INSERT INTO public.chat_messages (id, conversation_id, sender_id, content, message_type)
  VALUES (v_message_id, p_conversation_id, v_sender_id, p_content, p_message_type);

  RETURN v_message_id;
END;
$$;
