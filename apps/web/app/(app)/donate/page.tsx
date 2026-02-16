"use client";

import { Coffee } from "lucide-react";

export default function DonatePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border-pastel bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Coffee className="h-8 w-8 text-primary" />
        </div>

        <h1 className="mb-2 text-xl font-bold text-text-main">
          Support Festapp Rideshare
        </h1>

        <p className="mb-6 text-sm leading-relaxed text-text-secondary">
          Festapp Rideshare is completely free. If you find it useful, consider
          buying us a coffee to help keep it running.
        </p>

        <a
          href="https://ko-fi.com/festapp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-surface transition-colors hover:bg-primary/90"
        >
          <Coffee className="h-4 w-4" />
          Buy Us a Coffee
        </a>

        <p className="mt-6 text-xs text-text-secondary">
          Every contribution helps cover server costs and keeps the platform free
          for everyone.
        </p>
      </div>
    </div>
  );
}
