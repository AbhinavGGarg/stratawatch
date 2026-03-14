import type { Building, Site } from "@/types/command-types";

const makeBuilding = (input: Omit<Building, "ingressPoints" | "egressPoints">): Building => ({
  ...input,
  ingressPoints: [
    { id: `${input.id}-north`, label: "North Entry", location: input.coordinates },
    {
      id: `${input.id}-service`,
      label: "Service Entry",
      location: [input.coordinates[0] + 0.00025, input.coordinates[1] - 0.0002],
    },
  ],
  egressPoints: [
    { id: `${input.id}-south`, label: "South Exit", location: [input.coordinates[0], input.coordinates[1] - 0.0003] },
    {
      id: `${input.id}-east`,
      label: "East Exit",
      location: [input.coordinates[0] + 0.0003, input.coordinates[1]],
    },
  ],
});

const suezBuildings: Building[] = [
  makeBuilding({
    id: "suez-port-command",
    siteId: "suez-north-cluster",
    regionId: "suez_corridor",
    name: "Suez Port Command Center",
    address: "Port Said, Egypt",
    coordinates: [32.309, 31.265],
    footprint: [
      [0, 0],
      [26, 0],
      [26, 14],
      [0, 14],
    ],
    estimatedHeightMeters: 42,
    occupancy: 420,
    type: "office",
  }),
  makeBuilding({
    id: "suez-logistics-hospital",
    siteId: "suez-north-cluster",
    regionId: "suez_corridor",
    name: "Logistics Emergency Hospital",
    address: "Ismailia Corridor",
    coordinates: [32.336, 30.595],
    footprint: [
      [0, 0],
      [18, 0],
      [18, 18],
      [0, 18],
    ],
    estimatedHeightMeters: 31,
    occupancy: 280,
    type: "hospital",
  }),
];

const gulfBuildings: Building[] = [
  makeBuilding({
    id: "gulf-data-hub-7",
    siteId: "gulf-infra-park",
    regionId: "persian_gulf",
    name: "Gulf Data Hub 7",
    address: "Manama Infrastructure Park",
    coordinates: [50.59, 26.22],
    footprint: [
      [0, 0],
      [22, 0],
      [22, 10],
      [0, 10],
    ],
    estimatedHeightMeters: 24,
    occupancy: 160,
    type: "data_center",
  }),
  makeBuilding({
    id: "gulf-fuel-ops",
    siteId: "gulf-infra-park",
    regionId: "persian_gulf",
    name: "Fuel Dispatch Operations",
    address: "Eastern Industrial Zone",
    coordinates: [51.89, 25.29],
    footprint: [
      [0, 0],
      [16, 0],
      [16, 12],
      [0, 12],
    ],
    estimatedHeightMeters: 21,
    occupancy: 120,
    type: "warehouse",
  }),
];

const seAsiaBuildings: Building[] = [
  makeBuilding({
    id: "malacca-transit-ctrl",
    siteId: "malacca-gateway",
    regionId: "strait_malacca",
    name: "Malacca Transit Control",
    address: "Johor Gateway",
    coordinates: [103.72, 1.31],
    footprint: [
      [0, 0],
      [20, 0],
      [20, 15],
      [0, 15],
    ],
    estimatedHeightMeters: 34,
    occupancy: 250,
    type: "transport",
  }),
  makeBuilding({
    id: "malacca-medical-node",
    siteId: "malacca-gateway",
    regionId: "strait_malacca",
    name: "Regional Medical Node",
    address: "Singapore Maritime Belt",
    coordinates: [103.86, 1.29],
    footprint: [
      [0, 0],
      [14, 0],
      [14, 18],
      [0, 18],
    ],
    estimatedHeightMeters: 37,
    occupancy: 310,
    type: "hospital",
  }),
];

export const SITE_SEED: Site[] = [
  {
    id: "suez-north-cluster",
    regionId: "suez_corridor",
    city: "Port Said",
    name: "Suez North Operations Cluster",
    coordinates: [32.31, 31.18],
    criticalAssets: ["Port command", "Hospital", "Fuel logistics"],
    buildings: suezBuildings,
  },
  {
    id: "gulf-infra-park",
    regionId: "persian_gulf",
    city: "Manama",
    name: "Gulf Infrastructure Park",
    coordinates: [50.6, 26.2],
    criticalAssets: ["Data center", "Fuel dispatch", "Transit relay"],
    buildings: gulfBuildings,
  },
  {
    id: "malacca-gateway",
    regionId: "strait_malacca",
    city: "Singapore",
    name: "Malacca Gateway Cluster",
    coordinates: [103.8, 1.3],
    criticalAssets: ["Transit control", "Medical node", "Telecom relay"],
    buildings: seAsiaBuildings,
  },
];

export const SCENARIO_PRESETS = [
  {
    id: "fire-response",
    label: "Fire Response",
    type: "fire" as const,
    severity: 0.74,
  },
  {
    id: "quake-impact",
    label: "Earthquake Impact",
    type: "earthquake_damage" as const,
    severity: 0.82,
  },
  {
    id: "flood-surge",
    label: "Flood Surge",
    type: "flood_risk" as const,
    severity: 0.68,
  },
];
