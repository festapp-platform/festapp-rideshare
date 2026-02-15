import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

/**
 * Root layout with auth state gate.
 *
 * Uses getUser() (not getSession()) for initial session check per research.
 * Subscribes to onAuthStateChange for real-time session updates.
 *
 * Navigation guard:
 * - No session + not in (auth) group -> redirect to /(auth)/login
 * - Session + in (auth) group -> redirect to / (tabs come in Plan 04)
 */
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Initial session check + auth state subscription
  useEffect(() => {
    // Check for existing session using getUser() (server-validated)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Reconstruct minimal session marker for gate logic
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setIsLoading(false);
        });
      } else {
        setSession(null);
        setIsLoading(false);
      }
    });

    // Subscribe to auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Navigation guard: redirect based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not authenticated and not on auth screen -> go to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Authenticated but still on auth screen -> go to home
      // Tabs come in Plan 04; for now redirect to root
      router.replace("/");
    }
  }, [session, segments, isLoading, router]);

  // Show nothing while loading (could be splash screen)
  if (isLoading) return null;

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
