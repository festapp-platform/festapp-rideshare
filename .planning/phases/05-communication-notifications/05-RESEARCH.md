# Phase 5: Communication & Notifications - Research

**Researched:** 2026-02-15
**Domain:** Real-time chat, push notifications (OneSignal), email notifications (AWS SES), notification preferences
**Confidence:** HIGH

## Summary

Phase 5 adds two major subsystems: (1) persistent 1:1 chat between drivers and passengers after booking, and (2) a multi-channel notification system covering push (OneSignal), email (AWS SES), and in-app alerts. The key architectural decision is the chat persistence pattern: the roadmap says "Supabase Broadcast" but Broadcast is ephemeral (messages auto-delete after 3 days from `realtime.messages`). **The correct pattern is: store messages in a custom `chat_messages` table, then use Supabase Realtime Postgres Changes to push new messages to connected clients in real-time.** This gives us permanent history, RLS-protected access, and real-time delivery.

For push notifications, OneSignal provides SDKs for both Expo (react-native-onesignal v5.3.1 + onesignal-expo-plugin) and web (react-onesignal v3.x). The link between Supabase users and OneSignal is via `OneSignal.login(supabase_user_id)` which sets the `external_id` alias. Notification triggers fire from Supabase Edge Functions (or database webhooks) that call OneSignal's REST API. For email, AWS SES can be called directly via the AWS SDK v3 (`npm:@aws-sdk/client-sesv2`) from Supabase Edge Functions, though signing requests is complex -- using SMTP via Nodemailer or the SES v2 SDK via `npm:` specifier is the pragmatic path.

The notification preference system needs a `notification_preferences` table storing per-user toggles for each notification category (push and email independently). All notification-sending Edge Functions check preferences before dispatching.

**Primary recommendation:** Use database-persisted chat with Realtime Postgres Changes for live updates, Broadcast only for ephemeral signals (typing indicators). Use a single `send-notification` Edge Function as the central dispatch for all push/email notifications, checking preferences before sending.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.95 | Chat CRUD, Realtime subscriptions, RPC calls | Already in use |
| react-native-onesignal | ^5.3.1 | Mobile push notifications (Expo) | Official OneSignal SDK for React Native |
| onesignal-expo-plugin | latest | Expo config plugin for OneSignal native setup | Official Expo plugin, handles native code generation |
| react-onesignal | ^3.0 | Web push notifications (Next.js) | Official OneSignal web SDK |
| @aws-sdk/client-sesv2 | ^3.x | Email sending from Edge Functions | AWS SDK v3, works via npm: specifier in Deno |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.24 | Chat message validation schemas | Already installed, use for all input validation |
| date-fns | ^4.1 | Formatting timestamps in chat UI, reminder calculations | Already installed |
| sonner | ^2.0 | Toast notifications on web for in-app alerts | Already installed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Postgres Changes for chat | Supabase Broadcast only | Broadcast is ephemeral (3-day retention), no permanent history -- NOT acceptable for chat |
| OneSignal | Expo Push + FCM directly | More setup, no unified dashboard, no web push -- OneSignal is already decided |
| AWS SES SDK | SMTP via Nodemailer | SMTP ports 25/587 blocked on Deno Deploy; must use port 2587 for SES SMTP. SDK is cleaner |
| AWS SES | Resend | Resend is Supabase's recommended partner but project already decided on AWS SES |
| Custom notification dispatch | Supabase Database Webhooks only | Webhooks alone can't check preferences or compose messages; Edge Function needed |

**Installation:**
```bash
# Mobile (Expo)
cd apps/mobile && npx expo install onesignal-expo-plugin react-native-onesignal

# Web (Next.js)
cd apps/web && pnpm add react-onesignal

# No new packages needed for shared or supabase (Edge Functions use npm: specifiers)
```

## Architecture Patterns

### New Database Schema

