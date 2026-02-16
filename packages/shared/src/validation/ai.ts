import { z } from 'zod';
import { AI_ACTIONS, AI_SUPPORTED_LANGUAGES, MAX_AI_MESSAGE_LENGTH } from '../constants/ai';

/**
 * AI assistant validation schemas.
 *
 * AiRequestSchema validates user input to the AI Edge Function.
 * AiParsedIntentSchema describes the structured intent parsed by Claude tool_use.
 * AiResponseSchema wraps the full response from the Edge Function.
 */

const aiActionValues = Object.values(AI_ACTIONS) as [string, ...string[]];

export const AiRequestSchema = z.object({
  message: z.string().min(1).max(MAX_AI_MESSAGE_LENGTH),
  conversation_history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(10)
    .optional(),
});

export const AiParsedIntentSchema = z.object({
  action: z.enum(aiActionValues),
  confidence: z.number().min(0).max(1),
  language: z.enum(AI_SUPPORTED_LANGUAGES),
  params: z.record(z.unknown()),
  display_text: z.string(),
  needs_confirmation: z.boolean(),
});

export const AiResponseSchema = z.object({
  intent: AiParsedIntentSchema.nullable(),
  reply: z.string(),
  error: z.string().optional(),
});

// Inferred types
export type AiRequest = z.infer<typeof AiRequestSchema>;
export type AiParsedIntent = z.infer<typeof AiParsedIntentSchema>;
export type AiResponse = z.infer<typeof AiResponseSchema>;
