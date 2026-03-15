import { REGION_CATALOG } from "@/lib/region-catalog";
import { generateSignalBurst } from "@/lib/signal-generator";
import type { RegionState, Signal } from "@/lib/types";
import { SITE_SEED } from "@/mock-data/site-seed";
import type { ScenarioType } from "@/types/command-types";
import type { AIEngineInput } from "@/lib/ai/types";

export interface IntelligenceRequestBody {
  selectedRegionId?: string;
  allRegions?: RegionState[];
  signals?: Signal[];
  demoMode?: boolean;
  scenarioType?: ScenarioType;
  buildingId?: string;
}

const scenarioTypes: ScenarioType[] = [
  "fire",
  "earthquake_damage",
  "flood_risk",
  "smoke_spread",
  "structural_compromise",
  "evacuation_stress",
];

const isScenarioType = (value: unknown): value is ScenarioType =>
  typeof value === "string" && scenarioTypes.includes(value as ScenarioType);

export const toAIEngineInput = (body: IntelligenceRequestBody): AIEngineInput | null => {
  const allRegions = Array.isArray(body.allRegions) ? body.allRegions : [];
  const signals = Array.isArray(body.signals) ? body.signals : [];

  if (allRegions.length === 0) {
    return null;
  }

  const selectedRegionId =
    typeof body.selectedRegionId === "string" && body.selectedRegionId.length > 0
      ? body.selectedRegionId
      : allRegions[0]?.id;

  const selectedRegion = allRegions.find((region) => region.id === selectedRegionId);
  if (!selectedRegion) {
    return null;
  }

  const scenarioType = isScenarioType(body.scenarioType) ? body.scenarioType : "earthquake_damage";
  const demoMode = Boolean(body.demoMode);

  const boostedSignals = demoMode
    ? [
        ...signals,
        ...generateSignalBurst(
          REGION_CATALOG.map((region) => region.id),
          8,
          new Date(),
        ),
      ]
    : signals;

  const site = SITE_SEED.find((candidate) => candidate.regionId === selectedRegion.id) ?? null;
  const building =
    site?.buildings.find((candidate) => candidate.id === body.buildingId) ?? site?.buildings[0] ?? null;

  return {
    selectedRegion,
    allRegions,
    signals: boostedSignals,
    building,
    scenarioType,
    demoMode,
  };
};
