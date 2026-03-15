import { getNetworkTemplate } from "@/lib/cascade-engine";
import { formatSignalType } from "@/lib/signal-generator";
import type { RegionState, Signal } from "@/lib/types";
import type { AgentType, Building, ScenarioType } from "@/types/command-types";
import { createGlobalAnalystPrompt } from "@/ai/prompts/global-analyst";
import type {
  AIEngineInput,
  AIIntelligenceSnapshot,
  AnalystBrief,
  AnomalyHotspot,
  BuildingRiskPrediction,
  CascadePrediction,
  EvacuationRoutePlan,
  FusedSignal,
  MultiAgentConsensus,
  RiskForecast,
  SocialSignalAlert,
} from "@/lib/ai/types";

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));

const mean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const stdDev = (values: number[]): number => {
  if (values.length <= 1) {
    return 0;
  }

  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const sigmoid = (value: number): number => 1 / (1 + Math.exp(-value));

const nowIso = (): string => new Date().toISOString();

const hash = (value: string): number => {
  let h = 0;
  for (let index = 0; index < value.length; index += 1) {
    h = (h << 5) - h + value.charCodeAt(index);
    h |= 0;
  }
  return Math.abs(h);
};

const seedRand = (seed: number): (() => number) => {
  let state = seed || 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state & 2147483647) / 2147483647;
  };
};

const sourceConfidence: Record<Signal["source"], number> = {
  simulated: 0.61,
  usgs: 0.92,
  eonet: 0.84,
  open_meteo: 0.8,
};

const typeSectors: Record<Signal["type"], string[]> = {
  shipping_congestion: ["transport", "logistics", "fuel"],
  extreme_weather: ["transport", "power", "civilian_mobility"],
  news_sentiment_spike: ["public_safety", "communications"],
  infrastructure_disruption: ["power", "healthcare", "telecom"],
};

const watchActions: Record<Signal["type"], string[]> = {
  shipping_congestion: ["Avoid major corridor chokepoints", "Plan alternate transit windows"],
  extreme_weather: ["Avoid low-visibility routes", "Monitor shelter and route advisories"],
  news_sentiment_spike: ["Cross-verify information sources", "Avoid fast-changing gathering zones"],
  infrastructure_disruption: ["Prepare backup communications", "Avoid infrastructure-adjacent routes"],
};

const fuseSignals = (signals: Signal[]): FusedSignal[] => {
  const now = Date.now();

  return signals.map((signal) => {
    const ageMinutes = (now - new Date(signal.timestamp).getTime()) / 60000;
    const recencyFactor = clamp(Math.exp(-Math.max(0, ageMinutes) / 280));
    const confidence = clamp(sourceConfidence[signal.source] * 0.68 + recencyFactor * 0.2 + signal.severity * 0.12);

    return {
      id: signal.id,
      type: signal.type,
      severity: clamp(signal.severity),
      confidence,
      timestamp: signal.timestamp,
      coordinates: signal.location,
      regionId: signal.regionId,
      source: signal.source,
      provenance: signal.source === "simulated" ? "scenario_engine" : `${signal.source}_feed`,
      summary: signal.details ?? `${formatSignalType(signal.type)} observed`,
      tags: [signal.type, signal.source, confidence > 0.75 ? "high_confidence" : "medium_confidence"],
      affectedSectors: typeSectors[signal.type],
      recommendedWatchActions: watchActions[signal.type],
    };
  });
};

