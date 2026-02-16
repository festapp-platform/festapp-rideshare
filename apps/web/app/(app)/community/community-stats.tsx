"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Leaf,
  Car,
  Route,
  Users,
  UserCheck,
  Wallet,
  TreePine,
} from "lucide-react";
import { ShareButton } from "../components/share-button";

interface CommunityImpact {
  total_rides: number;
  total_users: number;
  total_co2_saved_kg: number;
  total_distance_km: number;
  total_money_shared_czk: number;
  active_drivers: number;
}

interface CommunityStatsProps {
  impact: CommunityImpact | null;
  isAuthenticated: boolean;
}

/**
 * Animated counter that counts up from 0 to the target value on page load.
 */
function AnimatedCounter({
  value,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;

    const duration = 1200; // ms
    const start = performance.now();

    function update(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * value;
      if (el) {
        el.textContent =
          decimals > 0
            ? current.toFixed(decimals) + suffix
            : Math.round(current).toLocaleString() + suffix;
      }
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }, [value, suffix, decimals]);

  return (
    <span ref={ref}>
      {decimals > 0 ? "0" + suffix : "0" + suffix}
    </span>
  );
}

export function CommunityStats({
  impact,
  isAuthenticated,
}: CommunityStatsProps) {
  const co2 = impact?.total_co2_saved_kg ?? 0;
  const treesEquivalent = Math.round(co2 / 22); // 1 tree absorbs ~22kg CO2/year

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 p-8 md:p-12">
        {/* CSS tree illustration */}
        <div className="absolute -right-6 -top-6 opacity-10 md:opacity-20">
          <TreePine className="h-48 w-48 text-green-600 md:h-64 md:w-64" />
        </div>
        <div className="absolute -bottom-4 -left-4 opacity-10">
          <Leaf className="h-32 w-32 rotate-45 text-green-500" />
        </div>

        <div className="relative z-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-green-700">
            Our Collective Impact
          </p>
          <h1 className="mb-3 text-3xl font-bold text-green-900 md:text-4xl">
            Together we&apos;ve saved{" "}
            <span className="text-green-600">
              <AnimatedCounter value={co2} decimals={1} suffix=" kg" />
            </span>{" "}
            CO2
          </h1>
          <p className="max-w-lg text-sm text-green-800">
            Every shared ride reduces emissions and brings our community closer.
            {treesEquivalent > 0 && (
              <>
                {" "}
                That&apos;s equivalent to{" "}
                <strong>{treesEquivalent.toLocaleString()} trees</strong>{" "}
                absorbing CO2 for a year.
              </>
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ShareButton
              title="Festapp Rideshare Community Impact"
              text={`Our community has saved ${co2.toFixed(1)} kg CO2 by sharing rides on Festapp!`}
              url="/community"
              label="Share Impact"
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            />
            {isAuthenticated ? (
              <Link
                href="/impact"
                className="rounded-xl border-2 border-green-600 bg-white/60 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-white"
              >
                View your impact
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-xl border-2 border-green-600 bg-white/60 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-white"
              >
                Join the community
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<Car className="h-6 w-6 text-purple-600" />}
          label="Total Rides Shared"
          value={<AnimatedCounter value={impact?.total_rides ?? 0} />}
          gradient="from-purple-50 to-fuchsia-50"
          border="border-purple-100"
        />
        <StatCard
          icon={<Leaf className="h-6 w-6 text-green-600" />}
          label="CO2 Saved"
          value={
            <>
              <AnimatedCounter
                value={co2}
                decimals={1}
                suffix=" kg"
              />
            </>
          }
          subtitle={
            treesEquivalent > 0
              ? `= ${treesEquivalent} trees planted`
              : undefined
          }
          gradient="from-green-50 to-emerald-50"
          border="border-green-100"
        />
        <StatCard
          icon={<Route className="h-6 w-6 text-orange-600" />}
          label="Total Distance Shared"
          value={
            <AnimatedCounter
              value={impact?.total_distance_km ?? 0}
              decimals={0}
              suffix=" km"
            />
          }
          gradient="from-orange-50 to-amber-50"
          border="border-orange-100"
        />
        <StatCard
          icon={<UserCheck className="h-6 w-6 text-blue-600" />}
          label="Active Drivers"
          value={<AnimatedCounter value={impact?.active_drivers ?? 0} />}
          gradient="from-blue-50 to-sky-50"
          border="border-blue-100"
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-teal-600" />}
          label="Total Users"
          value={<AnimatedCounter value={impact?.total_users ?? 0} />}
          gradient="from-teal-50 to-cyan-50"
          border="border-teal-100"
        />
        <StatCard
          icon={<Wallet className="h-6 w-6 text-indigo-600" />}
          label="Money Exchanged"
          value={
            <AnimatedCounter
              value={impact?.total_money_shared_czk ?? 0}
              suffix=" CZK"
            />
          }
          gradient="from-indigo-50 to-violet-50"
          border="border-indigo-100"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  gradient,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  gradient: string;
  border: string;
}) {
  return (
    <div
      className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-5`}
    >
      <div className="mb-3">{icon}</div>
      <p className="text-xl font-bold text-text-main">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{label}</p>
      {subtitle && (
        <p className="mt-0.5 text-[10px] font-medium text-green-600">
          {subtitle}
        </p>
      )}
    </div>
  );
}
