import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Rate limiting tests.
 *
 * The rate-limit module lives in supabase/functions/_shared/ and uses Deno-style
 * imports (createAdminClient from ./supabase-client.ts). We test the logic by
 * extracting and verifying the core algorithms in isolation rather than importing
 * the Deno module directly into vitest/Node.
 */

// ---- Identifier extraction logic (replicated from rate-limit.ts) ----

function getIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    let hash = 0;
    for (let i = 0; i < auth.length; i++) {
      const char = auth.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `auth:${hash}`;
  }

  return "anonymous";
}

// ---- Window calculation logic (replicated from rate-limit.ts) ----

function calculateWindow(nowMs: number, windowSeconds: number) {
  const windowMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs).toISOString();
  return { windowMs, windowStartMs, windowStart };
}

// ---- Rate limit check logic (replicated from rate-limit.ts) ----

interface RateLimitResult {
  limited: boolean;
  retryAfter: number;
}

function checkLimitLogic(
  currentCount: number,
  maxRequests: number,
  nowMs: number,
  windowStartMs: number,
  windowMs: number,
): RateLimitResult {
  if (currentCount >= maxRequests) {
    const windowEndMs = windowStartMs + windowMs;
    const retryAfter = Math.ceil((windowEndMs - nowMs) / 1000);
    return { limited: true, retryAfter: Math.max(1, retryAfter) };
  }
  return { limited: false, retryAfter: 0 };
}

// ---- rateLimitResponse logic (replicated from rate-limit.ts) ----

function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests" }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

// ========== Tests ==========

describe("Rate limit: identifier extraction", () => {
  it("extracts first IP from x-forwarded-for header", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getIdentifier(req)).toBe("1.2.3.4");
  });

  it("extracts single IP from x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(getIdentifier(req)).toBe("10.0.0.1");
  });

  it("falls back to auth header hash when no x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { authorization: "Bearer test-token-123" },
    });
    const id = getIdentifier(req);
    expect(id).toMatch(/^auth:-?\d+$/);
  });

  it("produces consistent hash for same auth header", () => {
    const req1 = new Request("https://example.com", {
      headers: { authorization: "Bearer abc" },
    });
    const req2 = new Request("https://example.com", {
      headers: { authorization: "Bearer abc" },
    });
    expect(getIdentifier(req1)).toBe(getIdentifier(req2));
  });

  it("produces different hashes for different auth headers", () => {
    const req1 = new Request("https://example.com", {
      headers: { authorization: "Bearer abc" },
    });
    const req2 = new Request("https://example.com", {
      headers: { authorization: "Bearer xyz" },
    });
    expect(getIdentifier(req1)).not.toBe(getIdentifier(req2));
  });

  it("returns anonymous when no identifying headers", () => {
    const req = new Request("https://example.com");
    expect(getIdentifier(req)).toBe("anonymous");
  });

  it("prefers x-forwarded-for over authorization", () => {
    const req = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        authorization: "Bearer token",
      },
    });
    expect(getIdentifier(req)).toBe("1.2.3.4");
  });
});

describe("Rate limit: window calculation", () => {
  it("floors timestamp to window boundary", () => {
    // 60-second window, timestamp at 90 seconds past epoch
    const nowMs = 90_000;
    const { windowStartMs } = calculateWindow(nowMs, 60);
    expect(windowStartMs).toBe(60_000);
  });

  it("window start is at boundary when timestamp is exact", () => {
    const nowMs = 120_000;
    const { windowStartMs } = calculateWindow(nowMs, 60);
    expect(windowStartMs).toBe(120_000);
  });

  it("produces valid ISO timestamp for windowStart", () => {
    const { windowStart } = calculateWindow(Date.now(), 60);
    expect(() => new Date(windowStart)).not.toThrow();
    expect(new Date(windowStart).toISOString()).toBe(windowStart);
  });

  it("windowMs equals windowSeconds * 1000", () => {
    const { windowMs } = calculateWindow(Date.now(), 30);
    expect(windowMs).toBe(30_000);
  });
});

describe("Rate limit: allow/block logic", () => {
  it("allows requests under the limit", () => {
    const result = checkLimitLogic(5, 20, 90_000, 60_000, 60_000);
    expect(result.limited).toBe(false);
    expect(result.retryAfter).toBe(0);
  });

  it("blocks requests at the limit", () => {
    const result = checkLimitLogic(20, 20, 90_000, 60_000, 60_000);
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("blocks requests over the limit", () => {
    const result = checkLimitLogic(25, 20, 90_000, 60_000, 60_000);
    expect(result.limited).toBe(true);
  });

  it("retryAfter is at least 1 second", () => {
    // Request right at the end of the window
    const result = checkLimitLogic(20, 20, 119_999, 60_000, 60_000);
    expect(result.retryAfter).toBeGreaterThanOrEqual(1);
  });

  it("retryAfter reflects remaining window time", () => {
    // 60s window starting at 60000, current time at 90000 = 30s remaining
    const result = checkLimitLogic(20, 20, 90_000, 60_000, 60_000);
    expect(result.retryAfter).toBe(30);
  });
});

describe("Rate limit: rateLimitResponse", () => {
  it("returns status 429", () => {
    const res = rateLimitResponse(30);
    expect(res.status).toBe(429);
  });

  it("has Retry-After header", () => {
    const res = rateLimitResponse(30);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("has Content-Type application/json", () => {
    const res = rateLimitResponse(30);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("body contains error message", async () => {
    const res = rateLimitResponse(30);
    const body = await res.json();
    expect(body.error).toBe("Too many requests");
  });

  it("Retry-After reflects the provided value", () => {
    const res = rateLimitResponse(45);
    expect(res.headers.get("Retry-After")).toBe("45");
  });
});
