import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Car,
  MapPin,
  Users,
  Star,
  Leaf,
  Shield,
  Clock,
  ArrowRight,
  Search,
  Zap,
  HandCoins,
  Radio,
} from "lucide-react";

/**
 * Root landing page.
 * Authenticated users are redirected to /search.
 * Unauthenticated users see a public marketing landing page.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/search");
  }

  // Fetch community stats (accessible to anon users)
  const { data: impactData } = await supabase.rpc("get_community_impact");
  const impact = impactData?.[0] ?? null;

  // Fetch a few upcoming rides for the preview section
  const { data: recentRides } = await supabase
    .from("rides")
    .select(
      "id, origin_address, destination_address, departure_time, price_czk, seats_available, seats_total"
    )
    .eq("status", "upcoming")
    .gte("departure_time", new Date().toISOString())
    .order("departure_time", { ascending: true })
    .limit(4);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border-pastel bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Car className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-text-main">
              spolujizda.online
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-main"
            >
              Prihlasit se
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              Registrace
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C6FA0]/10 via-background to-[#6BA3A0]/10" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-pastel bg-surface px-4 py-1.5 text-sm text-text-secondary">
              <Leaf className="h-3.5 w-3.5 text-success" />
              <span>Ekologicka spolujizda pro komunitu</span>
            </div>

            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-text-main sm:text-5xl lg:text-6xl">
              Spolujizda{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                zdarma
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-text-secondary sm:text-xl">
              Propojujeme ridice a spolucestujici na stejne trase. Zadne
              poplatky, zadne provize &mdash; proste sdilena jizda.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/search"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:opacity-95"
              >
                <Search className="h-4 w-4" />
                Najit jizdu
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-border-pastel bg-surface px-6 py-3 text-base font-semibold text-text-main transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <Car className="h-4 w-4" />
                Nabidnout jizdu
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-border-pastel bg-surface/50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-text-main sm:text-4xl">
              Jak to funguje
            </h2>
            <p className="mx-auto max-w-md text-text-secondary">
              Tri jednoduche kroky k vasi prvni sdilene jizde
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard
              step={1}
              icon={<Search className="h-6 w-6" />}
              title="Najdete trasu"
              description="Zadejte odkud a kam jedete a vyberte datum. Zobrazime vam vsechny dostupne jizdy na vasi trase."
            />
            <StepCard
              step={2}
              icon={<Zap className="h-6 w-6" />}
              title="Rezervujete misto"
              description="Zarezervujte si misto okamzite, nebo poslete zadost ridici. Potvrzeni dostanete behem chvilky."
            />
            <StepCard
              step={3}
              icon={<HandCoins className="h-6 w-6" />}
              title="Jedete a sdilite naklady"
              description="Potkejte se na miste, sdilte jizdu a rozdelte naklady v hotovosti. Jednoduche."
            />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-text-main sm:text-4xl">
              Proc spolujizda.online
            </h2>
            <p className="mx-auto max-w-md text-text-secondary">
              Postaveno komunitou, pro komunitu
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<HandCoins className="h-6 w-6 text-success" />}
              title="Uplne zdarma"
              description="Zadne poplatky, zadne provize. Vsechny penize zustavaji mezi ridici a spolucestujicimi."
              gradient="from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
              border="border-green-200 dark:border-green-800/40"
            />
            <FeatureCard
              icon={<Radio className="h-6 w-6 text-primary" />}
              title="Poloha v realnem case"
              description="Sdileni polohy pro snazsi koordinaci vyzvednuti. Zadne zbytecne volani."
              gradient="from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30"
              border="border-purple-200 dark:border-purple-800/40"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-secondary" />}
              title="Overene profily"
              description="Hodnoceni a recenze od ostatnich uzivatelu. Vidite, s kym jedete."
              gradient="from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30"
              border="border-teal-200 dark:border-teal-800/40"
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6 text-accent" />}
              title="Flexibilni jizdy"
              description="Zverejnete svuj zamer a spolucestujici se prihlasi. Nebo si najdete jizdu podle sve trasy."
              gradient="from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30"
              border="border-orange-200 dark:border-orange-800/40"
            />
          </div>
        </div>
      </section>

      {/* ── Recent Rides ── */}
      {recentRides && recentRides.length > 0 && (
        <section className="border-t border-border-pastel bg-surface/50 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-14 text-center">
              <h2 className="mb-3 text-3xl font-bold text-text-main sm:text-4xl">
                Nadchazejici jizdy
              </h2>
              <p className="mx-auto max-w-md text-text-secondary">
                Podivejte se, kam lide prave miri
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentRides.map((ride) => (
                <RideCard
                  key={ride.id}
                  origin={extractCity(ride.origin_address)}
                  destination={extractCity(ride.destination_address)}
                  departureTime={ride.departure_time}
                  price={ride.price_czk}
                  seatsAvailable={ride.seats_available}
                />
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/search"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-light"
              >
                Zobrazit vsechny jizdy
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Community Stats ── */}
      {impact && (
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-14 text-center">
              <h2 className="mb-3 text-3xl font-bold text-text-main sm:text-4xl">
                Nase komunita v cislech
              </h2>
              <p className="mx-auto max-w-md text-text-secondary">
                Kazda sdilena jizda ma smysl
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              <StatCard
                icon={<Car className="h-5 w-5 text-primary" />}
                value={impact.total_rides ?? 0}
                label="Sdilenych jizd"
              />
              <StatCard
                icon={<Leaf className="h-5 w-5 text-success" />}
                value={impact.total_co2_saved_kg ?? 0}
                label="kg CO2 usporeno"
                suffix=" kg"
                decimals={1}
              />
              <StatCard
                icon={<Users className="h-5 w-5 text-secondary" />}
                value={impact.active_drivers ?? 0}
                label="Aktivnich ridicu"
              />
              <StatCard
                icon={<Star className="h-5 w-5 text-accent" />}
                value={impact.total_users ?? 0}
                label="Uzivatelu"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Banner ── */}
      <section className="border-t border-border-pastel">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 px-8 py-16 text-center sm:px-16">
            <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-secondary/5 blur-3xl" />

            <div className="relative">
              <h2 className="mb-4 text-3xl font-bold text-text-main sm:text-4xl">
                Pripojte se
              </h2>
              <p className="mx-auto mb-8 max-w-md text-lg text-text-secondary">
                Zaregistrujte se a zacnete sdilet jizdy jiz dnes. Je to zdarma
                &mdash; a vzdy bude.
              </p>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:opacity-95"
              >
                Vytvorit ucet zdarma
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border-pastel bg-surface/50 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Car className="h-4 w-4" />
            <span>spolujizda.online</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-text-secondary">
            <Link
              href="/search"
              className="transition-colors hover:text-text-main"
            >
              Hledat jizdy
            </Link>
            <Link
              href="/community"
              className="transition-colors hover:text-text-main"
            >
              Komunita
            </Link>
            <Link
              href="/login"
              className="transition-colors hover:text-text-main"
            >
              Prihlaseni
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Helper Components ── */

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-border-pastel bg-surface p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {step}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text-main">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
  border,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  border: string;
}) {
  return (
    <div
      className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-6 transition-shadow hover:shadow-lg`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-surface">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-text-main">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function RideCard({
  origin,
  destination,
  departureTime,
  price,
  seatsAvailable,
}: {
  origin: string;
  destination: string;
  departureTime: string;
  price: number | null;
  seatsAvailable: number;
}) {
  const date = new Date(departureTime);
  const formattedDate = date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
  });
  const formattedTime = date.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-border-pastel bg-surface p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-main">
            {origin}
          </p>
          <div className="my-1 flex items-center gap-1 text-text-secondary">
            <ArrowRight className="h-3 w-3" />
          </div>
          <p className="truncate text-sm font-semibold text-text-main">
            {destination}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border-pastel pt-3">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {formattedDate}, {formattedTime}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {price != null && (
            <span className="text-xs font-semibold text-success">
              {price} CZK
            </span>
          )}
          <span className="text-xs text-text-secondary">
            {seatsAvailable} {seatsAvailable === 1 ? "misto" : "mista"}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  suffix = "",
  decimals = 0,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  decimals?: number;
}) {
  const formatted =
    decimals > 0
      ? value.toFixed(decimals) + suffix
      : value.toLocaleString() + suffix;

  return (
    <div className="rounded-2xl border border-border-pastel bg-surface p-6 text-center transition-shadow hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        {icon}
      </div>
      <p className="text-2xl font-bold text-text-main sm:text-3xl">
        {formatted}
      </p>
      <p className="mt-1 text-sm text-text-secondary">{label}</p>
    </div>
  );
}

/** Extract the city name (first part) from a full address string. */
function extractCity(address: string): string {
  // Addresses are typically "City, Street..." or "Street, City, Country"
  // Take the first meaningful part
  const parts = address.split(",").map((p) => p.trim());
  return parts[0] || address;
}
