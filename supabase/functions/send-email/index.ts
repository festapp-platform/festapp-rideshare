/**
 * Send Email Edge Function — Custom Supabase Auth Email Hook.
 *
 * Intercepts Supabase Auth emails (confirmation, recovery, magic link,
 * email change, invite) and sends branded, localized versions via AWS SES.
 *
 * Locale is read from user.user_metadata.locale (default: 'cs').
 *
 * JWT verification is disabled (--no-verify-jwt) because Supabase Auth hooks
 * use webhook signatures, not Bearer tokens.
 */

import { sendEmail } from "../_shared/ses.ts";
import { getEmailTemplate } from "../_shared/email-templates.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://spolujizda.online";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { user, email_data } = payload;

    // Extract locale from user metadata, default to Czech
    const locale = user?.user_metadata?.locale ?? "cs";

    // Map Supabase email action types
    const actionType = email_data?.email_action_type;
    const recipientEmail = email_data?.email_address || user?.email;

    if (!recipientEmail || !actionType) {
      console.error("Missing email address or action type", {
        email_address: email_data?.email_address,
        action_type: actionType,
      });
      // Return 200 so Supabase Auth doesn't retry
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build confirmation URL from token_hash
    const tokenHash = email_data?.token_hash ?? "";
    const redirectTo = email_data?.redirect_to ?? `${APP_URL}/search`;
    const confirmationUrl = tokenHash
      ? `${APP_URL}/auth/confirm?token_hash=${tokenHash}&type=${actionType}&redirect_to=${encodeURIComponent(redirectTo)}`
      : email_data?.confirmation_url ?? APP_URL;

    const template = getEmailTemplate(actionType, locale, confirmationUrl);

    const sent = await sendEmail({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
    });

    if (!sent) {
      console.error("Failed to send email via SES", {
        to: recipientEmail,
        action: actionType,
      });
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
