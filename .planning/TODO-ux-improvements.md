# UX Improvements Plan

Reported issues and improvements for ride creation, map picker, routing, pricing, and ratings.

## 1. Map Location Picker — zoom to existing selection

**Problem:** When the user opens "pick place on map" and they've already typed an address, the map should zoom to that location. Currently it may show a default view.

**Fix:** Pass the already-selected coordinates to `MapLocationPicker` as initial center/zoom. If coordinates exist, center map there at ~15 zoom level.

**Files:** `apps/web/app/(app)/components/map-location-picker.tsx`, ride form that opens it

## 2. Map Location Picker — gets stuck when choosing

**Problem:** Picking a place on the map gets stuck / doesn't respond properly.

**Investigation needed:** Debug the click handler, reverse geocoding flow, and state updates in `map-location-picker.tsx`. Check if there's a race condition or error swallowing.

**Files:** `apps/web/app/(app)/components/map-location-picker.tsx`

## 3. Route suggestions — show multiple alternatives

**Problem:** The selected route isn't necessarily the one the driver will take. Show multiple route alternatives when available (if the routing API provides them).

**Fix:** Request alternative routes from the routing API (Google Directions API supports `alternatives=true`). Display them on the map as semi-transparent alternatives the user can click to select.

**Files:** Route computation logic, ride creation map display

## 4. Editable route — add waypoints/stops

**Problem:** Users should be able to edit the route and add intermediate stops (waypoints) where they could pick up passengers.

**Fix:** Allow adding waypoints on the route. These become searchable pickup points for passengers. Store waypoints in the ride data.

**Files:** Ride creation form, route map component, ride database schema (waypoints column)

## 5. Time picker — no past times allowed

**Problem:** The time picker still shows/allows selecting times that have already passed. Only future times should be selectable.

**Fix:** Set `min` on the datetime input to current time. Filter out past time options. When date is today, disable hours/minutes that have passed.

**Files:** Ride creation form (datetime input component)

## 6. Price display — round to sensible cash amounts

**Problem:** Price shouldn't show exact CZK amounts — round to practical cash values (e.g., nearest 10 CZK or 50 CZK). When paying cash, "237 Kč" doesn't make sense — "250 Kč" does.

**Fix:** Round suggested price to nearest 10 CZK (or 50 CZK for longer trips). The slider should snap to round values.

**Files:** Price calculation logic, price slider component

## 7. Price slider — show value directly under slider

**Problem:** The price value should be displayed directly below the slider, not somewhere else on the form.

**Fix:** Move the price display label to be positioned directly under the slider handle or track.

**Files:** Price slider component in ride creation form

## 8. Suggested price too high — align with BlaBlaCar

**Problem:** Default suggested price seems too high. Should approximately match BlaBlaCar's pricing for similar routes.

**Investigation:** BlaBlaCar suggests ~0.80-1.20 CZK/km for Czech routes. Check current formula and adjust coefficient downward if needed.

**Files:** Price suggestion algorithm (distance-based calculation)

## 9. Rating display — hide stars when no rating

**Problem:** When a user has "No rating yet", the UI shows 0 stars. Should show no stars at all — just a text label like "Nové" / "Nový" or nothing.

**Fix:** In the StarRating component (or wherever ratings are displayed on ride cards/profiles), if `rating_count === 0`, don't render stars — show a "Nový" badge or no rating indicator at all.

**Files:** `apps/web/app/(app)/components/star-rating.tsx`, ride card components, profile display

## 10. Price formatting utility — locale-aware currency display

**Problem:** Prices are displayed inconsistently across the app, sometimes with raw "Kč" suffix. Need a single utility that formats all prices according to the user's locale setting.

**Fix:** Create a `formatPrice(amount: number, locale: string)` utility that uses `Intl.NumberFormat` with `style: 'currency'` and `currency: 'CZK'`. Use locale to determine format (e.g. `cs` → "250 Kč", `en` → "CZK 250"). Replace all ad-hoc price formatting with this utility.

**Files:** New utility in `apps/web/lib/utils/format-price.ts` (or shared package), then update all price displays across ride cards, ride detail, ride creation form, etc.

