"use client";

import { AlertTriangle, Bolt, RadioTower } from "lucide-react";
import { CascadeNetwork } from "@/components/dashboard/CascadeNetwork";
import type { CascadeResult, RegionState, SystemLink, SystemNode } from "@/lib/types";

interface CascadeFocusPanelProps {
  selectedRegion: RegionState | null;
  cascadeResult: CascadeResult | null;
  onSimulate: () => void;
  nodes: SystemNode[];
  links: SystemLink[];
}

export function CascadeFocusPanel({
  selectedRegion,
  cascadeResult,
  onSimulate,
  nodes,
  links,
}: CascadeFocusPanelProps) {
  return (
    <section className="h-full min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900/70 p-4 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Cascade Simulator</h2>
          <p className="text-xs text-zinc-400">Dependency stress-test timeline for critical systems</p>
        </div>
        <button
          type="button"
          onClick={onSimulate}
          disabled={!selectedRegion}
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-400/50 bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-200 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Bolt className="h-3.5 w-3.5" />
          Simulate
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="mb-1 inline-flex items-center gap-1 text-xs text-zinc-400">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-300" />
            Selected Region
          </p>
          <p className="text-sm text-zinc-100">{selectedRegion?.name ?? "Select a region on map"}</p>
          <p className="mt-1 text-xs text-zinc-400">
            Risk: {selectedRegion ? `${Math.round(selectedRegion.risk * 100)}%` : "-"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="mb-1 inline-flex items-center gap-1 text-xs text-zinc-400">
            <RadioTower className="h-3.5 w-3.5 text-red-300" />
            Monitored Systems
          </p>
          <p className="text-sm text-zinc-100">{nodes.length} nodes / {links.length} links</p>
          <p className="mt-1 text-xs text-zinc-400">Timeline: minute 0, 5, 15, 30</p>
        </div>
      </div>

      {cascadeResult ? (
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <CascadeNetwork result={cascadeResult} nodes={nodes} links={links} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-zinc-400">
          Click a region, then run simulation to visualize cascading failure propagation.
        </div>
      )}
    </section>
  );
}
