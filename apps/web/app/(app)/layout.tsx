import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "./app-nav";
import { MapProvider } from "@/lib/map-provider";
import { PostRideFab } from "./components/post-ride-fab";
import { Toaster } from "sonner";
import { OneSignalInit } from "./components/onesignal-init";
import { PendingRatingBanner } from "./components/pending-rating-banner";
import { PwaInstallBanner } from "./components/pwa-install-banner";
import { OfflineBanner } from "@/components/offline-banner";

/**
 * Authenticated app layout (NAV-01).
 * Server component that checks auth and redirects to /login if no session.
 * Also checks onboarding completion status.
 * Renders responsive navigation: sidebar on desktop, bottom tabs on mobile.
 *
 * Onboarding check uses user_metadata flag. The client sets localStorage
 * and the onboarding page itself is within this layout so it renders
 * without the nav chrome (handled by the onboarding page's full-screen layout).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if the current path is the onboarding page
  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") || "";
  const isOnboarding = pathname.startsWith("/onboarding");

  // Onboarding page renders full-screen without nav
  if (isOnboarding) {
    return <>{children}</>;
  }

  return (
    <MapProvider>
      <OfflineBanner />
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        {/* Desktop sidebar */}
        <AppNav />

        {/* Main content */}
        <main className="flex-1 pb-16 md:pb-0">
          {/* Pending rating detection banner (RATE-03) */}
          <PendingRatingBanner />
          <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
        </main>

        {/* Post-a-Ride FAB on all authenticated pages (NAV-07) */}
        <PostRideFab />

        {/* OneSignal push notification initialization (NOTF-05) */}
        <OneSignalInit />

        {/* PWA install banner (WEB-01) */}
        <PwaInstallBanner />

        {/* Toast notifications */}
        <Toaster position="top-right" richColors closeButton />
      </div>
    </MapProvider>
  );
}
