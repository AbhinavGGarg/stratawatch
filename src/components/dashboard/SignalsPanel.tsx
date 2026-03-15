"use client";

import { ActivitySquare, Globe2, Radar } from "lucide-react";
import type { RegionState, Signal } from "@/lib/types";

interface SignalsPanelProps {
  signals: Signal[];
  regions: RegionState[];
  formatSignalType: (type: Signal["type"]) => string;
}

const sourceLabel: Record<Signal["source"], string> = {
  simulated: "Simulated",
  usgs: "USGS",
  eonet: "NASA EONET",
  open_meteo: "Open-Meteo",
};

const sourceTone: Record<Signal["source"], string> = {
  simulated: "text-zinc-300 border-zinc-600/40 bg-zinc-700/20",
  usgs: "text-red-200 border-red-500/40 bg-red-500/10",
  eonet: "text-orange-200 border-orange-500/40 bg-orange-500/10",
  open_meteo: "text-cyan-200 border-cyan-500/40 bg-cyan-500/10",
};

const formatTimeAgo = (isoTimestamp: string): string => {
  const deltaMs = Date.now() - new Date(isoTimestamp).getTime();
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.round(deltaMinutes / 60);
  return `${deltaHours}h ago`;
};

export function SignalsPanel({ signals, regions, formatSignalType }: SignalsPanelProps) {
  const sortedSignals = [...signals]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 16);

  const bySource = sortedSignals.reduce<Record<Signal["source"], number>>(
    (acc, signal) => {
      acc[signal.source] += 1;
      return acc;
    },
    { simulated: 0, usgs: 0, eonet: 0, open_meteo: 0 },
  );

  const topRiskRegions = [...regions].sort((a, b) => b.risk - a.risk).slice(0, 5);

  return (
    <section className="h-full min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900/70 p-4 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Live Civilian Alerts</h2>
          <p className="text-xs text-zinc-400">Real-time conflict pressure indicators and disruption alerts</p>
        </div>
        <span className="rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-xs text-zinc-300">
          {sortedSignals.length} recent signals
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-400">
            <Radar className="h-3.5 w-3.5" />
            Signal Sources
          </p>
          <div className="space-y-1.5 text-xs text-zinc-300">
            <p>USGS: {bySource.usgs}</p>
            <p>NASA EONET: {bySource.eonet}</p>
            <p>Open-Meteo: {bySource.open_meteo}</p>
            <p>Simulated: {bySource.simulated}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-400">
            <Globe2 className="h-3.5 w-3.5" />
            Top Risk Regions
          </p>
          <div className="space-y-1.5 text-xs text-zinc-300">
            {topRiskRegions.map((region) => (
              <p key={region.id}>
                {region.name}: <span className="text-zinc-100">{Math.round(region.risk * 100)}%</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/25">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.7fr] border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500">
          <span>Region</span>
          <span>Threat Type</span>
          <span>Source</span>
          <span>Severity</span>
        </div>

        <div className="max-h-[460px] overflow-y-auto">
          {sortedSignals.map((signal) => {
            const regionName = regions.find((region) => region.id === signal.regionId)?.name ?? signal.regionId;
            return (
              <div
                key={signal.id}
                className="grid grid-cols-[1.2fr_1fr_0.8fr_0.7fr] items-center gap-2 border-b border-white/5 px-3 py-2 text-xs"
              >
                <div>
                  <p className="text-zinc-200">{regionName}</p>
                  <p className="text-[10px] text-zinc-500">{formatTimeAgo(signal.timestamp)}</p>
                </div>
                <p className="text-zinc-300">{formatSignalType(signal.type)}</p>
                <span className={`w-fit rounded-full border px-2 py-0.5 text-[10px] ${sourceTone[signal.source]}`}>
                  {sourceLabel[signal.source]}
                </span>
                <p className="inline-flex items-center gap-1 text-zinc-200">
                  <ActivitySquare className="h-3.5 w-3.5 text-orange-300" />
                  {Math.round(signal.severity * 100)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