```sql
-- ============================================================
-- Chat conversations: one per booking (driver <-> passenger)
-- ============================================================
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id),
  passenger_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Chat messages: persistent message storage
-- ============================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  -- For contact sharing (CHAT-03)
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'phone_share')),
  read_at TIMESTAMPTZ,          -- null = unread (for read receipts CHAT-02)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_unread ON public.chat_messages(conversation_id, read_at) WHERE read_at IS NULL;

-- ============================================================
-- Notification preferences: per-user toggles
-- ============================================================
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Push notification categories
  push_booking_requests BOOLEAN NOT NULL DEFAULT true,
  push_booking_confirmations BOOLEAN NOT NULL DEFAULT true,
  push_booking_cancellations BOOLEAN NOT NULL DEFAULT true,
  push_new_messages BOOLEAN NOT NULL DEFAULT true,
  push_ride_reminders BOOLEAN NOT NULL DEFAULT true,
  push_route_alerts BOOLEAN NOT NULL DEFAULT true,
  -- Email notification categories
  email_booking_confirmations BOOLEAN NOT NULL DEFAULT true,
  email_ride_reminders BOOLEAN NOT NULL DEFAULT true,
  email_cancellations BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Route alerts: extend favorite_routes for push alerts (SRCH-09)
-- ============================================================
ALTER TABLE public.favorite_routes
  ADD COLUMN alert_enabled BOOLEAN NOT NULL DEFAULT false;
```

### Pattern 1: Persistent Chat with Realtime Subscriptions

**What:** Store messages in `chat_messages` table, subscribe to Postgres Changes for live updates. Use Broadcast channel for typing indicators only (ephemeral).
**When to use:** All chat functionality.
**Why:** Messages persist permanently, RLS controls access, Realtime delivers instantly.

```typescript
// Subscribe to new messages in a conversation
const channel = supabase
  .channel(`chat-${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      // Add new message to local state
      addMessage(payload.new as ChatMessage);
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      // Handle read receipt updates
      updateMessage(payload.new as ChatMessage);
    }
  )
  .subscribe();
```

### Pattern 2: Typing Indicators via Broadcast (Ephemeral)

**What:** Use Supabase Broadcast for typing indicators -- no persistence needed.
**When to use:** Typing indicator signals only.

```typescript
// Send typing indicator
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { user_id: currentUserId, is_typing: true },
});

// Listen for typing
channel.on('broadcast', { event: 'typing' }, (payload) => {
  setOtherUserTyping(payload.payload.is_typing);
});
```

### Pattern 3: Centralized Notification Dispatch Edge Function

**What:** A single `send-notification` Edge Function that handles all notification types (push + email), checks user preferences, and dispatches accordingly.
**When to use:** Every notification event in the system.
**Why:** Single point for preference checking, rate limiting, and logging.

```typescript
// supabase/functions/send-notification/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

interface NotificationPayload {
  user_id: string;
  type: 'booking_request' | 'booking_confirmation' | 'booking_cancellation'
    | 'new_message' | 'ride_reminder' | 'route_alert';
  title: string;
  body: string;
  data?: Record<string, string>; // deep link data
  // Email-specific
  email_subject?: string;
  email_html?: string;
}

Deno.serve(async (req) => {
  const payload: NotificationPayload = await req.json();

  // 1. Fetch user preferences
  const prefs = await getNotificationPreferences(payload.user_id);

  // 2. Send push if enabled for this type
  if (shouldSendPush(prefs, payload.type)) {
    await sendOneSignalPush(payload);
  }

  // 3. Send email if enabled for this type and email content provided
  if (payload.email_html && shouldSendEmail(prefs, payload.type)) {
    await sendSesEmail(payload);
  }

  return new Response(JSON.stringify({ success: true }));
});
```

### Pattern 4: OneSignal User Linking

**What:** Link OneSignal device to Supabase user via `OneSignal.login(userId)` on auth state change.
**When to use:** On every app launch / auth state change.

```typescript
// Mobile (Expo) - in _layout.tsx or auth provider
import { OneSignal } from 'react-native-onesignal';

