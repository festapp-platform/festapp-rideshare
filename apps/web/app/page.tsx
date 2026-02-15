import { OTP_LENGTH } from "@festapp/shared";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">Festapp Rideshare</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Free community ride-sharing platform
        </p>
        <p className="text-sm text-zinc-500">
          OTP length: {OTP_LENGTH} digits (imported from @festapp/shared)
        </p>
      </main>
    </div>
  );
}
