"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadBadge } from "./components/unread-badge";

const secondaryItems = [
  {
    name: "AI Assistant",
    href: "/assistant",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    name: "Community",
    href: "/community",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: "My Impact",
    href: "/impact",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const navItems = [
  {
    name: "Search",
    href: "/search",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    name: "My Rides",
    href: "/my-rides",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M8 17v-4m8 4v-4m-8 0h8m-8 0l-2-6h12l-2 6M6 17a2 2 0 11-4 0 2 2 0 014 0zm16 0a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    href: "/messages",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    name: "Profile",
    href: "/profile",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

/**
 * Responsive app navigation (NAV-01).
 * Desktop: sidebar on the left.
 * Mobile: bottom tab bar.
 * Uses pastel design system CSS variables (PLAT-01).
 */
export function AppNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Desktop/Tablet sidebar -- icons-only on md, full labels on lg */}
      <nav role="navigation" aria-label="Main navigation" className="hidden md:flex md:w-16 lg:w-64 md:flex-col md:border-r md:border-border-pastel md:bg-surface transition-all duration-200">
        <div className="px-3 lg:px-6 py-6">
          <h1 className="hidden lg:block text-lg font-bold text-primary">Festapp Rideshare</h1>
          <h1 className="lg:hidden text-center text-lg font-bold text-primary">FR</h1>
          <p className="hidden lg:block text-xs text-text-secondary">Free community rides</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 px-1.5 lg:px-3">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              aria-current={isActive(item.href) ? "page" : undefined}
              title={item.name}
              className={`relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 lg:px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-primary/5 hover:text-text-main"
              }`}
            >
              <span className="relative flex-shrink-0" aria-hidden="true">
                {item.icon}
                {item.name === "Messages" && <UnreadBadge />}
              </span>
              <span className="hidden lg:block">{item.name}</span>
            </Link>
          ))}
          {/* Secondary links */}
          <div className="mt-auto border-t border-border-pastel pt-2">
            {secondaryItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                aria-label={item.name}
                aria-current={isActive(item.href) ? "page" : undefined}
                title={item.name}
                className={`flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 lg:px-3 py-2 min-h-[44px] text-xs font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-primary/5 hover:text-text-main"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="hidden lg:block">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile bottom tabs -- safe area padding for notched phones */}
      <nav role="navigation" aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border-pastel bg-surface pb-safe md:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2 min-h-[44px] min-w-[44px] text-xs font-medium transition-colors ${
                isActive(item.href) ? "text-tab-active" : "text-tab-inactive"
              }`}
            >
              <span className="relative" aria-hidden="true">
                {item.icon}
                {item.name === "Messages" && <UnreadBadge />}
              </span>
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