## 11. Language settings — allow user to change language

**Problem:** Users need a way to change the app language in settings. The i18n system supports cs/sk/en but there may not be a visible language picker in settings.

**Investigation:** Check if `apps/web/app/(app)/settings/language/page.tsx` exists and works. If not, create a language settings page with radio buttons for Czech, Slovak, English. The i18n provider already supports `setLocale()` and persists to localStorage.

**Files:** `apps/web/app/(app)/settings/language/page.tsx`, settings page navigation

## 12. Hide "Money Saved" display

**Problem:** "Money Saved" metric shouldn't be shown (or is showing incorrectly).

**Fix:** Remove or hide the "Money Saved" display from wherever it appears (impact dashboard, community stats, etc.).

**Files:** `apps/web/app/(app)/impact/impact-dashboard.tsx`, `apps/web/app/(app)/community/community-stats.tsx`

## 13. Messenger — messages appear twice (duplicate bug)

**Problem:** When sending a message in chat, it appears twice in the conversation.

**Investigation:** Likely a race condition between optimistic local insert and Realtime subscription delivering the same message. The dedup logic (matching by client-side UUID) may not be working correctly. Check `ChatView` component's message handling — the optimistic message and the Realtime INSERT event need to be deduplicated by message ID.

**Files:** Chat view component, Realtime subscription handler, message sending logic

## 14. Terms of Service acceptance at signup

**Problem:** Users should agree to Terms of Service and Privacy Policy before creating an account. This is a legal requirement and standard practice.

**Fix:** Add a checkbox to the signup form (both email and phone flows):
- "Souhlasím s [obchodními podmínkami](/terms) a [zásadami ochrany osobních údajů](/privacy)"
- Checkbox must be checked before the submit button is enabled
- Store `accepted_terms_at` timestamp in `user_metadata` for audit trail
- Translate the label to cs/sk/en via i18n

**Files:** `apps/web/app/(auth)/signup/page.tsx`, translations

## 15. Cookie consent banner — translate to user's locale

**Problem:** Cookie consent banner (`components/cookie-consent.tsx`) has hardcoded English text ("We use cookies for analytics..."). Should use i18n translations like everything else.

**Note:** The banner is technically optional since the app only uses first-party anonymous analytics with no third-party trackers. But keeping it is good practice. Just needs translation.

**Fix:** Import `useI18n` and replace hardcoded strings with `t()` calls. Add translation keys for the banner text, Accept, and Decline buttons.

**Files:** `apps/web/components/cookie-consent.tsx`, `apps/web/lib/i18n/translations.ts`

## 16. Complete i18n coverage — translate all remaining hardcoded strings

**Problem:** 171 hardcoded user-facing strings across 19 files still need i18n translation.

**Fix:** Add ~171 new translation keys to `apps/web/lib/i18n/translations.ts` (cs/sk/en) and replace all hardcoded strings with `t('key')` calls.

### Audit results by file (171 strings total):

**High priority (core user flows):**

| File | Strings | Key examples |
|------|---------|-------------|
| `(app)/components/ride-detail.tsx` | 48 | "Trip Details", "Price", "Free", "Driver", "Vehicle", "Preferences", "Smoking allowed", "Pets welcome", "Music on", "Chatty", "Booking", "seats available", "Cancel Booking", "Complete Ride", "Edit Ride", "Rate this ride", error messages |
| `(app)/my-rides/page.tsx` | 26 | "My Rides", "As Driver", "As Passenger", "Upcoming", "Past", "No upcoming rides", "Post a Ride", "Search for a Ride", booking status labels (Pending/Confirmed/Cancelled/Completed) |
| `(app)/components/booking-button.tsx` | 12 | "Request pending", "Fully booked", "Book N seats", "Request N seats", "Processing...", "Seat booked!", "Request sent!", error messages |
| `(app)/components/rating-modal.tsx` | 11 | "Rate your ride with {name}", "How was your experience?", "Comment (optional)", "Submit Rating", error/success messages |
| `(app)/components/cancellation-dialog.tsx` | 9 | "Cancel Booking"/"Cancel Ride", "Reason (optional)", "Confirm Cancellation", warning text |
| `(public)/ride/[shortId]/page.tsx` | 9 | "Departure at", "CZK", "Free", "seats left", "Book this ride", "New driver", "Notes" |
| `(app)/components/report-dialog.tsx` | 8 | "Report {name}", description label, "Submit Report", validation messages |
| `(app)/settings/page.tsx` | 8 | share text, error messages, "AI" label |

