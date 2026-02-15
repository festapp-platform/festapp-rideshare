/**
 * OneSignal REST API push notification helper.
 *
 * Uses fetch() directly (NOT the @onesignal/node-onesignal SDK which has
 * Deno compatibility issues). Targets users by external_id alias (Supabase
 * user UUID set via OneSignal.login() on client).
 *
 * Required env vars: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY
 * Graceful degradation: logs warning and returns false if env vars missing.
 */

export interface PushPayload {
  userIds: string[]; // Supabase user UUIDs (external_id in OneSignal)
  title: string;
  body: string;
  data?: Record<string, string>; // Deep link data
  url?: string; // Web click URL
}

export async function sendPush(payload: PushPayload): Promise<boolean> {
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

  if (!appId || !apiKey) {
    console.warn(
      "OneSignal not configured: ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY missing. Skipping push.",
    );
    return false;
  }

  try {
    const body: Record<string, unknown> = {
      app_id: appId,
      include_aliases: { external_id: payload.userIds },
      target_channel: "push",
      headings: { en: payload.title },
      contents: { en: payload.body },
    };

    if (payload.data) {
      body.data = payload.data;
    }
    if (payload.url) {
      body.url = payload.url;
    }

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `OneSignal push failed (${response.status}):`,
        errorData,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("OneSignal push error:", error);
    return false;
  }
}
