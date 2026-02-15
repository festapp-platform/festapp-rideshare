-- Chat tables: conversations linked to bookings, messages between driver and passenger
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
