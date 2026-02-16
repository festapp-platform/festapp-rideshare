/**
 * Supabase middleware session handler for Next.js.
 * Refreshes auth tokens and redirects unauthenticated users.
 *
 * Uses getUser() in middleware (not getSession()) per research open question #2:
 * getUser() is the proven middleware pattern that validates against the auth server.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that don't require authentication */
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/ride/",
  "/u/",
  "/help",
  "/terms",
  "/privacy",
  "/robots.txt",
  "/sitemap.xml",
  "/offline.html",
];

/** The landing page (/) is public */
function isLandingPage(pathname: string): boolean {
  return pathname === "/";
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip auth if Supabase is not configured (allows local dev without Supabase)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Use getUser() not getSession() for server-side validation.
  // getUser() makes a network request to the auth server and validates the token.
  // getSession() reads from unvalidated storage and should not be trusted on server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (unless on a public route or landing page)
  if (!user && !isPublicRoute(request.nextUrl.pathname) && !isLandingPage(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Admin route protection: only users with is_admin metadata can access /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const isAdmin = user?.app_metadata?.is_admin === true;
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
