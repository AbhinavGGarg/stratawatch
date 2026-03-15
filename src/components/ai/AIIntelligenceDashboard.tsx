"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  ChartLine,
  MapPin,
  Route,
  Sparkles,
  TriangleAlert,
  Waves,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MapPanel } from "@/components/dashboard/MapPanel";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { PredictiveCascadeGraph } from "@/components/ai/PredictiveCascadeGraph";
import { useStratawatch } from "@/hooks/use-stratawatch";
import { SITE_SEED } from "@/mock-data/site-seed";
import type { AIIntelligenceSnapshot } from "@/lib/ai/types";
import type { ScenarioType } from "@/types/command-types";

const scenarioOptions: Array<{ id: ScenarioType; label: string }> = [
  { id: "fire", label: "Fire" },
  { id: "earthquake_damage", label: "Earthquake" },
  { id: "flood_risk", label: "Flood" },
  { id: "smoke_spread", label: "Smoke" },
];

const asPercent = (value: number): string => `${Math.round(value * 100)}%`;

export function AIIntelligenceDashboard() {
  const {
    regions,
    signals,
    selectedRegion,
    selectedRegionId,
    setSelectedRegionId,
    stats,
    isLoading,
    activityFeed,
    lastUpdated,
  } = useStratawatch("live");

  const [snapshot, setSnapshot] = useState<AIIntelligenceSnapshot | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [scenarioType, setScenarioType] = useState<ScenarioType>("earthquake_damage");
  const [errorText, setErrorText] = useState<string | null>(null);

  const selectedSite = useMemo(
    () => SITE_SEED.find((site) => site.regionId === selectedRegionId) ?? null,
    [selectedRegionId],
  );

  const selectedBuilding = selectedSite?.buildings[0] ?? null;

  const fetchSnapshot = useCallback(async () => {
    if (!selectedRegion) {
      return;
    }

    setIsAnalyzing(true);
    setErrorText(null);

    try {
      const response = await fetch("/api/ai/intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedRegionId: selectedRegion.id,
          allRegions: regions,
          signals: signals.slice(0, 120),
          demoMode,
          scenarioType,
          buildingId: selectedBuilding?.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI snapshot failed (${response.status})`);
      }

      const payload = (await response.json()) as { snapshot: AIIntelligenceSnapshot };
      setSnapshot(payload.snapshot);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unable to run AI snapshot");
    } finally {
      setIsAnalyzing(false);
    }
  }, [demoMode, regions, scenarioType, selectedBuilding?.id, selectedRegion, signals]);

  useEffect(() => {
    void fetchSnapshot();
    const intervalId = window.setInterval(() => {
      void fetchSnapshot();
    }, 12000);

    return () => window.clearInterval(intervalId);
  }, [fetchSnapshot]);

  const anomalyRegionIds = useMemo(
    () => snapshot?.anomalyHotspots.map((hotspot) => hotspot.regionId) ?? [],
    [snapshot],
  );

  const sectorProbabilities = snapshot?.cascadePrediction.sectorProbabilities;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.12),transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.12),transparent_48%),#0b0b0f] px-3 py-3 md:px-4 md:py-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:52px_52px] opacity-35" />

      <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-50">StrataWatch AI Intelligence Layer</h1>
          <p className="text-xs text-zinc-400">AI/ML forecasting, anomaly detection, and responder-grade decision support</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDemoMode((previous) => !previous)}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              demoMode
                ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                : "border-white/15 bg-black/25 text-zinc-300 hover:bg-white/10"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {demoMode ? "Demo Mode On" : "Run Demo Mode"}
          </button>

          <button
            type="button"
            onClick={() => void fetchSnapshot()}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1 rounded-lg border border-orange-400/40 bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-100 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Activity className="h-3.5 w-3.5" />
            {isAnalyzing ? "Running AI..." : "Refresh AI Snapshot"}
          </button>
        </div>
      </div>

      <div className="relative z-10 grid min-h-[calc(100vh-7.8rem)] grid-cols-1 gap-3 xl:grid-cols-[310px_minmax(0,1fr)_430px]">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Sidebar stats={stats} activityFeed={activityFeed} lastUpdated={lastUpdated} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34 }}
          className="grid min-h-[56vh] grid-cols-1 gap-3"
        >
          <MapPanel
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
            isLoading={isLoading || isAnalyzing}
            hotspotRegionIds={anomalyRegionIds}
          />

          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
              <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-200">
                <TriangleAlert className="h-3.5 w-3.5 text-amber-300" />
                Emerging Risk Clusters
              </p>
              <div className="space-y-1.5">
                {(snapshot?.anomalyHotspots ?? []).slice(0, 5).map((hotspot) => (
                  <div key={hotspot.regionId} className="rounded-lg border border-white/10 bg-black/25 p-2">
                    <p className="text-xs font-medium text-zinc-100">{hotspot.regionName}</p>
                    <p className="text-[11px] text-zinc-400">
                      Score {asPercent(hotspot.anomalyScore)} · Confidence {asPercent(hotspot.confidence)}
                    </p>
                  </div>
                ))}
                {(snapshot?.anomalyHotspots.length ?? 0) === 0 ? (
                  <p className="text-xs text-zinc-500">No elevated anomaly clusters in the latest snapshot.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
              <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-200">
                <Waves className="h-3.5 w-3.5 text-cyan-300" />
                Social Signal Detection
              </p>
              <div className="space-y-2">
                {(snapshot?.socialSignals ?? []).map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-black/25 p-2">
                    <p className="text-xs text-zinc-200">{item.message}</p>
                    <p className="text-[11px] text-zinc-400">
                      {item.regionName} · {item.trend} · confidence {asPercent(item.confidence)}
                    </p>
                  </div>
                ))}
                {(snapshot?.socialSignals.length ?? 0) === 0 ? (
                  <p className="text-xs text-zinc-500">No social surge indicators in the current window.</p>
                ) : null}
              </div>
            </section>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.34 }}
          className="h-full min-h-0 space-y-3 overflow-y-auto"
        >
          <section className="rounded-2xl border border-white/10 bg-zinc-900/72 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="inline-flex items-center gap-1 text-xs font-medium text-zinc-200">
                <Bot className="h-3.5 w-3.5 text-orange-300" />
                AI Intelligence Analyst Agent
              </p>
              <span className="rounded-md border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                {snapshot?.analystBrief.confidenceLabel ?? "Medium"}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-300">
              {snapshot?.analystBrief.executiveBrief ?? "Running analyst reasoning..."}
            </p>
            <div className="mt-2 space-y-1">
              {(snapshot?.analystBrief.likelyDownstreamEffects ?? []).map((effect) => (
                <p key={effect} className="text-[11px] text-zinc-400">
                  • {effect}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/72 p-3">
            <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-200">
              <Brain className="h-3.5 w-3.5 text-red-300" />
              Predictive Cascade AI
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-red-200">
                Power: {asPercent(sectorProbabilities?.powerGridFailure ?? 0)}
              </div>
              <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-2 py-1.5 text-orange-200">
                Hospitals: {asPercent(sectorProbabilities?.hospitalOverload ?? 0)}
              </div>
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-amber-200">
                Transport: {asPercent(sectorProbabilities?.transportDisruption ?? 0)}
              </div>
              <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2 py-1.5 text-cyan-200">
                Telecom/Data: {asPercent(sectorProbabilities?.telecomOutage ?? 0)}
              </div>
            </div>

            <PredictiveCascadeGraph
              nodes={snapshot?.cascadePrediction.nodes ?? []}
              edges={snapshot?.cascadePrediction.edges ?? []}
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/72 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="inline-flex items-center gap-1 text-xs font-medium text-zinc-200">
                <ChartLine className="h-3.5 w-3.5 text-emerald-300" />
                Regional Risk Forecast (Next 24h)
              </p>
              <select
                value={scenarioType}
                onChange={(event) => setScenarioType(event.target.value as ScenarioType)}
                className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-zinc-300"
              >
                {scenarioOptions.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-40 rounded-xl border border-white/10 bg-black/25 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={snapshot?.riskForecast.points ?? []}
                  margin={{ top: 8, right: 10, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(161,161,170,0.16)" vertical={false} />
                  <XAxis dataKey="stepLabel" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} domain={[0, 1]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => {
                      const numeric = Array.isArray(value) ? Number(value[0]) : Number(value ?? 0);
                      return `${Math.round(numeric * 100)}%`;
                    }}
                  />
                  <Line type="monotone" dataKey="upperBound" stroke="#f97316" strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="predictedRisk" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="lowerBound" stroke="#38bdf8" strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/72 p-3">
            <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-200">
              <MapPin className="h-3.5 w-3.5 text-rose-300" />
              Building Risk + Evacuation AI
            </p>

            {snapshot?.buildingRisk ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-white/10 bg-black/25 p-2 text-xs text-zinc-300">
                  <p className="text-zinc-100">{snapshot.buildingRisk.buildingName}</p>
                  <p>
                    Risk score {asPercent(snapshot.buildingRisk.riskScore)} · {snapshot.buildingRisk.classification.toUpperCase()}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-2 text-xs text-zinc-300">
                  <p className="mb-1 inline-flex items-center gap-1 text-zinc-100">
                    <Route className="h-3.5 w-3.5 text-cyan-300" />
                    Optimal Evacuation Route
                  </p>
                  <p>{snapshot.evacuationPlan?.route.join(" -> ") ?? "Unavailable"}</p>
                  <p className="text-zinc-400">
                    ETA {snapshot.evacuationPlan?.estimatedMinutes ?? 0} min · confidence {asPercent(snapshot.evacuationPlan?.confidence ?? 0)}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/25 p-2 text-xs text-zinc-300">
                  <p className="mb-1 inline-flex items-center gap-1 text-zinc-100">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                    Multi-Agent Consensus
                  </p>
                  <p>Fire severity: {snapshot.multiAgentConsensus?.fireSeverity ?? "medium"}</p>
                  <p>Structural risk: {snapshot.multiAgentConsensus?.structuralRiskZone ?? "n/a"}</p>
                  <p>Entry: {snapshot.multiAgentConsensus?.recommendedEntry ?? "n/a"}</p>
                  <p>Evacuation: {snapshot.multiAgentConsensus?.evacuationRoute ?? "n/a"}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No seeded building is mapped for the selected region.</p>
            )}
          </section>

          {errorText ? (
            <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{errorText}</section>
          ) : null}
        </motion.aside>
      </div>
    </main>
  );
}
