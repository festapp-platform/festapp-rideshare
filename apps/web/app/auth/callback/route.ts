/**
 * Auth callback handler for web.
 * Exchanges the PKCE authorization code for a session, then redirects.
 * Handles OAuth, email confirmation, and password recovery flows.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/search";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If this is a password recovery flow, redirect to reset password page
      if (data.session?.user?.recovery_sent_at) {
        const recoverySentAt = new Date(data.session.user.recovery_sent_at);
        const now = new Date();
        // If recovery was sent within the last hour, this is a recovery flow
        if (now.getTime() - recoverySentAt.getTime() < 3600000) {
          return NextResponse.redirect(
            `${origin}/reset-password?confirmed=true`,
          );
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error -- redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