// Initialize once at app start
OneSignal.initialize(ONESIGNAL_APP_ID);

// On auth state change
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    OneSignal.login(session.user.id); // Links device to Supabase user
  } else {
    OneSignal.logout(); // Unlinks device
  }
});
```

```typescript
// Web (Next.js) - in layout or auth provider
import OneSignal from 'react-onesignal';

// Initialize once (client-side only)
await OneSignal.init({ appId: ONESIGNAL_APP_ID });

// On login
OneSignal.login(user.id);
```

### Pattern 5: Database Webhook for Notification Triggers

**What:** Use Supabase Database Webhooks to trigger the `send-notification` Edge Function when certain table changes occur (e.g., new booking inserted).
**When to use:** Automated notification triggers that don't originate from client actions.

```sql
-- Trigger notification on new booking
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://xamctptqmpruhovhjcgm.supabase.co/functions/v1/send-notification',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer SERVICE_ROLE_KEY"}',
    '{}',
    '5000'
  );
```

**Alternative approach:** Call the Edge Function directly from the booking RPC functions. This is simpler and avoids webhook configuration complexity. Since all booking mutations go through SECURITY DEFINER RPCs, the RPC can use `pg_net` to call the Edge Function after a successful mutation.

### Pattern 6: Ride Reminder via pg_cron

**What:** A scheduled job that checks for rides departing within 1 hour and sends reminder notifications.
**When to use:** NOTF-07 ride reminders.

```sql
-- Cron job: every 15 minutes, find rides departing in ~1 hour
SELECT cron.schedule(
  'ride-reminders',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://xamctptqmpruhovhjcgm.supabase.co/functions/v1/send-ride-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

### Recommended Project Structure

```
supabase/
├── functions/
│   ├── send-notification/       # Central notification dispatch
│   │   └── index.ts
│   ├── send-ride-reminders/     # Cron-triggered reminder job
│   │   └── index.ts
│   └── _shared/
│       ├── onesignal.ts         # OneSignal REST API helper
│       ├── ses.ts               # AWS SES email helper
│       └── notifications.ts     # Preference checking logic
├── migrations/
│   ├── 00000000000022_chat.sql
│   ├── 00000000000023_notification_preferences.sql
│   ├── 00000000000024_route_alerts.sql
│   └── 00000000000025_notification_triggers.sql

packages/shared/src/
├── validation/
│   ├── chat.ts                  # ChatMessage, SendMessage schemas
│   └── notification.ts          # NotificationPreferences schema
├── constants/
│   └── notifications.ts         # Notification type enums, category mappings
└── queries/
    └── chat.ts                  # getConversations, getMessages, etc.

apps/web/app/(app)/
├── messages/
│   ├── page.tsx                 # Conversation list (replace placeholder)
│   └── [conversationId]/
│       └── page.tsx             # Chat detail view
└── settings/
    └── notifications/
        └── page.tsx             # Notification preferences UI

apps/mobile/app/
├── messages/
│   ├── index.tsx                # Conversation list
│   └── [conversationId].tsx     # Chat detail view
└── settings/
    └── notifications.tsx        # Notification preferences UI
```

### Anti-Patterns to Avoid

- **Using Broadcast for persistent chat:** Broadcast messages are deleted after 3 days. Chat messages MUST be stored in a custom table.
- **Storing push tokens in your database:** OneSignal manages device tokens. Use `OneSignal.login(userId)` to link, then target by `external_id` via REST API. No need for a `push_tokens` table.
- **Sending notifications synchronously in RPCs:** Never block a booking RPC waiting for OneSignal/SES response. Use `pg_net` for async HTTP or trigger via webhook.
- **Checking preferences client-side:** Always check notification preferences server-side in the Edge Function. Client-side checks can be bypassed and add latency.
- **One Edge Function per notification type:** Creates maintenance overhead. Use a single dispatch function with a `type` parameter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notification delivery | Custom FCM/APNs integration | OneSignal REST API | Token management, delivery receipts, retry logic, web+mobile in one |
| Real-time message delivery | Custom WebSocket server | Supabase Realtime Postgres Changes | Already have Supabase, handles auth, reconnection, multiplexing |
| Typing indicators | Database polling or custom WS | Supabase Realtime Broadcast | Built-in, ephemeral, no storage overhead |
| Email sending | Raw SES HTTP with SigV4 signing | `@aws-sdk/client-sesv2` via npm: | SigV4 signing is extremely complex to hand-roll |
| Email templates | String concatenation | HTML template strings with variables | Keep it simple but structured |
| Scheduled reminders | setInterval in Edge Function | pg_cron + Edge Function | Cron is already used for ride expiry, reliable and serverless |
| Unread message counts | Client-side counting | PostgreSQL COUNT with RLS | Accurate, real-time via subscription |

## Common Pitfalls

### Pitfall 1: Supabase Realtime Requires Publication Configuration

**What goes wrong:** Subscribe to Postgres Changes on `chat_messages` but never receive events.
**Why it happens:** Supabase Realtime only listens to tables added to the `supabase_realtime` publication.
**How to avoid:** Add the table to the publication in the migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
```
**Warning signs:** Subscriptions connect successfully but callbacks never fire.

### Pitfall 2: OneSignal SDK Compatibility Issues in Deno

**What goes wrong:** Importing `@onesignal/node-onesignal` SDK in Edge Functions throws TypeError.
**Why it happens:** The OneSignal Node SDK has known compatibility issues with Deno runtime.
**How to avoid:** Use the OneSignal REST API directly with `fetch()` instead of the SDK:
```typescript
const response = await fetch('https://api.onesignal.com/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
  },
  body: JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: [userId] },
    target_channel: 'push',
    headings: { en: title },
    contents: { en: body },
    data: deepLinkData,
  }),
});
```
**Warning signs:** Edge Function deploys fine but throws at runtime.

### Pitfall 3: SMTP Ports Blocked on Deno Deploy

**What goes wrong:** AWS SES SMTP connection fails from Supabase Edge Functions.
**Why it happens:** Deno Deploy blocks outgoing connections on ports 25 and 587.
**How to avoid:** Use the AWS SES v2 REST API via `npm:@aws-sdk/client-sesv2` instead of SMTP. Or use port 2587 if SMTP is required.
```typescript
import { SESv2Client, SendEmailCommand } from 'npm:@aws-sdk/client-sesv2';

