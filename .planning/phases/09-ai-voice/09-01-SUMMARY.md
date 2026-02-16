---
phase: 09-ai-voice
plan: 01
subsystem: api
tags: [anthropic, claude, tool_use, ai, nlp, edge-function, deno, zod]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: "Supabase Edge Function patterns, JWT auth, createUserClient"
  - phase: 03-rides-matching
    provides: "Ride schemas and constants for tool parameter design"
provides:
  - "AI intent parsing Edge Function (ai-assistant) using Claude tool_use"
  - "Shared AI types, constants, and Zod validation schemas"
  - "Claude tool definitions for 6 ride operations"
  - "System prompt with Czech/Slovak/English language support"
affects: [09-02, 09-03, 09-04]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk@0.52.0 (esm.sh for Deno)"]
  patterns: ["Claude tool_use for structured intent parsing", "Language detection heuristic for cs/sk/en", "Confirmation-required flag for mutation vs query actions"]

key-files:
  created:
    - "supabase/functions/ai-assistant/index.ts"
    - "supabase/functions/_shared/ai-tools.ts"
    - "packages/shared/src/constants/ai.ts"
    - "packages/shared/src/validation/ai.ts"
  modified:
    - "packages/shared/src/index.ts"

key-decisions:
  - "Anthropic SDK v0.52.0 via esm.sh for Deno Edge Function compatibility"
  - "Inline request validation in Edge Function (can't import from shared package)"
  - "Language detection via diacritics/word heuristic (not separate API call)"
  - "Mutations always need_confirmation=true; search and general_chat do not"
  - "System prompt includes {today} placeholder for relative date resolution"

patterns-established:
  - "AI tool_use pattern: define tools array + system prompt in _shared, consume in Edge Function"
  - "Confirmation-required flag: CONFIRMATION_REQUIRED_ACTIONS Set for mutation gating"
  - "Replicated validation in Edge Functions when shared package import unavailable"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 09 Plan 01: AI Intent Parsing Summary

**Claude tool_use Edge Function parsing Czech/Slovak/English natural language into structured ride intents with 6 operation tools and confirmation gating**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T00:18:17Z
- **Completed:** 2026-02-16T00:20:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- AI_ACTIONS constant with 7 action types and Zod validation schemas exported from shared package
- Claude tool_use definitions for all 6 ride operations with typed parameter schemas
- AI assistant Edge Function with JWT auth, language detection, and structured intent response
- System prompt handling Czech/Slovak date expressions and city abbreviations

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared AI types, constants, and validation schemas** - `7630900` (feat)
2. **Task 2: AI assistant Edge Function with Claude tool_use** - `f9877ef` (feat)

## Files Created/Modified
- `packages/shared/src/constants/ai.ts` - AI_ACTIONS, AI_SUPPORTED_LANGUAGES, MAX_AI_MESSAGE_LENGTH constants
- `packages/shared/src/validation/ai.ts` - AiRequestSchema, AiParsedIntentSchema, AiResponseSchema Zod schemas
- `packages/shared/src/index.ts` - Added AI exports (constants, types, validation)
- `supabase/functions/_shared/ai-tools.ts` - Claude tool definitions and system prompt
- `supabase/functions/ai-assistant/index.ts` - AI intent parsing Edge Function

## Decisions Made
- Anthropic SDK v0.52.0 via esm.sh for Deno Edge Function compatibility
- Inline request validation in Edge Function (shared package not importable from Deno)
- Language detection via diacritics/common-word heuristic rather than separate API call
- Mutations always require confirmation (needs_confirmation=true); search and chat do not
- System prompt uses {today} placeholder injected at runtime for relative date resolution
- Rate limit errors return 429 status for proper client-side retry handling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing typecheck errors in `packages/shared/src/validation/__tests__/gamification.test.ts` (TS2538) -- confirmed present before this plan's changes. Not related to AI code. Logged as out-of-scope.

## User Setup Required

**External services require manual configuration:**
- `ANTHROPIC_API_KEY` environment variable needed in Supabase Edge Function secrets
- Obtain from: Anthropic Console -> API Keys -> Create Key
- Set via: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

## Next Phase Readiness
- AI intent parsing ready for 09-02 (voice input integration)
- Tool definitions extensible for future operations
- Response schema ready for client-side confirmation UI (09-03)

## Self-Check: PASSED

- All 5 created/modified files verified present on disk
- Commits `7630900` and `f9877ef` verified in git log
- Deno type-check passed for Edge Function

---
*Phase: 09-ai-voice*
*Completed: 2026-02-16*
