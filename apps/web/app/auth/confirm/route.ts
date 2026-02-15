/**
 * Email confirmation and password reset handler.
 * Processes token_hash from Supabase email links (signup confirmation, password reset).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/search";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      // For password recovery, redirect to a page where user can set new password
      if (type === "recovery") {
        return NextResponse.redirect(
          `${origin}/reset-password?confirmed=true`,
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Verification failed -- redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=verification`);
}
