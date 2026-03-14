import { SITE_SEED } from "@/mock-data/site-seed";
import { simulateBuildingIncident } from "@/services/building-sim-service";
import type { ScenarioType } from "@/types/command-types";

export const dynamic = "force-dynamic";

interface SimulatePayload {
  buildingId?: string;
  scenario?: ScenarioType;
  severity?: number;
}

const isScenarioType = (value: string): value is ScenarioType =>
  [
    "fire",
    "earthquake_damage",
    "flood_risk",
    "smoke_spread",
    "structural_compromise",
    "evacuation_stress",
  ].includes(value);

export async function POST(request: Request) {
  let payload: SimulatePayload = {};
  try {
    payload = (await request.json()) as SimulatePayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const buildingId = payload.buildingId;
  const scenario = payload.scenario;

  if (!buildingId || !scenario || !isScenarioType(scenario)) {
    return Response.json({ error: "buildingId and valid scenario are required" }, { status: 400 });
  }

  const building = SITE_SEED.flatMap((site) => site.buildings).find((entry) => entry.id === buildingId);
  if (!building) {
    return Response.json({ error: "Building not found" }, { status: 404 });
  }

  const result = simulateBuildingIncident(building, scenario, payload.severity);

  return Response.json({
    result,
    meta: {
      mode: "deterministic-demo",
      generatedAt: new Date().toISOString(),
    },
  });
}
