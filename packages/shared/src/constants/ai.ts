/**
 * AI assistant constants.
 *
 * Action keys match the Claude tool_use function names exactly.
 * Used across Edge Functions and client apps.
 */

export const AI_ACTIONS = {
  create_ride: 'create_ride',
  search_rides: 'search_rides',
  book_seat: 'book_seat',
  cancel_booking: 'cancel_booking',
  edit_ride: 'edit_ride',
  complete_ride: 'complete_ride',
  general_chat: 'general_chat',
} as const;

export type AiAction = typeof AI_ACTIONS[keyof typeof AI_ACTIONS];

export const AI_SUPPORTED_LANGUAGES = ['cs', 'sk', 'en'] as const;

export type AiLanguage = typeof AI_SUPPORTED_LANGUAGES[number];

/** Maximum length of a single user message to the AI assistant */
export const MAX_AI_MESSAGE_LENGTH = 500;
