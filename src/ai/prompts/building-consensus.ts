import type { ScenarioType } from "@/types/command-types";

export const createBuildingConsensusPrompt = (scenario: ScenarioType, buildingName: string): string =>
  [
    "You are coordinating specialized emergency AI agents.",
    `Scenario: ${scenario}.`,
    `Building: ${buildingName}.`,
    "Summarize fire risk, structural risk, best entry, best evacuation route, and top tactical caution.",
    "Use short tactical phrases and include confidence notes.",
  ].join(" ");
