"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/overview" },
  { label: "Signals", href: "/signals" },
  { label: "Risk Map", href: "/risk-map" },
  { label: "Cascade Simulator", href: "/cascade-simulator" },
];

export function DashboardTabs() {
  const pathname = usePathname();
  const currentPath = pathname === "/" ? "/overview" : pathname;

  return (
    <div className="relative z-10 mb-3 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-zinc-900/70 p-2">
      {tabs.map((tab) => {
        const isActive = currentPath === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-3 py-2 text-sm transition ${
              isActive
                ? "border border-orange-400/35 bg-orange-500/20 text-orange-100"
                : "border border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
