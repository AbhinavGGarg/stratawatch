"use client";

import { StrataWatchDashboard } from "@/components/dashboard/StrataWatchDashboard";
import { useIsClient } from "@/hooks/use-is-client";

export default function HomePage() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <main className="min-h-screen bg-[#0b0b0f] text-zinc-100">
        <div className="flex min-h-screen items-center justify-center">
          <p className="rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300">
            Loading StrataWatch...
          </p>
        </div>
      </main>
    );
  }

  return <StrataWatchDashboard />;
}
