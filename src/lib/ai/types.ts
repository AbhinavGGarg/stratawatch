import type { RegionState, Signal } from "@/lib/types";
import type { AgentType, Building, ScenarioType } from "@/types/command-types";

export interface FusedSignal {
  id: string;
  type: Signal["type"];
  severity: number;
  confidence: number;
  timestamp: string;
  coordinates: [number, number];
  regionId: string;
  source: Signal["source"];
  provenance: string;
  summary: string;
  tags: string[];
  affectedSectors: string[];
  recommendedWatchActions: string[];
}

export interface AnomalyHotspot {
  regionId: string;
  regionName: string;
  anomalyScore: number;
  confidence: number;
  signalCount: number;
  dominantSignals: Signal["type"][];
  summary: string;
}

export interface PredictedCascadeNode {
  id: string;
  label: string;
  type: string;
  failureProbability: number;
  stressLevel: number;
}

export interface PredictedCascadeEdge {
  source: string;
  target: string;
  probability: number;
  delayMinutes: number;
}

export interface CascadePrediction {
  regionId: string;
  generatedAt: string;
  horizonMinutes: number;
  sectorProbabilities: {
    powerGridFailure: number;
    hospitalOverload: number;
    transportDisruption: number;
    telecomOutage: number;
    dataCenterInstability: number;
  };
  nodes: PredictedCascadeNode[];
  edges: PredictedCascadeEdge[];
}

export interface RiskForecastPoint {
  timestamp: string;
  stepLabel: string;
  predictedRisk: number;
  lowerBound: number;
  upperBound: number;
}

export interface RiskForecast {
  regionId: string;
  horizonHours: number;
  points: RiskForecastPoint[];
}

export interface BuildingRiskPrediction {
  buildingId: string;
  buildingName: string;
  scenarioType: ScenarioType;
  riskScore: number;
  confidence: number;
  classification: "low" | "moderate" | "high" | "critical";
  keyDrivers: string[];
  zoneScores: Array<{ zone: string; score: number }>;
}

export interface EvacuationRoutePlan {
  route: string[];
  estimatedMinutes: number;
  confidence: number;
  rationale: string[];
}

export interface AgentInsight {
  agent: AgentType;
  confidence: number;
  finding: string;
  recommendation: string;
}

export interface MultiAgentConsensus {
  fireSeverity: "low" | "medium" | "high";
  structuralRiskZone: string;
  recommendedEntry: string;
  evacuationRoute: string;
  responderDeployment: string;
  confidence: number;
  agentInsights: AgentInsight[];
}

export interface SocialSignalAlert {
  id: string;
  regionId: string;
  regionName: string;
  message: string;
  confidence: number;
  trend: "rising" | "stable";
}

export interface AnalystBrief {
  executiveBrief: string;
  likelyDownstreamEffects: string[];
  watchNow: string[];
  confidenceLabel: "Low" | "Medium" | "High";
  confidence: number;
}

export interface AIIntelligenceSnapshot {
  generatedAt: string;
  region: Pick<RegionState, "id" | "name" | "risk" | "riskBand">;
  fusedSignals: FusedSignal[];
  anomalyHotspots: AnomalyHotspot[];
  cascadePrediction: CascadePrediction;
  riskForecast: RiskForecast;
  analystBrief: AnalystBrief;
  socialSignals: SocialSignalAlert[];
  buildingRisk: BuildingRiskPrediction | null;
  evacuationPlan: EvacuationRoutePlan | null;
  multiAgentConsensus: MultiAgentConsensus | null;
}

export interface AIEngineInput {
  selectedRegion: RegionState;
  allRegions: RegionState[];
  signals: Signal[];
  building?: Building | null;
  scenarioType?: ScenarioType;
  demoMode?: boolean;
}