const ses = new SESv2Client({
  region: 'eu-north-1', // or your SES region
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
  },
});
```
**Warning signs:** Connection timeout errors in Edge Function logs.

### Pitfall 4: Race Condition on Conversation Creation

**What goes wrong:** Two users simultaneously open chat after booking, creating duplicate conversations.
**Why it happens:** No unique constraint or atomic creation.
**How to avoid:** The `UNIQUE (booking_id)` constraint on `chat_conversations` prevents duplicates. Use `INSERT ... ON CONFLICT DO NOTHING RETURNING *` or create conversation atomically when booking is confirmed (in the booking RPC).

### Pitfall 5: OneSignal Web Push Requires HTTPS and Service Worker

**What goes wrong:** Web push notifications don't work in development.
**Why it happens:** Web Push requires HTTPS and a registered service worker. OneSignal provides `OneSignalSDKWorker.js` that must be served from the root.
**How to avoid:** Place `OneSignalSDKWorker.js` in `apps/web/public/`. During development, test on mobile or use OneSignal's test device feature.
**Warning signs:** "Permission denied" or silent failures in browser console.

### Pitfall 6: Chat Message Ordering with Optimistic Updates

**What goes wrong:** Messages appear out of order when using optimistic UI updates + Realtime subscription.
**Why it happens:** Optimistic insert adds message to local state, then Realtime subscription also delivers it, causing duplicates or reordering.
**How to avoid:** Use message `id` (UUID generated client-side) for deduplication. When Realtime delivers a message with an ID already in local state, update the existing entry (mark as "sent") rather than adding a duplicate.

### Pitfall 7: Notification Preferences Default Row Missing

**What goes wrong:** Edge Function tries to check preferences for a user who has never visited settings.
**Why it happens:** No row exists in `notification_preferences` yet.
**How to avoid:** Use `COALESCE` with defaults, or create a default preferences row when the profile is created (trigger), or handle NULL as "all enabled" in the Edge Function.

## Code Examples

### Sending a Chat Message (RPC)

```sql
-- Source: Custom RPC following project's SECURITY DEFINER pattern
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_message_id UUID;
  v_conv RECORD;
