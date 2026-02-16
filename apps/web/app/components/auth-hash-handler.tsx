"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles Supabase auth hash fragments (#access_token=...&type=recovery).
 * The implicit flow puts tokens in the URL hash which the server can't see.
 * This component detects them client-side and processes accordingly.
 */
export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    // Set the session from the hash tokens
    const supabase = createClient();
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(({ error }) => {
      // Clear the hash
      history.replaceState(null, "", window.location.pathname);

      if (error) {
        window.location.href = "/login?error=auth";
        return;
      }

      if (type === "recovery") {
        window.location.href = "/reset-password?confirmed=true";
      } else {
        window.location.href = "/search";
      }
    });
  }, []);

  return null;
}
