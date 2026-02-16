# Phase 13: Legal, Privacy & Observability - Research

**Researched:** 2026-02-16
**Domain:** Legal compliance (ToS/Privacy consent), location privacy UX, communication logging, audit trail
**Confidence:** HIGH

## Summary

Phase 13 covers four distinct areas: (1) ToS/Privacy consent at signup, (2) location sharing privacy indicator, (3) communication logging for all outbound channels, and (4) action-level audit trail with JSON diffs. The codebase is already well-prepared -- log tables (`log_emails`, `log_sms`, `log_notifications`) exist with proper schema, the `send-notification` Edge Function already logs push and email, and an `audit.record_version` table with triggers on rides/bookings/profiles/vehicles already captures row-level changes. The main work is: adding consent UI to signup flows, adding SMS logging to the `send-sms` hook, adding auth email logging to the `send-email` hook, building a global location sharing banner, and extending the audit system to capture action-level semantics with JSON diffs of changed fields.

**Primary recommendation:** Leverage the existing infrastructure heavily. The log tables and audit schema are already in place -- this phase is primarily about wiring up the remaining gaps (SMS/auth email logging, ToS checkbox, location banner) and enhancing the audit trail to store semantic action context and computed field diffs.

<user_constraints>
## User Constraints (from verbal decisions)

### Locked Decisions
- **ToS content**: Generate real, production-quality Czech legal text (not placeholder Lorem ipsum). The existing ToS and Privacy pages at `/terms` and `/privacy` already have English content that must be supplemented with proper Czech legal text.
- **Audit trail**: Action-level logging with JSON diff of changed fields (not just action names, but capture WHAT changed). This goes beyond the existing `audit.record_version` trigger which stores full `record`/`old_record` JSONB -- the enhancement should compute and store a diff of only the fields that changed.

### Claude's Discretion
- Location banner component design and positioning
- Whether to compute diffs in the trigger or in application code
- How to structure the ToS acceptance in the signup form (checkbox placement, link style)
- Whether auth email logging should be best-effort or blocking