const detectAnomalyHotspots = (fusedSignals: FusedSignal[], regions: RegionState[]): AnomalyHotspot[] => {
  const now = Date.now();
  const grouped = new Map<string, FusedSignal[]>();

  for (const signal of fusedSignals) {
    const bucket = grouped.get(signal.regionId) ?? [];
    bucket.push(signal);
    grouped.set(signal.regionId, bucket);
  }

  const featureRows = regions.map((region) => {
    const regionSignals = grouped.get(region.id) ?? [];
    const recentWindow = regionSignals.filter(
      (signal) => now - new Date(signal.timestamp).getTime() <= 1000 * 60 * 45,
    );
    const baselineWindow = regionSignals.filter(
      (signal) => now - new Date(signal.timestamp).getTime() <= 1000 * 60 * 240,
    );

    const count = recentWindow.length;
    const weightedSeverity = mean(recentWindow.map((signal) => signal.severity * signal.confidence));
    const velocity = baselineWindow.length === 0 ? count : count / Math.max(1, baselineWindow.length);

    return {
      region,
      count,
      weightedSeverity,
      velocity,
      signals: regionSignals,
    };
  });

  const counts = featureRows.map((row) => row.count);
  const severities = featureRows.map((row) => row.weightedSeverity);
  const velocities = featureRows.map((row) => row.velocity);

  const countMean = mean(counts);
  const severityMean = mean(severities);
  const velocityMean = mean(velocities);

  const countStd = stdDev(counts) || 1;
  const severityStd = stdDev(severities) || 1;
  const velocityStd = stdDev(velocities) || 1;

  return featureRows
    .map((row) => {
      const zCount = (row.count - countMean) / countStd;
      const zSeverity = (row.weightedSeverity - severityMean) / severityStd;
      const zVelocity = (row.velocity - velocityMean) / velocityStd;
      const anomalyScore = clamp(sigmoid(zCount * 0.9 + zSeverity * 0.75 + zVelocity * 0.55));
      const confidence = clamp(0.42 + anomalyScore * 0.5 + row.region.risk * 0.08);

      const dominantSignals = [...new Set(row.signals.map((signal) => signal.type))].slice(0, 3);

      return {
        regionId: row.region.id,
        regionName: row.region.name,
        anomalyScore,
        confidence,
        signalCount: row.count,
        dominantSignals,
        summary: `${row.region.name} shows atypical signal clustering and acceleration`,
      } satisfies AnomalyHotspot;
    })
    .filter((hotspot) => hotspot.anomalyScore >= 0.46)
    .sort((left, right) => right.anomalyScore - left.anomalyScore)
    .slice(0, 8);
};

const averageSeverity = (signals: FusedSignal[], regionId: string): number => {
  const regionSignals = signals.filter((signal) => signal.regionId === regionId);
  return mean(regionSignals.map((signal) => signal.severity));
};

const predictCascade = (
  selectedRegion: RegionState,
  fusedSignals: FusedSignal[],
  anomalyHotspots: AnomalyHotspot[],
): CascadePrediction => {
  const { nodes, links } = getNetworkTemplate();
  const seededRandom = seedRand(hash(`${selectedRegion.id}:${Math.round(selectedRegion.risk * 1000)}`));
  const localSignalSeverity = averageSeverity(fusedSignals, selectedRegion.id);
  const hotspotBoost = anomalyHotspots.some((hotspot) => hotspot.regionId === selectedRegion.id)
    ? 0.08
    : 0;

  const runs = 180;
  const failureCounts = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const edgeActivationCounts = new Map<string, number>(
    links.map((link) => [`${link.source}->${link.target}`, 0]),
  );

  for (let run = 0; run < runs; run += 1) {
    const failed = new Set<string>();
    const stressed = new Map<string, number>();

    const triggers = [...nodes]
      .sort((a, b) => b.criticality - a.criticality)
      .slice(0, selectedRegion.risk >= 0.72 ? 3 : 2)
      .map((node) => node.id);

    for (const triggerId of triggers) {
      failed.add(triggerId);
    }

    for (let step = 0; step < 4; step += 1) {
      for (const link of links) {
        const sourceFailed = failed.has(link.source);
        const sourceStress = stressed.get(link.source) ?? 0;
        if (!sourceFailed && sourceStress < 0.48) {
          continue;
        }

        const key = `${link.source}->${link.target}`;
        const base =
          selectedRegion.risk * 0.44 +
          localSignalSeverity * 0.26 +
          link.weight * 0.2 +
          hotspotBoost +
          (sourceFailed ? 0.08 : sourceStress * 0.12);

        const activationProbability = clamp(base);
        const roll = seededRandom();

        if (roll <= activationProbability) {
          edgeActivationCounts.set(key, (edgeActivationCounts.get(key) ?? 0) + 1);
          if (roll <= activationProbability * 0.64) {
            failed.add(link.target);
          } else {
            stressed.set(link.target, Math.max(stressed.get(link.target) ?? 0, activationProbability));
          }
        }
      }
    }

    for (const failedNodeId of failed) {
      failureCounts.set(failedNodeId, (failureCounts.get(failedNodeId) ?? 0) + 1);
    }
  }

  const predictedNodes = nodes.map((node) => {
    const probability = clamp((failureCounts.get(node.id) ?? 0) / runs);
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      failureProbability: probability,
      stressLevel: clamp(node.criticality * 0.45 + probability * 0.55),
    };
  });

  const predictedEdges = links
    .map((link) => {
      const key = `${link.source}->${link.target}`;
      const probability = clamp((edgeActivationCounts.get(key) ?? 0) / runs);
      return {
        source: link.source,
        target: link.target,
        probability,
        delayMinutes: Math.max(4, Math.round((1 - link.weight) * 18 + seededRandom() * 7)),
      };
    })
    .filter((edge) => edge.probability >= 0.18)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 20);

  const byType = (type: string): number =>
    mean(predictedNodes.filter((node) => node.type === type).map((node) => node.failureProbability));

  const transportLike = mean(
    predictedNodes
      .filter((node) => node.type === "transport" || node.type === "port")
      .map((node) => node.failureProbability),
  );

  return {
    regionId: selectedRegion.id,
    generatedAt: nowIso(),
    horizonMinutes: 30,
    sectorProbabilities: {
      powerGridFailure: byType("power"),
      hospitalOverload: byType("hospital"),
      transportDisruption: transportLike,
      telecomOutage: byType("data"),
      dataCenterInstability: byType("data"),
    },
    nodes: predictedNodes,
    edges: predictedEdges,
  };
};

