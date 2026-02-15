/**
 * Mobile Supabase client with LargeSecureStore for encrypted session persistence.
 *
 * Uses LargeSecureStore adapter (AES key in SecureStore, encrypted data in AsyncStorage)
 * to handle OAuth sessions that exceed expo-secure-store's 2048-byte limit.
 *
 * Auto-refreshes tokens when app comes to foreground (native only, not web).
 */
import { createClient } from "@supabase/supabase-js";
import { LargeSecureStore } from "./large-secure-store";
import { AppState, Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auto-refresh tokens when app comes to foreground (native platforms only)
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
