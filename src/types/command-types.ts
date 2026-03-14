import type { SignalSource, SignalType } from "@/lib/types";

export type ScaleLevel = "global" | "regional" | "city" | "site" | "building";

export type TrendDirection = "rising" | "stable" | "cooling";

export type ScenarioType =
  | "fire"
  | "earthquake_damage"
  | "flood_risk"
  | "smoke_spread"
  | "structural_compromise"
  | "evacuation_stress";

export type AgentType =
  | "fire_spread"
  | "structural_integrity"
  | "evacuation_path"
  | "responder_access"
  | "personnel_deployment"
  | "hazard_visibility";

export interface SignalRecord {
  id: string;
  type: SignalType;
  severity: number;
  confidence: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  regionId: string;
  source: SignalSource;
  provenance: string;
  summary: string;
  tags: string[];
  affectedSectors: string[];
  recommendedWatchActions: string[];
}

export interface RiskScore {
  regionId: string;
  score: number;
  confidence: number;
  trend: TrendDirection;
  lastUpdated: string;
  contributors: Array<{ factor: string; weight: number; delta: number }>;
  recentDiff: {
    absolute: number;
    percent: number;
  };
}

export interface Region {
  id: string;
  name: string;
  center: [number, number];
  scaleLevel: Extract<ScaleLevel, "global" | "regional">;
  sectors: string[];
  risk: RiskScore;
}

export interface InfrastructureNode {
  id: string;
  regionId: string;
  name: string;
  kind:
    | "port"
    | "power"
    | "hospital"
    | "transport"
    | "telecom"
    | "water"
    | "data_center"
    | "supply_depot"
    | "emergency_service";
  stress: number;
  predictedStress: number;
  status: "nominal" | "watch" | "stressed" | "critical";
  coordinates: [number, number];
  rationale: string[];
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  coupling: number;
  latencyMinutes: number;
}

export interface CascadeEvent {
  id: string;
  timestamp: string;
  regionId: string;
  sourceNodeId: string;
  impactedNodeIds: string[];
  step: number;
  summary: string;
}

export interface Site {
  id: string;
  regionId: string;
  city: string;
  name: string;
  coordinates: [number, number];
  criticalAssets: string[];
  buildings: Building[];
}

export interface Building {
  id: string;
  siteId: string;
  regionId: string;
  name: string;
  address: string;
  coordinates: [number, number];
  footprint: Array<[number, number]>;
  estimatedHeightMeters: number;
  occupancy: number;
  type: "hospital" | "data_center" | "office" | "warehouse" | "transport";
  ingressPoints: Array<{ id: string; label: string; location: [number, number] }>;
  egressPoints: Array<{ id: string; label: string; location: [number, number] }>;
}

export interface SimulationScenario {
  id: string;
  type: ScenarioType;
  buildingId: string;
  initiatedAt: string;
  severity: number;
  assumptions: string[];
  weatherContext?: {
    windKph: number;
    humidity: number;
  };
}

export interface HazardZone {
  id: string;
  label: string;
  severity: number;
  color: "red" | "orange" | "yellow" | "blue" | "green" | "cyan" | "purple";
  vertices: Array<[number, number, number]>;
}

export interface AgentAssessment {
  id: string;
  agent: AgentType;
  confidence: number;
  findings: string[];
  recommendedActions: string[];
  noGoZones: string[];
  priority: "high" | "medium" | "low";
}

export interface IncidentSummary {
  scenario: ScenarioType;
  severity: number;
  confidence: number;
  dominantHazards: string[];
  structuralConcerns: string[];
  recommendedEntry: string;
  recommendedEvacuation: string;
  noGoAreas: string[];
  tacticalNotes: string[];
  nextCriticalFailureRisks: string[];
  generatedAt: string;
}

export interface BuildingSimulationResult {
  scenario: SimulationScenario;
  zones: HazardZone[];
  agentAssessments: AgentAssessment[];
  summary: IncidentSummary;
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  source: "signal" | "risk" | "cascade" | "simulation" | "system";
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  regionId?: string;
  siteId?: string;
  buildingId?: string;
}

export interface PanelState {
  leftRailOpen: boolean;
  rightRailOpen: boolean;
  bottomTrayOpen: boolean;
  activeScale: ScaleLevel;
  activeRegionId: string | null;
  activeSiteId: string | null;
  activeBuildingId: string | null;
  activeScenario: ScenarioType | null;
  demoModeEnabled: boolean;
}
