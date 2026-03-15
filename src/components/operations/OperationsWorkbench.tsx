"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Compass, Globe2, Sparkles, TowerControl } from "lucide-react";
import { BriefingPanel } from "@/components/dashboard/BriefingPanel";
import { MapPanel } from "@/components/dashboard/MapPanel";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { LocalImpactSimulationPanel } from "@/components/simulation/LocalImpactSimulationPanel";
import type { DataMode } from "@/hooks/use-stratawatch";
import { DEMO_MODE_SCRIPT } from "@/mock-data/demo-mode";
import { useStratawatch } from "@/hooks/use-stratawatch";
import { useCommandStore } from "@/store/command-store";
import type { BuildingSimulationResult, ScenarioType } from "@/types/command-types";

interface OperationsWorkbenchProps {
  dataMode?: DataMode;
}

export function OperationsWorkbench({ dataMode = "live" }: OperationsWorkbenchProps) {
  const {
    regions,
    selectedRegion,
    selectedRegionId,
    setSelectedRegionId,
    selectedRegionSignals,
    stats,
    isLoading,
    activityFeed,
    triggerDisruption,
    lastUpdated,
    formatSignalType,
  } = useStratawatch(dataMode);

  const panel = useCommandStore((state) => state.panel);
  const setRegion = useCommandStore((state) => state.setRegion);
  const setScale = useCommandStore((state) => state.setScale);
  const setSite = useCommandStore((state) => state.setSite);
  const setBuilding = useCommandStore((state) => state.setBuilding);
  const setSimulation = useCommandStore((state) => state.setSimulation);
  const setScenario = useCommandStore((state) => state.setScenario);
  const selectedSite = useCommandStore((state) => state.selectedSite);
  const sites = useCommandStore((state) => state.sites);
  const opsFeed = useCommandStore((state) => state.opsFeed);
  const pushOpsFeed = useCommandStore((state) => state.pushOpsFeed);
  const setDemoMode = useCommandStore((state) => state.setDemoMode);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoLastAction, setDemoLastAction] = useState<string | null>(null);
  const demoTimersRef = useRef<number[]>([]);

  useEffect(() => {
    setRegion(selectedRegionId);
  }, [selectedRegionId, setRegion]);

  const filteredSites = useMemo(() => {
    if (!selectedRegionId) return [];
    return sites.filter((site) => site.regionId === selectedRegionId);
  }, [selectedRegionId, sites]);

  useEffect(() => {
    if (!selectedRegionId || filteredSites.length === 0) {
      return;
    }

    if (!selectedSite || selectedSite.regionId !== selectedRegionId) {
      setSite(filteredSites[0]?.id ?? null);
      setScale("site");
    }
  }, [filteredSites, selectedRegionId, selectedSite, setScale, setSite]);

  const clearDemoTimers = () => {
    for (const timer of demoTimersRef.current) {
      window.clearTimeout(timer);
    }
    demoTimersRef.current = [];
  };

  useEffect(
    () => () => {
      clearDemoTimers();
    },
    [],
  );

  const blendedActivity = useMemo(() => {
    return [...opsFeed, ...activityFeed]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 40);
  }, [activityFeed, opsFeed]);

  const inferScenarioFromEvent = (title: string, message: string): ScenarioType => {
    const text = `${title} ${message}`.toLowerCase();
    if (text.includes("flood")) return "flood_risk";
    if (text.includes("smoke")) return "smoke_spread";
    if (text.includes("earthquake") || text.includes("structural")) return "earthquake_damage";
    if (text.includes("evacuation")) return "evacuation_stress";
    return "fire";
  };

  const runDemoSimulation = async (buildingId: string, scenario: ScenarioType) => {
    try {
      const response = await fetch("/api/building/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildingId,
          scenario,
        }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { result: BuildingSimulationResult };
      setSimulation(payload.result);
      setScenario(scenario);
    } catch {
      // Keep demo resilient if simulation call fails.
    }
  };

  const runDemoMode = () => {
    clearDemoTimers();
    setDemoRunning(true);
    setDemoStep(0);
    setDemoLastAction("Initializing multi-scale sequence");
    setDemoMode(true);
    setScale("global");

    const firstRegion = DEMO_MODE_SCRIPT[0]?.regionId ?? "east_med";
    setSelectedRegionId(firstRegion);

    pushOpsFeed([
      {
        id: `manual-demo-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: "system",
        level: "info",
        title: "Demo Mode Started",
        message: "Deterministic multi-scale sequence started: GLOBAL -> REGIONAL -> SITE -> BUILDING.",
        regionId: selectedRegionId ?? firstRegion ?? undefined,
      },
    ]);

    DEMO_MODE_SCRIPT.forEach((event, index) => {
      const timer = window.setTimeout(() => {
        const shiftedEvent = {
          ...event,
          id: `manual-script-${index}-${Date.now()}`,
          timestamp: new Date(Date.now()).toISOString(),
        };

        setDemoStep(index + 1);
        setDemoLastAction(shiftedEvent.title);

        if (shiftedEvent.regionId) {
          setSelectedRegionId(shiftedEvent.regionId);
          setRegion(shiftedEvent.regionId);
          setScale("regional");
        }

        if (shiftedEvent.siteId) {
          setSite(shiftedEvent.siteId);
          setScale("site");
        }

        if (shiftedEvent.buildingId) {
          setBuilding(shiftedEvent.buildingId);
          setScale("building");
        }

        if (shiftedEvent.source === "cascade") {
          triggerDisruption();
        }

        if (shiftedEvent.source === "simulation" && shiftedEvent.buildingId) {
          const scenario = inferScenarioFromEvent(shiftedEvent.title, shiftedEvent.message);
          void runDemoSimulation(shiftedEvent.buildingId, scenario);
        }

        pushOpsFeed([shiftedEvent]);

        if (index === DEMO_MODE_SCRIPT.length - 1) {
          setDemoRunning(false);
          setDemoMode(false);
          setDemoLastAction("Demo sequence complete");
        }
      }, index * 2600);

      demoTimersRef.current.push(timer);
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),transparent_44%),#0b0b0f] px-3 py-3 md:px-4 md:py-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30" />

      <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-50">StrataWatch Command Center</h1>
          <p className="text-xs text-zinc-400">Global risk intelligence fused with site and building-level emergency simulation</p>
        </div>
        <div className="flex items-center gap-2">
          {dataMode === "simulated" && (
            <button
              type="button"
              onClick={runDemoMode}
              disabled={demoRunning}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {demoRunning ? "Demo Running..." : "Run Demo Mode"}
            </button>
          )}
          {dataMode === "simulated" && (demoRunning || demoLastAction) ? (
            <span className="rounded-lg border border-orange-400/35 bg-orange-500/15 px-2 py-1 text-[11px] text-orange-100">
              Demo {demoRunning ? `${demoStep}/${DEMO_MODE_SCRIPT.length}` : "Complete"}{demoLastAction ? ` · ${demoLastAction}` : ""}
            </span>
          ) : null}
          <span
            className={`rounded-lg border px-2 py-1 text-[11px] ${
              dataMode === "live"
                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
                : "border-cyan-400/35 bg-cyan-500/15 text-cyan-100"
            }`}
          >
            Data: {dataMode === "live" ? "LIVE" : "SIMULATED"}
          </span>
          <span className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-zinc-300">
            Scale: {panel.activeScale.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="relative z-10 grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)_420px]">
        <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.32 }}>
          <Sidebar stats={stats} activityFeed={blendedActivity} lastUpdated={lastUpdated} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36 }}
          className="grid min-h-[58vh] grid-cols-1 gap-3"
        >
          <MapPanel
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
            isLoading={isLoading}
          />

          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-300">
              <Compass className="h-3.5 w-3.5 text-cyan-300" />
              City / Site Drill-down
            </div>
            {selectedRegionId ? (
              filteredSites.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-3">
                  {filteredSites.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => setSite(site.id)}
                      className={`rounded-xl border p-3 text-left text-xs transition ${
                        selectedSite?.id === site.id
                          ? "border-cyan-400/40 bg-cyan-500/12 text-cyan-100"
                          : "border-white/10 bg-black/25 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      <p className="mb-1 inline-flex items-center gap-1.5 text-zinc-100">
                        <Building2 className="h-3.5 w-3.5 text-cyan-300" />
                        {site.name}
                      </p>
                      <p className="text-zinc-400">{site.city}</p>
                      <p className="mt-1 text-zinc-500">{site.buildings.length} buildings</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No mapped site clusters for this region in current seed data.</p>
              )
            ) : (
              <p className="text-xs text-zinc-500">Select a region on map to unlock site-level drill-down.</p>
            )}
          </section>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.32 }} className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-center gap-1 text-xs text-zinc-300">
              <Globe2 className="h-3.5 w-3.5 text-amber-300" />
              Regional Intelligence + Cascades
            </div>
            <BriefingPanel
              selectedRegion={selectedRegion}
              signals={selectedRegionSignals}
              formatSignalType={formatSignalType}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-center gap-1 text-xs text-zinc-300">
              <TowerControl className="h-3.5 w-3.5 text-red-300" />
              Building-Level Tactical Simulation
            </div>
            <LocalImpactSimulationPanel />
          </div>
        </motion.div>
      </div>
    </main>
  );
}