BEGIN
  -- Verify sender is participant in conversation
  SELECT * INTO v_conv FROM public.chat_conversations
  WHERE id = p_conversation_id
    AND (driver_id = v_sender_id OR passenger_id = v_sender_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  -- Validate content
  IF char_length(p_content) < 1 OR char_length(p_content) > 2000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 2000 characters';
  END IF;

  -- Insert message
  INSERT INTO public.chat_messages (conversation_id, sender_id, content, message_type)
  VALUES (p_conversation_id, v_sender_id, p_content, p_message_type)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;
```

### Mark Messages as Read (RPC)

```sql
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_conversation_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Only mark messages sent by the OTHER user as read
  UPDATE public.chat_messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != v_user_id
    AND read_at IS NULL;
END;
$$;
```

### OneSignal REST API Helper (Edge Function)

```typescript
// supabase/functions/_shared/onesignal.ts
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

interface PushPayload {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
}

export async function sendPush(payload: PushPayload): Promise<boolean> {
  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: payload.userIds },
      target_channel: 'push',
      headings: { en: payload.title },
      contents: { en: payload.body },
      data: payload.data,
      url: payload.url,
    }),
  });

  return response.ok;
}
```

### AWS SES Email Helper (Edge Function)

```typescript
// supabase/functions/_shared/ses.ts
import { SESv2Client, SendEmailCommand } from 'npm:@aws-sdk/client-sesv2';

const ses = new SESv2Client({
  region: Deno.env.get('AWS_SES_REGION') || 'eu-north-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
  },
});

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const command = new SendEmailCommand({
    FromEmailAddress: Deno.env.get('SES_FROM_EMAIL')!,
    Destination: {
      ToAddresses: [payload.to],
    },
    Content: {
      Simple: {
        Subject: { Data: payload.subject },
        Body: { Html: { Data: payload.html } },
      },
    },
  });

  const result = await ses.send(command);
  return result.$metadata.httpStatusCode === 200;
}
```

### Conversation List Query

```typescript
// packages/shared/src/queries/chat.ts
export function getConversationsForUser(
  supabase: SupabaseClient,
  userId: string
) {
  return supabase
    .from('chat_conversations')
    .select(`
      id,
      booking_id,
      ride_id,
      driver_id,
      passenger_id,
      created_at,
      rides!inner (
        origin_address,
        destination_address,
        departure_time
      ),
      profiles!chat_conversations_driver_id_fkey (
        display_name, avatar_url
      ),
      profiles!chat_conversations_passenger_id_fkey (
        display_name, avatar_url
      )
    `)
    .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)
    .order('created_at', { ascending: false });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OneSignal `setExternalUserId()` | `OneSignal.login(externalId)` | SDK v5.0 (2023) | v5 uses User Model; login() is the only way to link users |
| OneSignal `include_external_user_ids` | `include_aliases: { external_id: [...] }` | API v2 | Old field deprecated, use aliases |
| Supabase Realtime only Broadcast | Broadcast + Postgres Changes + Presence | 2024 | Three distinct primitives, each for different use cases |
| AWS SES v1 API | SES v2 (`@aws-sdk/client-sesv2`) | 2023 | v2 has simpler API, JSON-based (not XML) |

