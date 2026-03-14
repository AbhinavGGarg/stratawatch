import type {
  AgentAssessment,
  Building,
  BuildingSimulationResult,
  HazardZone,
  IncidentSummary,
  ScenarioType,
  SimulationScenario,
} from "@/types/command-types";

const hash = (value: string): number => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i);
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

const mkScenario = (buildingId: string, type: ScenarioType, severity: number): SimulationScenario => ({
  id: `sim-${buildingId}-${type}-${Date.now()}`,
  type,
  buildingId,
  initiatedAt: new Date().toISOString(),
  severity,
  assumptions: [
    "Interior occupancy estimated from baseline schedule.",
    "Primary response arrives within 8-12 minutes.",
    "Utility status assumed degraded but not fully failed at minute 0.",
  ],
  weatherContext: {
    windKph: 12,
    humidity: 38,
  },
});

const makeZones = (type: ScenarioType, severity: number, random: () => number): HazardZone[] => {
  const zones: HazardZone[] = [
    {
      id: "zone-hot",
      label: type === "flood_risk" ? "Active Flood Ingress" : "Primary Hazard Core",
      severity,
      color: type === "flood_risk" ? "blue" : "red",
      vertices: [
        [0, 0, 0],
        [5 + random() * 3, 0, 0],
        [5 + random() * 3, 4 + random() * 2, 0],
        [0, 4 + random() * 2, 0],
      ],
    },
    {
      id: "zone-spread",
      label: "Projected Spread Envelope",
      severity: Math.max(0.35, severity - 0.18),
      color: "orange",
      vertices: [
        [0, 0, 0],
        [8 + random() * 3, 0, 0],
        [8 + random() * 3, 6 + random() * 3, 0],
        [0, 6 + random() * 3, 0],
      ],
    },
    {
      id: "zone-evac",
      label: "Recommended Evacuation Corridor",
      severity: 0.24,
      color: "cyan",
      vertices: [
        [1, 0, 0],
        [2.5, 0, 0],
        [2.5, 9, 0],
        [1, 9, 0],
      ],
    },
    {
      id: "zone-entry",
      label: "Preferred Responder Entry",
      severity: 0.2,
      color: "green",
      vertices: [
        [6.2, 1.1, 0],
        [7.8, 1.1, 0],
        [7.8, 2.2, 0],
        [6.2, 2.2, 0],
      ],
    },
  ];

  if (type === "smoke_spread") {
    zones.push({
      id: "zone-smoke",
      label: "Low Visibility Sector",
      severity: Math.min(0.92, severity + 0.08),
      color: "purple",
      vertices: [
        [3, 3, 0],
        [6.8, 3, 0],
        [6.8, 8, 0],
        [3, 8, 0],
      ],
    });
  }

  return zones;
};

const makeAssessments = (severity: number): AgentAssessment[] => [
  {
    id: "agent-fire",
    agent: "fire_spread",
    confidence: Math.min(0.94, 0.68 + severity * 0.25),
    findings: [
      "Thermal spread trajectory favors central shaft and mezzanine transfer points.",
      "Secondary heat pockets likely near utility riser corridor.",
    ],
    recommendedActions: ["Cool central core boundary.", "Prioritize smoke suppression near east stairwell."],
    noGoZones: ["Primary hazard core"],
    priority: "high",
  },
  {
    id: "agent-structural",
    agent: "structural_integrity",
    confidence: 0.61 + severity * 0.23,
    findings: [
      "Localized frame instability expected after minute 15 under current thermal load.",
      "Mechanical floor exhibits elevated deformation risk.",
    ],
    recommendedActions: ["Restrict heavy movement above level 4.", "Use north entry where load paths are stronger."],
    noGoZones: ["Mechanical floor sector"],
    priority: "high",
  },
  {
    id: "agent-evac",
    agent: "evacuation_path",
    confidence: 0.72,
    findings: ["Southern exit is viable but congestion-prone.", "East route remains fastest under current smoke projection."],
    recommendedActions: ["Stage marshals at east corridor.", "Phase evacuation by floor density."],
    noGoZones: [],
    priority: "medium",
  },
  {
    id: "agent-access",
    agent: "responder_access",
    confidence: 0.79,
    findings: ["North approach has best survivability and shortest hazard exposure."],
    recommendedActions: ["Primary entry: North Entry.", "Secondary fallback: Service Entry."],
    noGoZones: ["South loading bay"],
    priority: "high",
  },
  {
    id: "agent-visibility",
    agent: "hazard_visibility",
    confidence: 0.67,
    findings: ["Visibility degradation expected in vertical circulation zones."],
    recommendedActions: ["Use thermal optics for stairwell sweep."],
    noGoZones: [],
    priority: "medium",
  },
];

const makeSummary = (type: ScenarioType, severity: number): IncidentSummary => ({
  scenario: type,
  severity,
  confidence: Math.min(0.95, 0.62 + severity * 0.28),
  dominantHazards:
    type === "flood_risk"
      ? ["rapid water ingress", "electrical exposure", "access degradation"]
      : ["thermal spread", "smoke accumulation", "egress congestion"],
  structuralConcerns: [
    "Localized load-bearing stress near central core.",
    "Potential service-floor instability under prolonged hazard duration.",
  ],
  recommendedEntry: "North Entry",
  recommendedEvacuation: "East Evacuation Corridor",
  noGoAreas: ["Primary Hazard Core", "Mechanical Floor Sector"],
  tacticalNotes: [
    "Prioritize containment before full interior sweep.",
    "Protect east corridor to maintain evacuation viability.",
    "Coordinate telecom relay continuity for responder command channel.",
  ],
  nextCriticalFailureRisks: [
    "Ventilation failure cascading into low-visibility expansion.",
    "Power relay overload impacting elevator and suppression systems.",
  ],
  generatedAt: new Date().toISOString(),
});

export const simulateBuildingIncident = (
  building: Building,
  scenarioType: ScenarioType,
  requestedSeverity?: number,
): BuildingSimulationResult => {
  const seed = hash(`${building.id}:${scenarioType}`);
  const random = seedRand(seed);
  const severity = Math.max(0.35, Math.min(0.96, requestedSeverity ?? 0.55 + random() * 0.35));

  return {
    scenario: mkScenario(building.id, scenarioType, severity),
    zones: makeZones(scenarioType, severity, random),
    agentAssessments: makeAssessments(severity),
    summary: makeSummary(scenarioType, severity),
  };
};
