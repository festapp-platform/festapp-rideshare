/**
 * Configuration for production integration tests.
 *
 * SUPABASE_SERVICE_ROLE_KEY must be provided via environment variable.
 * SUPABASE_ANON_KEY is public and can be hardcoded as a default.
 */

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://xamctptqmpruhovhjcgm.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbWN0cHRxbXBydWhvdmhqY2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjkyMDUsImV4cCI6MjA4NjY0NTIwNX0.s_o3dTA9GZi6rUxgt_8zv7O3i9QoT9tD_lsy9QHf9n8";

export const SUPABASE_SERVICE_ROLE_KEY = (() => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is required. " +
        "This is a secret key and must not be hardcoded.",
    );
  }
  return key;
})();

export const SITE_URL =
  process.env.SITE_URL ?? "https://spolujizda.online";

export const TEST_PHONE =
  process.env.TEST_PHONE ?? "+420792759379";
