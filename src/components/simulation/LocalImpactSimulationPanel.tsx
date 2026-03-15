"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Building2, Play, ShieldAlert, Zap } from "lucide-react";
import { SCENARIO_PRESETS } from "@/mock-data/site-seed";
import { useCommandStore } from "@/store/command-store";
import type { BuildingSimulationResult, ScenarioType } from "@/types/command-types";

const BuildingScene = dynamic(
  () => import("@/components/simulation/BuildingScene").then((mod) => mod.BuildingScene),
  { ssr: false },
);

interface BatchSimulationResult {
  buildingId: string;
  buildingName: string;
  result: BuildingSimulationResult;
}

export function LocalImpactSimulationPanel() {
  const sites = useCommandStore((state) => state.sites);
  const selectedSite = useCommandStore((state) => state.selectedSite);
  const selectedBuildingId = useCommandStore((state) => state.selectedBuildingId);
  const setSite = useCommandStore((state) => state.setSite);
  const setBuilding = useCommandStore((state) => state.setBuilding);
  const latestSimulation = useCommandStore((state) => state.latestSimulation);
  const setSimulation = useCommandStore((state) => state.setSimulation);
  const setScenario = useCommandStore((state) => state.setScenario);

  const [isRunning, setIsRunning] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("fire");
  const [batchResults, setBatchResults] = useState<BatchSimulationResult[]>([]);

  const selectedBuilding = useMemo(
    () => selectedSite?.buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [selectedSite, selectedBuildingId],
  );

  const runForBuilding = async (buildingId: string): Promise<BuildingSimulationResult> => {
    const response = await fetch("/api/building/simulate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        buildingId,
        scenario: activeScenario,
      }),
    });

    if (!response.ok) {
      throw new Error("Simulation request failed");
    }

    const payload = (await response.json()) as { result: BuildingSimulationResult };
    return payload.result;
  };

  const runSelectedSimulation = async () => {
    const targetBuilding = selectedBuilding ?? selectedSite?.buildings[0] ?? null;
    if (!targetBuilding) {
      return;
    }

    if (!selectedBuilding || selectedBuilding.id !== targetBuilding.id) {
      setBuilding(targetBuilding.id);
    }

    setIsRunning(true);
    setScenario(activeScenario);

    try {
      const result = await runForBuilding(targetBuilding.id);
      setBatchResults([]);
      setSimulation(result);
    } finally {
      setIsRunning(false);
    }
  };

  const runSiteBatchSimulation = async () => {
    if (!selectedSite || selectedSite.buildings.length === 0) {
      return;
    }

    setIsRunning(true);
    setScenario(activeScenario);

    try {
      const results = await Promise.all(
        selectedSite.buildings.map(async (building) => ({
          buildingId: building.id,
          buildingName: building.name,
          result: await runForBuilding(building.id),
        })),
      );

      setBatchResults(results);

      const activeResult =
        results.find((item) => item.buildingId === (selectedBuilding?.id ?? "")) ?? results[0] ?? null;
      if (activeResult) {
        setBuilding(activeResult.buildingId);
        setSimulation(activeResult.result);
      }
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    setSimulation(null);
    setBatchResults([]);
  }, [activeScenario, selectedBuildingId, selectedSite?.id, setSimulation]);

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/72 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Local Impact Simulation</h3>
          <p className="text-xs text-zinc-400">
            Building-level emergency simulation integrated into StrataWatch.
            {selectedSite ? ` Active site: ${selectedSite.name}.` : " Choose a site to begin."}
          </p>
          {selectedBuilding ? (
            <p className="mt-1 text-[11px] text-zinc-500">
              Target: {selectedBuilding.name} · Scenario: {" "}
              {SCENARIO_PRESETS.find((preset) => preset.type === activeScenario)?.label ?? activeScenario}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={runSelectedSimulation}
            disabled={isRunning || (!selectedBuilding && !selectedSite?.buildings[0])}
            className="inline-flex items-center gap-1 rounded-lg border border-orange-400/40 bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-100 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? "Simulating..." : "Run Selected"}
          </button>

          <button
            type="button"
            onClick={runSiteBatchSimulation}
            disabled={isRunning || !selectedSite || selectedSite.buildings.length === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/14 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/22 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            Run All In Site
          </button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">Site / Building</p>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {sites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => setSite(site.id)}
                className={`rounded-md border px-2 py-1 text-[11px] transition ${
                  selectedSite?.id === site.id
                    ? "border-cyan-400/45 bg-cyan-500/16 text-cyan-100"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                {site.city}
              </button>
            ))}
          </div>

          {selectedSite ? (
            <>
              <p className="text-sm text-zinc-100">{selectedSite.name}</p>
              <div className="mt-2 space-y-1.5">
                {selectedSite.buildings.map((building) => (
                  <button
                    key={building.id}
                    type="button"
                    onClick={() => setBuilding(building.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-xs transition ${
                      selectedBuildingId === building.id
                        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {building.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">{building.type}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500">Select a site cluster to target a building simulation.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">Scenario</p>
          <div className="space-y-1.5">
            {SCENARIO_PRESETS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setActiveScenario(scenario.type)}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-xs transition ${
                  activeScenario === scenario.type
                    ? "border-orange-400/40 bg-orange-500/15 text-orange-100"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                <span>{scenario.label}</span>
                <span>{Math.round(scenario.severity * 100)}%</span>
              </button>
            ))}
          </div>

          {batchResults.length > 0 ? (
            <div className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-2">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-cyan-200">Batch Results</p>
              <div className="space-y-1">
                {batchResults.map((item) => (
                  <button
                    key={item.buildingId}
                    type="button"
                    onClick={() => {
                      setBuilding(item.buildingId);
                      setSimulation(item.result);
                    }}
                    className="flex w-full items-center justify-between rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-cyan-100 hover:bg-white/10"
                  >
                    <span>{item.buildingName}</span>
                    <span>{Math.round(item.result.summary.severity * 100)}%</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectedBuilding && latestSimulation ? (
        <>
          <BuildingScene
            key={`${selectedBuilding.id}-${latestSimulation.scenario.type}-${latestSimulation.scenario.id}`}
            building={selectedBuilding}
            zones={latestSimulation.zones}
            scenarioType={latestSimulation.scenario.type}
          />

          <div className="grid gap-2 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <p className="mb-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
                <ShieldAlert className="h-3.5 w-3.5 text-red-300" />
                Incident Summary
              </p>
              <div className="space-y-1 text-xs text-zinc-300">
                <p>Severity: {Math.round(latestSimulation.summary.severity * 100)}%</p>
                <p>Confidence: {Math.round(latestSimulation.summary.confidence * 100)}%</p>
                <p>Recommended Entry: {latestSimulation.summary.recommendedEntry}</p>
                <p>Evacuation Route: {latestSimulation.summary.recommendedEvacuation}</p>
                <p>No-Go Areas: {latestSimulation.summary.noGoAreas.join(", ")}</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <p className="mb-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
                <Bot className="h-3.5 w-3.5 text-purple-300" />
                AI Agent Consensus
              </p>
              <div className="space-y-1.5">
                {latestSimulation.agentAssessments.slice(0, 3).map((agent) => (
                  <div key={agent.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <p className="text-xs font-medium text-zinc-100">{agent.agent.replaceAll("_", " ")}</p>
                    <p className="text-[11px] text-zinc-400">{agent.findings[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-xs text-zinc-500">
          <p className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
            Select a site and building, then run a scenario to generate 3D hazard overlays and incident recommendations.
          </p>
        </div>
      )}
    </section>
  );
}
