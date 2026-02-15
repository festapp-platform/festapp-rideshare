import { z } from 'zod';

export const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  message_type: z.enum(['text', 'phone_share']).default('text'),
});

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  content: z.string(),
  message_type: z.enum(['text', 'phone_share']),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export type SendMessage = z.infer<typeof SendMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
