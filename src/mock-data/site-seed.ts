import { REGION_CATALOG } from "@/lib/region-catalog";
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

const baseSites: Site[] = [
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

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const stableHash = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seededRandom = (seed: number): (() => number) => {
  let state = seed || 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state & 2147483647) / 2147483647;
  };
};

const buildingTypes: Building["type"][] = ["office", "hospital", "data_center", "warehouse", "transport"];

const humanCityName = (regionName: string): string => {
  const cleaned = regionName.replace(/\b(Corridor|Belt|Hub|Route|Grid|Lanes|Sea|Coast)\b/gi, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ") || regionName;
};

const createGeneratedBuildings = (
  regionId: string,
  regionName: string,
  siteId: string,
  center: [number, number],
  seed: number,
): Building[] => {
  const random = seededRandom(seed);

  return Array.from({ length: 2 }, (_, index) => {
    const type = buildingTypes[(seed + index) % buildingTypes.length] ?? "office";
    const lng = clamp(center[0] + (random() * 2 - 1) * 0.75, -179.8, 179.8);
    const lat = clamp(center[1] + (random() * 2 - 1) * 0.45, -84, 84);
    const width = Math.round(14 + random() * 12);
    const depth = Math.round(10 + random() * 10);

    return makeBuilding({
      id: `${regionId}-building-${index + 1}`,
      siteId,
      regionId,
      name: `${humanCityName(regionName)} ${index === 0 ? "Operations Hub" : "Emergency Node"}`,
      address: `${humanCityName(regionName)} Sector ${index + 1}`,
      coordinates: [lng, lat],
      footprint: [
        [0, 0],
        [width, 0],
        [width, depth],
        [0, depth],
      ],
      estimatedHeightMeters: Math.round(18 + random() * 42),
      occupancy: Math.round(120 + random() * 360),
      type,
    });
  });
};

const existingRegionIds = new Set(baseSites.map((site) => site.regionId));

const generatedSites: Site[] = REGION_CATALOG.filter((region) => !existingRegionIds.has(region.id)).map((region) => {
  const seed = stableHash(region.id);
  const siteId = `${region.id}-ops-cluster`;
  const city = humanCityName(region.name);

  return {
    id: siteId,
    regionId: region.id,
    city,
    name: `${region.name} Operations Cluster`,
    coordinates: region.center,
    criticalAssets: ["Emergency coordination", "Power relay", "Transit logistics"],
    buildings: createGeneratedBuildings(region.id, region.name, siteId, region.center, seed),
  };
});

export const SITE_SEED: Site[] = [...baseSites, ...generatedSites];

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
