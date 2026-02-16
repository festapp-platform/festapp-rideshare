import { describe, it, expect } from 'vitest';
import { AiRequestSchema, AiResponseSchema, AiParsedIntentSchema } from '../ai';
import { AI_ACTIONS, AI_SUPPORTED_LANGUAGES, MAX_AI_MESSAGE_LENGTH } from '../../constants/ai';

describe('AiRequestSchema', () => {
  it('accepts valid message', () => {
    const result = AiRequestSchema.parse({ message: 'Jedu z Prahy do Brna' });
    expect(result.message).toBe('Jedu z Prahy do Brna');
  });

  it('accepts message with conversation_history', () => {
    const result = AiRequestSchema.parse({
      message: 'Find rides',
      conversation_history: [{ role: 'user', content: 'hi' }],
    });
    expect(result.message).toBe('Find rides');
    expect(result.conversation_history).toHaveLength(1);
    expect(result.conversation_history![0].role).toBe('user');
  });

  it('accepts message with assistant role in history', () => {
    const result = AiRequestSchema.parse({
      message: 'Thanks',
      conversation_history: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'Hello! How can I help?' },
      ],
    });
    expect(result.conversation_history).toHaveLength(2);
  });

  it('accepts message without conversation_history (optional)', () => {
    const result = AiRequestSchema.parse({ message: 'Hello' });
    expect(result.conversation_history).toBeUndefined();
  });

  it('rejects empty message', () => {
    expect(() => AiRequestSchema.parse({ message: '' })).toThrow();
  });

  it('rejects message exceeding max length', () => {
    expect(() => AiRequestSchema.parse({ message: 'x'.repeat(MAX_AI_MESSAGE_LENGTH + 1) })).toThrow();
  });

  it('accepts message at max length boundary', () => {
    const result = AiRequestSchema.parse({ message: 'x'.repeat(MAX_AI_MESSAGE_LENGTH) });
    expect(result.message).toHaveLength(MAX_AI_MESSAGE_LENGTH);
  });

  it('rejects invalid role in conversation_history', () => {
    expect(() =>
      AiRequestSchema.parse({
        message: 'hi',
        conversation_history: [{ role: 'invalid', content: 'hi' }],
      }),
    ).toThrow();
  });

  it('rejects missing message field', () => {
    expect(() => AiRequestSchema.parse({})).toThrow();
    expect(() => AiRequestSchema.parse({ conversation_history: [] })).toThrow();
  });

  it('rejects conversation_history exceeding 10 entries', () => {
    const history = Array.from({ length: 11 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }));
    expect(() =>
      AiRequestSchema.parse({ message: 'hi', conversation_history: history }),
    ).toThrow();
  });
});

describe('AiParsedIntentSchema', () => {
  const validIntent = {
    action: 'create_ride',
    confidence: 0.95,
    language: 'cs',
    params: { origin_address: 'Praha', destination_address: 'Brno' },
    display_text: 'Vytvořit jízdu z Prahy do Brna',
    needs_confirmation: true,
  };

  it('accepts valid intent', () => {
    const result = AiParsedIntentSchema.parse(validIntent);
    expect(result.action).toBe('create_ride');
    expect(result.confidence).toBe(0.95);
    expect(result.language).toBe('cs');
    expect(result.needs_confirmation).toBe(true);
  });

  it('accepts all valid action types', () => {
    for (const action of Object.values(AI_ACTIONS)) {
      const result = AiParsedIntentSchema.parse({ ...validIntent, action });
      expect(result.action).toBe(action);
    }
  });

  it('rejects unknown action', () => {
    expect(() =>
      AiParsedIntentSchema.parse({ ...validIntent, action: 'unknown_action' }),
    ).toThrow();
  });

  it('rejects confidence greater than 1', () => {
    expect(() =>
      AiParsedIntentSchema.parse({ ...validIntent, confidence: 1.5 }),
    ).toThrow();
  });

  it('rejects negative confidence', () => {
    expect(() =>
      AiParsedIntentSchema.parse({ ...validIntent, confidence: -0.1 }),
    ).toThrow();
  });

  it('accepts confidence at boundaries (0 and 1)', () => {
    expect(AiParsedIntentSchema.parse({ ...validIntent, confidence: 0 }).confidence).toBe(0);
    expect(AiParsedIntentSchema.parse({ ...validIntent, confidence: 1 }).confidence).toBe(1);
  });

  it('rejects unsupported language', () => {
    expect(() =>
      AiParsedIntentSchema.parse({ ...validIntent, language: 'de' }),
    ).toThrow();
  });

  it('accepts all supported languages', () => {
    for (const lang of AI_SUPPORTED_LANGUAGES) {
      const result = AiParsedIntentSchema.parse({ ...validIntent, language: lang });
      expect(result.language).toBe(lang);
    }
  });
});