### Deferred Ideas (OUT OF SCOPE)
- Cookie consent banner (not required for this phase)
- GDPR data export automation (existing manual export link suffices)
- Admin UI for viewing logs (Phase 12 admin panel is separate)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEGAL-01 | User must accept ToS and Privacy Policy checkbox before signup (both email and phone flows) | Web signup at `apps/web/app/(auth)/signup/page.tsx` has email+phone tabs. Mobile at `apps/mobile/app/(auth)/signup.tsx` has email only. Both need checkbox added before submit button. Checkbox state must block form submission. |
| LEGAL-02 | ToS acceptance timestamp stored (accepted_terms_at in user_metadata) | Supabase `signUp()` and `signInWithOtp()` both accept `options.data` for user_metadata. Pass `accepted_terms_at: new Date().toISOString()` at signup time. The `handle_new_user` trigger in profiles migration already reads from `raw_user_meta_data`. |
| LEGAL-03 | Location sharing shows persistent global indicator on all pages with who can see and stop button | Location sharing is managed per-ride in `ride-detail.tsx` via `useLiveLocation` hook. Need a global React context that tracks active sharing state and renders a banner in the app layout (`apps/web/app/(app)/layout.tsx`). |
| LOG-01 | Every email sent (auth + notification) logged to email_logs table | `send-notification` already logs to `log_emails` for notification emails. `send-email` (auth hook) does NOT log yet -- needs to insert into `log_emails` after sending via SES. |
| LOG-02 | Every SMS sent logged to sms_logs table | `send-sms` (auth hook) does NOT log to `log_sms` yet -- needs to insert after SNS call. The `log_sms` table already exists with proper schema. |
| LOG-03 | Every push notification sent logged to notification_logs table | Already implemented in `send-notification/index.ts` line 306. Logs to `log_notifications` with user_id, type, channel, status, ride_id, booking_id. **This requirement is already satisfied.** |
| ADMIN-07 | Action audit trail with JSON diff -- ride CRUD, booking changes, moderation actions, profile changes | `audit.record_version` already captures INSERT/UPDATE/DELETE on rides, bookings, profiles, vehicles. Enhancement needed: (1) add a `changed_fields` JSONB column that stores only the diff, (2) add `actor_id` to track WHO made the change, (3) add triggers for moderation tables (reports, user_blocks). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Auth | (project) | User metadata storage for ToS timestamp | Already in use; `options.data` in signUp/signInWithOtp stores to `raw_user_meta_data` |
| Supabase Edge Functions | (project) | SMS/email logging in auth hooks | Already in use; `send-sms` and `send-email` functions exist |
| PostgreSQL triggers | (project) | Audit trail with JSON diff computation | Already in use; `audit.fn_record_version()` exists |
| React Context | (project) | Global location sharing state | Lightweight context pattern already used for i18n (`useI18n`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | (installed) | Form validation with checkbox | Already used in signup forms for field validation |
| zod | (installed) | Schema validation with boolean field | Already used in signup form schemas |
| sonner | (installed) | Toast notifications for location banner | Already used throughout the app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL trigger for diff | Application-level diff computation | Trigger is better: happens at DB level, impossible to bypass, no application code needed |
| Global React context for location | Zustand/Jotai store | Overkill; simple context with single boolean + metadata is sufficient, matches existing i18n pattern |
| Inline Czech legal text | External CMS or Markdown files | Inline is simpler for a single-language legal page; content rarely changes |

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── migrations/
│   └── 20260217000013_legal_observability.sql  # ToS column, audit diff, logging triggers
├── functions/
│   ├── send-email/index.ts    # Add log_emails insert
│   └── send-sms/index.ts      # Add log_sms insert
apps/web/
├── app/(auth)/signup/page.tsx  # Add ToS checkbox
├── app/(public)/terms/page.tsx # Czech legal content
├── app/(public)/privacy/page.tsx # Czech legal content
├── app/(app)/
│   ├── layout.tsx              # Add LocationSharingBanner
│   ├── contexts/
│   │   └── location-sharing-context.tsx  # Global sharing state
│   └── components/
│       └── location-sharing-banner.tsx   # Persistent banner component
apps/mobile/
└── app/(auth)/signup.tsx       # Add ToS checkbox
```

### Pattern 1: ToS Consent at Signup
**What:** Add a required checkbox to both email and phone signup forms. Store acceptance timestamp in Supabase user_metadata.
**When to use:** Before any `signUp()` or `signInWithOtp()` call.
**Example:**
```typescript
// Web signup - email flow
const { error } = await supabase.auth.signUp({
  email: values.email,
  password: values.password,
  options: {
    data: {
      display_name: values.display_name,
      locale,
      accepted_terms_at: new Date().toISOString(),
    },
  },
});

// Web signup - phone flow
const { error } = await supabase.auth.signInWithOtp({
  phone: values.phone,
  options: {
    data: {
      locale,
      accepted_terms_at: new Date().toISOString(),
    },
  },
});
```

### Pattern 2: Auth Hook Logging (SMS and Email)
**What:** After sending via SNS/SES, insert a log row using Supabase REST API with service_role key.
**When to use:** In `send-sms` and `send-email` Edge Functions after the send call completes.
**Example:**
```typescript
// In send-sms/index.ts, after sendSNS() call
try {
  const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (sbUrl && sbKey) {
    await fetch(`${sbUrl}/rest/v1/log_sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        recipient_phone: user.phone,
        type: "otp",
        status: "sent",
      }),
    });
  }
} catch { /* best-effort logging */ }
```

### Pattern 3: Audit Trail with JSON Diff
**What:** Enhance the existing `audit.fn_record_version()` trigger to compute and store a `changed_fields` JSONB containing only the fields that actually changed (old value -> new value).
**When to use:** On every UPDATE to audited tables.
**Example:**
```sql
-- Add changed_fields column
ALTER TABLE audit.record_version ADD COLUMN changed_fields JSONB;
ALTER TABLE audit.record_version ADD COLUMN actor_id UUID;

-- Enhanced trigger function
CREATE OR REPLACE FUNCTION audit.fn_record_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_record_id UUID;
  v_record JSONB;
  v_old_record JSONB;
  v_changed JSONB;
  v_key TEXT;
  v_actor UUID;
BEGIN
  -- Try to get the acting user (NULL for system/service_role operations)
  BEGIN
    v_actor := (SELECT auth.uid());
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    v_record := to_jsonb(NEW);
    v_old_record := to_jsonb(OLD);
    v_record_id := (v_record->>'id')::uuid;

    -- Only log if something besides updated_at changed
    IF v_record - 'updated_at' IS DISTINCT FROM v_old_record - 'updated_at' THEN
      -- Compute diff: only fields that changed
      v_changed := '{}'::jsonb;
      FOR v_key IN SELECT jsonb_object_keys(v_record)
      LOOP
        IF v_key != 'updated_at' AND
           (v_record->v_key) IS DISTINCT FROM (v_old_record->v_key) THEN
          v_changed := v_changed || jsonb_build_object(
            v_key, jsonb_build_object(
              'old', v_old_record->v_key,
              'new', v_record->v_key
            )
          );
        END IF;
      END LOOP;

      INSERT INTO audit.record_version
        (table_name, record_id, op, record, old_record, changed_fields, actor_id)
      VALUES
        (TG_TABLE_NAME, v_record_id, 'UPDATE', v_record, v_old_record, v_changed, v_actor);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_record := to_jsonb(NEW);
    v_record_id := (v_record->>'id')::uuid;
    INSERT INTO audit.record_version (table_name, record_id, op, record, actor_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', v_record, v_actor);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_old_record := to_jsonb(OLD);
    v_record_id := (v_old_record->>'id')::uuid;
    INSERT INTO audit.record_version (table_name, record_id, op, old_record, actor_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', v_old_record, v_actor);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;
```

### Pattern 4: Global Location Sharing Banner
**What:** A React context that tracks whether the current user is actively sharing their location (via `useLiveLocation`), and a persistent banner component rendered in the app layout.
**When to use:** The banner appears on ALL authenticated pages when location sharing is active.
**Example:**
```typescript
// location-sharing-context.tsx
interface LocationSharingState {
  isSharing: boolean;
  rideId: string | null;
  passengers: string[]; // names of people who can see location
  startSharing: (rideId: string, passengers: string[]) => void;
  stopSharing: () => void;
}

// location-sharing-banner.tsx — rendered in app layout
function LocationSharingBanner() {
  const { isSharing, passengers, stopSharing } = useLocationSharing();
  if (!isSharing) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <PulsingDot />
        <span>Sharing location with {passengers.join(', ')}</span>
      </div>
      <button onClick={stopSharing}>Stop</button>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Don't store ToS acceptance only client-side:** Must be in `user_metadata` (server-side, tamper-proof). The timestamp proves when the user accepted.
- **Don't make logging blocking for auth hooks:** SMS/email auth hooks must return 200 quickly. Logging should be best-effort (try/catch, don't fail the auth flow).
- **Don't compute audit diffs in application code:** The PostgreSQL trigger approach is tamper-proof and covers ALL changes including those made by service_role, admin SQL, or other triggers.
- **Don't create separate location sharing state per component:** Use a single global context to ensure the banner appears on ALL pages consistently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON diff computation | Custom JS diff library | PostgreSQL `jsonb_object_keys` + `IS DISTINCT FROM` in trigger | DB-level is authoritative, covers all access paths |
| Persistent banner across pages | Custom DOM injection | React Context + component in layout.tsx | Standard React pattern, already proven with other banners (PendingRatingBanner, EmailConfirmationBanner, etc.) |
| ToS page Czech legal content | AI-generated placeholder | Real Czech legal text following Czech Civil Code conventions | User explicitly locked this decision |

**Key insight:** The existing codebase already has 90% of the infrastructure. This phase is about closing gaps and enhancing existing patterns, not building new systems.

## Common Pitfalls

### Pitfall 1: Social OAuth Users Bypass ToS Checkbox
**What goes wrong:** Users signing in with Google or Apple OAuth bypass the signup form entirely, never seeing the ToS checkbox.
**Why it happens:** OAuth redirects to Google/Apple and comes back with a session -- no intermediate form is shown.
**How to avoid:** Two options: (1) Show ToS checkbox before the OAuth button with a note "By continuing with Google/Apple, you accept our ToS", or (2) Check for `accepted_terms_at` in user_metadata after OAuth callback and redirect to a ToS acceptance page if missing. Option 1 is simpler and standard practice.
**Warning signs:** Test OAuth signup flow end-to-end.

### Pitfall 2: SMS Logging Creates Circular Dependency
**What goes wrong:** The `send-sms` function uses raw `fetch()` to Supabase REST API for the test OTP store. Adding logging the same way is fine, but importing the Supabase client (`createAdminClient`) could add unwanted dependencies.
**Why it happens:** The send-sms function is minimal by design (no SDK imports, just raw AWS Sig V4).
**How to avoid:** Use the same raw `fetch()` pattern already used for `_test_otp_codes` insertion. Do NOT import the Supabase client SDK.
**Warning signs:** Import size increase in the Edge Function.

### Pitfall 3: Auth.uid() Not Available in Audit Trigger for Service Role Operations
**What goes wrong:** When Edge Functions or cron jobs modify data using `service_role`, `auth.uid()` returns NULL.
**Why it happens:** Service role bypasses RLS and doesn't set a JWT claim.
**How to avoid:** Wrap `auth.uid()` in a try/catch in the trigger (already shown in the pattern above). Accept that `actor_id` will be NULL for system operations -- this is correct behavior.
**Warning signs:** All audit entries having NULL actor_id during testing (because tests use service_role).

### Pitfall 4: Location Sharing State Persists After Navigation
**What goes wrong:** User starts sharing location on ride detail page, navigates to settings, the banner should still show. If using component-local state, it's lost on navigation.
**Why it happens:** React component state is lost when the component unmounts.
**How to avoid:** Use a React context provider in the app layout that persists across route changes. Store the sharing state in the context, not in the `useLiveLocation` hook's component.
**Warning signs:** Banner disappears when navigating away from ride detail page.

### Pitfall 5: Existing Phone Users Don't Have accepted_terms_at
**What goes wrong:** Existing users who signed up before this phase won't have `accepted_terms_at` in their metadata.
**Why it happens:** The field only gets set at signup time.
**How to avoid:** This is acceptable -- the ToS requirement is for NEW signups. Existing users implicitly accepted terms by using the platform. Document this decision. Do NOT force existing users through a re-acceptance flow (out of scope).
**Warning signs:** Queries filtering on `accepted_terms_at IS NOT NULL` excluding existing users.

## Code Examples

### Example 1: ToS Checkbox in Web Signup Form
```typescript
// Add to EmailSignUpSchema
const EmailSignUpSchema = z.object({
  display_name: DisplayNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
  accepted_terms: z.literal(true, {
    errorMap: () => ({ message: t("auth.mustAcceptTerms") }),
  }),
});

// Checkbox UI (before submit button)
<label className="flex items-start gap-2">
  <input
    type="checkbox"
    {...emailForm.register("accepted_terms")}
    className="mt-1 h-4 w-4 rounded border-border text-primary"
  />
  <span className="text-xs text-text-secondary">
    {t("auth.agreeToTerms")}{" "}
    <Link href="/terms" target="_blank" className="text-primary hover:underline">
      {t("auth.termsOfService")}
    </Link>{" "}
    {t("common.and")}{" "}
    <Link href="/privacy" target="_blank" className="text-primary hover:underline">
      {t("auth.privacyPolicy")}
    </Link>
  </span>
</label>
```

### Example 2: SMS Logging in send-sms Hook
```typescript
// After sendSNS() call succeeds, log to log_sms table
// Uses same raw fetch pattern as existing _test_otp_codes insert
try {
  const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (sbUrl && sbKey) {
    await fetch(`${sbUrl}/rest/v1/log_sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        recipient_phone: user.phone,
        type: "otp",
        status: "sent",
      }),
    });
  }
} catch { /* best-effort, don't fail SMS delivery */ }
```

### Example 3: Auth Email Logging in send-email Hook
```typescript
// After sendEmail() call, log to log_emails table
// Note: send-email hook doesn't have user_id in profile sense (user may not exist yet for signup)
// Use user.id from the auth hook payload
try {
  const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (sbUrl && sbKey) {
    await fetch(`${sbUrl}/rest/v1/log_emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: user?.id ?? null,
        type: `auth_${actionType}`, // e.g., auth_signup, auth_recovery
        recipient_email: recipientEmail,
        status: sent ? "sent" : "failed",
      }),
    });
  }
} catch { /* best-effort */ }
```

### Example 4: Location Sharing Banner
```typescript
// Sticky banner at top of app layout, inspired by existing EmailConfirmationBanner pattern
export function LocationSharingBanner() {
  const { isSharing, passengerNames, stopSharing } = useLocationSharing();
  const { t } = useI18n();

  if (!isSharing) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        <span>
          {t("location.sharingWith", { names: passengerNames.join(", ") })}
        </span>
      </div>
      <button
        onClick={stopSharing}
        className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30"
      >
        {t("location.stop")}
      </button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No ToS consent tracking | Store `accepted_terms_at` in user_metadata | This phase | Enables GDPR compliance audit |
| Full row snapshot audit | JSON diff of changed fields | This phase | Much easier to see what actually changed at a glance |
| Auth emails/SMS unlogged | All outbound communications logged | This phase | Complete observability for debugging and compliance |
| Location sharing UI only on ride page | Global persistent banner | This phase | Users always know when they're sharing location |

## Existing Infrastructure Summary

This is critical context for the planner -- most of the backend already exists:

### Already Complete (DO NOT rebuild)
1. **`log_emails` table** -- exists in migration `00000000000005_notifications.sql` with columns: id, user_id, type, recipient_email, status, ride_id, booking_id, error_message, created_at
2. **`log_sms` table** -- exists with columns: id, user_id, type, recipient_phone, status, error_message, created_at
3. **`log_notifications` table** -- exists with columns: id, user_id, type, channel, status, ride_id, booking_id, error_message, created_at
4. **Push notification logging** -- already implemented in `send-notification/index.ts` (LOG-03 is DONE)
5. **Email notification logging** -- already implemented in `send-notification/index.ts` for notification emails
6. **`audit.record_version` table** -- exists with triggers on rides, bookings, profiles, vehicles
7. **ToS and Privacy pages** -- exist at `/terms` and `/privacy` with English content
8. **BRIN indexes** on all log tables for time-range scans
9. **RLS** on all log tables (admin-only read, service_role write)

### Gaps to Fill
1. **SMS logging** -- `send-sms/index.ts` does not insert into `log_sms`
2. **Auth email logging** -- `send-email/index.ts` does not insert into `log_emails`
3. **ToS checkbox** -- not present in any signup form
4. **`accepted_terms_at` metadata** -- not passed in any signUp/signInWithOtp call
5. **Location sharing banner** -- no global indicator exists
6. **Audit `changed_fields`** -- column doesn't exist yet on `audit.record_version`
7. **Audit `actor_id`** -- column doesn't exist yet on `audit.record_version`
8. **Moderation audit** -- no triggers on `reports` or `user_blocks` tables
9. **Czech ToS/Privacy content** -- pages have English text only

### Important Schema Note: log_sms.user_id is NULLABLE
The `log_sms` table has `user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL` -- note it's nullable, unlike `log_emails` and `log_notifications` where it's NOT NULL. This is important because the SMS hook fires during signup when no profile row exists yet. Auth emails have the same issue -- the `send-email` hook fires for signup confirmation before `handle_new_user` trigger creates the profile. The `log_emails.user_id` is currently NOT NULL, which will cause auth email logging to fail for signup emails. **The migration must ALTER `log_emails.user_id` to be nullable** or use the auth.users id and skip the FK constraint.

## Open Questions

1. **Czech legal text authorship**
   - What we know: User wants real production-quality Czech legal text, not placeholder
   - What's unclear: Should this be reviewed by a Czech lawyer, or is AI-generated Czech legal text acceptable for a free community platform?
   - Recommendation: Generate comprehensive Czech legal text covering the key areas (liability limitation, data processing, user responsibilities). Mark it with "Last updated: February 2026" for versioning. The user can have it reviewed later.

2. **Social OAuth ToS acceptance**
   - What we know: Google and Apple OAuth bypass the signup form
   - What's unclear: Should we block OAuth until checkbox is checked, or accept ToS implicitly with OAuth?
   - Recommendation: Add ToS checkbox above the social buttons with text like "By signing up, you agree to our ToS and Privacy Policy." The checkbox must be checked before any signup method works (including social). This is the standard pattern used by most platforms.

3. **Location banner on mobile app**
   - What we know: Mobile app exists at `apps/mobile/` with Expo Router
   - What's unclear: Does the location sharing feature work on mobile yet? The `useLiveLocation` hook is web-only (uses `navigator.geolocation`).
   - Recommendation: Implement the location banner for web only. Mobile location banner can be added when mobile catches up with live location support.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/migrations/00000000000005_notifications.sql` -- log table schemas
- Codebase analysis: `supabase/migrations/00000000000010_audit.sql` -- audit trail schema
- Codebase analysis: `supabase/functions/send-notification/index.ts` -- existing logging implementation
- Codebase analysis: `supabase/functions/send-sms/index.ts` -- SMS hook without logging
- Codebase analysis: `supabase/functions/send-email/index.ts` -- email hook without logging
- Codebase analysis: `apps/web/app/(auth)/signup/page.tsx` -- signup form structure
- Codebase analysis: `apps/web/app/(app)/layout.tsx` -- app layout with existing banners
- Codebase analysis: `apps/web/app/(app)/hooks/use-live-location.ts` -- location sharing hook
- Codebase analysis: `apps/web/app/(public)/terms/page.tsx` -- existing ToS page
- Codebase analysis: `apps/web/app/(public)/privacy/page.tsx` -- existing privacy page

### Secondary (MEDIUM confidence)
- Supabase Auth documentation: `options.data` in signUp stores to `raw_user_meta_data` -- verified by existing usage in codebase (signup passes `display_name` and `locale`)
- PostgreSQL JSONB operations: `jsonb_object_keys`, `IS DISTINCT FROM`, `jsonb_build_object` -- standard PostgreSQL functions verified in existing migration code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all existing infrastructure
- Architecture: HIGH -- patterns directly match existing codebase patterns (banners, contexts, triggers)
- Pitfalls: HIGH -- identified from direct codebase analysis (nullable FKs, OAuth bypass, service_role auth.uid)

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable -- infrastructure patterns don't change frequently)