**Medium priority (secondary UI):**

| File | Strings | Key examples |
|------|---------|-------------|
| `(app)/components/block-button.tsx` | 5 | "Block"/"Unblock", confirmation dialog text |
| `(app)/components/ride-card.tsx` | 4 | "seats left", "Free", "Instant"/"Request", "km from pickup" |
| `(auth)/login/page.tsx` | 4 | "Google"/"Apple" labels, social auth error messages |
| `(auth)/signup/page.tsx` | 4 | "Google"/"Apple" labels, social auth error messages |
| `components/cookie-consent.tsx` | 3 | banner text, "Accept", "Decline" |
| `components/force-update-banner.tsx` | 3 | "A new version is available", "Refresh", "Dismiss" |
| `(app)/components/pwa-install-banner.tsx` | 3 | "Install Rideshare on your phone", "Install" |

**Low priority (minor):**

| File | Strings | Key examples |
|------|---------|-------------|
| `components/offline-banner.tsx` | 2 | "You're offline" |
| `(app)/components/share-button.tsx` | 2 | "Copied!"/"Share" |
| `(app)/components/pending-rating-banner.tsx` | 2 | "You have N rides to rate", "Rate now" |
| `app/not-found.tsx` | 2 | "This page doesn't exist", "Go to home" |
| `(auth)/reset-password/page.tsx` | 1 | "Hesla se neshodují" (hardcoded Czech!) |

### Implementation approach:
- Work file by file, starting with highest-string-count files
- Add translation keys grouped by component (e.g. `ride.tripDetails`, `ride.price`, `booking.requestPending`)
- For each file: add keys to translations.ts (cs/sk/en), then replace hardcoded strings with `t()` calls
- ~171 keys × 3 locales = ~513 translation entries total

## 17. AI ride creation not working — natural language input doesn't fill form

**Problem:** The AI input field on the ride creation page doesn't work. User types "z ostravy do brna zitra v 8" and nothing happens — the form fields (Odkud, Kam, date, time) remain empty. This is a core AI feature that should parse natural language and pre-fill the ride form.

**Investigation needed:**
- Check AI Edge Function (`supabase/functions/ai-assistant/`) — is it deployed and responding?
- Check the AI input component on ride creation page — does it call the edge function?
- Check the response parsing — does it extract origin, destination, date, time correctly?
- Check if the AI response is wired to set form field values
- Check browser console for errors when submitting AI input
- Test the edge function directly via curl

**Files:** AI input component on ride form, `supabase/functions/ai-assistant/index.ts`, ride creation page AI integration

## 18. Integration tests for AI functionality

**Problem:** AI features lack integration tests. Basic functionality like natural language ride creation should be tested to catch regressions.

**Fix:** Add integration tests to `packages/integration-tests/` or `packages/production-tests/` covering:
- AI Edge Function responds to ride creation intent ("z Prahy do Brna zítra v 10")
- AI correctly parses origin, destination, date, time from Czech text
- AI correctly parses from Slovak and English text
- AI handles ambiguous/incomplete inputs gracefully
- AI handles invalid/nonsensical inputs without crashing
- MCP server tools respond correctly (if deployed)

**Files:** New test file in `packages/production-tests/src/tests/ai.test.ts` or `packages/integration-tests/src/tests/ai.test.ts`

## 19. Live location sharing — persistent global indicator

**Problem:** When a driver shares their live location, there's no clear persistent indicator visible across the app. The user needs to know at all times:
1. That location sharing is currently active
2. Who exactly can see their location (which passengers/bookings)

