/**
 * Reusable rate limiting middleware for Edge Functions (WEB-09).
 *
 * Uses the api_rate_limits table to track request counts per
 * identifier (IP or user) and endpoint within sliding time windows.
 *
 * Usage:
 *   const { limited, retryAfter } = await checkRateLimit(req, 'endpoint', { maxRequests: 20, windowSeconds: 60 });
 *   if (limited) return rateLimitResponse(retryAfter);
 */
import { createAdminClient } from "./supabase-client.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  limited: boolean;
  retryAfter: number;
}

/**
 * Extract a client identifier from the request.
 * Prefers X-Forwarded-For (proxy/CDN IP), falls back to a hash of the
 * Authorization header, and finally "anonymous".
 */
function getIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain (client IP)
    return forwarded.split(",")[0].trim();
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    // Simple hash of auth header for identifier (not cryptographic, just bucketing)
    let hash = 0;
    for (let i = 0; i < auth.length; i++) {
      const char = auth.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `auth:${hash}`;
  }

  return "anonymous";
}

/**
 * Check whether the request exceeds the rate limit for the given endpoint.
 * If not limited, increments the counter via upsert.
 */
export async function checkRateLimit(
  req: Request,
  endpoint: string,
  limits: RateLimitOptions,
): Promise<RateLimitResult> {
  const identifier = getIdentifier(req);
  const supabase = createAdminClient();

  // Floor current time to window boundary
  const nowMs = Date.now();
  const windowMs = limits.windowSeconds * 1000;
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs).toISOString();

  // Count existing requests in current window
  const { data, error: selectError } = await supabase
    .from("api_rate_limits")
    .select("request_count")
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (selectError) {
    console.error("Rate limit check error:", selectError.message);
    // Fail open: don't block requests if rate limiting is broken
    return { limited: false, retryAfter: 0 };
  }

  const currentCount = data?.request_count ?? 0;

  if (currentCount >= limits.maxRequests) {
    // Calculate remaining time in current window
    const windowEndMs = windowStartMs + windowMs;
    const retryAfter = Math.ceil((windowEndMs - nowMs) / 1000);
    return { limited: true, retryAfter: Math.max(1, retryAfter) };
  }

  // Increment counter (upsert)
  if (currentCount === 0) {
    await supabase.from("api_rate_limits").insert({
      identifier,
      endpoint,
      request_count: 1,
      window_start: windowStart,
    });
  } else {
    await supabase
      .from("api_rate_limits")
      .update({ request_count: currentCount + 1 })
      .eq("identifier", identifier)
      .eq("endpoint", endpoint)
      .eq("window_start", windowStart);
  }

  return { limited: false, retryAfter: 0 };
}

/**
 * Generate a 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
