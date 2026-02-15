"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * OneSignal initialization component (NOTF-05).
 *
 * Initializes OneSignal SDK on mount and links/unlinks the device
 * to the authenticated Supabase user via external_id.
 *
 * Dynamically imports the onesignal module to avoid SSR issues.
 */
export function OneSignalInit() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setup() {
      const { initOneSignal, loginOneSignal, logoutOneSignal } = await import(
        "@/lib/onesignal"
      );

      // Initialize the SDK
      await initOneSignal();

      // Link current user if already signed in
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await loginOneSignal(user.id);
      }

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await loginOneSignal(session.user.id);
        } else if (event === "SIGNED_OUT") {
          logoutOneSignal();
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    }

    setup();

    return () => {
      unsubscribe?.();
    };
  }, []);

  return null;
}
