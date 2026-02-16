-- Chat message archival for completed rides (CHAT-06)
-- Deletes messages for rides completed more than 90 days ago.
-- Existing index idx_chat_messages_conversation on (conversation_id, created_at)
-- already covers both cursor-based pagination queries and the archival join.

CREATE OR REPLACE FUNCTION public.archive_completed_ride_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.chat_messages m
  USING public.chat_conversations c
  JOIN public.rides r ON r.id = c.ride_id
  WHERE m.conversation_id = c.id
    AND r.status = 'completed'
    AND r.departure_time < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_completed_ride_messages() TO service_role;

COMMENT ON FUNCTION public.archive_completed_ride_messages() IS
  'Deletes chat messages for completed rides older than 90 days. '
  'Can be called via pg_cron: SELECT cron.schedule(''archive-chat'', ''0 3 * * 0'', ''SELECT public.archive_completed_ride_messages()'') '
  'or via a scheduled Edge Function.';
