# Phase 14: Price Formatting, Chat Optimization & AI Tests - Research

**Researched:** 2026-02-16
**Domain:** Price formatting (Intl.NumberFormat), chat pagination/archival, AI integration testing
**Confidence:** HIGH

## Summary

Phase 14 spans three distinct domains: (1) creating a shared `formatPrice()` utility and deploying it across ~16 files that currently display prices as raw `${price} CZK` strings, (2) optimizing chat message loading with cursor-based pagination and adding an archival strategy for completed ride messages, and (3) writing integration tests for the AI Edge Function covering Czech, Slovak, and English inputs plus error handling.

The good news: zero new dependencies are required. `Intl.NumberFormat` is a built-in browser API with universal support. The chat query builder (`packages/shared/src/queries/chat.ts`) already supports cursor-based pagination via its `before` parameter -- the client-side `ChatView` component just doesn't use it (it does its own offset-style query). The integration test infrastructure at `packages/integration-tests/` and `supabase/__tests__/` already has helpers for authenticated clients and edge function invocation, so AI tests can follow the existing `edge-functions.test.ts` pattern.

**Primary recommendation:** Implement `formatPrice()` in `packages/shared/src/utils/format-price.ts`, fix the pricing coefficient to achieve 0.80 CZK/km, update all 16+ price display sites, refactor ChatView to use the shared `getMessages()` with cursor pagination, add a migration for chat archival, and write AI integration tests in `supabase/__tests__/integration/ai-assistant.test.ts`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRICE-01 | All prices display via shared formatPrice() using locale-aware Intl.NumberFormat with CZK currency | Create `packages/shared/src/utils/format-price.ts` using `Intl.NumberFormat` with `maximumFractionDigits: 0`. Replace 16+ inline `${price} CZK` patterns across the app. See "Files Requiring formatPrice()" inventory below. |
| PRICE-02 | Suggested prices round to nearest 10 CZK (or 50 CZK for trips >200 CZK) | Modify `calculateSuggestedPrice()` in `packages/shared/src/constants/pricing.ts` and `calculatePrice()` in `supabase/functions/compute-route/index.ts` to apply smart rounding: `roundTo10()` for prices <=200, `roundTo50()` for prices >200. |
| PRICE-03 | Price value displays directly below the price slider on ride creation form | Modify `ride-form.tsx` lines 697-718 (Step 2 price slider section). The current layout shows the value in a flex row between min/max -- move or duplicate it as a prominent value directly below the slider. |
| PRICE-04 | Suggested price coefficient aligns with BlaBlaCar (~0.80 CZK/km) | Update `COST_SHARING_FACTOR` in both `packages/shared/src/constants/pricing.ts` (currently 0.36, yields ~0.88 CZK/km) and `supabase/functions/compute-route/index.ts` (currently 0.6, yields ~1.47 CZK/km). Target factor: ~0.327 to achieve 0.80 CZK/km. See "Pricing Coefficient Math" section. |
| CHAT-05 | Chat messages table optimized (archival for completed rides, pagination strategy, TTL) | Add a SQL migration with: (a) a DB function or pg_cron job to archive/delete messages for rides with status='completed' older than N days, (b) verify existing index `idx_chat_messages_conversation` covers cursor pagination queries. |
| CHAT-06 | Chat loading uses cursor-based pagination (not offset) | The shared query builder `getMessages()` already supports cursor-based pagination via `before` parameter. Refactor `ChatView.handleLoadOlder()` to pass `oldestMessage.created_at` to the shared function instead of doing its own `.lt('created_at', ...)` query directly. |
| TEST-11 | Integration tests verify AI Edge Function responds to ride creation intent in Czech, Slovak, English | Create `supabase/__tests__/integration/ai-assistant.test.ts` following existing edge function test patterns. Test Czech ("Chci nabidnout jizdu z Prahy do Brna zitra v 8:00"), Slovak ("Chcem ponuknut jazdu z Bratislavy do Kosic"), English ("I want to offer a ride from Prague to Brno") inputs produce `create_ride` tool calls. |
| TEST-12 | Integration tests verify AI handles ambiguous, incomplete, and invalid inputs gracefully | Add test cases for: incomplete ("Jedu z Prahy" -- missing destination), ambiguous ("Chci jet" -- no details), invalid ("Create ride to the moon"), and gibberish inputs. Verify no crash, appropriate conversational response or clarification request. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Intl.NumberFormat | Built-in | CZK currency formatting with locale awareness | Browser built-in, universal support, handles Czech locale conventions (Kc symbol, no decimals). Zero bundle cost. |
| Vitest | (existing) | Test runner for integration tests | Already configured at `supabase/__tests__/vitest.config.ts` and `packages/integration-tests/vitest.config.ts`. |
| Supabase JS | (existing) | Client for invoking AI Edge Function in tests | Already used in `packages/integration-tests/src/tests/edge-functions.test.ts` pattern. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @festapp/shared | (monorepo) | Shared pricing constants, formatPrice utility, chat queries | All price formatting and chat query operations. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Intl.NumberFormat | Custom string formatting | Custom is error-prone for locale differences. Intl handles Czech "Kc" symbol, spacing, and number grouping automatically. |
| pg_cron for archival | Application-level cleanup | pg_cron is built into Supabase and runs without app involvement. Application cleanup requires a scheduled function. |