const forecastRisk = (
  selectedRegion: RegionState,
  anomalyHotspots: AnomalyHotspot[],
  cascadePrediction: CascadePrediction,
): RiskForecast => {
  const history = selectedRegion.riskHistory.slice(-12).map((point) => point.risk);
  const lastRisk = history[history.length - 1] ?? selectedRegion.risk;
  const baseline = mean(history.length > 0 ? history : [selectedRegion.risk]);
  const slope = history.length > 1 ? (history[history.length - 1] - history[0]) / history.length : 0;
  const localAnomaly = anomalyHotspots.find((hotspot) => hotspot.regionId === selectedRegion.id);
  const anomalyBoost = localAnomaly ? localAnomaly.anomalyScore * 0.18 : 0;
  const cascadeBoost = mean(Object.values(cascadePrediction.sectorProbabilities)) * 0.13;

  const points = Array.from({ length: 6 }, (_, index) => {
    const step = index + 1;
    const projected = clamp(
      lastRisk * 0.72 + baseline * 0.16 + slope * step * 0.8 + anomalyBoost + cascadeBoost * (step / 6),
    );

    const timestamp = new Date(Date.now() + step * 4 * 60 * 60 * 1000).toISOString();
    const uncertainty = 0.06 + step * 0.012;

    return {
      timestamp,
      stepLabel: `+${step * 4}h`,
      predictedRisk: projected,
      lowerBound: clamp(projected - uncertainty),
      upperBound: clamp(projected + uncertainty),
    };
  });

  return {
    regionId: selectedRegion.id,
    horizonHours: 24,
    points,
  };
};

const estimateBuildingRisk = (
  building: Building | null | undefined,
  selectedRegion: RegionState,
  scenarioType: ScenarioType,
): BuildingRiskPrediction | null => {
  if (!building) {
    return null;
  }

  const heightFactor = clamp(building.estimatedHeightMeters / 85);
  const occupancyFactor = clamp(building.occupancy / 520);
  const ageProxy = clamp((hash(building.id) % 45) / 45);

  const materialProxy =
    building.type === "hospital"
      ? 0.42
      : building.type === "data_center"
        ? 0.36
        : building.type === "warehouse"
          ? 0.58
          : 0.5;

  const scenarioFactor: Record<ScenarioType, number> = {
    fire: 0.76,
    earthquake_damage: 0.84,
    flood_risk: 0.69,
    smoke_spread: 0.63,
    structural_compromise: 0.88,
    evacuation_stress: 0.67,
  };

  const riskScore = clamp(
    heightFactor * 0.22 +
      occupancyFactor * 0.2 +
      ageProxy * 0.16 +
      materialProxy * 0.12 +
      selectedRegion.risk * 0.16 +
      scenarioFactor[scenarioType] * 0.14,
  );

  const classification =
    riskScore >= 0.82 ? "critical" : riskScore >= 0.66 ? "high" : riskScore >= 0.44 ? "moderate" : "low";

  return {
    buildingId: building.id,
    buildingName: building.name,
    scenarioType,
    riskScore,
    confidence: clamp(0.62 + riskScore * 0.3),
    classification,
    keyDrivers: [
      `Structure profile factor: ${(heightFactor * 100).toFixed(0)}%`,
      `Occupancy pressure factor: ${(occupancyFactor * 100).toFixed(0)}%`,
      `Regional hazard coupling: ${(selectedRegion.risk * 100).toFixed(0)}%`,
      `Scenario multiplier: ${(scenarioFactor[scenarioType] * 100).toFixed(0)}%`,
    ],
    zoneScores: [
      { zone: "Core utility shafts", score: clamp(riskScore * 0.92) },
      { zone: "Stairwell/egress network", score: clamp(riskScore * 0.78) },
      { zone: "External access apron", score: clamp(riskScore * 0.56) },
    ],
  };
};

