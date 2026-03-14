"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bolt, Brain, Clock3, ShieldAlert, Sparkles, Waypoints } from "lucide-react";
import { generateBriefingText } from "@/lib/briefing";
import type { CascadeResult, RegionState, Signal, SystemLink, SystemNode } from "@/lib/types";
import { CascadeNetwork } from "@/components/dashboard/CascadeNetwork";
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart";

interface BriefingPanelProps {
  selectedRegion: RegionState | null;
  signals: Signal[];
  onSimulate: () => void;
  cascadeResult: CascadeResult | null;
  nodes: SystemNode[];
  links: SystemLink[];
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

export function BriefingPanel({
  selectedRegion,
  signals,
  onSimulate,
  cascadeResult,
  nodes,
  links,
  formatSignalType,
}: BriefingPanelProps) {
  return (
    <aside className="h-full min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900/78 p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Intelligence Briefing</h2>
          <p className="text-xs text-zinc-400">Regional disruption analysis</p>
        </div>
        <button
          type="button"
          onClick={onSimulate}
          disabled={!selectedRegion}
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-400/50 bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-200 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Bolt className="h-3.5 w-3.5" />
          Simulate Disruption
        </button>
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
              Select a hex region on the map to open an intelligence briefing.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-300" />
                    <p className="text-sm font-semibold text-zinc-100">{selectedRegion.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-50">{formatRisk(selectedRegion.risk)}</span>
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
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Signal Drivers</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRegion.drivers.length === 0 ? (
                    <span className="text-xs text-zinc-500">No dominant drivers in current window</span>
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
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Recent Events</h3>
                </div>
                <div className="space-y-2">
                  {signals.length === 0 && selectedRegion.recentEvents.length === 0 ? (
                    <p className="text-xs text-zinc-500">No recent activity detected for this region.</p>
                  ) : (
                    <>
                      {selectedRegion.recentEvents.map((event, index) => (
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
                  <Waypoints className="h-4 w-4 text-zinc-200" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Simulated Cascade Effects</h3>
                </div>
                {cascadeResult ? (
                  <>
                    <p className="mb-3 text-xs leading-relaxed text-zinc-300">
                      Trigger nodes: {cascadeResult.triggerNodes.join(", ")}. Watch the network evolve across minute 0, 5, 15,
                      and 30 to evaluate cascading failure depth.
                    </p>
                    <CascadeNetwork
                      key={cascadeResult.startedAt}
                      result={cascadeResult}
                      nodes={nodes}
                      links={links}
                    />
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-white/15 bg-black/20 p-4 text-xs text-zinc-400">
                    Run a disruption simulation to visualize dependency failures and timeline spread.
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-black/28 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-zinc-200" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Assessment</h3>
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">{generateBriefingText(selectedRegion)}</p>
              </section>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
