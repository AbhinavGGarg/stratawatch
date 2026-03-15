"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, FlaskConical, Globe2, Radar } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import type { ActivityEvent } from "@/lib/types";

interface SidebarProps {
  stats: {
    activeSignals: number;
    highRiskZones: number;
    systemsMonitored: number;
  };
  activityFeed: ActivityEvent[];
  lastUpdated: string;
}

const navigationItems = [
  { icon: Globe2, label: "Overview", href: "/overview" },
  { icon: BarChart3, label: "Live Heatmap", href: "/risk-map" },
  { icon: Radar, label: "Live Alerts", href: "/signals" },
  { icon: FlaskConical, label: "Simulation Lab", href: "/simulation-lab" },
];

const statusCards = [
  {
    key: "activeSignals",
    label: "Active Signals",
    accent: "text-amber-300",
  },
  {
    key: "highRiskZones",
    label: "High Risk Zones",
    accent: "text-orange-300",
  },
  {
    key: "systemsMonitored",
    label: "Zones Monitored",
    accent: "text-red-300",
  },
] as const;

const formatUpdatedLabel = (isoString: string): string =>
  new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export function Sidebar({ stats, activityFeed, lastUpdated }: SidebarProps) {
  const pathname = usePathname();
  const normalizedPath =
    pathname === "/"
      ? "/overview"
      : pathname === "/operations" || pathname === "/cascade-simulator" || pathname === "/command-center"
        ? "/overview"
        : pathname;

  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-900/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-lg">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-red-500 text-black">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-zinc-50">StrataWatch</h1>
            <p className="text-xs text-zinc-400">Civilian Early Warning Heatmap</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = normalizedPath === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "border border-orange-400/30 bg-orange-500/15 text-orange-100"
                    : "text-zinc-300 hover:bg-white/10 hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {statusCards.map((card) => (
          <div key={card.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">{card.label}</p>
            <p className={`mt-1 text-xl font-semibold ${card.accent}`}>{stats[card.key]}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
        Last refresh {formatUpdatedLabel(lastUpdated)}
      </p>

      <div className="min-h-0 flex-1">
        <ActivityFeed events={activityFeed} />
      </div>
    </aside>
  );
}