interface RouteNode {
  id: string;
  label: string;
}

interface RouteEdge {
  from: string;
  to: string;
  cost: number;
}

const findBestRoute = (
  nodes: RouteNode[],
  edges: RouteEdge[],
  startId: string,
  goalIds: Set<string>,
): { path: string[]; cost: number } => {
  const distances = new Map<string, number>(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
  const previous = new Map<string, string | null>(nodes.map((node) => [node.id, null]));
  const queue = new Set(nodes.map((node) => node.id));

  distances.set(startId, 0);

  while (queue.size > 0) {
    let currentId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const nodeId of queue) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (distance < bestDistance) {
        bestDistance = distance;
        currentId = nodeId;
      }
    }

    if (!currentId) {
      break;
    }

    queue.delete(currentId);

    if (goalIds.has(currentId)) {
      const path: string[] = [];
      let cursor: string | null = currentId;
      while (cursor) {
        path.unshift(cursor);
        cursor = previous.get(cursor) ?? null;
      }
      return { path, cost: bestDistance };
    }

    for (const edge of edges.filter((candidate) => candidate.from === currentId)) {
      if (!queue.has(edge.to)) {
        continue;
      }

      const currentDistance = distances.get(currentId) ?? Number.POSITIVE_INFINITY;
      const candidateDistance = currentDistance + edge.cost;

      if (candidateDistance < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, candidateDistance);
        previous.set(edge.to, currentId);
      }
    }
  }

  return { path: [], cost: Number.POSITIVE_INFINITY };
};

const optimizeEvacuation = (
  building: Building | null | undefined,
  scenarioType: ScenarioType,
  buildingRisk: BuildingRiskPrediction | null,
): EvacuationRoutePlan | null => {
  if (!building) {
    return null;
  }

  const hazardPenalty =
    scenarioType === "fire" || scenarioType === "smoke_spread"
      ? 1.3
      : scenarioType === "earthquake_damage"
        ? 1.18
        : scenarioType === "flood_risk"
          ? 1.12
          : 1;

  const nodes: RouteNode[] = [
    { id: "entry", label: "North Entry" },
    { id: "west_stair", label: "West Stairwell" },
    { id: "east_stair", label: "East Stairwell" },
    { id: "south_exit", label: "South Exit" },
    { id: "east_exit", label: "East Exit" },
    { id: "service_corridor", label: "Service Corridor" },
  ];

  const edges: RouteEdge[] = [
    { from: "entry", to: "west_stair", cost: 1.6 * hazardPenalty },
    { from: "entry", to: "east_stair", cost: 1.7 * (hazardPenalty + 0.06) },
    { from: "west_stair", to: "south_exit", cost: 1.5 },
    { from: "east_stair", to: "east_exit", cost: 1.4 * hazardPenalty },
    { from: "west_stair", to: "service_corridor", cost: 1.1 },
    { from: "service_corridor", to: "east_exit", cost: 1.1 },
    { from: "east_stair", to: "south_exit", cost: 1.65 * (hazardPenalty + 0.05) },
  ];

  const bestPath = findBestRoute(nodes, edges, "entry", new Set(["south_exit", "east_exit"]));
  const nameLookup = new Map(nodes.map((node) => [node.id, node.label]));
  const route = bestPath.path.map((nodeId) => nameLookup.get(nodeId) ?? nodeId);

  if (route.length === 0) {
    return {
      route: ["No safe route identified"],
      estimatedMinutes: 9.5,
      confidence: 0.42,
      rationale: ["All major corridors exceed hazard threshold."],
    };
  }

  const occupancyPenalty = clamp((building.occupancy - 120) / 620, 0, 0.36);
  const riskPenalty = (buildingRisk?.riskScore ?? 0.5) * 0.4;
  const estimatedMinutes = Number((bestPath.cost * 1.9 + occupancyPenalty * 4 + riskPenalty * 3).toFixed(1));

  return {
    route,
    estimatedMinutes,
    confidence: clamp(0.58 + (1 / Math.max(1.2, bestPath.cost)) * 0.22 + (1 - occupancyPenalty) * 0.16),
    rationale: [
      "Route minimizes projected hazard exposure and congestion points.",
      "Path was selected using weighted shortest-path optimization with scenario penalties.",
    ],
  };
};