**Installation:**
No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
packages/shared/src/
  utils/
    format-price.ts         # NEW: formatPrice() utility
  constants/
    pricing.ts              # MODIFY: COST_SHARING_FACTOR, smart rounding

supabase/
  functions/compute-route/
    index.ts                # MODIFY: align COST_SHARING_FACTOR
  migrations/
    YYYYMMDD_chat_archival.sql  # NEW: archival function + policy
  __tests__/integration/
    ai-assistant.test.ts    # NEW: AI Edge Function integration tests
```

### Pattern 1: formatPrice() Utility
**What:** Centralized price formatting using `Intl.NumberFormat`
**When to use:** Every place a price is displayed to users
**Example:**
```typescript
// packages/shared/src/utils/format-price.ts
export function formatPrice(
  amount: number | null | undefined,
  options?: { locale?: string; free?: string }
): string {
  if (amount == null || amount === 0) {
    return options?.free ?? 'Zdarma';
  }

  const locale = options?.locale ?? 'cs';
  // Map locale to full BCP 47 tag for Intl
  const bcp47 = locale === 'en' ? 'en-CZ' : `${locale}-CZ`;

  return new Intl.NumberFormat(bcp47, {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}
```

**Output by locale:**
- `cs-CZ`: "150 Kc" (with hacek on c: Kc)
- `sk-CZ`: "150 Kc"
- `en-CZ`: "CZK 150" (ISO code prefix for English)

**Note:** `Intl.NumberFormat` with `currency: 'CZK'` renders the proper Czech symbol in Czech locales. The `maximumFractionDigits: 0` is critical because CZK has no subunits in practice (Czech Republic eliminated coins below 1 CZK in 2008).

### Pattern 2: Smart Price Rounding
**What:** Round suggested prices to cash-friendly values
**When to use:** When calculating suggested prices from distance
**Example:**
```typescript
function roundPrice(price: number): number {
  if (price > 200) {
    return Math.round(price / 50) * 50;
  }
  return Math.round(price / 10) * 10;
}
```

### Pattern 3: Chat Cursor-Based Pagination
**What:** Use `created_at` of oldest loaded message as cursor for next page
**When to use:** Loading older messages in ChatView
**Example:**
```typescript
// In ChatView.handleLoadOlder():
const oldestMessage = messages[0];
const { data: olderMessages } = await getMessages(
  supabase,
  conversationId,
  50,
  oldestMessage.created_at  // cursor parameter
);
```

The shared `getMessages()` at `packages/shared/src/queries/chat.ts` already supports this via its `before` parameter. The client just needs to use it.

### Pattern 4: AI Edge Function Integration Test
**What:** Invoke `ai-assistant` edge function with test prompts and verify structured responses
**When to use:** Testing AI intent parsing across languages
**Example:**
```typescript
const { data, error } = await authenticatedClient.functions.invoke(
  "ai-assistant",
  {
    body: {
      message: "Chci nabidnout jizdu z Prahy do Brna zitra v 8:00",
      conversation_history: [],
    },
  },
);

expect(error).toBeNull();
expect(data.intent).toBeDefined();
expect(data.intent.action).toBe("create_ride");
expect(data.intent.params.origin_address).toBeDefined();
expect(data.intent.params.destination_address).toBeDefined();
```

### Anti-Patterns to Avoid
- **Inline price formatting:** Never use `${price} CZK` or `${price} Kc` directly. Always use `formatPrice()`.
- **Offset-based chat pagination:** Never use `.range()` or skip/offset for chat messages. Cursor-based (`.lt('created_at', cursor)`) is stable when new messages arrive.
- **Hardcoding COST_SHARING_FACTOR in multiple places:** The edge function and shared package must use the same value. Consider importing from shared or at minimum documenting the canonical value.
- **Testing AI responses for exact string matches:** AI responses are non-deterministic. Test for structural properties (action type, presence of params) not exact text.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | Custom string concatenation | `Intl.NumberFormat` | Handles locale-specific symbol placement, grouping separators, decimal rules. Czech "150 Kc" vs English "CZK 150" automatically. |
| Chat pagination | Custom offset tracking | Supabase `.lt()` cursor queries via `getMessages()` | Offset pagination breaks when new messages arrive (shifts all indices). Cursor is stable. |
| AI response validation in tests | Regex parsing of AI text | Check `intent.action` and `intent.params` structure | AI text varies; structured function calls are deterministic in format. |

**Key insight:** The formatPrice utility and chat pagination are minimal code changes because the infrastructure (Intl API, getMessages with cursor support) already exists. The work is wiring, not building.

## Common Pitfalls

### Pitfall 1: CZK Decimal Places
**What goes wrong:** `Intl.NumberFormat` with default CZK settings shows "150,00 Kc" (two decimal places).
**Why it happens:** CZK technically has 2 decimal places in ISO 4217, even though Czech Republic eliminated sub-crown coins.
**How to avoid:** Always set `maximumFractionDigits: 0` and `minimumFractionDigits: 0`.
**Warning signs:** Seeing ".00" or ",00" in any price display.

### Pitfall 2: COST_SHARING_FACTOR Divergence
**What goes wrong:** The shared package (`pricing.ts`) uses `COST_SHARING_FACTOR: 0.36` while the compute-route edge function uses `0.6`. They produce different suggested prices for the same route.
**Why it happens:** The edge function was written independently from the shared constants.
**How to avoid:** Align both to the same value. For 0.80 CZK/km target, the factor should be ~0.327. Update both files in the same commit.
**Warning signs:** Server-computed price differs from client fallback price for the same route.

### Pitfall 3: ride-form.tsx Is Touched By Multiple Phases
**What goes wrong:** Merge conflicts or regressions because Phase 12 (done), Phase 14 (this), and Phase 16 (waypoints) all modify `ride-form.tsx`.
**Why it happens:** The file is 986 lines and is the central ride creation component.
**How to avoid:** Phase 14 changes to `ride-form.tsx` are minimal (price display below slider + formatPrice calls). Keep changes surgical. The slider value display is in lines 697-718. The price display sites are at lines 552, 689.
**Warning signs:** Changes that restructure the form layout or state management.

### Pitfall 4: AI Test Flakiness Due to Non-Deterministic Responses
**What goes wrong:** Tests pass intermittently because Gemini returns slightly different function call parameters each time.
**Why it happens:** LLM responses are inherently variable. City name parsing may differ ("Praha" vs "Prague").
**How to avoid:** Test structural properties: `intent.action === "create_ride"`, `intent.params.origin_address` is defined, `intent.params.departure_date` matches expected format. Don't assert exact string values for city names.
**Warning signs:** Tests that check `origin_address === "Praha"` -- the AI might return "Prague" or "Praha 1".

### Pitfall 5: Chat Archival Without Considering Active Conversations
**What goes wrong:** Messages for completed rides are deleted while a user is still viewing the conversation.
**Why it happens:** Archival runs on a schedule without checking active sessions.
**How to avoid:** Set a generous TTL (e.g., 30-90 days after ride completion, not immediate). The archival function should check `rides.status = 'completed' AND rides.departure_time < NOW() - INTERVAL 'N days'`.
**Warning signs:** Users reporting "messages disappeared" for recently completed rides.

### Pitfall 6: formatPrice in SSR vs Client Locale
**What goes wrong:** Server-rendered prices show different locale formatting than client-rendered prices, causing hydration mismatches.
**Why it happens:** Server doesn't know the user's locale preference during SSR.
**How to avoid:** For SSR components, use a default locale ('cs') or pass locale from cookie/header. For client components, use the i18n provider's locale. In practice, most price displays are in client components.
**Warning signs:** React hydration warnings mentioning price text content.

## Code Examples

### formatPrice() Implementation
```typescript
// packages/shared/src/utils/format-price.ts
// Source: MDN Intl.NumberFormat + Czech currency conventions

export function formatPrice(
  amount: number | null | undefined,
  options?: { locale?: string; free?: string }
): string {
  if (amount == null || amount === 0) {
    return options?.free ?? 'Zdarma';
  }

  const locale = options?.locale ?? 'cs';
  const bcp47 = locale === 'en' ? 'en-CZ' : `${locale}-CZ`;

  return new Intl.NumberFormat(bcp47, {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}
```

### Replacing Inline Price Formatting
```typescript
// BEFORE (current pattern in ~16 files):
{ride.price_czk != null ? `${ride.price_czk} CZK` : 'Free'}

// AFTER:
{formatPrice(ride.price_czk, { locale, free: t('rides.free') })}
```

### Smart Rounding in calculateSuggestedPrice
```typescript
// packages/shared/src/constants/pricing.ts
function roundPrice(price: number): number {
  if (price > 200) {
    return Math.round(price / 50) * 50;
  }
  return Math.round(price / 10) * 10;
}

export function calculateSuggestedPrice(distanceMeters: number) {
  const distanceKm = distanceMeters / 1000;
  const fuelCost = (distanceKm / 100) * PRICING.AVG_CONSUMPTION_L_PER_100KM * PRICING.FUEL_PRICE_CZK_PER_LITER;
  const raw = Math.max(PRICING.MIN_PRICE_CZK, fuelCost * PRICING.COST_SHARING_FACTOR);
  const suggested = roundPrice(raw);

  return {
    suggested,
    min: Math.max(PRICING.MIN_PRICE_CZK, roundPrice(suggested * PRICING.MIN_PRICE_FACTOR)),
    max: roundPrice(suggested * PRICING.MAX_PRICE_FACTOR),
  };
}
```

### Chat Archival Migration
```sql
-- Archive/delete chat messages for completed rides older than 90 days
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

-- Can be called via pg_cron or a scheduled edge function
-- SELECT cron.schedule('archive-chat-messages', '0 3 * * 0', 'SELECT public.archive_completed_ride_messages()');
```

### ChatView Cursor-Based Pagination Refactor
```typescript
// BEFORE (current ChatView.handleLoadOlder):
const { data: olderMessages } = await supabase
  .from("chat_messages")
  .select("*")
  .eq("conversation_id", conversationId)
  .lt("created_at", oldestMessage.created_at)
  .order("created_at", { ascending: false })
  .limit(50);

// AFTER (using shared getMessages with cursor):
import { getMessages } from "@festapp/shared";
const { data: olderMessages } = await getMessages(
  supabase,
  conversationId,
  50,
  oldestMessage.created_at
);
```

## Pricing Coefficient Math

**Goal:** Suggested price = 0.80 CZK/km (BlaBlaCar-aligned).

**Current formula:** `suggestedPrice = (km / 100) * AVG_CONSUMPTION * FUEL_PRICE * COST_SHARING_FACTOR`

With `AVG_CONSUMPTION = 7 L/100km`, `FUEL_PRICE = 35 CZK/L`:
- Per-km fuel cost = `(7 * 35) / 100 = 2.45 CZK/km`
- For 0.80 CZK/km suggested: `COST_SHARING_FACTOR = 0.80 / 2.45 = 0.3265`

**Current values and their per-km rates:**
| Location | Current Factor | Per-km Rate | Status |
|----------|---------------|-------------|--------|
| `packages/shared/src/constants/pricing.ts` | 0.36 | ~0.88 CZK/km | Close but too high |
| `supabase/functions/compute-route/index.ts` | 0.60 | ~1.47 CZK/km | Way too high |
| **Target** | **~0.327** | **0.80 CZK/km** | BlaBlaCar-aligned |

**Action:** Update both to `0.327` (or adjust to a clean number that gives approximately 0.80 CZK/km). A value of `1/3` (0.333) gives 0.816 CZK/km which is also reasonable.

## Files Requiring formatPrice() Replacement

**Complete inventory of files displaying prices with inline formatting:**

| # | File | Current Pattern | Line(s) |
|---|------|----------------|---------|
| 1 | `apps/web/app/(app)/components/ride-card.tsx` | `${ride.price_czk} CZK` / `'Free'` | 141 |
| 2 | `apps/web/app/(app)/components/ride-detail.tsx` | `${ride.price_czk} CZK` / `"Free"` | 428 |
| 3 | `apps/web/app/(app)/components/ride-form.tsx` | `{routeInfo.suggestedPriceCzk} {PRICING.CURRENCY_SYMBOL}` | 552, 689 |
| 4 | `apps/web/app/(app)/components/ride-form.tsx` | `{field.value} {PRICING.CURRENCY_SYMBOL}` (slider display) | 712 |
| 5 | `apps/web/app/(app)/components/ride-form.tsx` | `{priceRange.min/max} {PRICING.CURRENCY_SYMBOL}` | 710, 715 |
| 6 | `apps/web/app/(app)/components/edit-ride-form.tsx` | (similar PRICING.CURRENCY_SYMBOL pattern) | Multiple |
| 7 | `apps/web/app/(app)/my-rides/page.tsx` | `${ride.price_czk} CZK` / `"Free"` | 369, 498 |
| 8 | `apps/web/app/(app)/search/page.tsx` | (price filtering, may need display) | 140-145 |
| 9 | `apps/web/app/(app)/events/[id]/event-detail.tsx` | `${ride.price_czk} CZK` / `"Free"` | 232 |
| 10 | `apps/web/app/(app)/routes/[id]/route-detail.tsx` | `{intent.price_czk} CZK` | 160 |
| 11 | `apps/web/app/(app)/routes/route-intent-list.tsx` | `{intent.price_czk} CZK` | 111 |
| 12 | `apps/web/app/(app)/routes/new/route-intent-form.tsx` | `{routeInfo.suggestedPriceCzk} {PRICING.CURRENCY_SYMBOL}` | 231 |
| 13 | `apps/web/app/(app)/assistant/components/intent-confirmation.tsx` | `${value} CZK` | 69 |
| 14 | `apps/web/app/(app)/impact/impact-dashboard.tsx` | `${impact?.total_money_saved_czk ?? 0} CZK` | 150 |
| 15 | `apps/web/app/(public)/ride/[shortId]/page.tsx` | `${ride.price_czk} CZK` / `"Free"` | 27, 132, 135 |
| 16 | `apps/web/app/(app)/rides/[id]/page.tsx` | `${ride.price_czk} CZK` (metadata) | 60 |
| 17 | `apps/web/app/page.tsx` | `{price} CZK` (home page ride cards) | 468 |
| 18 | `apps/web/__tests__/seo.test.ts` | `${ride.price_czk} CZK` (test assertions) | 98 |
| 19 | `apps/web/app/(app)/rides/new/recurring/page.tsx` | `Suggested: ${routeInfo.suggestedPriceCzk}` | 372 |

**Note:** Files 16 and 18 use price in metadata/SEO descriptions -- formatPrice may need a plain-text variant without special characters for OG descriptions.

## Chat Architecture Analysis

### Current State
- **Tables:** `chat_conversations` (linked to bookings), `chat_messages` (text content, read receipts)
- **Indexes:** `idx_chat_messages_conversation` on `(conversation_id, created_at)` -- **already optimal for cursor pagination**
- **Shared Query:** `getMessages()` in `packages/shared/src/queries/chat.ts` already accepts `before` cursor parameter
- **Client Issue:** `ChatView.handleLoadOlder()` bypasses the shared query and does its own inline Supabase query
- **No archival:** Messages persist indefinitely regardless of ride status

### Proposed Changes
1. **ChatView refactor:** Replace inline query with `getMessages()` from shared package (3-5 lines changed)
2. **Archival migration:** Add `archive_completed_ride_messages()` function that deletes messages for completed rides older than 90 days
3. **Archival scheduling:** Either pg_cron (if available) or a scheduled Supabase Edge Function calling the archive function weekly
4. **No new indexes needed:** Existing `idx_chat_messages_conversation` covers `WHERE conversation_id = X AND created_at < cursor ORDER BY created_at DESC`

### Pagination Verification
The `getMessages()` function returns messages ordered `created_at DESC` with `LIMIT`. When `before` is provided, it adds `.lt('created_at', before)`. This is proper cursor-based pagination. The ChatView initial load fetches 50 messages and sets `hasMore = initialMessages.length >= 50`. Subsequent loads correctly prepend older messages. The only change needed is wiring to the shared function.

## AI Edge Function Test Strategy

### Test Infrastructure
- **Location:** `supabase/__tests__/integration/ai-assistant.test.ts` (follows existing pattern)
- **Config:** `supabase/__tests__/vitest.config.ts` includes `integration/**/*.test.ts`
- **Setup:** Uses `createTestUser()` from `helpers/test-user.ts` for authenticated client
- **Invocation:** `client.functions.invoke("ai-assistant", { body: { message, conversation_history } })`

### Test Categories (TEST-11)

**Czech ride creation:**
```
"Chci nabidnout jizdu z Prahy do Brna zitra v 8:00"
Expected: intent.action = "create_ride", params has origin_address, destination_address, departure_date, departure_time
```

**Slovak ride creation:**
```
"Chcem ponuknut jazdu z Bratislavy do Kosic v piatok o 15:00"
Expected: intent.action = "create_ride", params has origin_address, destination_address
```

**English ride creation:**
```
"I want to offer a ride from Prague to Brno tomorrow at 8am"
Expected: intent.action = "create_ride", params has origin_address, destination_address
```

### Test Categories (TEST-12)

**Incomplete input:**
```
"Jedu z Prahy" (missing destination, time)
Expected: intent is null, reply contains a clarification question
```

**Ambiguous input:**
```
"Chci jet" (no details at all)
Expected: intent is null, reply asks for more information
```

**Invalid input:**
```
"asdfghjkl" (gibberish)
Expected: no crash, conversational response
```

**Non-ride intent:**
```
"Jak funguje tato aplikace?" (how does this app work)
Expected: intent is null, conversational reply
```

### Important Considerations
- **AI tests require `GOOGLE_AI_API_KEY`** to be set. Tests should skip gracefully if the key is not available (conditional `describe` or `skipIf`).
- **Rate limiting:** The AI function has a 20 req/60s limit. Space tests or use a more generous test config.
- **Non-determinism:** Assert on structure (`intent.action`, `intent.params` keys exist), not exact parameter values.
- **Timeout:** AI calls take 2-5 seconds. Set `testTimeout` appropriately (at least 15s, already configured).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `${price} CZK` string concat | `Intl.NumberFormat` with locale | Browser standard since ES2015 | Proper locale-aware formatting with symbols |
| Offset pagination for chat | Cursor-based pagination | Industry standard | Stable pagination when new messages arrive |
| No AI test coverage | Integration tests via Edge Function invocation | This phase | Regression protection for multilingual AI |

**Deprecated/outdated:**
- Using ISO code "CZK" in user-facing strings -- Czech users expect "Kc" (with hacek)
- Offset-based message loading (`.range()`) -- breaks when concurrent writes occur

## Open Questions

1. **pg_cron availability on Supabase project**
   - What we know: Supabase supports pg_cron on Pro plans
   - What's unclear: Whether this specific project has pg_cron enabled
   - Recommendation: Write the archival function as a plain SQL function. If pg_cron is available, schedule it. Otherwise, create a simple scheduled Edge Function or call it manually. The function itself is the same either way.

2. **formatPrice for OG/SEO metadata**
   - What we know: Some price displays are in `generateMetadata()` for OpenGraph descriptions (lines 60 in rides/[id]/page.tsx, line 27 in ride/[shortId]/page.tsx)
   - What's unclear: Whether `Intl.NumberFormat` with "Kc" (Unicode hacek) is safe in OG meta tags
   - Recommendation: Use formatPrice for user-facing display. For metadata/OG strings, consider a simpler format like "150 CZK" since these are consumed by crawlers, not Czech users directly. Alternatively, test that social platforms render the hacek correctly.

3. **COST_SHARING_FACTOR exact value**
   - What we know: 0.327 gives exactly 0.80 CZK/km, 0.333 (1/3) gives 0.816 CZK/km
   - What's unclear: Whether user wants exactly 0.80 or approximately 0.80
   - Recommendation: Use 0.327 for precision. The rounding (to nearest 10/50 CZK) will dominate the final price anyway, making the distinction academic for actual displayed prices.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/shared/src/constants/pricing.ts` - current COST_SHARING_FACTOR and pricing formula
- Codebase inspection: `supabase/functions/compute-route/index.ts` - server-side pricing calculation
- Codebase inspection: `supabase/functions/ai-assistant/index.ts` - AI Edge Function architecture
- Codebase inspection: `packages/shared/src/queries/chat.ts` - existing cursor-based getMessages()
- Codebase inspection: `apps/web/app/(app)/messages/components/chat-view.tsx` - current chat pagination implementation
- Codebase inspection: `supabase/__tests__/` - existing integration test infrastructure
- Codebase inspection: `apps/web/app/(app)/components/ride-form.tsx` - current price slider implementation

### Secondary (MEDIUM confidence)
- MDN Intl.NumberFormat documentation - CZK currency formatting options, maximumFractionDigits behavior
- Prior research at `.planning/research/STACK.md` and `.planning/research/PITFALLS.md` - formatPrice design and CZK decimal pitfall

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All browser built-in APIs and existing infrastructure
- Architecture: HIGH - Patterns verified by reading actual source code; getMessages() cursor support confirmed
- Pitfalls: HIGH - CZK decimal issue documented in prior research; COST_SHARING_FACTOR divergence verified in source
- AI testing: MEDIUM - Test structure is clear, but AI non-determinism means test stability requires careful assertion design

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable domain, no fast-moving dependencies)
