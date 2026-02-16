/**
 * AI Assistant Edge Function.
 *
 * Receives natural language text (Czech, Slovak, or English) and uses
 * Claude's tool_use feature to parse it into structured ride operation
 * intents. Returns confirmation-ready structured data for mutations,
 * or direct results for queries.
 *
 * Authentication: User JWT required (via Authorization header).
 *
 * Returns:
 *   200 - Parsed intent or conversational reply
 *   400 - Invalid input
 *   401 - Unauthorized
 *   500 - AI processing error
 */
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.52.0";
import { createUserClient } from "../_shared/supabase-client.ts";
import { AI_TOOL_DEFINITIONS, SYSTEM_PROMPT } from "../_shared/ai-tools.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Maximum message length (matches shared MAX_AI_MESSAGE_LENGTH) */
const MAX_MESSAGE_LENGTH = 500;

/** Maximum conversation history entries */
const MAX_HISTORY_LENGTH = 10;

/** Actions that require user confirmation before execution */
const CONFIRMATION_REQUIRED_ACTIONS = new Set([
  "create_ride",
  "book_seat",
  "cancel_booking",
  "edit_ride",
  "complete_ride",
]);

/**
 * Detect language from response text using simple heuristics.
 * Checks for Czech/Slovak diacritics and common words.
 */
function detectLanguage(text: string): "cs" | "sk" | "en" {
  const lower = text.toLowerCase();

  // Slovak-specific indicators (check before Czech since they overlap)
  const skIndicators = [
    "ahoj",
    "dobrý deň",
    "ďakujem",
    "prosím",
    "zajtra",
    "pozajtra",
    "budúci",
    "nájdených",
    "vyhľadávanie",
    "sedadlo",
    "voľné",
    "cesta",
    /[ľďťňôä]/,
  ];
  const skScore = skIndicators.reduce((score, indicator) => {
    if (indicator instanceof RegExp) return score + (indicator.test(lower) ? 2 : 0);
    return score + (lower.includes(indicator) ? 1 : 0);
  }, 0);

  // Czech-specific indicators
  const csIndicators = [
    "ahoj",
    "dobrý den",
    "děkuji",
    "prosím",
    "zítra",
    "pozítří",
    "příští",
    "nalezených",
    "vyhledávání",
    "sedadlo",
    "volné",
    "jízda",
    /[ěščřžýáíéúůď]/,
  ];
  const csScore = csIndicators.reduce((score, indicator) => {
    if (indicator instanceof RegExp) return score + (indicator.test(lower) ? 2 : 0);
    return score + (lower.includes(indicator) ? 1 : 0);
  }, 0);

  // Slovak-unique characters give strong signal
  if (skScore > csScore && skScore >= 2) return "sk";
  if (csScore >= 2) return "cs";
  return "en";
}

/**
 * Validate request body shape inline (Edge Functions can't import from shared package).
 */
function validateRequest(
  body: unknown,
): { message: string; conversation_history?: Array<{ role: string; content: string }> } | null {
  if (!body || typeof body !== "object") return null;

  const obj = body as Record<string, unknown>;
  if (typeof obj.message !== "string" || obj.message.length === 0 || obj.message.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  if (obj.conversation_history !== undefined) {
    if (!Array.isArray(obj.conversation_history)) return null;
    if (obj.conversation_history.length > MAX_HISTORY_LENGTH) return null;
    for (const entry of obj.conversation_history) {
      if (
        !entry ||
        typeof entry !== "object" ||
        typeof entry.role !== "string" ||
        !["user", "assistant"].includes(entry.role) ||
        typeof entry.content !== "string"
      ) {
        return null;
      }
    }
  }

  return obj as { message: string; conversation_history?: Array<{ role: string; content: string }> };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Authenticate user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabase = createUserClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const validated = validateRequest(body);
    if (!validated) {
      return jsonResponse(
        {
          error: `Invalid request. Required: message (string, 1-${MAX_MESSAGE_LENGTH} chars). Optional: conversation_history (array, max ${MAX_HISTORY_LENGTH} entries).`,
        },
        400,
      );
    }

    const { message, conversation_history = [] } = validated;

    // Check for Anthropic API key
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not configured");
      return jsonResponse({ error: "AI service not configured" }, 500);
    }

    // Build messages array from conversation history
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...conversation_history.map((entry) => ({
        role: entry.role as "user" | "assistant",
        content: entry.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Inject today's date into system prompt
    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = SYSTEM_PROMPT.replace("{today}", today);

    // Call Claude API with tool_use
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: AI_TOOL_DEFINITIONS,
      messages,
    });

    // Parse response: look for tool_use and text content blocks
    let toolAction: string | null = null;
    let toolParams: Record<string, unknown> = {};
    let assistantText = "";

    for (const block of response.content) {
      if (block.type === "tool_use") {
        toolAction = block.name;
        toolParams = (block.input as Record<string, unknown>) ?? {};
      } else if (block.type === "text") {
        assistantText += block.text;
      }
    }

    // Detect language from assistant's response
    const language = detectLanguage(assistantText || message);

    if (toolAction) {
      // Structured intent detected
      const intent = {
        action: toolAction,
        confidence: 1.0,
        language,
        params: toolParams,
        display_text: assistantText,
        needs_confirmation: CONFIRMATION_REQUIRED_ACTIONS.has(toolAction),
      };

      return jsonResponse({ intent, reply: assistantText }, 200);
    }

    // No tool use -- general conversational response
    return jsonResponse(
      {
        intent: null,
        reply: assistantText,
      },
      200,
    );
  } catch (error) {
    console.error("ai-assistant error:", error);

    // Check for Anthropic-specific errors
    if (error instanceof Error) {
      if (error.message?.includes("authentication") || error.message?.includes("api_key")) {
        return jsonResponse({ error: "AI service authentication error" }, 500);
      }
      if (error.message?.includes("rate_limit")) {
        return jsonResponse({ error: "AI service rate limited. Please try again later." }, 429);
      }
    }

    return jsonResponse({ error: "Failed to process your request. Please try again." }, 500);
  }
});
