"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UnreadBadge } from "./components/unread-badge";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Responsive app navigation (NAV-01).
 * Desktop: sidebar on the left.
 * Mobile: bottom tab bar.
 * Uses pastel design system CSS variables (PLAT-01).
 * Localized via i18n (GROUP-D).
 * Shows user avatar + name (GROUP-A).
 * AI Assistant removed from nav (GROUP-E1).
 */
export function AppNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
    }
    fetchProfile();
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navItems = [
    {
      nameKey: "nav.search" as const,
      href: "/search",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      nameKey: "nav.myRides" as const,
      href: "/my-rides",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M8 17v-4m8 4v-4m-8 0h8m-8 0l-2-6h12l-2 6M6 17a2 2 0 11-4 0 2 2 0 014 0zm16 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      nameKey: "nav.messages" as const,
      href: "/messages",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      nameKey: "nav.profile" as const,
      href: "/profile",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const secondaryItems = [
    {
      nameKey: "nav.community" as const,
      href: "/community",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      nameKey: "nav.myStats" as const,
      href: "/impact",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  // User avatar for mobile profile tab
  const profileAvatar = profile?.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt=""
      className="h-6 w-6 rounded-full object-cover"
    />
  ) : null;

  return (
    <>
      {/* Desktop/Tablet sidebar -- icons-only on md, full labels on lg */}
      <nav role="navigation" aria-label="Main navigation" className="hidden md:flex md:w-16 lg:w-64 md:flex-col md:border-r md:border-border-pastel md:bg-surface transition-all duration-200">
        <div className="px-3 lg:px-6 py-6">
          <h1 className="hidden lg:block text-lg font-bold text-primary">spolujizda.online</h1>
          <h1 className="lg:hidden text-center text-lg font-bold text-primary">FR</h1>
          <p className="hidden lg:block text-xs text-text-secondary">{t("brand.subtitle")}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 px-1.5 lg:px-3">
          {navItems.map((item) => {
            const name = t(item.nameKey);
            return (
              <Link
                key={item.nameKey}
                href={item.href}
                aria-label={name}
                aria-current={isActive(item.href) ? "page" : undefined}
                title={name}
                className={`relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 lg:px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-primary/5 hover:text-text-main"
                }`}
              >
                <span className="relative flex-shrink-0" aria-hidden="true">
                  {item.icon}
                  {item.nameKey === "nav.messages" && <UnreadBadge />}
                </span>
                <span className="hidden lg:block">{name}</span>
              </Link>
            );
          })}
          {/* Secondary links */}
          <div className="mt-auto border-t border-border-pastel pt-2">
            {secondaryItems.map((item) => {
              const name = t(item.nameKey);
              return (
                <Link
                  key={item.nameKey}
                  href={item.href}
                  aria-label={name}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  title={name}
                  className={`flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 lg:px-3 py-2 min-h-[44px] text-xs font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-primary/5 hover:text-text-main"
                  }`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span className="hidden lg:block">{name}</span>
                </Link>
              );
            })}

            {/* User profile at bottom of sidebar (GROUP-A1) */}
            {profile && (
              <Link
                href="/profile"
                className="mt-2 flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 lg:px-3 py-2 min-h-[44px] text-xs font-medium text-text-secondary hover:bg-primary/5 hover:text-text-main transition-colors"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <span className="hidden lg:block truncate">
                  {profile.display_name || t("nav.profile")}
                </span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom tabs -- safe area padding for notched phones */}
      <nav role="navigation" aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border-pastel bg-surface pb-safe md:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const name = t(item.nameKey);
            // For profile tab, show user avatar if available (GROUP-A1)
            const isProfileTab = item.nameKey === "nav.profile";
            const icon = isProfileTab && profileAvatar ? profileAvatar : item.icon;

            return (
              <Link
                key={item.nameKey}
                href={item.href}
                aria-label={name}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2 min-h-[44px] min-w-[44px] text-xs font-medium transition-colors ${
                  isActive(item.href) ? "text-tab-active" : "text-tab-inactive"
                }`}
              >
                <span className="relative" aria-hidden="true">
                  {icon}
                  {item.nameKey === "nav.messages" && <UnreadBadge />}
                </span>
                <span>{name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