const multiAgentAnalysis = (
  selectedRegion: RegionState,
  scenarioType: ScenarioType,
  buildingRisk: BuildingRiskPrediction | null,
  evacuationPlan: EvacuationRoutePlan | null,
): MultiAgentConsensus => {
  const baseSeverity = buildingRisk?.riskScore ?? selectedRegion.risk;

  const agentInsights: Array<{ agent: AgentType; confidence: number; finding: string; recommendation: string }> = [
    {
      agent: "fire_spread",
      confidence: clamp(0.54 + baseSeverity * 0.36),
      finding:
        scenarioType === "flood_risk"
          ? "Water ingress can disable suppression pumps and increase electrical fire risk."
          : "Heat and smoke are likely to accumulate around core shafts within 15 minutes.",
      recommendation: "Seal high-flow shafts early and prioritize thermal containment at the core.",
    },
    {
      agent: "structural_integrity",
      confidence: clamp(0.52 + baseSeverity * 0.32),
      finding: "Upper utility floors show elevated structural fatigue under current stress profile.",
      recommendation: "Limit responder massing on high-load segments after initial entry.",
    },
    {
      agent: "evacuation_path",
      confidence: clamp(0.58 + (evacuationPlan?.confidence ?? 0.55) * 0.3),
      finding: "West-to-south egress remains the most stable low-congestion route.",
      recommendation: "Stage evacuation in phased waves to avoid chokepoint buildup.",
    },
    {
      agent: "responder_access",
      confidence: clamp(0.55 + selectedRegion.risk * 0.28),
      finding: "South entry is vulnerable to route instability; north access is currently safer.",
      recommendation: "Use north entry for primary teams and keep service corridor as backup.",
    },
  ];

  return {
    fireSeverity: baseSeverity >= 0.74 ? "high" : baseSeverity >= 0.48 ? "medium" : "low",
    structuralRiskZone: "Upper utility and central shaft envelope",
    recommendedEntry: "North Entry",
    evacuationRoute: (evacuationPlan?.route ?? ["West Stairwell", "South Exit"]).join(" -> "),
    responderDeployment: "Primary team north ingress, secondary stabilization team at service corridor",
    confidence: clamp(mean(agentInsights.map((agent) => agent.confidence))),
    agentInsights,
  };
};

const confidenceToLabel = (confidence: number): "Low" | "Medium" | "High" => {
  if (confidence >= 0.78) return "High";
  if (confidence >= 0.54) return "Medium";
  return "Low";
};

const createFallbackBrief = (
  selectedRegion: RegionState,
  anomalyHotspots: AnomalyHotspot[],
  cascadePrediction: CascadePrediction,
): AnalystBrief => {
  const localAnomaly = anomalyHotspots.find((hotspot) => hotspot.regionId === selectedRegion.id);
  const cascade = cascadePrediction.sectorProbabilities;
  const confidence = clamp(
    0.52 +
      selectedRegion.risk * 0.2 +
      mean(Object.values(cascadePrediction.sectorProbabilities)) * 0.2 +
      (localAnomaly?.confidence ?? 0) * 0.12,
  );

  return {
    executiveBrief:
      `${selectedRegion.name} is in ${selectedRegion.riskBand.toUpperCase()} risk conditions with ` +
      `${localAnomaly ? "an anomalous signal cluster" : "steady signal pressure"} and likely downstream stress ` +
      `on power (${Math.round(cascade.powerGridFailure * 100)}%) and healthcare ` +
      `(${Math.round(cascade.hospitalOverload * 100)}%).`,
    likelyDownstreamEffects: [
      "Transport congestion and rerouting pressure near major corridors.",
      "Service reliability drops in power-telecom dependent zones.",
      "Higher probability of hospital load spikes if disruption persists.",
    ],
    watchNow: [
      "Signal acceleration in adjacent regions over the next 60 minutes.",
      "Compounding infrastructure incidents tied to power and transit nodes.",
      "Localized social distress signals indicating civilian movement pressure.",
    ],
    confidenceLabel: confidenceToLabel(confidence),
    confidence,
  };
};