**Deprecated/outdated:**
- `OneSignal.setExternalUserId()`: Removed in SDK v5. Use `OneSignal.login()`.
- `include_external_user_ids` in REST API: Deprecated. Use `include_aliases` with `external_id`.
- `@onesignal/node-onesignal` SDK in Deno: Known runtime issues. Use raw `fetch()` to REST API.

## Open Questions

1. **OneSignal App Configuration**
   - What we know: Need a OneSignal account, app ID, REST API key, and platform credentials (FCM key, APNs cert)
   - What's unclear: Whether the OneSignal account and app are already created
   - Recommendation: Create OneSignal app as first task, store credentials as Supabase secrets

2. **AWS SES Verified Sender**
   - What we know: SES requires a verified sender email/domain; new accounts are in sandbox mode
   - What's unclear: Whether SES is already configured and out of sandbox
   - Recommendation: Verify sending domain, request production access if needed. Use existing AWS credentials from the SNS setup.

3. **Email Template Complexity**
   - What we know: Need templates for booking confirmation, ride reminder, cancellation
   - What's unclear: Whether to use simple HTML strings or a template engine
   - Recommendation: Start with simple HTML template strings with variable interpolation. No template engine needed for 3-4 templates.

4. **Chat Conversation Creation Timing**
   - What we know: Chat is available "after booking is confirmed"
   - What's unclear: Create conversation eagerly (when booking confirms) or lazily (when first message is sent)?
   - Recommendation: Create conversation in the booking confirmation RPC (eager). This simplifies the chat UI -- conversations always exist for confirmed bookings.

5. **Unread Message Badge Count**
   - What we know: Need to show unread count in navigation
   - What's unclear: Whether to use a Realtime subscription on unread count or poll periodically
   - Recommendation: Use a Realtime subscription on `chat_messages` filtered by `read_at IS NULL` and `sender_id != current_user`. Subscribe once at app level.

## Sources

### Primary (HIGH confidence)
- Supabase Realtime Broadcast docs - https://supabase.com/docs/guides/realtime/broadcast - Confirmed Broadcast is ephemeral, 3-day retention
- Supabase Database Webhooks docs - https://supabase.com/docs/guides/database/webhooks - Webhook trigger syntax and payload format
- OneSignal Expo Plugin GitHub - https://github.com/OneSignal/onesignal-expo-plugin - Installation, config, initialization
- react-native-onesignal GitHub - https://github.com/OneSignal/react-native-onesignal - v5.3.1, login() API
- OneSignal-Supabase sample integration - https://github.com/OneSignalDevelopers/onesignal-supabase-sample-integration-supabase - REST API pattern from Edge Functions
- Supabase sending emails docs - https://supabase.com/docs/guides/functions/examples/send-emails - Edge Function email pattern
- Supabase push notifications docs - https://supabase.com/docs/guides/functions/examples/push-notifications - Edge Function push pattern

### Secondary (MEDIUM confidence)
- Supabase Realtime Chat UI component - https://supabase.com/ui/docs/nextjs/realtime-chat - Confirms Broadcast+onMessage pattern for persistence
- OneSignal REST API `include_aliases` pattern - Verified via multiple GitHub issues and community sources
- AWS SDK v3 Deno compatibility - https://deno.com/npm/package/aws-sdk - npm: specifier works in Deno Deploy

### Tertiary (LOW confidence)
- SMTP port 2587 for SES on Deno Deploy - Single source mention in Supabase docs, needs validation if SMTP approach is used (recommendation: use SDK instead)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified with official sources, versions confirmed
- Architecture (chat): HIGH - Postgres Changes for persistence is well-documented pattern; Broadcast ephemeral nature confirmed
- Architecture (notifications): HIGH - OneSignal REST API well-documented; Edge Function pattern established in project
- Pitfalls: HIGH - Based on official docs, known issues, and established project patterns

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable ecosystem, no major changes expected)