describe('AiResponseSchema', () => {
  const validResponse = {
    intent: {
      action: 'search_rides',
      confidence: 0.9,
      language: 'en',
      params: { origin_address: 'Prague', destination_address: 'Brno' },
      display_text: 'Search rides from Prague to Brno',
      needs_confirmation: false,
    },
    reply: 'I found 3 rides from Prague to Brno.',
  };

  it('accepts complete response with intent', () => {
    const result = AiResponseSchema.parse(validResponse);
    expect(result.intent).not.toBeNull();
    expect(result.reply).toBe('I found 3 rides from Prague to Brno.');
  });

  it('accepts response with null intent (general chat)', () => {
    const result = AiResponseSchema.parse({
      intent: null,
      reply: 'Hello! How can I help you with rides?',
    });
    expect(result.intent).toBeNull();
    expect(result.reply).toContain('Hello');
  });

  it('accepts response with optional error field', () => {
    const result = AiResponseSchema.parse({
      intent: null,
      reply: 'Something went wrong',
      error: 'AI service unavailable',
    });
    expect(result.error).toBe('AI service unavailable');
  });

  it('accepts response without error field', () => {
    const result = AiResponseSchema.parse(validResponse);
    expect(result.error).toBeUndefined();
  });

  it('rejects response with invalid intent action', () => {
    expect(() =>
      AiResponseSchema.parse({
        intent: { ...validResponse.intent, action: 'fly_to_moon' },
        reply: 'test',
      }),
    ).toThrow();
  });

  it('rejects response with invalid intent confidence', () => {
    expect(() =>
      AiResponseSchema.parse({
        intent: { ...validResponse.intent, confidence: 2.0 },
        reply: 'test',
      }),
    ).toThrow();
  });

  it('rejects response with unsupported language in intent', () => {
    expect(() =>
      AiResponseSchema.parse({
        intent: { ...validResponse.intent, language: 'fr' },
        reply: 'test',
      }),
    ).toThrow();
  });

  it('rejects response missing reply field', () => {
    expect(() => AiResponseSchema.parse({ intent: null })).toThrow();
  });
});

describe('AI_ACTIONS constant', () => {
  it('has all 7 expected action keys', () => {
    const keys = Object.keys(AI_ACTIONS);
    expect(keys).toHaveLength(7);
    expect(keys).toContain('create_ride');
    expect(keys).toContain('search_rides');
    expect(keys).toContain('book_seat');
    expect(keys).toContain('cancel_booking');
    expect(keys).toContain('edit_ride');
    expect(keys).toContain('complete_ride');
    expect(keys).toContain('general_chat');
  });

  it('values match expected strings', () => {
    expect(AI_ACTIONS.create_ride).toBe('create_ride');
    expect(AI_ACTIONS.search_rides).toBe('search_rides');
    expect(AI_ACTIONS.book_seat).toBe('book_seat');
    expect(AI_ACTIONS.cancel_booking).toBe('cancel_booking');
    expect(AI_ACTIONS.edit_ride).toBe('edit_ride');
    expect(AI_ACTIONS.complete_ride).toBe('complete_ride');
    expect(AI_ACTIONS.general_chat).toBe('general_chat');
  });

  it('MAX_AI_MESSAGE_LENGTH is 500', () => {
    expect(MAX_AI_MESSAGE_LENGTH).toBe(500);
  });

  it('AI_SUPPORTED_LANGUAGES contains cs, sk, en', () => {
    expect(AI_SUPPORTED_LANGUAGES).toContain('cs');
    expect(AI_SUPPORTED_LANGUAGES).toContain('sk');
    expect(AI_SUPPORTED_LANGUAGES).toContain('en');
    expect(AI_SUPPORTED_LANGUAGES).toHaveLength(3);
  });
});