const maybeGenerateLlmBrief = async (
  fallback: AnalystBrief,
  selectedRegion: RegionState,
  anomalies: AnomalyHotspot[],
): Promise<AnalystBrief> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are a crisis intelligence analyst. Return concise operational prose and avoid markdown.",
          },
          {
            role: "user",
            content: createGlobalAnalystPrompt(selectedRegion, anomalies),
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };

    const contentBlocks = payload.output ?? [];
    const extractedText =
      payload.output_text ??
      contentBlocks
        .flatMap((block) => block.content ?? [])
        .filter((block) => block.type === "output_text" || typeof block.text === "string")
        .map((block) => block.text ?? "")
        .join(" ")
        .trim();

    if (!extractedText) {
      return fallback;
    }

    return {
      ...fallback,
      executiveBrief: extractedText,
    };
  } catch {
    return fallback;
  }
};

const generateSocialSignals = (
  selectedRegion: RegionState,
  anomalyHotspots: AnomalyHotspot[],
  demoMode: boolean,
): SocialSignalAlert[] => {
  const primary = anomalyHotspots.find((hotspot) => hotspot.regionId === selectedRegion.id);
  const baselineConfidence = clamp(0.46 + selectedRegion.risk * 0.38 + (primary?.anomalyScore ?? 0) * 0.12);

  const baseAlert: SocialSignalAlert = {
    id: `social-${selectedRegion.id}-${Date.now()}`,
    regionId: selectedRegion.id,
    regionName: selectedRegion.name,
    message:
      selectedRegion.risk >= 0.62
        ? `Crowd reports indicate rising disruption pressure in ${selectedRegion.name}.`
        : `Social chatter indicates localized concern growth in ${selectedRegion.name}.`,
    confidence: baselineConfidence,
    trend: selectedRegion.risk >= 0.58 ? "rising" : "stable",
  };

  if (!demoMode) {
    return [baseAlert];
  }

  return [
    baseAlert,
    {
      id: `social-demo-${selectedRegion.id}`,
      regionId: selectedRegion.id,
      regionName: selectedRegion.name,
      message: `Demo signal: posts referencing route blockages increased by 31% in the last hour.`,
      confidence: clamp(baseAlert.confidence + 0.08),
      trend: "rising",
    },
  ];
};

export const runAIIntelligenceSnapshot = async ({
  selectedRegion,
  allRegions,
  signals,
  building,
  scenarioType = "earthquake_damage",
  demoMode = false,
}: AIEngineInput): Promise<AIIntelligenceSnapshot> => {
  const fusedSignals = fuseSignals(signals);
  const anomalyHotspots = detectAnomalyHotspots(fusedSignals, allRegions);
  const cascadePrediction = predictCascade(selectedRegion, fusedSignals, anomalyHotspots);
  const riskForecast = forecastRisk(selectedRegion, anomalyHotspots, cascadePrediction);
  const buildingRisk = estimateBuildingRisk(building, selectedRegion, scenarioType);
  const evacuationPlan = optimizeEvacuation(building, scenarioType, buildingRisk);
  const multiAgentConsensus = multiAgentAnalysis(
    selectedRegion,
    scenarioType,
    buildingRisk,
    evacuationPlan,
  );

  const fallbackBrief = createFallbackBrief(selectedRegion, anomalyHotspots, cascadePrediction);
  const analystBrief = await maybeGenerateLlmBrief(fallbackBrief, selectedRegion, anomalyHotspots);
  const socialSignals = generateSocialSignals(selectedRegion, anomalyHotspots, demoMode);

  return {
    generatedAt: nowIso(),
    region: {
      id: selectedRegion.id,
      name: selectedRegion.name,
      risk: selectedRegion.risk,
      riskBand: selectedRegion.riskBand,
    },
    fusedSignals,
    anomalyHotspots,
    cascadePrediction,
    riskForecast,
    analystBrief,
    socialSignals,
    buildingRisk,
    evacuationPlan,
    multiAgentConsensus,
  };
};
