export type SignalType =
  | "shipping_congestion"
  | "extreme_weather"
  | "news_sentiment_spike"
  | "infrastructure_disruption";

export type SignalSource = "simulated" | "usgs" | "eonet" | "open_meteo" | "google_news";

export type RiskBand = "low" | "medium" | "high" | "critical";

export type NodeStatus = "healthy" | "stressed" | "failed";

export interface Signal {
  id: string;
  type: SignalType;
  source: SignalSource;
  severity: number;
  timestamp: string;
  location: [number, number];
  regionId: string;
  details?: string;
}

export interface RegionSeed {
  id: string;
  name: string;
  center: [number, number];
  hexId: string;
  neighbors: string[];
}

export interface RiskHistoryPoint {
  timestamp: string;
  risk: number;
}

export interface RegionState extends RegionSeed {
  risk: number;
  riskBand: RiskBand;
  drivers: SignalType[];
  recentEvents: string[];
  riskHistory: RiskHistoryPoint[];
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "critical";
  message: string;
  regionId?: string;
}

export interface SystemNode {
  id: string;
  label: string;
  type: "port" | "power" | "hospital" | "transport" | "data";
  criticality: number;
}

export interface SystemLink {
  source: string;
  target: string;
  weight: number;
}

export interface CascadeSnapshot {
  minute: 0 | 5 | 15 | 30;
  nodeStatus: Record<string, NodeStatus>;
  failedCount: number;
  stressedCount: number;
}

export interface CascadeResult {
  regionId: string;
  startedAt: string;
  triggerNodes: string[];
  snapshots: CascadeSnapshot[];
  failedNodes: string[];
}
