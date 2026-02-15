import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { ONBOARDING_COMPLETED_KEY } from "@festapp/shared";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

/**
 * Root layout with auth state gate and onboarding check.
 *
 * Uses getUser() (not getSession()) for initial session check per research.
 * Subscribes to onAuthStateChange for real-time session updates.
 *
 * Navigation guard:
 * - No session + not in (auth) group -> redirect to /(auth)/login
 * - Session + in (auth) group -> check onboarding, then redirect
 * - Session + onboarding not completed -> redirect to /onboarding
 * - Session + onboarding completed -> proceed to tabs
 */
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
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
          // Check onboarding status
          AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY).then((value) => {
            setOnboardingCompleted(value === "true");
            setIsLoading(false);
          });
        });
      } else {
        setSession(null);
        setOnboardingCompleted(null);
        setIsLoading(false);
      }
    });

    // Subscribe to auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY).then((value) => {
          setOnboardingCompleted(value === "true");
        });
      } else {
        setOnboardingCompleted(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Navigation guard: redirect based on auth state + onboarding
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!session && !inAuthGroup) {
      // Not authenticated and not on auth screen -> go to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Authenticated but still on auth screen -> check onboarding
      if (!onboardingCompleted) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)/search");
      }
    } else if (session && !onboardingCompleted && !inOnboarding && !inAuthGroup) {
      // Authenticated but onboarding not completed -> go to onboarding
      router.replace("/onboarding");
    }
  }, [session, segments, isLoading, onboardingCompleted, router]);

  // Show nothing while loading (could be splash screen)
  if (isLoading) return null;

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
