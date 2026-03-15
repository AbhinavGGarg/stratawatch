"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Brain, Clock3, ShieldAlert } from "lucide-react";
import { generateBriefingText } from "@/lib/briefing";
import type { RegionState, Signal } from "@/lib/types";
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart";

interface BriefingPanelProps {
  selectedRegion: RegionState | null;
  signals: Signal[];
  formatSignalType: (type: Signal["type"]) => string;
}

const riskBarColor = (risk: number): string => {
  if (risk >= 0.8) return "from-red-500 to-orange-500";
  if (risk >= 0.62) return "from-orange-500 to-amber-400";
  if (risk >= 0.36) return "from-amber-400 to-yellow-300";
  return "from-emerald-500 to-lime-300";
};

const formatRisk = (risk: number): string => `${Math.round(risk * 100)}%`;

const formatTimeAgo = (isoTimestamp: string): string => {
  const deltaMs = Date.now() - new Date(isoTimestamp).getTime();
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  return `${deltaHours}h ago`;
};

const riskLabel = (risk: number): string => {
  if (risk >= 0.8) return "Critical";
  if (risk >= 0.62) return "High";
  if (risk >= 0.36) return "Watch";
  return "Low";
};

const recommendedActions = (region: RegionState, drivers: string[]): string[] => {
  if (region.risk >= 0.8) {
    return [
      "Avoid non-essential movement in this zone and delay travel through nearby transit nodes.",
      "Keep one trusted local source open for rapid updates and verify route status before departure.",
      "Prepare a 24-hour contingency plan for shelter, transport, and communications.",
    ];
  }

  if (region.risk >= 0.62) {
    return [
      "Use daylight travel windows where possible and avoid known chokepoints.",
      "Monitor alerts for rapid escalation in the next 30-60 minutes.",
      `Watch these drivers closely: ${drivers.slice(0, 2).join(", ") || "regional instability indicators"}.`,
    ];
  }

  if (region.risk >= 0.36) {
    return [
      "Continue normal activity with caution and keep alternate routes available.",
      "Track local advisories for sudden service disruption or movement restrictions.",
      "Check in with contacts before moving across unfamiliar areas.",
    ];
  }

  return [
    "No immediate civilian safety action required.",
    "Keep passive monitoring enabled for early warning changes.",
    "Review route options before long-distance movement.",
  ];
};

export function BriefingPanel({
  selectedRegion,
  signals,
  formatSignalType,
}: BriefingPanelProps) {
  return (
    <aside className="h-full min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900/78 p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Civilian Safety Brief</h2>
          <p className="text-xs text-zinc-400">What is changing, where risk is rising, and what to do next</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedRegion?.id ?? "empty"}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.24 }}
          className="space-y-4"
        >
          {!selectedRegion ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-black/25 p-6 text-center text-sm text-zinc-400">
              Monitoring global conflict heatmap. Select a region to open a local safety brief.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-300" />
                    <p className="text-sm font-semibold text-zinc-100">{selectedRegion.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-50">{formatRisk(selectedRegion.risk)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400">{riskLabel(selectedRegion.risk)}</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${riskBarColor(selectedRegion.risk)}`}
                    style={{ width: `${Math.max(8, Math.round(selectedRegion.risk * 100))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">{generateBriefingText(selectedRegion)}</p>
              </div>

              <section className="rounded-xl border border-white/10 bg-black/28 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-zinc-200" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Key Drivers</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRegion.drivers.length === 0 ? (
                    <span className="text-xs text-zinc-500">No dominant drivers in the current window</span>
                  ) : (
                    selectedRegion.drivers.map((driver) => (
                      <span
                        key={driver}
                        className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-[11px] text-orange-200"
                      >
                        {formatSignalType(driver)}
                      </span>
                    ))
                  )}
                </div>
                <div className="mt-3">
                  <RiskTrendChart region={selectedRegion} />
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-black/28 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-zinc-200" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Recent Alerts</h3>
                </div>
                <div className="space-y-2">
                  {signals.length === 0 && selectedRegion.recentEvents.length === 0 ? (
                    <p className="text-xs text-zinc-500">No recent activity detected for this region.</p>
                  ) : (
                    <>
                      {[...new Set(selectedRegion.recentEvents)].slice(0, 4).map((event, index) => (
                        <p key={`${event}-${index}`} className="text-xs text-zinc-300">
                          • {event}
                        </p>
                      ))}
                      {signals.slice(0, 3).map((signal) => (
                        <p key={signal.id} className="text-xs text-zinc-400">
                          • {signal.source === "simulated" ? "Simulated" : "Live"} · {formatSignalType(signal.type)} (
                          {Math.round(signal.severity * 100)}%), {formatTimeAgo(signal.timestamp)}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-black/28 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-zinc-200" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">What Civilians Should Do Now</h3>
                </div>
                <div className="space-y-2">
                  {recommendedActions(
                    selectedRegion,
                    selectedRegion.drivers.map((driver) => formatSignalType(driver).toLowerCase()),
                  ).map((action) => (
                    <p key={action} className="text-xs leading-relaxed text-zinc-300">
                      • {action}
                    </p>
                  ))}
                </div>
              </section>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
