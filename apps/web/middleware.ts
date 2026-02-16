/**
 * Next.js middleware - refreshes Supabase auth sessions and protects routes.
 */
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets (svg, png, jpg, jpeg, gif, webp)
     * - sw.js (service worker - must not be intercepted by auth middleware)
     * - manifest.json (PWA manifest)
     * - OneSignalSDKWorker.js (push notification worker)
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|OneSignalSDKWorker\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