**Fix:** Create a global "location sharing active" banner/indicator that:
- Is visible on ALL pages while location sharing is active (not just ride detail)
- Shows clearly who can see the location (e.g. "Your location is visible to: Jan K., Marie P.")
- Provides a quick way to stop sharing
- Uses a prominent style (e.g. a sticky top banner with a pulsing dot, or a floating pill/chip)
- Persists across navigation — lives in the app layout, not individual pages

**Possible implementation:** A `<LocationSharingBanner />` component in the app layout (`apps/web/app/(app)/layout.tsx`) that:
- Subscribes to a global "sharing active" state (context or store)
- Shows a fixed/sticky banner at the top: `🔴 Sdílíte polohu • Viditelné pro: Jan K., Marie P. • [Zastavit]`
- Pulsing red dot animation to draw attention
- Collapses to a small pill when scrolling (optional)
- Translated via i18n (cs/sk/en)

**Files:** New component + app layout integration, location sharing hook/context, i18n translations

## 20. Email/SMS/Notification logging — audit trail for all outbound comms

**Problem:** No logs are kept when emails, SMS, or push notifications are sent. There's no way to debug delivery failures or audit what was sent to whom.

**Fix:** Create `email_logs`, `sms_logs`, and `notification_logs` tables. Log every send attempt from `send-email`, `send-sms`, and `send-notification` Edge Functions with recipient, type, status (success/failure), and timestamp.

**Files:** New migration for log tables, `supabase/functions/send-email/index.ts`, `supabase/functions/send-sms/index.ts`, `supabase/functions/send-notification/index.ts`

## 21. Admin setup — set bujnmi@gmail.com as admin

**Problem:** Admin role is determined by `app_metadata.is_admin` (set in `is_admin()` SQL function), but there's no documented way to assign it. Need to set the admin flag for bujnmi@gmail.com.

**Fix:** Create a migration or use Supabase dashboard to set `app_metadata.is_admin = true` for the user with email bujnmi@gmail.com. Document the admin assignment process.

**Files:** New migration or manual Supabase dashboard action

## 22. Action audit trail — log all significant actions

**Problem:** No history of user/admin actions. Need an audit trail for ride CRUD, booking changes, moderation actions, profile changes — for debugging and compliance.

**Fix:** Create `audit_log` table with `actor_id`, `action`, `entity_type`, `entity_id`, `details (JSONB)`, `created_at`. Add triggers or RPC logging for significant actions.

**Files:** New migration for audit_log table, possibly triggers on key tables

## 23. Chat messages optimization — storage efficiency

**Problem:** Chat messages could grow very large over time. Need pagination strategy and possibly archival for completed rides.

**Investigation:** Check current chat_messages schema. Consider: cursor-based pagination (not offset), message archival/cleanup for rides older than N months, TOAST compression for content column, partitioning by date.

**Files:** `supabase/migrations/00000000000004_chat.sql`, chat view component, chat RPCs

## Priority Order

1. **#17** AI ride creation not working (bug — core feature broken)
2. **#13** Messenger duplicate messages (bug — core feature broken)
3. **#2** Map picker stuck (bug — blocks usage)
4. **#5** No past times (bug — data quality)
5. **#21** Admin setup — set bujnmi@gmail.com as admin (operational)
6. **#14** Terms acceptance at signup (legal requirement)
7. **#19** Location sharing global indicator (privacy/UX — must be visible everywhere)
8. **#20** Email/SMS/Notification logging (observability)
9. **#22** Action audit trail (compliance/debugging)
10. **#23** Chat messages optimization (storage efficiency)
11. **#18** Integration tests for AI (test coverage)
12. **#10** Price formatting utility (foundation for #6, #7, #8)
13. **#16** Complete i18n coverage (171 strings across 19 files)
14. **#15** Cookie consent translation
15. **#1** Map zoom to selection (UX improvement)
16. **#9** Hide empty stars (visual fix)
17. **#11** Language settings (UX — may already exist)
18. **#12** Hide Money Saved (visual fix)
19. **#6** Round prices for cash (UX improvement)
20. **#7** Price under slider (UI layout)
21. **#8** Lower suggested price (tuning)
22. **#3** Multiple route alternatives (feature — DEFERRED to v1.2, mutually exclusive with waypoints in Google API)
23. **#4** Editable route with waypoints (feature — largest scope)
